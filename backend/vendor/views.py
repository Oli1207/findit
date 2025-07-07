from django.shortcuts import render, redirect
from django.conf import settings
from userauths.models import *
from decimal import Decimal
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from rest_framework.decorators import api_view, permission_classes
from store.models import *
from store.serializers import *
from django.http import JsonResponse
from django.db import models, transaction

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
import cv2
import numpy as np
import stripe
from rest_framework.parsers import MultiPartParser, FormParser
from concurrent.futures import ThreadPoolExecutor


class ProductCreateView(generics.CreateAPIView):
    serializer_class = ProductSerializer
    queryset = Product.objects.all()

    @transaction.atomic
    def perform_create(self, serializer):

        vendor_id = self.request.data.get('vendor')  # Extract vendor ID from the request
        print("first vendor id", vendor_id)
        if not vendor_id:
            raise serializers.ValidationError({"vendor": "Vendor ID is required."})

        # Validate vendor existence
        try:
            vendor = Vendor.objects.get(id=vendor_id)
            print("got him", vendor)
        except Vendor.DoesNotExist:
            raise serializers.ValidationError({"vendor": "Vendor does not exist."})

        # Save product with the vendor
        serializer.save(vendor=vendor)

        product_instance = serializer.instance

        specifications_data = []
        colors_data = []
        sizes_data = []
        gallery_data = []
        
        for key, value in self.request.data.items():
            if key.startswith('specifications') and '[title]' in key:
                index = key.split('[')[1].split(']')[0]
                title = value
                content_key = f'specifications[{index}][content]'
                content  = self.request.data.get(content_key)
                specifications_data.append({'title': title, 'content': content})

            elif key.startswith('colors') and '[name]' in key:
                index = key.split('[')[1].split(']')[0]
                name = value
                color_code_key = f'colors[{index}][color_code]'
                color_code = self.request.data.get(color_code_key)
                colors_data.append({'name':name, 'color_code': color_code})

            elif key.startswith('sizes') and '[name]' in key:
                index = key.split('[')[1].split(']')[0]
                name = value
                price_key = f'sizes[{index}][price]'
                price = self.request.data.get(price_key)
                sizes_data.append({'name': name, 'price': price})

            elif key.startswith('gallery') and '[image]' in key:
                index = key.split('[')[1].split(']')[0]
                image = value
                gallery_data.append({'image': image})


        print("specifications", specifications_data)
        print("colors", colors_data)
        print("sizes", sizes_data)
        print("gallery", gallery_data)

        self.save_nested_data(product_instance, SpecificationSerializer, specifications_data)
        self.save_nested_data(product_instance, ColorSerializer, colors_data)
        self.save_nested_data(product_instance, SizeSerializer, sizes_data)
        self.save_nested_data(product_instance, GallerySerializer, gallery_data)

    def save_nested_data(self, product_instance, serializer_class, data):
        serializer = serializer_class(data=data, many=True, context={'product_instance': product_instance})
        serializer.is_valid(raise_exception=True)
        serializer.save(product=product_instance)


# class CouponListAPIView(generics.ListAPIView):
#     serializer_class = CouponSerializer
#     permission_classes = [AllowAny]

#     def get_queryset(self):
#         vendor_id = self.kwargs['vendor_id']
#         vendor = Vendor.objects.Get(id=vendor_id)

#         return Coupon.objects.filter(vendor=vendor)
    
#     def create(self, request, *args, **kwargs):
#         payload = request.data
#         vendor_id = payload

class VendorProfileUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [AllowAny]

class ShopUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [AllowAny]


class ShopAPIView(generics.RetrieveAPIView):
    serializer_class = VendorSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        vendor_slug = self.kwargs['vendor_slug']
        return Vendor.objects.get(slug=vendor_slug)

class ShopProductAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        vendor_id = self.kwargs['vendor_id']
        vendor = Vendor.objects.get(id=vendor_id)
        return Product.objects.filter(vendor=vendor)
    
class ShopProductIDAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        vendor_slug = self.kwargs['slug']
        vendor = Vendor.objects.get(slug=vendor_slug)
        return Product.objects.filter(vendor=vendor)
    
@api_view(['POST'])
@permission_classes([AllowAny])  # Permettre un accès sans authentification
def toggle_follow(request, vendor_id):
    try:
        user_id = request.data.get('user_id') 
        print(user_id) # Récupérer l'ID de l'utilisateur depuis FormData
        if not user_id:
            return Response({"error": "User ID is required"}, status=400)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
       
        try:
            vendor = Vendor.objects.get(id=vendor_id)
        except Vendor.DoesNotExist:
            return Response({"error": "Vendor does not exist"}, status=404)
        
        if user in vendor.followers.all():
            vendor.followers.remove(user)
            following = False
     
        else:
            vendor.followers.add(user)
            following = True
        
        return Response({"success": True, "following": following})
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
@api_view(['GET'])
@permission_classes([AllowAny])  # Permettre l'accès sans authentification
def get_vendor_details(request, vendor_id, user_id):
    try:
        # Récupérer le vendeur
        vendor = Vendor.objects.get(id=vendor_id)

        # Récupérer l'utilisateur
        try:
            user = User.objects.get(id=user_id)
            following = user in vendor.followers.all()  # Vérifier si l'utilisateur suit le vendeur
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        # Retourner le statut de "suivi"
        return Response({"following": following})
    except Vendor.DoesNotExist:
        return Response({"error": "Vendor not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def is_following(request, vendor_id, user_id):
    try:
        vendor = Vendor.objects.get(id=vendor_id)
        user = User.objects.get(id=user_id)
        is_following = user in vendor.followers.all()
        return Response({"following": is_following})
    except Vendor.DoesNotExist:
        return Response({"error": "Vendor not found"}, status=404)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)



class OrdersAPIView(generics.ListAPIView):
    serializer_class = CartOrderSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        vendor_id = self.kwargs['vendor_id']
        vendor = Vendor.objects.get(id=vendor_id)
        orders = CartOrder.objects.filter(vendor=vendor)
        return orders
    

class OrderDetailAPIView(generics.RetrieveAPIView):
    serializer_class = CartOrderSerializer
    permission_classes = (AllowAny,)

    def get_object(self):
        vendor_id = self.kwargs['vendor_id']
        order_oid = self.kwargs['order_oid']

        vendor = Vendor.objects.get(id=vendor_id)
        order = CartOrder.objects.get(
            vendor=vendor, oid=order_oid)
        return order


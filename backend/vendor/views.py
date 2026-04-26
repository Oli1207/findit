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
from vendor.models import VendorVerification

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
@permission_classes([IsAuthenticated])   # Seul un utilisateur connecté peut suivre
def toggle_follow(request, vendor_id):
    try:
        vendor = Vendor.objects.get(id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({"error": "Vendeur introuvable"}, status=404)

    user = request.user
    if user in vendor.followers.all():
        vendor.followers.remove(user)
        following = False
    else:
        vendor.followers.add(user)
        following = True

    return Response({
        "success": True,
        "following": following,
        "followers_count": vendor.followers.count(),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def batch_is_following(request):
    """
    Vérifie en une seule requête si l'utilisateur connecté suit une liste de vendeurs.
    Body: { "vendor_ids": [1, 2, 3] }
    Réponse: { "1": true, "2": false, "3": true }
    """
    vendor_ids = request.data.get('vendor_ids', [])
    if not vendor_ids:
        return Response({})

    user = request.user
    if user.is_authenticated:
        # 1 seule requête DB pour tous les vendeurs
        followed_ids = set(
            Vendor.objects
            .filter(id__in=vendor_ids, followers=user)
            .values_list('id', flat=True)
        )
        result = {str(vid): (vid in followed_ids) for vid in vendor_ids}
    else:
        result = {str(vid): False for vid in vendor_ids}

    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def is_following(request, vendor_id, user_id):
    """Conservé pour compatibilité – préférer batch_is_following."""
    try:
        vendor = Vendor.objects.get(id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({"error": "Vendeur introuvable"}, status=404)

    user = request.user
    following = user.is_authenticated and vendor.followers.filter(id=user.id).exists()
    return Response({"following": following})


class OrdersAPIView(generics.ListAPIView):
    serializer_class = CartOrderSerializer
    permission_classes = (AllowAny,)
    pagination_class = None
    
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


class VendorPresentationsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, vendor_id):
        try:
            vendor = Vendor.objects.get(id=vendor_id)
        except Vendor.DoesNotExist:
            return Response({"error": "Vendeur non trouvé"}, status=404)

        presentations = (
            Presentation.objects
            .filter(vendor=vendor)
            .select_related("vendor", "vendor__user")
            .prefetch_related("comments")
            .annotate(
                likes_count=models.Count("likes", distinct=True),
                comments_count=models.Count("comments", distinct=True),
            )
            .order_by("-id")
        )
        serializer = PresentationFeedSerializer(presentations, many=True, context={"request": request})
        return Response({"presentations": serializer.data})


class VendorProductsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, vendor_id):
        try:
            vendor = Vendor.objects.get(id=vendor_id)
        except Vendor.DoesNotExist:
            return Response({"error": "Vendeur non trouvé"}, status=404)

        products = (
            Product.objects
            .filter(vendor=vendor)
            .select_related("vendor", "vendor__user", "category")
            .prefetch_related("color_set", "size_set", "gallery_set", "specification_set")
            .annotate(rating_count=models.Count("review", distinct=True))
            .order_by("-date")
        )
        serializer = ProductFeedSerializer(products, many=True, context={"request": request})
        return Response({"products": serializer.data})


# ─── Vérification d'identité vendeur ─────────────────────────────────────────

class VendorRequestVerificationView(APIView):
    """
    POST  — le vendeur soumet ses 3 photos live (base64).
    Champs attendus : id_front, id_back, selfie  (base64 strings)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            vendor = request.user.vendor
        except Vendor.DoesNotExist:
            return Response({'detail': 'Pas de compte vendeur.'}, status=400)

        id_front = request.data.get('id_front')
        id_back  = request.data.get('id_back')
        selfie   = request.data.get('selfie')

        if not (id_front and id_back and selfie):
            return Response({'detail': 'Les 3 photos sont obligatoires.'}, status=400)

        verif, _ = VendorVerification.objects.get_or_create(vendor=vendor)
        # Refuse si déjà approuvé
        if verif.status == 'approved':
            return Response({'detail': 'Votre identité est déjà vérifiée ✓'}, status=400)

        verif.status = 'pending'
        verif.save_base64_photo('id_front', id_front)
        verif.save_base64_photo('id_back',  id_back)
        verif.save_base64_photo('selfie',   selfie)
        verif.save()

        return Response({'detail': 'Demande envoyée. Un admin examinera vos photos sous 48h.'})


class VendorVerificationStatusView(APIView):
    """GET — retourne le statut de vérification du vendeur connecté."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            vendor = request.user.vendor
        except Vendor.DoesNotExist:
            return Response({'detail': 'Pas de compte vendeur.'}, status=400)

        try:
            verif = vendor.verification
            return Response({
                'status':    verif.status,
                'verified':  vendor.verified,
                'submitted_at': verif.submitted_at,
                'admin_notes':  verif.admin_notes if verif.status == 'rejected' else None,
            })
        except VendorVerification.DoesNotExist:
            return Response({'status': None, 'verified': vendor.verified})

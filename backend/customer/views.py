from django.shortcuts import render, redirect
from django.conf import settings
from userauths.models import *
from decimal import Decimal
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from store.models import *
from store.serializers import *

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


class OrdersAPIView(generics.ListAPIView):
    serializer_class = CartOrderSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user

        orders = CartOrder.objects.filter(buyer=user)
        return orders
    

class OrderDetailAPIView(generics.RetrieveAPIView):
    serializer_class = CartOrderSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        order_oid = self.kwargs['order_oid']

        user = self.request.user

        order = CartOrder.objects.get(buyer=user, oid=order_oid)
        return order


class WishListAPIView(generics.ListCreateAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = self.request.user
        wishlists = Wishlist.objects.filter(user=user)
        return wishlists
    
    def create(self, request, *args, **kwargs):
        payload = request.data

        product_id = payload['product_id']
        user = request.user

        product = Product.objects.get(id=product_id)

        wishlist = Wishlist.objects.filter(product=product, user=user)
        if wishlist:
            wishlist.delete()
            return Response({"message": "produit retiré de la liste de souhaits"}, status=status.HTTP_200_OK)
        else:
            Wishlist.objects.create(product=product, user=user)
            return Response({"message": "produit ajouté à la liste de souhaits"}, status=status.HTTP_201_CREATED)


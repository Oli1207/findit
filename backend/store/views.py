from django.shortcuts import render, redirect
from django.conf import settings
from userauths.models import *
from decimal import Decimal, ROUND_HALF_UP
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from rest_framework.decorators import api_view, permission_classes
from store.models import *
from store.serializers import *
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView
from django.db.models import Case, When, Value, BooleanField, FloatField, Subquery, OuterRef, F
from django.db.models.functions import Coalesce
from django.core.paginator import Paginator
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
import cv2
import numpy as np
import stripe
from rest_framework.parsers import MultiPartParser, FormParser
from concurrent.futures import ThreadPoolExecutor
from itertools import chain
import requests as http_requests
import hmac, hashlib, secrets, logging

logger = logging.getLogger(__name__)

from django.views.decorators.cache import never_cache
from pywebpush import webpush, WebPushException
import json
from rest_framework.pagination import PageNumberPagination
from django.views.decorators.cache import cache_page
from itertools import chain
from django.utils.decorators import method_decorator

def send_push_notification(user, title, body, url="/"):
    from .models import PushNotificationSubscription
    sub = PushNotificationSubscription.objects.filter(user=user).first()
    if not sub:
        return

    subscription_info = {
        "endpoint": sub.endpoint,
        "keys": {
            "p256dh": sub.keys_p256dh,
            "auth": sub.keys_auth,
        },
    }

    try:
        webpush(
            subscription_info,
            data=json.dumps({"title": title, "body": body, "url": url}),
            vapid_private_key="KRXTHGjfSv7r1gYfyvyGyu8IqqJTeeDlttY00TrBFbs",
            vapid_claims={"sub": "mailto:kangaholivier22@gmail.com"},
        )
    except WebPushException as ex:
        print("Web push failed: {}", repr(ex))


from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.authentication import JWTAuthentication


class SavePushSubscription(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        auth = request.headers.get("Authorization", None)
        if auth is None or not auth.startswith("Bearer "):
            return Response({"error": "Token manquant ou invalide"}, status=401)

        try:
            token_str = auth.split(" ")[1]
            validated_token = JWTAuthentication().get_validated_token(token_str)
            user = JWTAuthentication().get_user(validated_token)
        except Exception as e:
            return Response({"error": "Token invalide"}, status=401)

        subscription = request.data

        PushNotificationSubscription.objects.update_or_create(
            user=user,
            defaults={
                'endpoint': subscription['endpoint'],
                'keys_auth': subscription['keys']['auth'],
                'keys_p256dh': subscription['keys']['p256dh'],
            }
        )
        return Response({"status": "Subscription saved"})


@api_view(['GET'])
@permission_classes([AllowAny])
def products_from_followed_vendors(request, user_id):
    try:
        user = request.user
        # Récupérer les produits dont le vendeur est suivi par l'utilisateur
        products = Product.objects.filter(vendor__followers=user).order_by('-date')

        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response({'error': 'Utilisateur non trouvé.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def followed_vendors_unified_feed(request, user_id):
    """
    Feed unifié (produits + vidéos) des vendeurs suivis par l'utilisateur.
    Même format que UnifiedFeedAPIView : {results, page, has_more}
    """
    user = request.user
    if not user.is_authenticated:
        return Response({'results': [], 'page': 1, 'has_more': False})

    page     = max(1, int(request.query_params.get('page', 1)))
    p_offset = (page - 1) * FEED_PRODUCTS_PER_PAGE
    v_offset = (page - 1) * FEED_VIDEOS_PER_PAGE

    product_qs = (
        _base_product_qs()
        .filter(vendor__followers=user)
        .order_by('-date')
    )
    video_qs = (
        _base_video_qs()
        .filter(vendor__followers=user)
        .order_by('-likes_count')
    )

    total_products = product_qs.count()
    products_slice = list(product_qs[p_offset: p_offset + FEED_PRODUCTS_PER_PAGE])
    videos_slice   = list(video_qs[v_offset:  v_offset + FEED_VIDEOS_PER_PAGE])

    product_data = ProductFeedSerializer(
        products_slice, many=True, context={'request': request}
    ).data
    video_data = PresentationFeedSerializer(
        videos_slice, many=True, context={'request': request}
    ).data

    combined = interleave_feed(list(product_data), list(video_data))

    return Response({
        'results':  combined,
        'page':     page,
        'has_more': (p_offset + FEED_PRODUCTS_PER_PAGE) < total_products,
    })


class CategoryListAPIView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


class ProductListAPIView(generics.ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]


class FeedPagination(PageNumberPagination):
    page_size = 10  # Combien d'items par "swipe"


class PersonalizedProductFeed(ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    pagination_class = FeedPagination

    # PersonalizedProductFeed.get_queryset

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        try:
            user = self.request.user
        except User.DoesNotExist:
            return Product.objects.none()  # Retourner un queryset vide

        # 1. Récupérer les ID des vendeurs suivis (c'est bien)
        followed_vendor_ids = Vendor.objects.filter(followers=user).values_list("id", flat=True)

        # 2. OPTIMISATION : Récupérer les scores d'intérêt en une seule fois
        user_interests = CategoryInterest.objects.filter(user=user)
        
        # 3. Construire les clauses "When" pour le score
        interest_when_clauses = [
            When(category_id=interest.category_id, then=Value(interest.score))
            for interest in user_interests
        ]

        products = Product.objects.filter(stock_qty__gte=1).annotate(
            # Annotation "is_followed_vendor" (c'est bien)
            is_followed_vendor=Case(
                When(vendor_id__in=followed_vendor_ids, then=Value(1.0)),
                default=Value(0.0),
                output_field=FloatField()
            ),
            
            # 4. OPTIMISATION : Utiliser le Case...When
            interest_score=Coalesce(
                Case(
                    *interest_when_clauses,
                    default=Value(0.0),
                    output_field=FloatField()
                ),
                Value(0.0)
            ),
            
            # Le reste de vos annotations
            normalized_views=F('views') * 0.01,
            timestamp_score=F('date')
            
        ).order_by(
            '-is_followed_vendor',
            '-interest_score',
            '-normalized_views',
            '-timestamp_score'
        )

        # N'oubliez pas d'optimiser le serializer !
        return products.select_related("vendor", "category").prefetch_related("gallery")


# ─── Feed helpers ──────────────────────────────────────────────────────────────

FEED_PRODUCTS_PER_PAGE = 16   # 80 % des 20 items par page
FEED_VIDEOS_PER_PAGE   = 4    # 20 % — 1 vidéo toutes les 4 cartes produit


def interleave_feed(products_data, videos_data, ratio=4):
    """Insère 1 vidéo toutes les `ratio` cartes produit pour immerger les vidéos."""
    result = []
    video_iter = iter(videos_data)
    for i, item in enumerate(products_data):
        result.append(item)
        if (i + 1) % ratio == 0:
            try:
                result.append(next(video_iter))
            except StopIteration:
                pass
    result.extend(video_iter)
    return result


def _base_product_qs():
    """Queryset produit optimisé : 0 N+1, rating_count annoté."""
    return (
        Product.objects
        .filter(stock_qty__gte=1, status='disponible')
        .select_related('vendor', 'category')
        .prefetch_related('gallery_set', 'color_set', 'size_set', 'specification_set')
        .annotate(rating_count=models.Count('review', distinct=True))
    )


def _base_video_qs():
    """Queryset présentation optimisé : likes/comments annotés."""
    return (
        Presentation.objects
        .select_related('vendor')
        .annotate(
            likes_count=models.Count('likes', distinct=True),
            comments_count=models.Count('comments', distinct=True),
        )
    )


class PopularProductFeed(APIView):
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60 * 15))   # 15 min – same cache key per ?page=N
    def get(self, request, *args, **kwargs):
        page     = max(1, int(request.query_params.get('page', 1)))
        p_offset = (page - 1) * FEED_PRODUCTS_PER_PAGE
        v_offset = (page - 1) * FEED_VIDEOS_PER_PAGE

        product_qs = (
            _base_product_qs()
            .order_by('-views', '-rating', '-date')
        )
        video_qs = (
            _base_video_qs()
            .order_by('-likes_count')
        )

        total_products = product_qs.count()
        products_slice = list(product_qs[p_offset: p_offset + FEED_PRODUCTS_PER_PAGE])
        videos_slice   = list(video_qs[v_offset:  v_offset + FEED_VIDEOS_PER_PAGE])

        product_data = ProductFeedSerializer(
            products_slice, many=True, context={'request': request}
        ).data
        video_data = PresentationFeedSerializer(
            videos_slice, many=True, context={'request': request}
        ).data

        combined = interleave_feed(list(product_data), list(video_data))

        return Response({
            'results':  combined,
            'page':     page,
            'has_more': (p_offset + FEED_PRODUCTS_PER_PAGE) < total_products,
        })
    

class TrackProductView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, product_id):
        duration = float(request.data.get("duration", 0))
        product_id = request.data.get("product_id")

        if not product_id:
            return Response({"error": "Paramètres manquants"}, status=400)

        if duration < 15:
            return Response({"msg": "Ignore durée trop courte"})

        user = request.user

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"error": "Produit non trouvé"}, status=404)

        product.views = F("views") + 1
        product.save(update_fields=["views"])
        

        score_add = duration / 10.0

        interest, created = CategoryInterest.objects.get_or_create(
            user=user,
            category=product.category,
            defaults={"score": score_add}
        )
        if not created:
            interest.score = F("score") + score_add
            interest.save(update_fields=["score"])

        return Response({"msg": "Vu enregistré"})


class ProductDetailAPIView(generics.RetrieveAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        slug = self.kwargs['slug']
        return Product.objects.get(slug=slug)
    

class ImageSearchAPIView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file = request.FILES['image']
        image = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_GRAYSCALE)

        # Utilisation de SIFT pour extraire les caractéristiques
        sift = cv2.SIFT_create()
        keypoints, descriptors = sift.detectAndCompute(image, None)

        if descriptors is None:
            return Response({"message": "Aucune caractéristique détectée dans l'image."}, status=status.HTTP_400_BAD_REQUEST)

        bf = cv2.BFMatcher(cv2.NORM_L2, crossCheck=True)
        best_matches = []

        for product in Product.objects.exclude(orb_features__isnull=True):
            product_descriptors = np.frombuffer(product.orb_features, dtype=np.uint8).reshape(-1, 128)

            matches = bf.match(descriptors, product_descriptors)
            matches = sorted(matches, key=lambda x: x.distance)

            good_matches = [m for m in matches if m.distance < 200]

            best_matches.append((product, len(good_matches)))

        best_matches.sort(key=lambda x: x[1], reverse=True)
        best_products = [match[0] for match in best_matches if match[1] > 0]

        if not best_products:
            return Response([], status=status.HTTP_200_OK)

        serializer = ProductSerializer(best_products[:5], many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class PresentationListAPIView(generics.ListAPIView):
    queryset = Presentation.objects.all()
    serializer_class = PresentationSerializer
    permission_classes = [AllowAny]


from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError


class PresentationCreateAPIView(generics.CreateAPIView):
    queryset = Presentation.objects.all()
    serializer_class = PresentationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user

        # On récupère le vendor lié à l'utilisateur
        try:
            vendor = Vendor.objects.get(user=user)
        except Vendor.DoesNotExist:
            raise ValidationError("Vous devez avoir un compte vendeur pour créer une présentation.")

        serializer.save(vendor=vendor)


class UnifiedFeedAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        page     = max(1, int(request.query_params.get('page', 1)))
        p_offset = (page - 1) * FEED_PRODUCTS_PER_PAGE
        v_offset = (page - 1) * FEED_VIDEOS_PER_PAGE

        product_qs = _base_product_qs()
        video_qs   = _base_video_qs()

        # ── Personnalisation (vendeurs suivis + intérêts catégories) ──────────
        try:
            user = User.objects.get(id=user_id)
            followed_ids = list(
                Vendor.objects.filter(followers=user).values_list('id', flat=True)
            )
            interests    = CategoryInterest.objects.filter(user=user)
            when_clauses = [
                When(category_id=i.category_id, then=Value(i.score))
                for i in interests
            ]

            product_qs = product_qs.annotate(
                is_followed=Case(
                    When(vendor_id__in=followed_ids, then=Value(1.0)),
                    default=Value(0.0),
                    output_field=FloatField(),
                ),
                interest_score=Coalesce(
                    Case(*when_clauses, default=Value(0.0), output_field=FloatField()),
                    Value(0.0),
                ),
            ).order_by('-is_followed', '-interest_score', '-views', '-date')

        except (User.DoesNotExist, ValueError, TypeError):
            product_qs = product_qs.order_by('-views', '-date')

        video_qs = video_qs.order_by('-likes_count')

        # ── Slice paginé ──────────────────────────────────────────────────────
        total_products = product_qs.count()
        products_slice = list(product_qs[p_offset: p_offset + FEED_PRODUCTS_PER_PAGE])
        videos_slice   = list(video_qs[v_offset:  v_offset + FEED_VIDEOS_PER_PAGE])

        product_data = ProductFeedSerializer(
            products_slice, many=True, context={'request': request}
        ).data
        video_data = PresentationFeedSerializer(
            videos_slice, many=True, context={'request': request}
        ).data

        combined = interleave_feed(list(product_data), list(video_data))

        return Response({
            'results':  combined,
            'page':     page,
            'has_more': (p_offset + FEED_PRODUCTS_PER_PAGE) < total_products,
        })
    

class ProductSoldeAPIView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return (
            Product.objects
            .filter(solde=True)                        # en solde uniquement
            .order_by('-date')                         # 👈 tri du plus récent au plus ancien
            .select_related('vendor', 'category')      # 👈 optimisations
            .prefetch_related('gallery_set')
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def set_product_sale(request, pk):
    """
    Met un produit en solde :
    - old_price = ancien price
    - price = nouveau prix reçu
    - solde = True
    """
    product = get_object_or_404(Product, pk=pk)

    # Optionnel : s'assurer que l'utilisateur connecté est bien le vendeur du produit
    if not hasattr(product.vendor, "user") or product.vendor.user != request.user:
        return Response(
            {"detail": "Vous n'êtes pas autorisé à modifier ce produit."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        new_price = request.data.get("price")
        if new_price is None:
            return Response(
                {"detail": "Le champ 'price' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # On garde l'ancien prix
        product.old_price = product.price
        product.price = new_price
        product.solde = True
        product.save(update_fields=["price", "old_price", "solde"])

        serializer = ProductSerializer(product, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST
        )


class ProductsByCategoryAPIView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, category_id):
        try:
            category = Category.objects.get(id=category_id, active=True)
        except Category.DoesNotExist:
            return Response({"detail": "Catégorie non trouvée"}, status=status.HTTP_404_NOT_FOUND)
        
        products = Product.objects.filter(category=category, status="disponible")
        serializer = ProductSerializer(products, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class VendorContentAPIView(APIView):
    permission_classes = [AllowAny]  # Ou AllowAny si pas de login requis

    def get(self, request, vendor_id):
        try:
            # Récupérer le vendeur
            vendor = Vendor.objects.get(id=vendor_id)

            # Récupérer tous les produits et présentations du vendeur
            products = Product.objects.filter(vendor=vendor)
            presentations = Presentation.objects.filter(vendor=vendor)

            # Sérialiser les données
            products_serializer = ProductSerializer(products, many=True, context={'request': request})
            presentations_serializer = PresentationSerializer(presentations, many=True, context={'request': request})

            # Retourner tout dans une seule réponse
            return Response({
                "products": products_serializer.data,
                "presentations": presentations_serializer.data
            })

        except Vendor.DoesNotExist:
            return Response({"error": "Vendeur non trouvé"}, status=404)
            

class LikePresentationAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            pres = Presentation.objects.get(pk=pk)
            user = request.user

            if user in pres.likes.all():
                pres.likes.remove(user)
                liked = False
            else:
                pres.likes.add(user)
                liked = True
            return Response({"liked": liked, "likes_count": pres.likes.count()})
        except (Presentation.DoesNotExist, User.DoesNotExist):
            return Response(status=404)


class PresentationDetailAPIView(generics.RetrieveAPIView):
    """Détail d'une présentation — inclut les commentaires complets."""
    queryset = Presentation.objects.all()
    serializer_class = PresentationSerializer
    permission_classes = [AllowAny]


class CommentCreateAPIView(generics.CreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        presentation_id = self.request.data.get("presentation")
        user = self.request.user
        serializer.save(user=user, presentation_id=presentation_id)


class CouponAPIView(generics.CreateAPIView):
    serializer_class = CouponSerializer
    queryset = Coupon.objects.all()
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        payload = request.data

        order_oid = payload['order_oid']
        coupon_code = payload['coupon_code']

        order = CartOrder.objects.get(oid=order_oid)
        coupon = Coupon.objects.filter(code=coupon_code, active=True).first()

        if coupon:
            order_items = CartOrderItem.objects.filter(order=order, vendor=coupon.vendor)
            if order_items:
                for i in order_items:
                    if not coupon in i.coupon.all():
                        discount = i.total * coupon.discount / 100

                        i.total -= discount
                        i.sub_total -= discount
                        i.coupon.add(coupon)
                        i.saved += discount

                        order.total -= discount
                        order.sub_total -= discount
                        order.saved += discount

                        i.save()
                        order.save()

                        return Response({"message": "Coupon Activated", "icon": "success"}, status=status.HTTP_200_OK)
                    else:
                        return Response({"message": "Coupon Already Activated", "icon": "warning"}, status=status.HTTP_200_OK)
            else:
                return Response({"message": "Order Item Does Not Exist", "icon": "error"}, status=status.HTTP_200_OK)
        else:
            return Response({"message": "Coupon Does Not Exist", "icon": "error"}, status=status.HTTP_200_OK)


class ReviewListAPIView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        product_id = self.kwargs.get('product_id')
        try:
            product = Product.objects.get(id=product_id)
            return Review.objects.filter(product=product)
        except Product.DoesNotExist:
            return Review.objects.none()

    def create(self, request, *args, **kwargs):
        data = request.data

        # Vérifie la présence de tous les champs requis
        required_fields = ['product_id', 'rating', 'review']
        missing_fields = [field for field in required_fields if not data.get(field)]

        if missing_fields:
            return Response(
                {"error": f"Champs manquants : {', '.join(missing_fields)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        try:
            product = Product.objects.get(id=data['product_id'])
        except Product.DoesNotExist:
            return Response(
                {"error": "Produit introuvable"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Vérifie que la note est un nombre entier entre 1 et 5
        try:
            rating = int(data['rating'])
            if rating < 1 or rating > 5:
                return Response(
                    {"error": "La note doit être comprise entre 1 et 5"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {"error": "La note doit être un entier"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifie que le commentaire n’est pas vide ou trop court
        review_text = data['review'].strip()
        if len(review_text) < 3:
            return Response(
                {"error": "Le commentaire est trop court"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Création de l’avis
        Review.objects.create(
            user=user,
            product=product,
            rating=rating,
            review=review_text
        )

        return Response(
            {"message": "Avis créé avec succès"},
            status=status.HTTP_201_CREATED
        )
        

@api_view(['GET'])
def search_by_text(request):
    query = request.GET.get('query', '')
    products = Product.objects.filter(title__icontains=query)
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def search_by_image(request):
    if 'image' not in request.FILES:
        return Response({'error': 'Missing image'}, status=400)

    uploaded_image = request.FILES['image']
    img_query = cv2.imdecode(np.frombuffer(uploaded_image.read(), np.uint8), cv2.IMREAD_GRAYSCALE)

    orb = cv2.ORB_create()
    kp1, des1 = orb.detectAndCompute(img_query, None)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    similar_products = []

    with ThreadPoolExecutor() as executor:
        futures = []
        for product in Product.objects.all():
            futures.append(executor.submit(process_product, product, orb, bf, des1))
        for future in futures:
            result = future.result()
            if result:
                similar_products.append(result)

    serializer = ProductSerializer(similar_products, many=True)
    return Response(serializer.data)


def process_product(product, orb, bf, des1):
    img_db = cv2.imread(product.image.path, cv2.IMREAD_GRAYSCALE)
    kp2, des2 = orb.detectAndCompute(img_db, None)
    matches = bf.match(des1, des2)
    matches = sorted(matches, key=lambda x: x.distance)
    similarity_threshold = 50
    good_matches = [match for match in matches if match.distance < similarity_threshold]
    
    if len(good_matches) > 10:
        return product
    return None


class FeedPaginationN(PageNumberPagination):
    page_size = 5                          # ✅ 5 items par page
    page_size_query_param = "page_size"    # optionnel: ?page_size=...
    max_page_size = 50


class SearchProductAPIView(APIView):
    """
    Recherche unifiée : produits + présentations vidéo.

    Params GET :
      query       – texte recherché dans title / description
      type        – "all" (défaut) | "products" | "videos"
      category_id – filtre par catégorie (int)
      page        – numéro de page (défaut 1)
      page_size   – taille de page (défaut 20, max 60)
    """
    permission_classes = [AllowAny]

    PAGE_SIZE_DEFAULT = 20
    PAGE_SIZE_MAX     = 60

    def get(self, request):
        query       = request.GET.get("query", "").strip()
        content_type = request.GET.get("type", "all")          # all | products | videos
        category_id = request.GET.get("category_id")
        page        = max(int(request.GET.get("page", 1)), 1)
        page_size   = min(int(request.GET.get("page_size", self.PAGE_SIZE_DEFAULT)), self.PAGE_SIZE_MAX)

        items = []

        # ── Produits ──────────────────────────────────────────────────
        if content_type in ("all", "products"):
            qs = Product.objects.select_related("vendor", "vendor__user", "category")
            if query:
                qs = qs.filter(
                    models.Q(title__icontains=query) |
                    models.Q(description__icontains=query)
                )
            if category_id:
                qs = qs.filter(category_id=category_id)

            for p in qs:
                gallery = [
                    request.build_absolute_uri(g.image.url) if g.image else None
                    for g in p.gallery_set.all()
                ]
                items.append({
                    "id":          p.pk,
                    "type":        "product",
                    "title":       p.title,
                    "description": p.description,
                    "image":       request.build_absolute_uri(p.image.url) if p.image else None,
                    "gallery":     [u for u in gallery if u],
                    "price":       str(p.price),
                    "old_price":   str(p.old_price),
                    "slug":        p.slug,
                    "solde":       getattr(p, "solde", False),
                    "rating":      float(p.rating) if p.rating else 0,
                    "rating_count": p.review_set.count() if hasattr(p, "review_set") else 0,
                    "category": {"id": p.category.pk, "title": p.category.title} if p.category else None,
                    "vendor": {
                        "id":    p.vendor.pk,
                        "name":  p.vendor.name,
                        "slug":  p.vendor.slug,
                        "image": request.build_absolute_uri(p.vendor.image.url) if p.vendor and p.vendor.image else None,
                        "user":  p.vendor.user_id,
                    } if p.vendor else None,
                    "size":  [{"name": s.name} for s in p.size_set.all()],
                    "color": [{"color_code": c.color_code, "name": c.name} for c in p.color_set.all()],
                })

        # ── Vidéos (présentations) ────────────────────────────────────
        if content_type in ("all", "videos"):
            qs = Presentation.objects.select_related("vendor", "vendor__user", "category")
            if query:
                qs = qs.filter(
                    models.Q(title__icontains=query) |
                    models.Q(description__icontains=query)
                )
            if category_id:
                qs = qs.filter(category_id=category_id)

            for pres in qs:
                items.append({
                    "id":            pres.pk,
                    "type":          "presentation",
                    "title":         pres.title or "",
                    "description":   pres.description or "",
                    "video":         request.build_absolute_uri(pres.video.url) if pres.video else None,
                    "link":          pres.link,
                    "likes_count":   pres.likes.count(),
                    "comments_count": pres.comments.count(),
                    "category": {"id": pres.category.pk, "title": pres.category.title} if pres.category else None,
                    "vendor": {
                        "id":    pres.vendor.pk,
                        "name":  pres.vendor.name,
                        "slug":  pres.vendor.slug,
                        "image": request.build_absolute_uri(pres.vendor.image.url) if pres.vendor and pres.vendor.image else None,
                        "user":  pres.vendor.user_id,
                    } if pres.vendor else None,
                })

        # ── Pagination manuelle ───────────────────────────────────────
        total  = len(items)
        start  = (page - 1) * page_size
        end    = start + page_size
        page_items = items[start:end]

        return Response({
            "count":    total,
            "page":     page,
            "has_more": end < total,
            "next":     f"?page={page + 1}" if end < total else None,
            "results":  page_items,
        })


class VendorReviewView(generics.ListAPIView):
    """
    GET  /vendor-reviews/<vendor_id>/  → liste des avis (public)
    POST /vendor-reviews/<vendor_id>/  → créer / mettre à jour son avis (auth)
    """
    serializer_class = VendorReviewSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        return (
            VendorReview.objects
            .filter(vendor_id=self.kwargs["vendor_id"])
            .select_related("user__profile")
        )

    def post(self, request, vendor_id):
        vendor = get_object_or_404(Vendor, id=vendor_id)

        # Le vendeur ne peut pas se noter lui-même
        if vendor.user_id == request.user.pk:
            return Response(
                {"message": "Vous ne pouvez pas noter votre propre boutique."},
                status=400,
            )

        try:
            rating = int(request.data.get("rating", 0))
            if rating not in range(1, 6):
                raise ValueError
        except (TypeError, ValueError):
            return Response({"message": "La note doit être un entier entre 1 et 5."}, status=400)

        comment = (request.data.get("comment") or "").strip()

        review, created = VendorReview.objects.update_or_create(
            user=request.user,
            vendor=vendor,
            defaults={"rating": rating, "comment": comment},
        )
        serializer = VendorReviewSerializer(review, context={"request": request})
        return Response(serializer.data, status=201 if created else 200)


class UserAddressAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = Profile.objects.get(user=request.user)
        return Response(
            {
                "full_name": profile.full_name,
                "mobile": profile.mobile,
                "address": profile.address,
                "city": profile.city,
                "state": profile.state,
                "country": profile.country,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        payload = request.data
        profile = Profile.objects.get(user=request.user)

        profile.full_name = payload.get("full_name", profile.full_name)
        profile.mobile = payload.get("mobile", profile.mobile)
        profile.address = payload.get("address", profile.address)
        profile.city = payload.get("city", profile.city)
        profile.state = payload.get("state", profile.state)
        profile.country = payload.get("country", profile.country)
        profile.save()

        return Response({"message": "Adresse mise à jour avec succès"}, status=status.HTTP_200_OK)


class CreateOrderAPIView(APIView):
    """
    API endpoint to handle individual product orders.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data
        print(data)
        # Extract required fields
        product_id = data.get("product_id")
        qty = int(data.get("qty", 1))
        size = data.get("size", "No Size")
        color = data.get("color", "No Color")
        price = float(data.get("price"))
        full_name = data.get("full_name")
        mobile = data.get("mobile")
        address = data.get("address")
        city = data.get("city")
        state = data.get("state")
        country = data.get("country")

        # Validate required fields
        if not all([product_id, full_name, mobile, address, city]):
            return Response(
                {"message": "Veuillez entrer les informations demandées"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fetch user and product
        user = request.user
        product = get_object_or_404(Product, id=product_id)

        # Calculate total price
        total_price = price * qty

        # Create the order
        try:
            order = CartOrder.objects.create(
                buyer=user,
                product=product,
                vendor=product.vendor,
                qty=qty,
                size=size,
                color=color,
                price=total_price,
                full_name=full_name,
                mobile=mobile,
                address=address,
                city=city,
                state=state,
                country=country,
            )
            
            send_push_notification(
                user=product.vendor.user,
                title="Nouvelle commande reçue",
                body=f"La commande {order.oid} vient d’être passée.",
                url=f"/vendor/orders/{order.oid}/"
            )

            return Response(
                {"message": "Order created successfully.", "order_id": order.oid},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response(
                {"message": "Failed to create order.", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ═══════════════════════════════════════════════════════════════════════════════
#  SYSTÈME ESCROW — PAYSTACK
# ═══════════════════════════════════════════════════════════════════════════════

from store.paystack_helpers import (
    PaystackError,
    initialize_transaction,
    verify_transaction,
    to_paystack_amount,
)

_FEE = Decimal(str(settings.PLATFORM_FEE_PERCENT)) / Decimal("100")  # 0.05


def _generate_validation_code() -> str:
    """Code 6 caractères, sans caractères ambigus (0/O, 1/I/l)."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))


def _send_order_email(order, subject: str, message_html: str) -> None:
    """Envoi d'un e-mail à l'acheteur. Silencieux en cas d'échec."""
    try:
        buyer_email = order.buyer.email if order.buyer else None
        if not buyer_email:
            return
        msg = EmailMultiAlternatives(
            subject=subject,
            body=message_html,
            from_email=settings.FROM_EMAIL,
            to=[buyer_email],
        )
        msg.attach_alternative(message_html, "text/html")
        msg.send(fail_silently=True)
    except Exception:
        pass


class InitiatePaystackPaymentView(APIView):
    """
    Étape 1 — Le client soumet sa commande.
    Crée le CartOrder en séquestre et initialise la transaction Paystack.
    → { authorization_url, reference, order_oid }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data       = request.data
        product_id = data.get("product_id")
        qty        = int(data.get("qty", 1))
        price_unit = data.get("price")
        vendor_id  = data.get("vendor")
        full_name  = data.get("full_name", "")
        mobile     = data.get("mobile", "")
        address    = data.get("address", "")
        city       = data.get("city", "")
        state      = data.get("state", "")
        country    = data.get("country", "")
        size       = data.get("size", "No Size")
        color      = data.get("color", "No Color")

        if not all([product_id, price_unit, vendor_id, mobile, address, city]):
            return Response(
                {"message": "Champs obligatoires manquants (produit, prix, vendeur, contact, adresse)."},
                status=400,
            )

        product = get_object_or_404(Product, id=product_id)
        vendor  = get_object_or_404(Vendor,  id=vendor_id)

        # ── Calcul du montant ──────────────────────────────────────────────────
        total        = (Decimal(str(price_unit)) * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        platform_fee = (total * _FEE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        vendor_amt   = (total - platform_fee).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        code         = _generate_validation_code()

        # ── Création de la commande (pending_payment) ──────────────────────────
        order = CartOrder.objects.create(
            buyer           = request.user,
            product         = product,
            vendor          = vendor,
            qty             = qty,
            size            = size,
            color           = color,
            price           = total,
            full_name       = full_name,
            mobile          = mobile,
            address         = address,
            city            = city,
            state           = state,
            country         = country,
            escrow_status   = "pending_payment",
            validation_code = code,
            platform_fee    = platform_fee,
            vendor_amount   = vendor_amt,
        )

        # ── Initialisation Paystack ────────────────────────────────────────────
        try:
            amount_minor = to_paystack_amount(total, settings.PAYSTACK_CURRENCY)
            result = initialize_transaction(
                email        = request.user.email,
                amount       = amount_minor,
                currency     = settings.PAYSTACK_CURRENCY,
                reference    = order.oid,
                callback_url = f"https://findit.deals/payment/verify/",
                metadata     = {
                    "order_oid": order.oid,
                    "product"  : product.title,
                    "custom_fields": [
                        {"display_name": "Commande", "variable_name": "order_oid", "value": order.oid},
                        {"display_name": "Produit",  "variable_name": "product",   "value": product.title},
                    ],
                },
            )
        except PaystackError as exc:
            logger.error("InitiatePaystack – PaystackError : %s", exc)
            order.delete()
            return Response({"message": str(exc)}, status=502)
        except Exception as exc:
            logger.exception("InitiatePaystack – erreur inattendue")
            order.delete()
            return Response({"message": f"Erreur interne : {exc}"}, status=500)

        tx_data = result.get("data", {})
        order.paystack_ref = tx_data.get("reference", order.oid)
        order.save(update_fields=["paystack_ref"])

        return Response({
            "authorization_url": tx_data["authorization_url"],
            "reference"        : tx_data.get("reference", order.oid),
            "order_oid"        : order.oid,
        }, status=201)


class VerifyPaystackPaymentView(APIView):
    """
    Étape 2 — Appelée par le frontend après le retour de Paystack.
    Vérifie la transaction et passe le statut à paid_holding.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        reference = request.query_params.get("reference") or request.query_params.get("trxref")
        if not reference:
            return Response({"message": "Référence manquante."}, status=400)

        # ── Vérification côté Paystack ─────────────────────────────────────────
        try:
            result = verify_transaction(reference)
        except PaystackError as exc:
            logger.error("VerifyPaystack – PaystackError : %s", exc)
            return Response({"message": str(exc)}, status=502)

        tx = result.get("data", {})
        if tx.get("status") != "success":
            return Response({
                "message"        : "Paiement non confirmé par Paystack.",
                "paystack_status": tx.get("status"),
            }, status=400)

        # ── Récupération de la commande ────────────────────────────────────────
        try:
            order = CartOrder.objects.select_related("buyer", "vendor__user", "product").get(oid=reference)
        except CartOrder.DoesNotExist:
            return Response({"message": "Commande introuvable."}, status=404)

        # Idempotence — déjà traité ?
        if order.escrow_status != "pending_payment":
            return Response({
                "message"       : "Déjà traité.",
                "order_oid"     : order.oid,
                "escrow_status" : order.escrow_status,
            })

        order.escrow_status  = "paid_holding"
        order.payment_status = "complete"
        order.save(update_fields=["escrow_status", "payment_status"])

        # ── Notification vendeur ───────────────────────────────────────────────
        try:
            send_push_notification(
                user  = order.vendor.user,
                title = "💰 Nouvelle commande payée",
                body  = f"#{order.oid} – {order.product.title}. Préparez la livraison.",
                url   = "/profile/",
            )
        except Exception:
            pass

        # ── E-mail acheteur avec code de validation ────────────────────────────
        _send_order_email(
            order,
            subject      = f"✅ Paiement confirmé – Commande #{order.oid}",
            message_html = f"""
            <h2>Paiement reçu !</h2>
            <p>Votre commande <strong>#{order.oid}</strong>
               ({order.product.title}) est confirmée.</p>
            <p>Le vendeur va préparer votre article.</p>
            <hr>
            <p><strong>Conservez précieusement votre code de validation :</strong></p>
            <h1 style="letter-spacing:6px;color:#000;font-family:monospace">
              {order.validation_code}
            </h1>
            <p>Entrez ce code dans l'application <em>uniquement</em>
               lorsque vous avez reçu et vérifié votre article.</p>
            """,
        )

        return Response({
            "message"       : "Paiement confirmé. Votre code de validation vous a été envoyé par e-mail.",
            "order_oid"     : order.oid,
            "escrow_status" : order.escrow_status,
        })


class PaystackWebhookView(APIView):
    """
    Webhook Paystack — notification serveur-à-serveur.
    URL à configurer dans le dashboard Paystack :
    https://dashboard.paystack.com/#/settings/developer
    → https://backend.findit.deals/api/v1/paystack-webhook/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # ── Vérification de la signature HMAC-SHA512 ───────────────────────────
        sig      = request.headers.get("x-paystack-signature", "")
        secret   = getattr(settings, "PAYSTACK_SECRET_KEY", "") or ""
        expected = hmac.new(
            secret.encode(),
            request.body,
            hashlib.sha512,
        ).hexdigest()

        if not hmac.compare_digest(expected, sig):
            logger.warning("Paystack webhook : signature invalide (possible fausse requête)")
            return Response({"message": "Signature invalide."}, status=400)

        event = request.data.get("event")
        data  = request.data.get("data", {})

        if event == "charge.success":
            reference = data.get("reference")
            if reference:
                try:
                    order = CartOrder.objects.get(oid=reference)
                    if order.escrow_status == "pending_payment":
                        order.escrow_status  = "paid_holding"
                        order.payment_status = "complete"
                        order.save(update_fields=["escrow_status", "payment_status"])
                        logger.info("Webhook charge.success → commande %s → paid_holding", reference)
                except CartOrder.DoesNotExist:
                    logger.warning("Webhook charge.success : commande %s introuvable", reference)

        return Response({"message": "ok"})


class MarkAsShippedView(APIView):
    """
    Le vendeur marque la commande comme expédiée.
    Le client reçoit une notification l'invitant à valider à réception.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, order_oid):
        try:
            order = CartOrder.objects.select_related("buyer", "product").get(
                oid=order_oid, vendor__user=request.user
            )
        except CartOrder.DoesNotExist:
            return Response({"message": "Commande introuvable."}, status=404)

        if order.escrow_status != "paid_holding":
            return Response({"message": f"Statut actuel '{order.escrow_status}' ne permet pas cette action."}, status=400)

        order.escrow_status = "shipped"
        order.save(update_fields=["escrow_status"])

        # Notification + e-mail acheteur
        try:
            send_push_notification(
                user  = order.buyer,
                title = "📦 Commande expédiée !",
                body  = f"#{order.oid} est en route. Entrez votre code dès réception.",
                url   = "/profile/",
            )
        except Exception:
            pass

        _send_order_email(
            order,
            subject      = f"📦 Votre commande #{order.oid} est en route",
            message_html = f"""
            <h2>Votre commande est expédiée !</h2>
            <p><strong>#{order.oid}</strong> – {order.product.title}</p>
            <p>À réception, vérifiez l'article puis entrez votre code dans l'application :</p>
            <h1 style="letter-spacing:6px;color:#000;font-family:monospace">{order.validation_code}</h1>
            <p>Cela confirmera la livraison et libérera le paiement au vendeur.</p>
            """,
        )

        return Response({"message": "Commande marquée comme expédiée.", "escrow_status": "shipped"})


class ValidateDeliveryView(APIView):
    """
    Le client entre son code de validation pour confirmer la réception.
    Déclenche le signal "paiement à reverser" côté admin.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_oid = request.data.get("order_oid", "").strip()
        code      = request.data.get("validation_code", "").strip().upper()

        if not order_oid or not code:
            return Response({"message": "order_oid et validation_code sont requis."}, status=400)

        try:
            order = CartOrder.objects.select_related("vendor__user", "product").get(
                oid=order_oid, buyer=request.user
            )
        except CartOrder.DoesNotExist:
            return Response({"message": "Commande introuvable."}, status=404)

        if order.escrow_status not in ("paid_holding", "shipped"):
            return Response(
                {"message": f"La commande est au statut '{order.escrow_status}' — validation impossible."},
                status=400,
            )

        if order.validation_code != code:
            return Response({"message": "Code de validation incorrect. Vérifiez et réessayez."}, status=400)

        order.escrow_status = "validated"
        order.save(update_fields=["escrow_status"])

        # Notifier le vendeur
        try:
            send_push_notification(
                user  = order.vendor.user,
                title = "✅ Réception validée !",
                body  = f"#{order.oid} – le client a confirmé la réception. Le paiement de {order.vendor_amount} sera reversé sous 24–48 h.",
                url   = "/profile/",
            )
        except Exception:
            pass

        return Response({
            "message"       : "Réception confirmée ! Le paiement sera reversé au vendeur.",
            "escrow_status" : "validated",
            "vendor_amount" : str(order.vendor_amount),
            "platform_fee"  : str(order.platform_fee),
        })

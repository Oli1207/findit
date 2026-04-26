from rest_framework import serializers

from store.models import *
from vendor.models import *
from userauths.serializers import ProfileSerializer, UserSerializer

class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = '__all__'


class GallerySerializer(serializers.ModelSerializer):
    class Meta:
        model = Gallery
        fields = '__all__'


class SpecificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specification
        fields = '__all__'


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = '__all__'


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = '__all__'


class VendorSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = '__all__'

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        for name, field in fields.items():
            if name == 'followers_count':
                continue  # SerializerMethodField — depth n'a pas de sens
            try:
                if request and request.method == "POST":
                    field.depth = 0
                else:
                    field.depth = 3
            except AttributeError:
                pass
        return fields



class ProductSerializer(serializers.ModelSerializer):
    gallery = GallerySerializer(source="gallery_set", many=True, read_only=True)
    color = ColorSerializer(many=True, read_only=True)
    specification = SpecificationSerializer(many=True, read_only=True)
    size = SizeSerializer(many=True, read_only=True)
    vendor = VendorSerializer(read_only=True)
    url = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    

    class Meta:
        model = Product
        fields =  [
                    'id',
                    'title',
                    'image',
                   'description',
                   'category',
                   'price',
                   'old_price',
                   'shipping_amount',
                   'stock_qty',
                   'in_stock',
                   'status',
                   'featured',
                   'views',
                   'rating',
                   'vendor',
                   'gallery',
                   'color',
                   'specification',
                   'size',
                   'product_rating',
                   'rating_count',
                   'orders',
                   'pid',
                   'slug',
                   'date',
                   'type',
                   'url',
                   'solde', 
                   
                   ]

    def get_type(self, obj):
        return "product"
    def get_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(obj.get_absolute_url())
    
    
    def get_fields(self):
            fields = super().get_fields()
            request = self.context.get("request")
            if request and request.method == "POST":
                for field in fields.values():
                    field.depth = 0
            else:
                for field in fields.values():
                    field.depth = 3
            return fields


class CartSerializer(serializers.ModelSerializer):

    class Meta:
        model = Cart
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(CartSerializer, self).__init__(*args, **kwargs)

        request = self.context.get("request")
        if request and request.method == "POST":
            self.Meta.depth = 0

        else:
            self.Meta.depth = 3



class CartOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartOrderItem
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(CartOrderItemSerializer, self).__init__(*args, **kwargs)

        request = self.context.get("request")
        if request and request.method == "POST":
            self.Meta.depth = 0

        else:
            self.Meta.depth = 3



class CartOrderSerializer(serializers.ModelSerializer):

    class Meta:
        model = CartOrder
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(CartOrderSerializer, self).__init__(*args, **kwargs)

        request = self.context.get("request")
        if request and request.method == "POST":
            self.Meta.depth = 0

        else:
            self.Meta.depth = 3


class ProductFaqSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductFaq
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(ProductFaqSerializer, self).__init__(*args, **kwargs)

        request = self.context.get("request")
        if request and request.method == "POST":
            self.Meta.depth = 0

        else:
            self.Meta.depth = 3



class ReviewSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer()
    class Meta:
        model = Review
        fields = ['id', 'review', 'rating', 'user', 'profile', 'date']

    def __init__(self, *args, **kwargs):
        super(ReviewSerializer, self).__init__(*args, **kwargs)

        request = self.context.get("request")
        if request and request.method == "POST":
            self.Meta.depth = 0

        else:
            self.Meta.depth = 3


class WishlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wishlist
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(WishlistSerializer, self).__init__(*args, **kwargs)

        request = self.context.get("request")
        if request and request.method == "POST":
            self.Meta.depth = 0

        else:
            self.Meta.depth = 3


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(CouponSerializer, self).__init__(*args, **kwargs)

        request = self.context.get("request")
        if request and request.method == "POST":
            self.Meta.depth = 0

        else:
            self.Meta.depth = 3


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(NotificationSerializer, self).__init__(*args, **kwargs)

        request = self.context.get("request")
        if request and request.method == "POST":
            self.Meta.depth = 0

        else:
            self.Meta.depth = 3

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    display_name = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'user', 'content', 'created_at', 'replies', 'parent', 'display_name']

    def get_display_name(self, obj):
        presentation_vendor = obj.presentation.vendor
        # Si le commentaire est du vendeur de la vidéo
        if hasattr(obj.user, 'vendor') and obj.user.vendor == presentation_vendor:
            return obj.user.vendor.name
        return obj.user.full_name
    
    def get_replies(self, obj):
        return CommentSerializer(obj.replies.all(), many=True).data


class PresentationSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Presentation
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(PresentationSerializer, self).__init__(*args, **kwargs)

        request = self.context.get("request")
        if request and request.method == "POST":
            self.Meta.depth = 0

        else:
            self.Meta.depth = 3

    def get_likes_count(self, obj):
        return obj.likes.count()


    def get_comments_count(self, obj):
        return Comment.objects.filter(presentation=obj).count()


# ─────────────────────────────────────────────────────────────────────────────
# FEED SERIALIZERS  –  légers, optimisés pour le flux principal
# Minimisent les queries grâce à select_related / prefetch_related côté view
# ─────────────────────────────────────────────────────────────────────────────

class CategoryFeedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'title', 'slug']


class VendorFeedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'name', 'image', 'slug', 'user']


class ProductFeedSerializer(serializers.ModelSerializer):
    """Serializer produit allégé pour le feed – toutes les relations pré-chargées."""
    vendor        = VendorFeedSerializer(read_only=True)
    category      = CategoryFeedSerializer(read_only=True)
    gallery       = serializers.SerializerMethodField()
    color         = ColorSerializer(source="color_set",         many=True, read_only=True)
    specification = SpecificationSerializer(source="specification_set", many=True, read_only=True)
    size          = SizeSerializer(source="size_set",           many=True, read_only=True)
    type          = serializers.SerializerMethodField()
    rating_count  = serializers.IntegerField(read_only=True)   # valeur injectée par annotation ORM

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'image', 'description', 'category',
            'price', 'old_price', 'shipping_amount', 'stock_qty',
            'in_stock', 'status', 'rating', 'vendor', 'gallery',
            'color', 'specification', 'size',
            'rating_count', 'pid', 'slug', 'type', 'solde',
        ]

    def get_gallery(self, obj):
        request = self.context.get('request')
        return [
            request.build_absolute_uri(g.image.url) if request else g.image.url
            for g in obj.gallery_set.all()
            if g.image
        ]

    def get_type(self, obj):
        return "product"


class VendorReviewSerializer(serializers.ModelSerializer):
    """Avis vendeur — lecture enrichie, écriture minimale."""
    user_name  = serializers.SerializerMethodField()
    user_image = serializers.SerializerMethodField()

    class Meta:
        model  = VendorReview
        fields = ["id", "user", "user_name", "user_image", "rating", "comment", "date"]
        read_only_fields = ["id", "user", "date"]

    def get_user_name(self, obj):
        u = obj.user
        return getattr(u, "full_name", None) or getattr(u, "username", None) or u.email or "Utilisateur"

    def get_user_image(self, obj):
        try:
            profile = obj.user.profile
            if profile.image:
                request = self.context.get("request")
                return request.build_absolute_uri(profile.image.url) if request else str(profile.image.url)
        except Exception:
            pass
        return None


class PresentationFeedSerializer(serializers.ModelSerializer):
    """Serializer présentation allégé pour le feed – likes/comments via annotation."""
    vendor         = VendorFeedSerializer(read_only=True)
    type           = serializers.SerializerMethodField()
    likes_count    = serializers.IntegerField(read_only=True)   # via annotation
    comments_count = serializers.IntegerField(read_only=True)   # via annotation

    class Meta:
        model = Presentation
        fields = ['id', 'title', 'description', 'video', 'vendor', 'link',
                  'type', 'likes_count', 'comments_count']

    def get_type(self, obj):
        return "presentation"

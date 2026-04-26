from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.text import slugify
from shortuuid.django_fields import ShortUUIDField
from userauths.models import User, Profile
from vendor.models import Vendor
import cv2
import numpy as np
from django.urls import reverse
from django.utils import timezone
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError

class Category(models.Model):
    title = models.CharField(max_length=100)
    image = models.FileField(upload_to="category", default="category.jpg", blank=True, null=True)
    active = models.BooleanField(default=True)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['-title']

class Product(models.Model):
    STATUS = (
        ("rupture", "Rupture"),
        ("en_attente", "En Attente"),
        ("disponible", "Disponible"),
    )
    title = models.CharField(max_length=100)
    image = models.FileField(upload_to="category", default="category.jpg", blank=True, null=True)
    description = models.TextField(null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(decimal_places=2, max_digits=12, default=0.00)
    old_price = models.DecimalField(decimal_places=2, max_digits=12, default=0.00)
    shipping_amount = models.DecimalField(decimal_places=2, max_digits=12, default=0.00)
    stock_qty = models.PositiveIntegerField(default=1)
    in_stock = models.BooleanField(default=True)
    status = models.CharField(max_length=100, choices=STATUS, default="disponible")
    featured = models.BooleanField(default=False)
    views = models.PositiveIntegerField(default=0)
    rating = models.PositiveIntegerField(default=0, null=True, blank=True)
    solde = models.BooleanField(default=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, blank=True, null=True)

    pid = ShortUUIDField(unique=True, length=10, prefix="findit", alphabet="abcdefghijklmnopqrstuvwxyz")
    slug = models.SlugField(null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)
    orb_features = models.BinaryField(blank=True, null=True)  # Store ORB features
    

    
    def save(self, *args, **kwargs):
        # Generate slug if it doesn't exist
        if not self.slug:
            self.slug = slugify(self.title)

       
        super(Product, self).save(*args, **kwargs)


        # Update the rating after saving
        self.rating = self.product_rating()
        super(Product, self).save(update_fields=['rating'])

    def __str__(self):
        return self.title

    def product_rating(self):
        product_rating = Review.objects.filter(product=self).aggregate(avg_rating=models.Avg("rating"))
        return product_rating['avg_rating']

    def rating_count(self):
        rating_count = Review.objects.filter(product=self).count()
        return rating_count

    def is_available(self):
        return self.stock_qty > 0

    def gallery(self):
        return Gallery.objects.filter(product=self)

    def specification(self):
        return Specification.objects.filter(product=self)

    def size(self):
        return Size.objects.filter(product=self)

    def color(self):
        return Color.objects.filter(product=self)
    
    def get_absolute_url(self):
        return reverse("product_detail", kwargs={"slug": self.slug})
    
    def orders(self):
        return  CartOrder.objects.filter(product=self).count()



class CategoryInterest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    score = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('user', 'category')

class Gallery(models.Model):
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    image = models.FileField(upload_to="products", default="products.jpg",  null=True, blank=True)
    active = models.BooleanField(default=True)
    gid = ShortUUIDField(unique=True, alphabet="abcdefghijklmnopqrstuvwxyz", prefix="finditgallery")

    def __str__(self):
        return self.product.title

    class Meta:
        verbose_name_plural = "Galleries"

class Specification(models.Model):
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=1000,  null=True, blank=True)
    content = models.CharField(max_length=1000,  null=True, blank=True)

    def __str__(self):
        return self.title

class Size(models.Model):
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=1000, null=True, blank=True)
    price = models.DecimalField(decimal_places=2, max_digits=12, default=0.00,  null=True, blank=True)

    def __str__(self):
        return self.name

class Color(models.Model):
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=1000, null=True, blank=True)
    color_code = models.CharField(max_length=1000,  null=True, blank=True)

    def __str__(self):
        return self.name

class Cart(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    qty = models.PositiveIntegerField(default=0)
    price = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    sub_total = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    shipping_amount = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    service_fee = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    tax_fee = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    total = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    country = models.CharField(max_length=100, null=True, blank=True)
    size = models.CharField(max_length=100, null=True, blank=True)
    color = models.CharField(max_length=100, null=True, blank=True)
    cart_id = models.CharField(max_length=1000, null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.cart_id} - {self.product.title}"

class CartOrder(models.Model):
    PAYMENT_STATUS = (
        ("en_attente", "En Attente"),
        ("complete", "Complete"),
        ("annule", "Annule"),
    )
    ORDER_STATUS = (
        ("en_attente", "En Attente"),
        ("complete", "Complete"),
        ("annule", "Annule"),
    )
    ESCROW_STATUS = (
        ("pending_payment", "En attente de paiement"),
        ("paid_holding",    "Payé – Fonds en séquestre"),
        ("shipped",         "Expédié par le vendeur"),
        ("validated",       "Réception validée par le client"),
        ("released",        "Fonds reversés au vendeur"),
        ("disputed",        "Litige ouvert"),
        ("refunded",        "Remboursé"),
    )

    buyer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, null=True, blank=True)
    qty = models.PositiveIntegerField(default=1)
    size = models.CharField(max_length=100, null=True, blank=True)
    color = models.CharField(max_length=100, null=True, blank=True)
    price = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)

    # Adresse
    full_name = models.CharField(max_length=100, null=True, blank=True)
    mobile = models.CharField(max_length=100, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)

    # Statut classique
    payment_status = models.CharField(choices=PAYMENT_STATUS, max_length=100, default="en_attente")
    order_status   = models.CharField(choices=ORDER_STATUS,   max_length=100, default="en_attente")
    oid  = ShortUUIDField(unique=True, length=10, alphabet="abcdefghijklmnopqrstuvwxyz")
    date = models.DateTimeField(auto_now_add=True)

    # ── Escrow / Paystack ──────────────────────────────────────
    escrow_status   = models.CharField(choices=ESCROW_STATUS, max_length=30, default="pending_payment")
    validation_code = models.CharField(max_length=8,   null=True, blank=True)   # code visible par le client uniquement
    paystack_ref    = models.CharField(max_length=200, null=True, blank=True)   # référence Paystack
    platform_fee    = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # 5 %
    vendor_amount   = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # 95 %

    def __str__(self):
        return f"Commande {self.oid}"
    

class CartOrderItem(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    order = models.ForeignKey(CartOrder, on_delete=models.CASCADE, null=True, blank=True)
    qty = models.PositiveIntegerField(default=0)
    price = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    sub_total = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    shipping_amount = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    service_fee = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    tax_fee = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    country = models.CharField(max_length=100, null=True, blank=True)
    size = models.CharField(max_length=100, null=True, blank=True)
    color = models.CharField(max_length=100, null=True, blank=True)

    coupon = models.ManyToManyField("store.Coupon", blank=True)
    initial_total = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    saved = models.DecimalField(default=0.00, max_digits=12, decimal_places=2)
    oid = ShortUUIDField(unique=True, length=10, alphabet="abcdefghijklmnopqrstuvwxyz")
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Grand Total of all amount listed above")
    
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.oid

class ProductFaq(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    email = models.EmailField(null=True, blank=True)
    question = models.CharField(max_length=1000)
    answer = models.TextField(null=True, blank=True)
    active = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.question

    class Meta:
        verbose_name_plural = "Product FAQs"

class Review(models.Model):
    RATING = (
        (1, "1 Star"),
        (2, "2 Star"),
        (3, "3 Star"),
        (4, "4 Star"),
        (5, "5 Star"),
    )
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    review = models.TextField()
    reply = models.TextField(null=True, blank=True)
    rating = models.IntegerField(default=None, choices=RATING)
    active = models.BooleanField(default=False)
    date=models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.product.title

    class Meta:
        verbose_name_plural = "Reviews & Rating"

    def profile(self):
        return Profile.objects.get(user=self.user)

@receiver(post_save, sender=Review)
def update_product_rating(sender, instance, **kwargs):
    if instance.product:
        instance.product.save()


class VendorReview(models.Model):
    """Avis laissé par un client sur un vendeur (profil public)."""
    RATING = (
        (1, "1 ★"),
        (2, "2 ★"),
        (3, "3 ★"),
        (4, "4 ★"),
        (5, "5 ★"),
    )
    user    = models.ForeignKey(User,   on_delete=models.CASCADE, related_name="vendor_reviews")
    vendor  = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="reviews")
    rating  = models.IntegerField(choices=RATING)
    comment = models.TextField(blank=True)
    date    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together    = ("user", "vendor")   # 1 avis max par user par vendeur
        ordering           = ["-date"]
        verbose_name_plural = "Vendor Reviews"

    def __str__(self):
        return f"{self.user} → {self.vendor.name} ({self.rating}★)"


class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.product.title

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True)
    order = models.ForeignKey(CartOrder, on_delete=models.SET_NULL, null=True, blank=True)
    # order_item = models.ForeignKey(CartOrderItem, on_delete=models.SET_NULL, null=True, blank=True)
    seen = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.order:
            return self.order.oid
        else:
            return f"Notification - {self.pk}"

class Coupon(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    user_by = models.ManyToManyField(User, blank=True)
    code = models.CharField(max_length=1000)
    discount = models.IntegerField(default=1)
    active = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code


def validate_video_size(value):
    """
    Limite la taille de la vidéo à ~20 Mo.
    """
    max_size_mb = 20
    if value.size > max_size_mb * 1024 * 1024:
        raise ValidationError(f"La vidéo ne doit pas dépasser {max_size_mb} Mo.")

class Presentation(models.Model):
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="presentations",
        verbose_name="Catégorie",
    )
    # max_length en CARACTÈRES (pas en mots)
    title = models.CharField(
        max_length=50,
        null=True,
        blank=True
    )
    video = models.FileField(
        upload_to="video_de_presentation",
        default="video.mp4",
        blank=True,
        null=True,
        validators=[
            # extensions proches de ce qu'on trouve sur TikTok / smartphones
            FileExtensionValidator(
                allowed_extensions=["mp4", "mov", "webm", "hevc", "h265"]
            ),
            validate_video_size,
        ],
    )
    description = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )
    link = models.CharField(
        max_length=200,
        null=True,
        blank=True
    )
    likes = models.ManyToManyField(
        User,
        related_name="presentation_likes",
        blank=True
    )

    def __str__(self):
        return self.title or ""

class Comment(models.Model):
    presentation = models.ForeignKey(Presentation, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name="replies")

    def __str__(self):
        if self.user and hasattr(self.user, 'vendor') and self.user.vendor == self.presentation.vendor:
            return f"{self.user.vendor.name} - {self.content[:20]}"
        return f"{self.user.full_name} - {self.content[:20]}"
    
    
class Tax(models.Model):
    country = models.CharField(max_length=100)
    rate = models.IntegerField(default=5, help_text="Numbers added here are in percentage e.g 5%")
    active = models.BooleanField(default=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.country
    
    class Meta:
        verbose_name_plural = "Taxes"
        ordering = ['country']

class PushNotificationSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    endpoint = models.TextField()
    keys_auth = models.TextField()
    keys_p256dh = models.TextField()

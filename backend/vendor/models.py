import base64, uuid
from django.core.files.base import ContentFile
from django.db import models
from userauths.models import User
from django.utils.text import slugify
from django.db.models.signals import post_save
from django.dispatch import receiver

class Vendor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    image = models.FileField(upload_to="vendor", blank=True, null=True, default="default/default-user.png")
    name = models.CharField(max_length=100, help_text="Shop name", null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    mobile = models.CharField(max_length=100, help_text="Shop Mobile Number", null=True, blank=True)
    # active = non suspendu — tout vendeur peut vendre par défaut
    active   = models.BooleanField(default=True)
    # verified = badge bleu identité vérifiée (accordé manuellement par admin)
    verified = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now_add=True)
    slug = models.SlugField(unique=True, max_length=500)
    followers = models.ManyToManyField(User, symmetrical=False, related_name="following", null=True, blank=True)

    class Meta:
        verbose_name_plural = "Vendors"
        ordering = ['-date']

    def __str__(self):
        return str(self.name)
    
    def save(self, *args, **kwargs):
        if self.slug == "" or self.slug == None:
            self.slug = slugify(self.name)

        super(Vendor, self).save(*args, **kwargs)


    

class VendorVerification(models.Model):
    """Demande de vérification d'identité par un vendeur (photos live seulement)."""

    STATUS_CHOICES = [
        ('pending',  'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
    ]

    vendor       = models.OneToOneField(Vendor, on_delete=models.CASCADE, related_name='verification')
    id_front     = models.ImageField(upload_to='vendor_verif/', blank=True, null=True)
    id_back      = models.ImageField(upload_to='vendor_verif/', blank=True, null=True)
    selfie       = models.ImageField(upload_to='vendor_verif/', blank=True, null=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at  = models.DateTimeField(null=True, blank=True)
    admin_notes  = models.TextField(blank=True)

    def save_base64_photo(self, field_name, b64_data):
        """Convertit du base64 en fichier et le rattache au champ ImageField."""
        if not b64_data:
            return
        # Enlever le préfixe "data:image/jpeg;base64," si présent
        if ',' in b64_data:
            b64_data = b64_data.split(',', 1)[1]
        img_bytes = base64.b64decode(b64_data)
        filename  = f"{field_name}_{uuid.uuid4().hex[:8]}.jpg"
        getattr(self, field_name).save(filename, ContentFile(img_bytes), save=False)

    def __str__(self):
        return f"{self.vendor.name} — {self.status}"


@receiver(post_save, sender=User)
def create_vendor(sender, instance, created, **kwargs):
    if created:
        Vendor.objects.create(
            user=instance,
            name=instance.full_name if instance.full_name else instance.username
        )










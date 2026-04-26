from django.db import models
from django.contrib.auth.models import AbstractUser
from shortuuid.django_fields import ShortUUIDField
from django.db.models.signals import post_save
from django.dispatch import receiver


class User(AbstractUser):
    username = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=100, blank=True, null=True)
    otp = models.CharField(max_length=100, blank=True, null=True)
    reset_token = models.CharField(max_length=500, blank=True, null=True)
    reset_token_created_at = models.DateTimeField(null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email
    
    def save(self, *args, **kwargs):
        email_username, mobile = self.email.split('@')
        if self.full_name == "" or self.full_name == None:
            self.full_name = email_username
        if self.username == "" or self.username == None:
            self.username = email_username
        super(User, self).save(*args, **kwargs)

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    image = models.FileField(upload_to="image", default="default/default-user.png", null=True, blank=True)
    full_name = models.CharField(max_length=100, null=True, blank=True)
    about = models.TextField(null=True, blank=True)
    gender = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    address = models.CharField(max_length=100, null=True, blank=True)
    mobile = models.CharField(default="0000000000")
    date = models.DateTimeField(auto_now_add=True)
    pid = ShortUUIDField(unique=True, length=10, max_length=20, alphabet="abcdefghijklmnopqrstuvwxyz")
  


    def __str__(self):
        if self.full_name:
            return str(self.full_name)
        else:
            return str(self.user.full_name)

    def save(self, *args, **kwargs):
        if self.full_name == "" or self.full_name == None:
            self.full_name = self.user.full_name
        super(Profile, self).save(*args, **kwargs)

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

class Conversation(models.Model):
    user = models.ForeignKey(User, related_name="user_conversations",null=True, on_delete=models.SET_NULL)
    vendor = models.ForeignKey("vendor.Vendor", related_name="vendor_conversations", null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'vendor')  # Ensure one conversation per user-vendor pair

    def __str__(self):
        return f"Conversation between {self.user.email} and {self.vendor.name}"
    
class Message(models.Model):
    conversation = models.ForeignKey(Conversation, related_name="messages", on_delete=models.CASCADE)
    sender = models.ForeignKey(User, related_name="sent_messages", on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Message from {self.sender.email} in Conversation {self.conversation.id}"


# ─────────────────────────────────────────────────────────────────────────────
# Admin Panel — Roles & Profiles
# ─────────────────────────────────────────────────────────────────────────────

class AdminRole(models.Model):
    """Rôle admin avec permissions granulaires."""
    name        = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    # ── Utilisateurs ──
    can_view_users   = models.BooleanField(default=True)
    can_edit_users   = models.BooleanField(default=False)
    can_ban_users    = models.BooleanField(default=False)
    can_delete_users = models.BooleanField(default=False)

    # ── Vendeurs ──
    can_view_vendors    = models.BooleanField(default=True)
    can_approve_vendors = models.BooleanField(default=False)
    can_suspend_vendors = models.BooleanField(default=False)

    # ── Produits ──
    can_view_products   = models.BooleanField(default=True)
    can_edit_products   = models.BooleanField(default=False)
    can_delete_products = models.BooleanField(default=False)
    can_feature_products = models.BooleanField(default=False)

    # ── Commandes ──
    can_view_orders   = models.BooleanField(default=True)
    can_manage_orders = models.BooleanField(default=False)

    # ── Finances ──
    can_view_payments    = models.BooleanField(default=False)
    can_process_payouts  = models.BooleanField(default=False)
    can_view_stats       = models.BooleanField(default=False)

    # ── Contenu ──
    can_manage_categories    = models.BooleanField(default=False)
    can_manage_presentations = models.BooleanField(default=False)

    # ── Admin ──
    can_manage_roles  = models.BooleanField(default=False)
    can_manage_admins = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Rôle Admin"
        verbose_name_plural = "Rôles Admin"
        ordering = ['name']

    def __str__(self):
        return self.name

    def permissions_dict(self):
        fields = [f.name for f in self._meta.fields if isinstance(f, models.BooleanField)]
        return {f: getattr(self, f) for f in fields}


class AdminProfile(models.Model):
    """Profil d'un administrateur avec son rôle et ses métadonnées."""
    user         = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile')
    role         = models.ForeignKey(AdminRole, on_delete=models.SET_NULL, null=True, blank=True)
    is_superadmin = models.BooleanField(default=False)
    is_active    = models.BooleanField(default=True)
    notes        = models.TextField(blank=True)
    created_by   = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_admins'
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Profil Admin"
        verbose_name_plural = "Profils Admin"

    def __str__(self):
        role_name = "Superadmin" if self.is_superadmin else (self.role.name if self.role else "Sans rôle")
        return f"{self.user.email} [{role_name}]"

    def has_perm(self, perm: str) -> bool:
        """Vérifie une permission. Superadmin a tout."""
        if self.is_superadmin:
            return True
        if not self.role or not self.is_active:
            return False
        return getattr(self.role, perm, False)
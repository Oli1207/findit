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
    active = models.BooleanField(default=False)
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


    

@receiver(post_save, sender=User)
def create_vendor(sender, instance, created, **kwargs):
    if created:
        Vendor.objects.create(
            user=instance,
            name=instance.full_name if instance.full_name else instance.username
        )










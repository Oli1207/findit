from django.contrib import admin
from .models import *

class GalleryInline(admin.TabularInline):
    model = Gallery

class SpecificationInline(admin.TabularInline):
    model = Specification

class SizeInline(admin.TabularInline):
    model = Size

class ColorInline(admin.TabularInline):
    model = Color

class ProductAdmin(admin.ModelAdmin):
    list_display = ['title', 'price', 'category', 'shipping_amount', 'stock_qty', 'in_stock', 'vendor', 'featured']
    list_editable = ['featured']
    list_filter = ['date']
    search_fields = ['title']
    inlines = [GalleryInline, SpecificationInline, ColorInline, SizeInline]

class CartOrderAdmin(admin.ModelAdmin):
    list_display = ['oid', 'buyer', 'payment_status', 'total']
    

admin.site.register(Product, ProductAdmin)

admin.site.register(Cart)
admin.site.register(CartOrder)
admin.site.register(CartOrderItem)
admin.site.register(Coupon)
admin.site.register(Notification)
admin.site.register(ProductFaq)
admin.site.register(Review)
admin.site.register(Wishlist)
admin.site.register(Category)
admin.site.register(Presentation)
admin.site.register(Tax)
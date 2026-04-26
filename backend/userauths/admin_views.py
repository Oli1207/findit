"""
admin_views.py — API du panel admin Findit
Toutes les vues ici nécessitent IsAdminUser (AdminProfile actif).
Les superadmins ont accès à tout.
"""
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions, serializers

from userauths.models import User, Profile, AdminProfile, AdminRole
from vendor.models import Vendor, VendorVerification
from store.models import Product, CartOrder, Category
from django.utils import timezone


# ─── Permission ───────────────────────────────────────────────────────────────

class IsAdminUser(permissions.BasePermission):
    message = "Accès refusé : vous n'êtes pas administrateur."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            admin = request.user.admin_profile
            return admin.is_active
        except AdminProfile.DoesNotExist:
            return False


def require_perm(perm):
    """Décorateur de méthode pour vérifier une permission granulaire."""
    def decorator(func):
        def wrapper(self, request, *args, **kwargs):
            try:
                admin = request.user.admin_profile
                if not admin.has_perm(perm):
                    return Response(
                        {'detail': f"Permission requise : {perm}"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except AdminProfile.DoesNotExist:
                return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)
            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator


# ─── Serializers inline ───────────────────────────────────────────────────────

class AdminRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AdminRole
        fields = '__all__'


class AdminProfileSerializer(serializers.ModelSerializer):
    user_email    = serializers.EmailField(source='user.email', read_only=True)
    user_name     = serializers.CharField(source='user.full_name', read_only=True)
    role_name     = serializers.CharField(source='role.name', read_only=True)
    permissions   = serializers.SerializerMethodField()

    class Meta:
        model  = AdminProfile
        fields = ['id', 'user_email', 'user_name', 'role', 'role_name',
                  'is_superadmin', 'is_active', 'notes', 'created_at', 'permissions']

    def get_permissions(self, obj):
        if obj.is_superadmin:
            return {'all': True}
        return obj.role.permissions_dict() if obj.role else {}


class UserAdminSerializer(serializers.ModelSerializer):
    vendor_active = serializers.SerializerMethodField()
    order_count   = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'email', 'full_name', 'phone', 'is_active',
                  'date_joined', 'vendor_active', 'order_count']

    def get_vendor_active(self, obj):
        try: return obj.vendor.active
        except: return None

    def get_order_count(self, obj):
        return CartOrder.objects.filter(buyer=obj).count()


class VendorAdminSerializer(serializers.ModelSerializer):
    user_email         = serializers.EmailField(source='user.email', read_only=True)
    product_count      = serializers.SerializerMethodField()
    order_count        = serializers.SerializerMethodField()
    revenue            = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()

    class Meta:
        model  = Vendor
        fields = ['id', 'name', 'user_email', 'active', 'verified', 'mobile',
                  'date', 'product_count', 'order_count', 'revenue', 'slug',
                  'verification_status']

    def get_product_count(self, obj):
        return Product.objects.filter(vendor=obj).count()

    def get_order_count(self, obj):
        return CartOrder.objects.filter(vendor=obj).count()

    def get_revenue(self, obj):
        total = CartOrder.objects.filter(
            vendor=obj, payment_status='complete'
        ).aggregate(t=Sum('vendor_amount'))['t']
        return float(total or 0)

    def get_verification_status(self, obj):
        try:
            return obj.verification.status   # pending / approved / rejected
        except VendorVerification.DoesNotExist:
            return None


class OrderAdminSerializer(serializers.ModelSerializer):
    buyer_email  = serializers.EmailField(source='buyer.email', read_only=True)
    vendor_name  = serializers.CharField(source='vendor.name', read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)

    class Meta:
        model  = CartOrder
        fields = ['id', 'oid', 'buyer_email', 'vendor_name', 'product_title',
                  'price', 'qty', 'payment_status', 'order_status',
                  'escrow_status', 'platform_fee', 'vendor_amount', 'date']


# ─── Dashboard Stats ──────────────────────────────────────────────────────────

class AdminDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        now   = timezone.now()
        week  = now - timedelta(days=7)
        month = now - timedelta(days=30)

        orders_paid = CartOrder.objects.filter(payment_status='complete')

        stats = {
            'users': {
                'total':      User.objects.count(),
                'this_week':  User.objects.filter(date_joined__gte=week).count(),
                'this_month': User.objects.filter(date_joined__gte=month).count(),
            },
            'vendors': {
                'total':    Vendor.objects.count(),
                'active':   Vendor.objects.filter(active=True).count(),
                'inactive': Vendor.objects.filter(active=False).count(),
            },
            'products': {
                'total':     Product.objects.count(),
                'in_stock':  Product.objects.filter(in_stock=True).count(),
                'featured':  Product.objects.filter(featured=True).count(),
            },
            'orders': {
                'total':       CartOrder.objects.count(),
                'paid':        orders_paid.count(),
                'pending':     CartOrder.objects.filter(payment_status='en_attente').count(),
                'in_escrow':   CartOrder.objects.filter(escrow_status='paid_holding').count(),
                'this_month':  CartOrder.objects.filter(date__gte=month).count(),
            },
            'revenue': {
                'total_gross':    float(orders_paid.aggregate(t=Sum('price'))['t'] or 0),
                'platform_fees':  float(orders_paid.aggregate(t=Sum('platform_fee'))['t'] or 0),
                'vendor_payouts': float(orders_paid.aggregate(t=Sum('vendor_amount'))['t'] or 0),
                'pending_release': float(
                    CartOrder.objects.filter(escrow_status='paid_holding')
                    .aggregate(t=Sum('vendor_amount'))['t'] or 0
                ),
            },
        }
        return Response(stats)


# ─── Users ────────────────────────────────────────────────────────────────────

class AdminUsersListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class   = UserAdminSerializer

    def get_queryset(self):
        qs = User.objects.all().order_by('-date_joined')
        q  = self.request.query_params.get('q')
        if q:
            qs = qs.filter(Q(email__icontains=q) | Q(full_name__icontains=q))
        status = self.request.query_params.get('status')
        if status == 'active':   qs = qs.filter(is_active=True)
        if status == 'inactive': qs = qs.filter(is_active=False)
        return qs


class AdminUserActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @require_perm('can_ban_users')
    def post(self, request, user_id):
        action = request.data.get('action')
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable.'}, status=404)

        if action == 'ban':
            user.is_active = False
            user.save()
            return Response({'detail': f'{user.email} banni.'})
        elif action == 'unban':
            user.is_active = True
            user.save()
            return Response({'detail': f'{user.email} réactivé.'})
        return Response({'detail': 'Action inconnue.'}, status=400)


# ─── Vendors ─────────────────────────────────────────────────────────────────

class AdminVendorsListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class   = VendorAdminSerializer

    def get_queryset(self):
        qs     = Vendor.objects.select_related('user').all().order_by('-date')
        q      = self.request.query_params.get('q')
        active = self.request.query_params.get('active')
        if q: qs = qs.filter(Q(name__icontains=q) | Q(user__email__icontains=q))
        if active == 'true':  qs = qs.filter(active=True)
        if active == 'false': qs = qs.filter(active=False)
        return qs


class AdminVendorActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @require_perm('can_approve_vendors')
    def post(self, request, vendor_id):
        action = request.data.get('action')
        try:
            vendor = Vendor.objects.get(id=vendor_id)
        except Vendor.DoesNotExist:
            return Response({'detail': 'Vendeur introuvable.'}, status=404)

        if action == 'suspend':
            vendor.active = False
            vendor.save()
            return Response({'detail': f'{vendor.name} suspendu.'})
        elif action == 'reactivate':
            vendor.active = True
            vendor.save()
            return Response({'detail': f'{vendor.name} réactivé.'})
        elif action == 'verify':
            # Accorder le badge bleu identité vérifiée
            vendor.verified = True
            vendor.save()
            try:
                verif = vendor.verification
                verif.status = 'approved'
                verif.reviewed_at = timezone.now()
                verif.admin_notes = request.data.get('notes', '')
                verif.save()
            except VendorVerification.DoesNotExist:
                pass
            return Response({'detail': f'Identité de {vendor.name} vérifiée ✓'})
        elif action == 'reject_verification':
            vendor.verified = False
            vendor.save()
            try:
                verif = vendor.verification
                verif.status = 'rejected'
                verif.reviewed_at = timezone.now()
                verif.admin_notes = request.data.get('notes', 'Photos refusées.')
                verif.save()
            except VendorVerification.DoesNotExist:
                pass
            return Response({'detail': f'Vérification de {vendor.name} rejetée.'})
        return Response({'detail': 'Action inconnue.'}, status=400)


# ─── Admin Verifications (pending identity reviews) ───────────────────────────

class AdminVendorVerificationsView(APIView):
    """Liste des demandes de vérification d'identité en attente."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    @require_perm('can_approve_vendors')
    def get(self, request):
        status_filter = request.query_params.get('status', 'pending')
        verifs = VendorVerification.objects.filter(
            status=status_filter
        ).select_related('vendor', 'vendor__user').order_by('-submitted_at')

        data = [{
            'id':           v.id,
            'vendor_id':    v.vendor.id,
            'vendor_name':  v.vendor.name,
            'vendor_email': v.vendor.user.email if v.vendor.user else None,
            'vendor_mobile': v.vendor.mobile,
            'status':       v.status,
            'submitted_at': v.submitted_at,
            'reviewed_at':  v.reviewed_at,
            'admin_notes':  v.admin_notes,
            'id_front':     request.build_absolute_uri(v.id_front.url) if v.id_front else None,
            'id_back':      request.build_absolute_uri(v.id_back.url)  if v.id_back  else None,
            'selfie':       request.build_absolute_uri(v.selfie.url)   if v.selfie   else None,
        } for v in verifs]

        return Response({'verifications': data, 'count': len(data)})


# ─── Products ─────────────────────────────────────────────────────────────────

class AdminProductsListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        from store.serializers import ProductSerializer
        qs = Product.objects.select_related('vendor', 'category').all().order_by('-date')
        q  = self.request.query_params.get('q')
        if q: qs = qs.filter(Q(title__icontains=q) | Q(vendor__name__icontains=q))
        status = self.request.query_params.get('status')
        if status: qs = qs.filter(status=status)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = [{
            'id': p.id, 'title': p.title, 'price': float(p.price),
            'status': p.status, 'in_stock': p.in_stock, 'featured': p.featured,
            'vendor': p.vendor.name if p.vendor else None,
            'category': p.category.title if p.category else None,
            'views': p.views, 'slug': p.slug,
            'image': request.build_absolute_uri(p.image.url) if p.image else None,
        } for p in qs[:200]]
        return Response(data)


class AdminProductActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @require_perm('can_edit_products')
    def post(self, request, product_id):
        action = request.data.get('action')
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'detail': 'Produit introuvable.'}, status=404)

        if action == 'feature':
            product.featured = not product.featured
            product.save()
            return Response({'featured': product.featured})
        elif action == 'delete':
            try:
                admin = request.user.admin_profile
                if not admin.has_perm('can_delete_products'):
                    return Response({'detail': 'Permission can_delete_products requise.'}, status=403)
            except AdminProfile.DoesNotExist:
                return Response({'detail': 'Accès refusé.'}, status=403)
            product.delete()
            return Response({'detail': 'Produit supprimé.'})
        return Response({'detail': 'Action inconnue.'}, status=400)


# ─── Orders ──────────────────────────────────────────────────────────────────

class AdminOrdersListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class   = OrderAdminSerializer

    def get_queryset(self):
        qs = CartOrder.objects.select_related('buyer', 'vendor', 'product').order_by('-date')
        q  = self.request.query_params.get('q')
        escrow = self.request.query_params.get('escrow')
        payment = self.request.query_params.get('payment')
        if q: qs = qs.filter(
            Q(oid__icontains=q) | Q(buyer__email__icontains=q) | Q(vendor__name__icontains=q)
        )
        if escrow:  qs = qs.filter(escrow_status=escrow)
        if payment: qs = qs.filter(payment_status=payment)
        return qs[:300]


# ─── Payouts ─────────────────────────────────────────────────────────────────

class AdminPayoutsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @require_perm('can_view_payments')
    def get(self, request):
        """Liste des fonds en séquestre prêts à être reversés."""
        orders = CartOrder.objects.filter(
            escrow_status='validated'
        ).select_related('vendor', 'buyer', 'product').order_by('-date')

        data = [{
            'order_oid':     o.oid,
            'vendor_name':   o.vendor.name   if o.vendor else '—',
            'vendor_id':     o.vendor.id     if o.vendor else None,
            'vendor_mobile': o.vendor.mobile if o.vendor else None,
            'vendor_email':  o.vendor.user.email if (o.vendor and o.vendor.user) else None,
            'product':       o.product.title if o.product else '—',
            'vendor_amount': float(o.vendor_amount),
            'platform_fee':  float(o.platform_fee),
            'date':          o.date,
            'escrow_status': o.escrow_status,
        } for o in orders]

        total_pending = sum(d['vendor_amount'] for d in data)
        return Response({'payouts': data, 'total_pending': total_pending})

    @require_perm('can_process_payouts')
    def post(self, request):
        """Marquer une commande comme reversée."""
        order_oid = request.data.get('order_oid')
        try:
            order = CartOrder.objects.get(oid=order_oid, escrow_status='validated')
        except CartOrder.DoesNotExist:
            return Response({'detail': 'Commande introuvable ou non éligible.'}, status=404)

        order.escrow_status = 'released'
        order.save()
        return Response({'detail': f'Fonds reversés pour commande {order_oid}.'})


# ─── Roles ───────────────────────────────────────────────────────────────────

class AdminRolesView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @require_perm('can_manage_roles')
    def get(self, request):
        roles = AdminRole.objects.all()
        return Response(AdminRoleSerializer(roles, many=True).data)

    @require_perm('can_manage_roles')
    def post(self, request):
        ser = AdminRoleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class AdminRoleDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def _get_role(self, pk):
        try: return AdminRole.objects.get(pk=pk)
        except AdminRole.DoesNotExist: return None

    @require_perm('can_manage_roles')
    def put(self, request, pk):
        role = self._get_role(pk)
        if not role: return Response({'detail': 'Rôle introuvable.'}, status=404)
        ser = AdminRoleSerializer(role, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    @require_perm('can_manage_roles')
    def delete(self, request, pk):
        role = self._get_role(pk)
        if not role: return Response({'detail': 'Rôle introuvable.'}, status=404)
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Admin Profiles ───────────────────────────────────────────────────────────

class AdminProfilesView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @require_perm('can_manage_admins')
    def get(self, request):
        profiles = AdminProfile.objects.select_related('user', 'role').all()
        return Response(AdminProfileSerializer(profiles, many=True).data)

    @require_perm('can_manage_admins')
    def post(self, request):
        """Promouvoir un user en admin."""
        email   = request.data.get('email')
        role_id = request.data.get('role_id')
        notes   = request.data.get('notes', '')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable.'}, status=404)

        role = None
        if role_id:
            try: role = AdminRole.objects.get(id=role_id)
            except AdminRole.DoesNotExist: pass

        profile, created = AdminProfile.objects.get_or_create(
            user=user,
            defaults={'role': role, 'notes': notes, 'created_by': request.user}
        )
        if not created:
            profile.role = role
            profile.notes = notes
            profile.is_active = True
            profile.save()

        return Response(AdminProfileSerializer(profile).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class AdminProfileDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @require_perm('can_manage_admins')
    def patch(self, request, pk):
        try:
            profile = AdminProfile.objects.get(pk=pk)
        except AdminProfile.DoesNotExist:
            return Response({'detail': 'Profil introuvable.'}, status=404)

        # Empêche de modifier un superadmin sauf si on est soi-même superadmin
        try:
            me = request.user.admin_profile
            if profile.is_superadmin and not me.is_superadmin:
                return Response({'detail': 'Impossible de modifier un superadmin.'}, status=403)
        except AdminProfile.DoesNotExist:
            return Response({'detail': 'Accès refusé.'}, status=403)

        for field in ['role_id', 'is_active', 'notes']:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()
        return Response(AdminProfileSerializer(profile).data)


# ─── Me (infos admin connecté) ────────────────────────────────────────────────

class AdminMeView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            profile = request.user.admin_profile
        except AdminProfile.DoesNotExist:
            return Response({'detail': 'Non admin.'}, status=403)
        return Response(AdminProfileSerializer(profile).data)

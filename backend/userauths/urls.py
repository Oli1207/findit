from django.urls import path

from userauths import views as userauths_views
from userauths import admin_views as admin_views
from store import views as store_views
from customer import views as customer_views
from vendor import views as vendor_views
from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from rest_framework_simplejwt.views import TokenRefreshView


urlpatterns = [
    path('user/token/', userauths_views.MyTokenObtainPairView.as_view()),
    path('user/token/refresh/', TokenRefreshView.as_view()),
    path('user/register/', userauths_views.RegisterView.as_view()),
    path('user/profile/<user_id>/', userauths_views.ProfileView.as_view()),
    path('user/password-reset/<email>/', userauths_views.PasswordResetEmailVerify.as_view()),
  path('user/password-reset-confirm/', userauths_views.PasswordResetConfirmAPIView.as_view(), name='password-reset-confirm'),
path("user/google-login/", userauths_views.GoogleLogin.as_view(), name="google_login"),
path("personalized-products/<user_id>/", store_views.PersonalizedProductFeed.as_view(), name="personalized-feed"),
path("unified-feed/<user_id>/", store_views.UnifiedFeedAPIView.as_view(), name="unified-feed"),
path("popular-products/", store_views.PopularProductFeed.as_view(), name="popular-products"),
    path("products/<int:product_id>/view/", store_views.TrackProductView.as_view(), name="track-view"),
    path('category/', store_views.CategoryListAPIView.as_view()),
    path('products/', store_views.ProductListAPIView.as_view()),
     path('products-soldes/', store_views.ProductSoldeAPIView.as_view()),
    path('products/<slug>/', store_views.ProductDetailAPIView.as_view(), name="product_detail"),
    path('presentations/', store_views.PresentationListAPIView.as_view()),
    path('vendor-content/<int:vendor_id>/', store_views.VendorContentAPIView.as_view(), name='vendor-content'),
    path('vendor-presentations/<int:vendor_id>/', vendor_views.VendorPresentationsAPIView.as_view(), name='vendor-presentations'),
    path('vendor-products/<int:vendor_id>/', vendor_views.VendorProductsAPIView.as_view(), name='vendor-products'),
    path('category/<int:category_id>/', store_views.ProductsByCategoryAPIView.as_view(), name='products-by-category'),
    path('presentations/<int:pk>/', store_views.PresentationDetailAPIView.as_view()),
    path('presentations/<int:pk>/like/', store_views.LikePresentationAPIView.as_view()),
    path('comments/create/', store_views.CommentCreateAPIView.as_view()),
    
      #path('cart-delete/<str:cart_id>/<int:item_id>/<int:user_id>/', store_views.CartItemDeleteAPIView.as_view()),
    #path('cart-delete/<str:cart_id>/<int:item_id>/', store_views.CartItemDeleteAPIView.as_view()),
    path('create-order/', store_views.CreateOrderAPIView.as_view()),
   # path('checkout/<order_oid>/', store_views.CheckOutView.as_view()),
    path('coupon/', store_views.CouponAPIView.as_view()),

   

    path('customer/orders/<user_id>/', customer_views.OrdersAPIView.as_view()),
    
    path('customer/order/<user_id>/<order_oid>/', customer_views.OrderDetailAPIView.as_view()),
    path('reviews/<product_id>/', store_views.ReviewListAPIView.as_view()),
  path('image-search/', store_views.ImageSearchAPIView.as_view(), name='image-search'),

path('customer/wishlist/<user_id>/', customer_views.WishListAPIView.as_view()),
path('search_by_text/', store_views.search_by_text, name='text_search'),  # Recherche par texte
    path('search_by_image/', store_views.search_by_image, name='image_search'),  # Recherche par image

    path('search/', store_views.SearchProductAPIView.as_view()),


    path('vendor-create-product/', vendor_views.ProductCreateView.as_view()),
    path('vendor-settings/<int:pk>/', vendor_views.VendorProfileUpdateView.as_view()),
    path('vendor-shop-settings/<int:pk>/', vendor_views.ShopUpdateView.as_view()),
     path('shop/<vendor_slug>/', vendor_views.ShopAPIView.as_view()),
      path('vendor/products/<slug>/', vendor_views.ShopProductIDAPIView.as_view()),
         path('vendor/products/<int:vendor_id>/', vendor_views.ShopProductAPIView.as_view()),
      path('toggle-follow/<int:vendor_id>/', vendor_views.toggle_follow, name='toggle_follow'),
      path('vendors/is-following/', vendor_views.batch_is_following, name='batch_is_following'),
      path('vendors/<vendor_id>/is-following/<user_id>/', vendor_views.is_following, name='is_following'),
        path('vendor/orders/<vendor_id>/', vendor_views.OrdersAPIView.as_view(), name='vendor-orders'),
         path('vendor/order/<vendor_id>/<order_oid>/', vendor_views.OrderDetailAPIView.as_view(), name='vendor-order-detail'),
      path('conversations/', userauths_views.create_or_get_conversation, name="create_or_get_conversation"),
    path('messages/send/', userauths_views.send_message, name="send_message"),
    path('conversations/<int:conversation_id>/messages/', userauths_views.get_conversation_messages, name="get_conversation_messages"),
    path('conversations/<int:conversation_id>/detail/', userauths_views.get_conversation_detail, name="get_conversation_detail"),
    path('conversations/vendor/', userauths_views.get_conversations_for_vendor, name="get_conversations_for_vendor"),
    path('conversations/user/', userauths_views.get_conversations_for_user, name="get_conversations_for_user"),
    path('products/followed/<int:user_id>/', store_views.products_from_followed_vendors, name='products-from-followed'),
    path('followed-feed/unified/<int:user_id>/', store_views.followed_vendors_unified_feed, name='followed_vendors_unified_feed'),
    # path('vendor-notifications/<int:user_id>/', store_views.VendorNotificationsView.as_view(), name='vendor-notifications'),
    path('save-subscription/', store_views.SavePushSubscription.as_view(), name='save-subscription'),
    path('products/<int:pk>/set-sale/', store_views.set_product_sale, name='product-set-sale'),
  path('presentations/create/', store_views.PresentationCreateAPIView.as_view(), name='presentation-create'),

    # ── Avis vendeur ──────────────────────────────────────────────────────────
    path('vendor-reviews/<int:vendor_id>/', store_views.VendorReviewView.as_view(), name='vendor-reviews'),

    # ── Escrow / Paystack ─────────────────────────────────────────────────────
    path('initiate-payment/',             store_views.InitiatePaystackPaymentView.as_view(), name='initiate-payment'),
    path('verify-payment/',               store_views.VerifyPaystackPaymentView.as_view(),   name='verify-payment'),
    path('paystack-webhook/',             store_views.PaystackWebhookView.as_view(),         name='paystack-webhook'),
    path('validate-delivery/',            store_views.ValidateDeliveryView.as_view(),        name='validate-delivery'),
    path('orders/<str:order_oid>/ship/',  store_views.MarkAsShippedView.as_view(),           name='mark-shipped'),

    # ── Admin Panel API ───────────────────────────────────────────────────────
    path('admin/me/',                         admin_views.AdminMeView.as_view(),              name='admin-me'),
    path('admin/stats/',                      admin_views.AdminDashboardStatsView.as_view(),  name='admin-stats'),
    path('admin/users/',                      admin_views.AdminUsersListView.as_view(),       name='admin-users'),
    path('admin/users/<int:user_id>/action/', admin_views.AdminUserActionView.as_view(),      name='admin-user-action'),
    path('admin/vendors/',                    admin_views.AdminVendorsListView.as_view(),     name='admin-vendors'),
    path('admin/vendors/<int:vendor_id>/action/', admin_views.AdminVendorActionView.as_view(), name='admin-vendor-action'),
    path('admin/products/',                   admin_views.AdminProductsListView.as_view(),    name='admin-products'),
    path('admin/products/<int:product_id>/action/', admin_views.AdminProductActionView.as_view(), name='admin-product-action'),
    path('admin/orders/',                     admin_views.AdminOrdersListView.as_view(),      name='admin-orders'),
    path('admin/payouts/',                    admin_views.AdminPayoutsView.as_view(),         name='admin-payouts'),
    path('admin/roles/',                      admin_views.AdminRolesView.as_view(),           name='admin-roles'),
    path('admin/roles/<int:pk>/',             admin_views.AdminRoleDetailView.as_view(),      name='admin-role-detail'),
    path('admin/profiles/',                   admin_views.AdminProfilesView.as_view(),        name='admin-profiles'),
    path('admin/profiles/<int:pk>/',          admin_views.AdminProfileDetailView.as_view(),   name='admin-profile-detail'),
    path('admin/verifications/',              admin_views.AdminVendorVerificationsView.as_view(), name='admin-verifications'),

    # ── Vérification identité vendeur (soumission live) ───────────────────────
    path('vendor/request-verification/',      vendor_views.VendorRequestVerificationView.as_view(), name='vendor-request-verification'),
    path('vendor/verification-status/',       vendor_views.VendorVerificationStatusView.as_view(),  name='vendor-verification-status'),

    # ── Préférences catégories (onboarding invité → compte) ───────────────────
    path('save-category-preferences/<int:user_id>/', store_views.SaveCategoryPreferencesView.as_view(), name='save-category-preferences'),
]
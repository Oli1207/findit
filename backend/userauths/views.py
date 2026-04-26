from django.shortcuts import render
from userauths.models import *
from vendor.models import *
from userauths.serializers import *
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
import random
from datetime import timedelta
import shortuuid
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken
from django.utils import timezone
import requests
from django.urls import reverse
from urllib.parse import urljoin
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Error
from dj_rest_auth.registration.views import SocialLoginView

from django.utils.decorators import method_decorator

from django.views.decorators.cache import never_cache

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter

class GoogleLoginCallback(APIView):
    def get(self, request, *args, **kwargs):
        """
        If you are building a fullstack application (eq. with React app next to Django)
        you can place this endpoint in your frontend application to receive
        the JWT tokens there - and store them in the state
        """

        code = request.GET.get("code")

        if code is None:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        
        # Remember to replace the localhost:8000 with the actual domain name before deployment
        token_endpoint_url = urljoin("https://backend.findit.deals", reverse("google_login"))
        response = requests.post(url=token_endpoint_url, data={"code": code})

        return Response(response.json(), status=status.HTTP_200_OK)


class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter

    def post(self, request, *args, **kwargs):
        id_token = request.data.get("access_token")
        if not id_token:
            return Response({"error": "Token manquant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            resp = requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'id_token': id_token}
            )
            resp.raise_for_status()
            user_data = resp.json()
        except requests.exceptions.RequestException:
            return Response({"error": "Token invalide"}, status=status.HTTP_400_BAD_REQUEST)

        email = user_data.get("email")
        full_name = user_data.get("name", "")
        if not email:
            return Response({"error": "Email non fourni par Google"}, status=400)

        user, created = User.objects.get_or_create(email=email)
        if created:
            user.full_name = full_name
            email_username = email.split("@")[0]
            user.username = email_username
            user.set_unusable_password()
            user.save()

        refresh = RefreshToken.for_user(user)

        # enrichir aussi le refresh token
        refresh["full_name"] = user.full_name
        refresh["email"] = user.email
        refresh["username"] = user.username
        try:
            refresh["vendor_id"] = user.vendor.id
        except:
            refresh["vendor_id"] = 0

        # access aussi (optionnel si tu ne le décodes pas)
        access = refresh.access_token
        access["full_name"] = user.full_name
        access["email"] = user.email
        access["username"] = user.username
        try:
            access["vendor_id"] = user.vendor.id
        except:
            access["vendor_id"] = 0

        return Response({
            "access": str(access),
            "refresh": str(refresh),
        }, status=status.HTTP_200_OK)


class CustomGoogleOAuth2Adapter(GoogleOAuth2Adapter):
    def complete_login(self, request, app, token, **kwargs):
        from allauth.socialaccount.providers.google.provider import GoogleProvider
        import requests

        id_token = token.token
        print("ID TOKEN reçu depuis le frontend :", id_token)  # 🔍 Debug

        try:
            resp = requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'id_token': id_token}
            )
            print("Réponse de Google tokeninfo status:", resp.status_code)  # 🔍 Debug
            resp.raise_for_status()
            extra_data = resp.json()
            print("Données décodées de Google tokeninfo :", extra_data)  # 🔍 Debug
        except requests.exceptions.RequestException as e:
            print("Erreur lors de la validation du token Google :", e)  # 🔍 Debug
            raise e

        login = self.get_provider().sociallogin_from_response(request, extra_data)
        return login

import logging
logger = logging.getLogger('django')

def log_authentication_error(request):
    logger.info(f"Authentication failed: {request.headers}")



class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
   

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny, )
    serializer_class = RegisterSerializer

# @method_decorator(never_cache, name='dispatch')
class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    queryset = Profile.objects.all()
    permission_classes = [AllowAny]
    lookup_field = 'user_id'

    def get_object(self):
        user_id = self.kwargs['user_id']
        return Profile.objects.get(user__id=user_id)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_or_get_conversation(request):
    try:
        # Get user_id and validate
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"error": "User ID is required."}, status=400)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"error": "User not found."}, status=404)

        # Get vendor_id and validate
        vendor_id = request.data.get('vendor_id')
        if not vendor_id:
            return Response({"error": "Vendor ID is required."}, status=400)

        vendor = Vendor.objects.filter(id=vendor_id).first()
        if not vendor:
            return Response({"error": "Vendor not found."}, status=404)

        # Get or create a conversation
        conversation, created = Conversation.objects.get_or_create(user=user, vendor=vendor)

        # Serialize and return the conversation
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data, status=201 if created else 200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def send_message(request):
    try:
        # Get and validate user_id
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"error": "User ID is required."}, status=400)

        sender = User.objects.filter(id=user_id).first()
        if not sender:
            return Response({"error": "User not found."}, status=404)

        # Get conversation_id and content
        conversation_id = request.data.get('conversation_id')
        content = request.data.get('content')
        if not conversation_id or not content:
            return Response({"error": "Conversation ID and content are required."}, status=400)

        # Validate conversation
        conversation = Conversation.objects.filter(id=conversation_id).first()
        if not conversation:
            return Response({"error": "Conversation not found."}, status=404)

        # Ensure the sender is either the user or the vendor
        if sender != conversation.user and sender != conversation.vendor.user:
            return Response({"error": "You are not a participant in this conversation."}, status=403)

        # Create the message
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=content
        )

        # Bump conversation updated_at so lists re-sort correctly
        Conversation.objects.filter(id=conversation.id).update(updated_at=timezone.now())

        serializer = MessageSerializer(message)
        return Response(serializer.data, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_conversation_detail(request, conversation_id):
    """Return conversation metadata (for chat header)."""
    try:
        user_id = request.query_params.get('user_id')
        user = User.objects.filter(id=user_id).first() if user_id else None

        conversation = Conversation.objects.filter(id=conversation_id).first()
        if not conversation:
            return Response({"error": "Conversation not found."}, status=404)

        if user and user != conversation.user and user != conversation.vendor.user:
            return Response({"error": "Forbidden."}, status=403)

        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_conversation_messages(request, conversation_id):
    try:
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({"error": "User ID is required."}, status=400)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"error": "User not found."}, status=404)

        conversation = Conversation.objects.filter(id=conversation_id).first()
        if not conversation:
            return Response({"error": "Conversation not found."}, status=404)

        if user != conversation.user and user != conversation.vendor.user:
            return Response({"error": "You are not a participant in this conversation."}, status=403)

        # Delta fetch: only return messages newer than since_id
        since_id = request.query_params.get('since_id')
        qs = conversation.messages.order_by('timestamp')
        if since_id:
            qs = qs.filter(id__gt=since_id)

        # Mark received messages as read (not sent by this user)
        qs.exclude(sender=user).filter(is_read=False).update(is_read=True)

        serializer = MessageSerializer(qs, many=True)
        return Response(serializer.data, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# def generate_otp():
#     uuid_key = shortuuid.uuid()
#     unique_key = uuid_key[:6]
#     return unique_key


def generate_numeric_otp(length=7):
        # Generate a random 7-digit OTP
        otp = ''.join([str(random.randint(0, 9)) for _ in range(length)])
        return otp


# class PasswordResetEmailVerify(generics.RetrieveAPIView):
#     permission_classes = (AllowAny,)
#     serializer_class = UserSerializer

#     def get_object(self):
#         email = self.kwargs['email']
#         user = User.objects.get(email=email)

#         if user:
#             user.otp = generate_otp()
#             user.save()

#             uidb64 = user.pk
#                # Generate a token and include it in the reset link sent via email
#             refresh = RefreshToken.for_user(user)
#             reset_token = str(refresh.access_token)
#             otp = user.otp

#             link = f"http://localhost:5173/create-new-password?otp={otp}&uidb64={uidb64}"

#             print("link ===", link)
        
#         return user
    


class PasswordResetEmailVerify(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer
    
    def get_object(self):
        email = self.kwargs['email']
        user = User.objects.get(email=email)
        
        if user:
            user.otp = generate_numeric_otp()
            uidb64 = user.pk
            
             # Generate a token and include it in the reset link sent via email
            refresh = RefreshToken.for_user(user)
            reset_token = str(refresh.access_token)

            # Store the reset_token in the user model for later verification
            user.reset_token = reset_token
            user.reset_token_created_at = timezone.now()
            user.save()

            link = f"https://findit.deals/create-new-password?otp={user.otp}&uidb64={uidb64}&reset_token={reset_token}"
            
            merge_data = {
                'link': link, 
                'username': user.username, 
            }
            subject = f"Password Reset Request"
            text_body = render_to_string("email/password_reset.txt", merge_data)
            html_body = render_to_string("email/password_reset.html", merge_data)
            
            msg = EmailMultiAlternatives(
                subject=subject, from_email=settings.FROM_EMAIL,
                to=[user.email], body=text_body
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send()
        return user
    

class PasswordResetConfirmAPIView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        otp = request.data.get("otp")
        uidb64 = request.data.get("uidb64")
        reset_token = request.data.get("reset_token")
        new_password = request.data.get("new_password")

        try:
            user = User.objects.get(pk=uidb64, otp=otp, reset_token=reset_token)

            # Vérifie que le token est valide
            AccessToken(reset_token)

            if not user.reset_token_created_at or timezone.now() > user.reset_token_created_at + timedelta(minutes=2):
                return Response({"error": "Lien expiré. Veuillez refaire la demande."}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(new_password)
            user.otp = None
            user.reset_token = None
            user.save()

            return Response({"message": "Mot de passe mis à jour avec succès."}, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({"error": "Lien invalide ou expiré."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)    

@api_view(['GET'])
@permission_classes([AllowAny])
def get_conversations_for_user(request):
    try:
        # Get and validate user_id
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({"error": "User ID is required."}, status=400)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"error": "User not found."}, status=404)

        conversations = Conversation.objects.filter(user=user).order_by('-updated_at')
        serializer = ConversationSerializer(conversations, many=True, context={'request': request})
        return Response(serializer.data, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_conversations_for_vendor(request):
    try:
        # Get and validate vendor_id
        vendor_id = request.query_params.get('vendor_id')
        if not vendor_id:
            return Response({"error": "Vendor ID is required."}, status=400)

        vendor = Vendor.objects.filter(id=vendor_id).first()
        if not vendor:
            return Response({"error": "Vendor not found."}, status=404)

        conversations = Conversation.objects.filter(vendor=vendor).order_by('-updated_at')
        serializer = ConversationSerializer(conversations, many=True, context={'request': request})
        return Response(serializer.data, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

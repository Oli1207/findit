from django.shortcuts import render
from userauths.models import *
from vendor.models import *
from userauths.serializers import *
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
import random
import shortuuid

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

        # Serialize and return the message
        serializer = MessageSerializer(message)
        return Response(serializer.data, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_conversation_messages(request, conversation_id):
    try:
        # Get and validate user_id
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({"error": "User ID is required."}, status=400)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"error": "User not found."}, status=404)

        # Validate conversation
        conversation = Conversation.objects.filter(id=conversation_id).first()
        if not conversation:
            return Response({"error": "Conversation not found."}, status=404)

        # Ensure the user is either the user or the vendor
        if user != conversation.user and user != conversation.vendor.user:
            return Response({"error": "You are not a participant in this conversation."}, status=403)

        # Retrieve messages
        messages = conversation.messages.order_by('-timestamp')
        serializer = MessageSerializer(messages, many=True)
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
            user.save()

            link = f"http://localhost:5173/create-new-password?otp={user.otp}&uidb64={uidb64}&reset_token={reset_token}"
            
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

        # Retrieve all conversations where the user is a participant as a client
        conversations = Conversation.objects.filter(user=user).order_by('-updated_at')

        # Serialize conversations
        serializer = ConversationSerializer(conversations, many=True)
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

        # Retrieve all conversations where the vendor is a participant
        conversations = Conversation.objects.filter(vendor=vendor).order_by('-updated_at')

        # Serialize conversations
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

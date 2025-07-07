from rest_framework import serializers
from rest_framework_simplejwt.tokens import Token
from userauths.models import *
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.utils.functional import cached_property
from backend.settings import SIMPLE_JWT
from typing import TYPE_CHECKING, Any, List, Optional, Union

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['full_name'] = user.full_name
        token['email'] = user.email
        token['username'] = user.username
        try:
            token['vendor_id'] = user.vendor.id
        except:
            token['vendor_id'] = 0
        return token


    def __str__(self) -> str:
        return f"TokenUser {self.id}"

    @cached_property
    def id(self) -> Union[int, str]:
        return self.token[SIMPLE_JWT.USER_ID_CLAIM]

    @cached_property
    def pk(self) -> Union[int, str]:
        return self.id

    @cached_property
    def username(self) -> str:
        return self.token.get("username", "")

    @property
    def is_anonymous(self) -> bool:
        return False

    @property
    def is_authenticated(self) -> bool:
        return True

    def get_username(self) -> str:
        return self.username

   

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['full_name', 'email','phone', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'mot de passe': "Mot de passe différent"})
        return attrs
    
    def create(self, validated_data):
        user = User.objects.create(
            full_name = validated_data['full_name'],
            email = validated_data['email'],
            phone = validated_data['phone'],
        )

        email_user, mobile = user.email.split("@")
        user.username = email_user
        user.set_password(validated_data['password'])
        user.save()
        
        return user


class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = '__all__'


class ProfileSerializer(serializers.ModelSerializer):
    

    class Meta:
        model = Profile
        fields = '__all__'

    def to_representation(self, instance):
        response = super().to_representation(instance)
        response['user'] = UserSerializer(instance.user).data
        return response

class MessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.ReadOnlyField(source="sender.email")  # Inclure l'email du sender

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_email', 'content', 'timestamp', 'is_read']

class ConversationSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source="user.full_name")
    vendor_name = serializers.ReadOnlyField(source="vendor.name")
    profile_image = serializers.SerializerMethodField()
    vendor_image = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'user', 'profile_image','vendor_image', 'user_name', 'vendor', 'vendor_name', 'created_at', 'updated_at']

    def get_profile_image(self, obj):
        if obj.user and hasattr(obj.user, 'profile') and obj.user.profile.image:
            return obj.user.profile.image.url
        return None

    def get_vendor_image(self, obj):
        if obj.vendor and obj.vendor.image:
            return obj.vendor.image.url
        return None




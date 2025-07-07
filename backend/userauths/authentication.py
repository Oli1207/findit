from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from .models import User
from django.conf import settings



class JWTAuthentication(BaseAuthentication):
    """
    Simple JWT authentication using DRF's BaseAuthentication.
    """

    def authenticate(self, request):
        # Récupérer le token de l'en-tête Authorization
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None  # Pas de token, pas d'authentification

        # Extraire le token
        token = auth_header.split(' ')[1]

        try:
            # Valider le token
            validated_token = AccessToken(token)

            # Récupérer l'utilisateur associé au token
            user_id = validated_token.get(settings.SIMPLE_JWT['USER_ID_CLAIM'])
            user = User.objects.get(pk=user_id)
            if not user.is_active:
                raise AuthenticationFailed('User is inactive.')

            return (user, validated_token)
        except Exception as e:
            raise AuthenticationFailed('Invalid or expired token.')

    def authenticate_header(self, request):
        """
        Définir un en-tête WWW-Authenticate pour les réponses 401.
        """
        return 'Bearer'

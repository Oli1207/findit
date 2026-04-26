from .base import *

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '192.168.1.15', '192.168.1.16']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME':     env.str('DB_NAME',     default='real_findit'),
        'USER':     env.str('DB_USER',     default='postgres'),
        'PASSWORD': env.str('DB_PASSWORD', default=''),
        'HOST':     env.str('DB_HOST',     default='localhost'),
        'PORT':     env.str('DB_PORT',     default='5432'),
    }
}

CORS_ALLOW_ALL_ORIGINS = True

# Emails affichés dans la console en dev
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

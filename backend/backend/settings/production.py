from .base import *

DEBUG = False

# ── Hosts & CORS (listes séparées par virgule dans .env) ──────────────────────
_allowed = env.str('ALLOWED_HOSTS', default='findit.deals,www.findit.deals,backend.findit.deals')
ALLOWED_HOSTS = [h.strip() for h in _allowed.split(',')]

_cors = env.str('CORS_ALLOWED_ORIGINS', default='https://findit.deals,https://www.findit.deals')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors.split(',')]

_csrf = env.str('CSRF_TRUSTED_ORIGINS',
                default='https://findit.deals,https://www.findit.deals,https://backend.findit.deals')
CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf.split(',')]

CORS_ALLOW_ALL_ORIGINS = False

# ── Base de données prod ───────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     env.str('DB_NAME'),
        'USER':     env.str('DB_USER'),
        'PASSWORD': env.str('DB_PASSWORD'),
        'HOST':     env.str('DB_HOST', default='localhost'),
        'PORT':     env.str('DB_PORT', default='5432'),
    }
}

# ── Sécurité ──────────────────────────────────────────────────────────────────
# Apache/LWS gère le SSL → Django ne redirige pas lui-même
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER        = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE          = True
CSRF_COOKIE_SECURE             = True
SECURE_HSTS_SECONDS            = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF    = True

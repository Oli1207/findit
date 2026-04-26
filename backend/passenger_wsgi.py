"""
Point d'entrée Phusion Passenger (LWS cPanel L).
Ce fichier doit se trouver dans le même dossier que manage.py.
"""
import os
import sys

# Ajoute le dossier backend/ au PYTHONPATH
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings.production'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

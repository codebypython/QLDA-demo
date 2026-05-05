from .base import *  # noqa: F401,F403
import os

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']
CORS_ALLOW_ALL_ORIGINS = True
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# For local development WITHOUT PostGIS/GDAL installed:
# Use standard PostgreSQL or SQLite as fallback.
# PostGIS features will be disabled in SQLite mode.
USE_POSTGIS = os.environ.get('USE_POSTGIS', 'false').lower() == 'true'

if not USE_POSTGIS:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    # Remove django.contrib.gis from INSTALLED_APPS when not using PostGIS
    INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'django.contrib.gis']

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

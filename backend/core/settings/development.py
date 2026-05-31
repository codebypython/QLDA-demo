from .base import *  # noqa: F401,F403
import os

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']
CORS_ALLOW_ALL_ORIGINS = True
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# For local development:
# - Set USE_POSTGIS=true in .env to use PostGIS (requires GDAL)
# - Set USE_POSTGRES=true in .env to use standard PostgreSQL (no GDAL required)
# - Default (both false): fallback to SQLite
USE_POSTGIS = os.environ.get('USE_POSTGIS', 'false').lower() == 'true'

# Windows Auto-detection for GDAL/PostGIS library paths
if os.name == 'nt' and USE_POSTGIS:
    import glob
    # Search in PostgreSQL bin directories
    pg_bin_paths = glob.glob(r"C:\Program Files\PostgreSQL\*\bin")
    # Search in OSGeo4W bin directories
    osgeo_paths = glob.glob(r"C:\OSGeo4W*\bin")
    
    search_paths = pg_bin_paths + osgeo_paths
    found_bin_dir = None
    gdal_dll = None
    geos_dll = None
    
    for p in search_paths:
        if os.path.isdir(p):
            # Scan for any gdal DLL and geos_c DLL
            gdal_files = glob.glob(os.path.join(p, "*gdal*.dll"))
            geos_files = glob.glob(os.path.join(p, "*geos_c*.dll"))
            if gdal_files and geos_files:
                found_bin_dir = p
                gdal_dll = gdal_files[0]
                geos_dll = geos_files[0]
                break
                
    if found_bin_dir and gdal_dll and geos_dll:
        # Add bin directory to PATH so DLL dependencies (PROJ, etc.) can be loaded
        os.environ['PATH'] = found_bin_dir + os.pathsep + os.environ['PATH']
        GDAL_LIBRARY_PATH = gdal_dll
        GEOS_LIBRARY_PATH = geos_dll

if not USE_POSTGIS:
    USE_POSTGRES = os.environ.get('USE_POSTGRES', 'false').lower() == 'true'
    if USE_POSTGRES:
        # Keep base config but use standard PostgreSQL engine
        DATABASES['default']['ENGINE'] = 'django.db.backends.postgresql'
    else:
        # Fallback to SQLite
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

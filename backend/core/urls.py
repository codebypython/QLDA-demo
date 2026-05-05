from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/', include('apps.users.admin_urls')),
    path('api/v1/assets/', include('apps.assets.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
    path('api/v1/maintenance/', include('apps.maintenance.urls')),
    path('api/v1/tasks/', include('apps.tasks.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/audit/', include('apps.audit.urls')),
    path('api/v1/areas/', include('apps.areas.urls')),
    path('api/v1/system/', include('apps.system.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, TaskforceListView

router = DefaultRouter()
router.register('admin/users', UserViewSet, basename='user')

urlpatterns = [
    path('users/', TaskforceListView.as_view(), name='users-list'),
    path('', include(router.urls)),
]

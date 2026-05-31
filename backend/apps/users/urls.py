from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, ProfileView, ChangePasswordView, ShareLocationView, ActiveLocationsView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change_password/', ChangePasswordView.as_view(), name='change_password'),
    path('share_location/', ShareLocationView.as_view(), name='share_location'),
    path('active_locations/', ActiveLocationsView.as_view(), name='active_locations'),
]

from rest_framework import viewsets
from .models import Area
from .serializers import AreaSerializer
from apps.users.permissions import ReadOnlyOrOperator


class AreaViewSet(viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [ReadOnlyOrOperator]

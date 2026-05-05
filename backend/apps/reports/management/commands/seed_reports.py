"""Seed demo incident reports across central Da Nang.
Usage: python manage.py seed_reports
"""
import os
import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.reports.models import IncidentReport
from apps.users.models import User

USE_POSTGIS = os.environ.get('USE_POSTGIS', 'false').lower() == 'true'

DEMO_REPORTS = [
    (16.0610, 108.2273, 'pothole', 'high', 'Ổ gà lớn ngay đầu Cầu Rồng phía Tây, gây mất an toàn giao thông'),
    (16.0664, 108.2095, 'littering', 'medium', 'Rác chất đống quanh chợ Cồn, mùi khó chịu'),
    (16.0697, 108.2170, 'broken_lamp', 'low', 'Cột đèn không sáng đoạn Bạch Đằng'),
    (16.0540, 108.2426, 'littering', 'high', 'Rác trên bãi biển Mỹ Khê sau cuối tuần'),
    (16.0463, 108.2208, 'flooding', 'critical', 'Ngập sâu sau mưa lớn, phía Tây cầu Trần Thị Lý'),
    (16.0729, 108.2161, 'crowd', 'medium', 'Tập trung đông khu chợ Hàn, ùn tắc cục bộ'),
    (16.0712, 108.2197, 'vandalism', 'medium', 'Bị vẽ bậy mặt tường Nhà hát Trưng Vương'),
    (16.0905, 108.2382, 'pothole', 'medium', 'Đường lên Linh Ứng có ổ gà'),
    (16.0670, 108.2350, 'broken_lamp', 'low', 'Đèn quảng cáo Helio bị nháy'),
    (16.0608, 108.2298, 'littering', 'low', 'Rác lề đường đầu Cầu Rồng phía Đông'),
    (16.0758, 108.2295, 'flooding', 'high', 'Ngập đoạn cầu Thuận Phước sau mưa'),
    (16.0428, 108.2168, 'crowd', 'low', 'Đông người trước Big C cuối tuần'),
]

STATUSES = ['pending', 'pending', 'assigned', 'in_progress', 'resolved']


class Command(BaseCommand):
    help = 'Seed demo incident reports in Da Nang'

    def handle(self, *args, **options):
        if IncidentReport.objects.count() >= len(DEMO_REPORTS):
            self.stdout.write(self.style.WARNING(
                f'Already has {IncidentReport.objects.count()} reports. Skipping.'
            ))
            return

        citizen = User.objects.filter(role='citizen').first()
        if not citizen:
            self.stdout.write(self.style.WARNING(
                'No citizen user found. Run `seed_users` first.'
            ))
            return

        now = timezone.now()
        for i, (lat, lng, itype, sev, desc) in enumerate(DEMO_REPORTS):
            kwargs = {
                'reporter': citizen,
                'incident_type': itype,
                'severity': sev,
                'description': desc,
                'status': random.choice(STATUSES),
                'ai_confidence': round(random.uniform(0.55, 0.95), 3),
            }
            if USE_POSTGIS:
                from django.contrib.gis.geos import Point
                kwargs['location'] = Point(lng, lat, srid=4326)
            else:
                kwargs['_latitude'] = lat
                kwargs['_longitude'] = lng

            r = IncidentReport.objects.create(**kwargs)
            r.created_at = now - timedelta(hours=random.randint(1, 240))
            r.save(update_fields=['created_at'])

        self.stdout.write(self.style.SUCCESS(
            f'Created {len(DEMO_REPORTS)} demo reports'
        ))

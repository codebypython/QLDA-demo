"""
Seed the database with sample assets in Da Nang City.
Usage: python manage.py seed_data
"""
import os
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from apps.assets.models import Asset
from apps.users.models import User

USE_POSTGIS = os.environ.get('USE_POSTGIS', 'false').lower() == 'true'

# ~30 real-world locations in central Da Nang (Hai Chau + Son Tra)
# Bbox: 16.04-16.10 N, 108.20-108.24 E
DANANG_LOCATIONS = [
    (16.0610, 108.2273, "Cầu Rồng - đầu phía Tây"),
    (16.0608, 108.2298, "Cầu Rồng - đầu phía Đông"),
    (16.0664, 108.2247, "Cầu Sông Hàn"),
    (16.0697, 108.2170, "Bờ sông Hàn (đoạn Bạch Đằng)"),
    (16.0655, 108.2188, "Đường Bạch Đằng - Trần Phú"),
    (16.0674, 108.2206, "Quảng trường 2/9"),
    (16.0739, 108.2240, "Cầu Tình Yêu (Love Bridge)"),
    (16.0749, 108.2240, "Bến du thuyền DHC"),
    (16.0470, 108.2080, "Công viên APEC"),
    (16.0512, 108.2095, "Bảo tàng Chăm"),
    (16.0689, 108.2232, "Trung tâm hành chính TP. Đà Nẵng"),
    (16.0712, 108.2197, "Nhà hát Trưng Vương"),
    (16.0729, 108.2161, "Chợ Hàn"),
    (16.0664, 108.2095, "Chợ Cồn"),
    (16.0628, 108.2155, "Công viên 29/3"),
    (16.0540, 108.2167, "Đường Nguyễn Văn Linh"),
    (16.0615, 108.2387, "Bãi biển Mỹ Khê - đoạn T20"),
    (16.0540, 108.2426, "Bãi biển Mỹ Khê - Phạm Văn Đồng"),
    (16.0463, 108.2470, "Bãi biển Non Nước"),
    (16.0820, 108.2350, "Sơn Trà - chân bán đảo"),
    (16.0905, 108.2382, "Sơn Trà - Linh Ứng (đầu đường)"),
    (16.0758, 108.2295, "Cầu Thuận Phước - đầu Tây"),
    (16.0755, 108.2369, "Cầu Thuận Phước - đầu Đông"),
    (16.0463, 108.2208, "Cầu Trần Thị Lý - đầu Tây"),
    (16.0461, 108.2295, "Cầu Trần Thị Lý - đầu Đông"),
    (16.0593, 108.2122, "ĐH Duy Tân - cơ sở Quang Trung"),
    (16.0571, 108.2058, "Đường Hùng Vương"),
    (16.0506, 108.2130, "Ga Đà Nẵng"),
    (16.0428, 108.2168, "Big C - Vĩnh Trung Plaza"),
    (16.0670, 108.2350, "Helio Center"),
    (16.0790, 108.2218, "Vincom Plaza Ngô Quyền"),
    (16.0660, 108.2260, "Đường Trần Phú - đoạn trung tâm"),
]


class Command(BaseCommand):
    help = 'Seed the database with sample assets in central Da Nang'

    def handle(self, *args, **options):
        if Asset.objects.count() >= len(DANANG_LOCATIONS):
            self.stdout.write(self.style.WARNING(
                f'Database already has {Asset.objects.count()} assets. Skipping.'
            ))
            return

        asset_types = list(Asset.AssetType.values)
        statuses = list(Asset.Status.values)

        for i, (lat, lng, name) in enumerate(DANANG_LOCATIONS):
            asset_type = asset_types[i % len(asset_types)]
            status_val = random.choices(statuses, weights=[70, 20, 10])[0]
            kwargs = {
                'name': f"{dict(Asset.AssetType.choices)[asset_type]} - {name}",
                'asset_type': asset_type,
                'status': status_val,
                'installed_at': date.today() - timedelta(days=random.randint(30, 1800)),
                'last_maintained_at': date.today() - timedelta(days=random.randint(1, 365)) if status_val != 'active' else None,
            }

            if USE_POSTGIS:
                from django.contrib.gis.geos import Point
                kwargs['location'] = Point(lng, lat, srid=4326)
            else:
                kwargs['_latitude'] = lat
                kwargs['_longitude'] = lng

            Asset.objects.create(**kwargs)

        self.stdout.write(self.style.SUCCESS(
            f'Created {len(DANANG_LOCATIONS)} assets in Da Nang'
        ))

        if not User.objects.filter(email='admin@infra.local').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@infra.local',
                password='admin123456',
                role='admin',
                full_name='System Admin',
            )
            self.stdout.write(self.style.SUCCESS(
                'Created admin user: admin@infra.local / admin123456'
            ))

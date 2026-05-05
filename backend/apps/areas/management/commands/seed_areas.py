"""Seed Da Nang districts as Areas. Usage: python manage.py seed_areas"""
from django.core.management.base import BaseCommand
from apps.areas.models import Area


# Approximate bboxes [min_lng, min_lat, max_lng, max_lat]
DA_NANG_DISTRICTS = [
    ('Hải Châu', 'hai-chau', 108.190, 16.040, 108.230, 16.080),
    ('Sơn Trà', 'son-tra', 108.225, 16.060, 108.310, 16.130),
    ('Thanh Khê', 'thanh-khe', 108.155, 16.060, 108.200, 16.100),
    ('Ngũ Hành Sơn', 'ngu-hanh-son', 108.230, 15.990, 108.275, 16.050),
    ('Liên Chiểu', 'lien-chieu', 108.110, 16.060, 108.170, 16.150),
    ('Cẩm Lệ', 'cam-le', 108.150, 16.000, 108.220, 16.060),
]


class Command(BaseCommand):
    help = 'Seed 6 Da Nang districts as Areas'

    def handle(self, *args, **options):
        created = 0
        for name, code, lng_min, lat_min, lng_max, lat_max in DA_NANG_DISTRICTS:
            _, was_created = Area.objects.update_or_create(
                code=code,
                defaults={
                    'name': name,
                    'bbox_min_lng': lng_min,
                    'bbox_min_lat': lat_min,
                    'bbox_max_lng': lng_max,
                    'bbox_max_lat': lat_max,
                },
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(DA_NANG_DISTRICTS)} areas ({created} new)'))

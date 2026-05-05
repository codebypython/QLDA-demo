"""Create demo users for each role.
Usage: python manage.py seed_users
"""
from django.core.management.base import BaseCommand
from apps.users.models import User


DEMO_USERS = [
    # role, email, username, full_name, password
    ('admin', 'admin@infra.local', 'admin', 'System Admin', 'admin123456'),
    ('operator', 'operator1@infra.local', 'operator1', 'Nguyễn Văn Operator', 'operator123'),
    ('operator', 'operator2@infra.local', 'operator2', 'Trần Thị Operator', 'operator123'),
    ('taskforce', 'tf1@infra.local', 'tf1', 'Lê Văn TaskForce', 'taskforce123'),
    ('taskforce', 'tf2@infra.local', 'tf2', 'Phạm Văn TaskForce', 'taskforce123'),
    ('taskforce', 'tf3@infra.local', 'tf3', 'Hoàng Thị TaskForce', 'taskforce123'),
    ('citizen', 'citizen@infra.local', 'citizen', 'Người Dân Demo', 'citizen123'),
]


class Command(BaseCommand):
    help = 'Seed demo users for each role'

    def handle(self, *args, **options):
        created = 0
        for role, email, username, full_name, password in DEMO_USERS:
            if User.objects.filter(email=email).exists():
                continue
            if role == 'admin':
                user = User.objects.create_superuser(
                    username=username, email=email, password=password,
                    role=role, full_name=full_name,
                )
            else:
                user = User.objects.create_user(
                    username=username, email=email, password=password,
                    role=role, full_name=full_name,
                )
            created += 1
            self.stdout.write(self.style.SUCCESS(f'Created {role}: {email} / {password}'))

        self.stdout.write(self.style.SUCCESS(f'Created {created} demo users'))

import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with role-based access."""
    class Role(models.TextChoices):
        CITIZEN = 'citizen', 'Công dân'
        OPERATOR = 'operator', 'Điều hành'
        TASKFORCE = 'taskforce', 'Đội tác nghiệp'
        ADMIN = 'admin', 'Quản trị viên'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CITIZEN)
    full_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN

    @property
    def is_operator(self):
        return self.role in (self.Role.OPERATOR, self.Role.ADMIN)

    @property
    def is_taskforce(self):
        return self.role == self.Role.TASKFORCE

"""RBAC regression tests for reports, tasks, maintenance, areas."""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.models import User
from apps.reports.models import IncidentReport
from apps.assets.models import Asset
from apps.tasks.models import Task
from apps.maintenance.models import MaintenanceLog


class ReportRBACTests(TestCase):
    def setUp(self):
        self.citizen = User.objects.create_user(
            email='cit1@test.local', username='cit1', password='pass12345', role='citizen',
        )
        self.operator = User.objects.create_user(
            email='op1@test.local', username='op1', password='pass12345', role='operator',
        )
        self.admin = User.objects.create_user(
            email='adm1@test.local', username='adm1', password='pass12345', role='admin',
        )
        self.taskforce = User.objects.create_user(
            email='tf1@test.local', username='tf1', password='pass12345', role='taskforce',
        )

        self.report_pending = IncidentReport.objects.create(
            reporter=self.citizen,
            _latitude=16.05,
            _longitude=108.22,
            status=IncidentReport.Status.PENDING,
            description='hello',
        )
        self.report_resolved = IncidentReport.objects.create(
            reporter=self.citizen,
            _latitude=16.05,
            _longitude=108.22,
            status=IncidentReport.Status.RESOLVED,
        )

        self.task_assigned = Task.objects.create(
            title='Linked task',
            report=self.report_pending,
            assigned_to=self.taskforce,
            created_by=self.operator,
            status=Task.Status.ASSIGNED,
        )

        self.asset = Asset.objects.create(name='T1', asset_type='bench', _latitude=16.06, _longitude=108.22)

    def test_citizen_can_patch_own_pending_report(self):
        c = APIClient()
        c.force_authenticate(user=self.citizen)
        url = f'/api/v1/reports/{self.report_pending.id}/'
        res = c.patch(url, {'description': 'updated', 'severity': 'high'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['description'], 'updated')

    def test_citizen_cannot_patch_resolved_report(self):
        c = APIClient()
        c.force_authenticate(user=self.citizen)
        url = f'/api/v1/reports/{self.report_resolved.id}/'
        res = c.patch(url, {'description': 'nope'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_taskforce_cannot_patch_report_body(self):
        c = APIClient()
        c.force_authenticate(user=self.taskforce)
        url = f'/api/v1/reports/{self.report_pending.id}/'
        res = c.patch(url, {'description': 'hack'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_taskforce_partial_update_task_status(self):
        c = APIClient()
        c.force_authenticate(user=self.taskforce)
        url = f'/api/v1/tasks/{self.task_assigned.id}/'
        res = c.patch(url, {'status': 'in_progress'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status'], 'in_progress')


class MaintenanceAndAreaRBACTests(TestCase):
    def setUp(self):
        self.operator = User.objects.create_user(
            email='op2@test.local', username='op2', password='pass12345', role='operator',
        )
        self.admin = User.objects.create_user(
            email='adm2@test.local', username='adm2', password='pass12345', role='admin',
        )
        self.taskforce = User.objects.create_user(
            email='tf2@test.local', username='tf2', password='pass12345', role='taskforce',
        )
        self.asset = Asset.objects.create(name='A-test', asset_type='bench', _latitude=16.06, _longitude=108.22)

        self.tf_log = MaintenanceLog.objects.create(
            asset=self.asset,
            technician=self.taskforce,
            status=MaintenanceLog.Status.SCHEDULED,
            notes='tf log',
        )

    def test_taskforce_list_maintenance_ok(self):
        c = APIClient()
        c.force_authenticate(user=self.taskforce)
        res = c.get('/api/v1/maintenance/')
        self.assertEqual(res.status_code, 200)

    def test_taskforce_can_patch_own_maintenance_notes(self):
        c = APIClient()
        c.force_authenticate(user=self.taskforce)
        url = f'/api/v1/maintenance/{self.tf_log.id}/'
        res = c.patch(url, {'notes': 'done field prep'}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_operator_cannot_write_area(self):
        c = APIClient()
        c.force_authenticate(user=self.operator)
        res = c.post('/api/v1/areas/', {
            'name': 'X',
            'code': 'x_unique_code_rbac_test',
            'bbox_min_lng': 108.0,
            'bbox_min_lat': 15.9,
            'bbox_max_lng': 108.5,
            'bbox_max_lat': 16.2,
        }, format='json')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_write_area(self):
        c = APIClient()
        c.force_authenticate(user=self.admin)
        res = c.post('/api/v1/areas/', {
            'name': 'Y',
            'code': 'y_unique_code_admin_rbac_test',
            'bbox_min_lng': 108.0,
            'bbox_min_lat': 15.9,
            'bbox_max_lng': 108.5,
            'bbox_max_lat': 16.2,
        }, format='json')
        self.assertEqual(res.status_code, 201)

"""
Master Seeding Script for InfraWatch Da Nang
Usage: python manage.py seed_demo_all
"""
import os
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.users.models import User
from apps.areas.models import Area
from apps.assets.models import Asset
from apps.reports.models import IncidentReport
from apps.tasks.models import Task
from apps.maintenance.models import MaintenanceLog
from apps.comments.models import Comment
from apps.notifications.models import Notification
from apps.audit.models import ActivityLog
from apps.system.models import SystemSetting, DEFAULT_SETTINGS

USE_POSTGIS = os.environ.get('USE_POSTGIS', 'false').lower() == 'true'


def set_coordinates(obj, lat, lng):
    if USE_POSTGIS:
        from django.contrib.gis.geos import Point
        obj.location = Point(lng, lat, srid=4326)
    else:
        obj._latitude = lat
        obj._longitude = lng


class Command(BaseCommand):
    help = 'Wipe database and seed a highly comprehensive and realistic mock dataset for InfraWatch Da Nang demo'

    def handle(self, *args, **options):
        self.stdout.write("=========================================")
        self.stdout.write("STARTING DEMO DATABASE SEEDING PROCESS...")
        self.stdout.write("=========================================")

        # 1. Database Wipe (Ordered to avoid Foreign Key violations)
        self.stdout.write("1. Wiping old data...")
        Comment.objects.all().delete()
        Notification.objects.all().delete()
        ActivityLog.objects.all().delete()
        MaintenanceLog.objects.all().delete()
        Task.objects.all().delete()
        IncidentReport.objects.all().delete()
        Asset.objects.all().delete()
        Area.objects.all().delete()
        User.objects.all().delete()
        SystemSetting.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("   All existing database tables cleared!"))

        # 2. System Settings
        self.stdout.write("2. Seeding default system settings...")
        for key, val in DEFAULT_SETTINGS.items():
            SystemSetting.set(key, val)
        self.stdout.write(self.style.SUCCESS("   System settings initialized!"))

        # 3. Users
        self.stdout.write("3. Seeding users...")
        # Admins
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@infra.local',
            password='admin123456',
            role='admin',
            full_name='Lê Hoàng Admin',
        )
        # Operators
        op1 = User.objects.create_user(
            username='operator1',
            email='operator1@infra.local',
            password='operator123',
            role='operator',
            full_name='Nguyễn Văn Điều Hành',
        )
        op2 = User.objects.create_user(
            username='operator2',
            email='operator2@infra.local',
            password='operator123',
            role='operator',
            full_name='Trần Thị Kiểm Duyệt',
        )
        # TaskForce
        tf1 = User.objects.create_user(
            username='tf1',
            email='tf1@infra.local',
            password='taskforce123',
            role='taskforce',
            full_name='Trần Văn Đội 1 (Đường Bộ)',
        )
        tf2 = User.objects.create_user(
            username='tf2',
            email='tf2@infra.local',
            password='taskforce123',
            role='taskforce',
            full_name='Phạm Minh Đội 2 (Thiết Bị)',
        )
        tf3 = User.objects.create_user(
            username='tf3',
            email='tf3@infra.local',
            password='taskforce123',
            role='taskforce',
            full_name='Lê Hoàng Đội 3 (Môi Trường)',
        )
        # Citizens
        cit1 = User.objects.create_user(
            username='citizen',
            email='citizen@infra.local',
            password='citizen123',
            role='citizen',
            full_name='Đặng Hoàng Công Dân',
        )
        cit2 = User.objects.create_user(
            username='citizen1',
            email='citizen1@infra.local',
            password='citizen123',
            role='citizen',
            full_name='Lê Thị Dân Trí',
        )
        cit3 = User.objects.create_user(
            username='citizen2',
            email='citizen2@infra.local',
            password='citizen123',
            role='citizen',
            full_name='Nguyễn Hữu Báo Cáo',
        )
        cit4 = User.objects.create_user(
            username='citizen3',
            email='citizen3@infra.local',
            password='citizen123',
            role='citizen',
            full_name='Trần Minh Tuấn',
        )
        cit5 = User.objects.create_user(
            username='citizen4',
            email='citizen4@infra.local',
            password='citizen123',
            role='citizen',
            full_name='Phạm Thu Thảo',
        )
        self.stdout.write(self.style.SUCCESS("   Seeded 11 users with roles (Admin, Operator, TaskForce, Citizen)!"))

        # 4. Areas (Da Nang Districts)
        self.stdout.write("4. Seeding areas (Da Nang Districts)...")
        districts = [
            ('Hải Châu', 'hai-chau', 108.190, 16.040, 108.230, 16.080),
            ('Sơn Trà', 'son-tra', 108.225, 16.060, 108.310, 16.130),
            ('Thanh Khê', 'thanh-khe', 108.155, 16.060, 108.200, 16.100),
            ('Ngũ Hành Sơn', 'ngu-hanh-son', 108.230, 15.990, 108.275, 16.050),
            ('Liên Chiểu', 'lien-chieu', 108.110, 16.060, 108.170, 16.150),
            ('Cẩm Lệ', 'cam-le', 108.150, 16.000, 108.220, 16.060),
        ]
        area_objs = {}
        for name, code, lng_min, lat_min, lng_max, lat_max in districts:
            area = Area.objects.create(
                name=name,
                code=code,
                bbox_min_lng=lng_min,
                bbox_min_lat=lat_min,
                bbox_max_lng=lng_max,
                bbox_max_lat=lat_max,
            )
            area_objs[code] = area
        self.stdout.write(self.style.SUCCESS(f"   Seeded {len(districts)} districts/areas!"))

        # 5. Assets (Public Infrastructure Assets in Da Nang)
        self.stdout.write("5. Seeding infrastructure assets...")
        assets_data = [
            # Cột đèn (lamp)
            ('lamp', 'Cột đèn - Cầu Sông Hàn', 16.0664, 108.2247, 'active'),
            ('lamp', 'Cột đèn - Cầu Rồng (Đầu Tây)', 16.0610, 108.2273, 'active'),
            ('lamp', 'Cột đèn - Cầu Rồng (Đầu Đông)', 16.0608, 108.2298, 'active'),
            ('lamp', 'Cột đèn - Công viên APEC', 16.0470, 108.2080, 'damaged'),  # Story 2
            ('lamp', 'Cột đèn - Bờ sông Hàn Bạch Đằng', 16.0697, 108.2170, 'active'),
            ('lamp', 'Cột đèn - Cầu Thuận Phước', 16.0758, 108.2295, 'active'),
            ('lamp', 'Cột đèn - Đường Nguyễn Văn Linh', 16.0540, 108.2167, 'active'),

            # Ghế đá (bench)
            ('bench', 'Ghế đá - Công viên APEC', 16.0471, 108.2082, 'active'),
            ('bench', 'Ghế đá - Bờ sông Hàn Bạch Đằng', 16.0698, 108.2172, 'active'),
            ('bench', 'Ghế đá - Công viên 29/3', 16.0628, 108.2155, 'active'),
            ('bench', 'Ghế đá - Cầu Tình Yêu (Love Bridge)', 16.0739, 108.2240, 'active'),

            # Thùng rác (trash_can)
            ('trash_can', 'Thùng rác công cộng - Mỹ Khê T20', 16.0615, 108.2387, 'active'),  # Story 3
            ('trash_can', 'Thùng rác công cộng - Mỹ Khê Phạm Văn Đồng', 16.0540, 108.2426, 'active'),
            ('trash_can', 'Thùng rác công cộng - Chợ Hàn', 16.0729, 108.2161, 'active'),
            ('trash_can', 'Thùng rác công cộng - Chợ Cồn', 16.0664, 108.2095, 'active'),
            ('trash_can', 'Thùng rác công cộng - Bạch Đằng - Trần Phú', 16.0655, 108.2188, 'active'),

            # Nhà vệ sinh (toilet)
            ('toilet', 'Nhà vệ sinh công cộng - Công viên APEC', 16.0472, 108.2078, 'active'),
            ('toilet', 'Nhà vệ sinh công cộng - Bến du thuyền DHC', 16.0749, 108.2240, 'active'),
            ('toilet', 'Nhà vệ sinh công cộng - Bờ sông Hàn Bạch Đằng', 16.0699, 108.2168, 'active'),
            ('toilet', 'Nhà vệ sinh công cộng - Bãi biển Mỹ Khê T20', 16.0616, 108.2385, 'active'),

            # Cây xanh (tree)
            ('tree', 'Cây xanh - Bờ sông Hàn (đoạn Bạch Đằng)', 16.0697, 108.2171, 'damaged'),  # Story 5
            ('tree', 'Cây xanh - Đường Trần Phú', 16.0660, 108.2260, 'active'),
            ('tree', 'Cây xanh - Đường Hùng Vương', 16.0571, 108.2058, 'active'),
            ('tree', 'Cây xanh - Công viên 29/3', 16.0629, 108.2157, 'active'),

            # Biển báo (sign)
            ('sign', 'Biển chỉ dẫn - Cầu Rồng', 16.0611, 108.2272, 'active'),
            ('sign', 'Biển cấm đổ rác - Mỹ Khê', 16.0617, 108.2388, 'active'),
            ('sign', 'Biển báo - Cầu Thuận Phước (Đầu Tây)', 16.0759, 108.2294, 'active'),
            ('sign', 'Biển báo - Cầu Trần Thị Lý (Đầu Đông)', 16.0461, 108.2295, 'active'),
        ]
        asset_objs = {}
        for asset_type, name, lat, lng, status in assets_data:
            installed_days = random.randint(180, 720)
            asset = Asset(
                name=name,
                asset_type=asset_type,
                status=status,
                installed_at=date.today() - timedelta(days=installed_days),
                last_maintained_at=date.today() - timedelta(days=random.randint(30, 120)) if status == 'active' else None,
            )
            set_coordinates(asset, lat, lng)
            asset.save()
            asset_objs[name] = asset
        self.stdout.write(self.style.SUCCESS(f"   Seeded {len(assets_data)} assets in Da Nang map!"))

        # 6. Workflow Stories (IncidentReports, Tasks, MaintenanceLogs, Comments, Notifications, Audit)
        self.stdout.write("6. Seeding workflow stories...")

        now = timezone.now()

        # =========================================================================
        # STORY 1: Ổ gà Cầu Rồng đầu phía Tây (RESOLVED FLOW)
        # =========================================================================
        self.stdout.write("   - Seeding Story 1: Pothole at Cau Rong (Resolved Workflow)")
        r1 = IncidentReport(
            reporter=cit1,
            incident_type='pothole',
            severity='high',
            description='Ổ gà lớn ngay dốc lên Cầu Rồng phía Tây, rất sâu và nguy hiểm cho người đi xe máy vào ban đêm.',
            status='resolved',
            ai_confidence=0.925,
        )
        set_coordinates(r1, 16.0610, 108.2273)
        r1.save()
        r1.created_at = now - timedelta(days=5)
        r1.save(update_fields=['created_at'])

        # Task
        t1 = Task.objects.create(
            title='Sửa chữa ổ gà chân cầu Rồng (phía Tây)',
            description='Tiến hành khảo sát hiện trường, sử dụng nhựa đường để lấp hố, san phẳng dốc cầu Rồng đầu phía Tây bảo đảm giao thông an toàn.',
            report=r1,
            related_asset=asset_objs['Biển chỉ dẫn - Cầu Rồng'],
            location_latitude=16.0610,
            location_longitude=108.2273,
            assigned_to=tf1,
            created_by=op1,
            priority='high',
            status='completed',
            completed_at=now - timedelta(days=2),
            completion_notes='Đã sử dụng 30kg nhựa đường asphalt nóng lấp phẳng ổ gà, đầm nén chắc chắn. Hiện tại bề mặt cầu phẳng mịn, lưu thông an toàn.',
        )
        t1.created_at = now - timedelta(days=4)
        t1.save(update_fields=['created_at'])

        # Maintenance Log
        m1 = MaintenanceLog.objects.create(
            asset=asset_objs['Biển chỉ dẫn - Cầu Rồng'],
            report=r1,
            technician=tf1,
            status='completed',
            scheduled_at=now - timedelta(days=4),
            completed_at=now - timedelta(days=2),
            notes='Vá mặt đường nhựa dốc cầu Rồng. Sử dụng nhựa đường asphalt nóng và thiết bị đầm tay.',
        )
        m1.created_at = now - timedelta(days=4)
        m1.save(update_fields=['created_at'])

        # Comments
        Comment.objects.create(
            report=r1, author=cit1, body='Ổ gà rất to ở dốc cầu Rồng phía Tây đi rất ghê, suýt nữa tôi bị ngã tối qua.',
            created_at=now - timedelta(days=5)
        )
        Comment.objects.create(
            report=r1, author=op1, body='Cảm ơn thông tin của công dân. Chúng tôi đã lập tức bàn giao cho đội kỹ thuật số 1 kiểm tra sửa chữa.',
            created_at=now - timedelta(days=4)
        )
        Comment.objects.create(
            report=r1, author=tf1, body='Kỹ thuật viên Đội 1 đã tiếp nhận nhiệm vụ. Sẽ tiến hành mang thiết bị và nhựa đường ra khắc phục ngay trong hôm nay.',
            created_at=now - timedelta(days=4)
        )
        Comment.objects.create(
            report=r1, author=tf1, body='Đã xử lý xong ổ gà, bề mặt phẳng đẹp. Gửi ảnh nghiệm thu.',
            created_at=now - timedelta(days=2)
        )
        Comment.objects.create(
            report=r1, author=op1, body='Tuyệt vời! Báo cáo kỹ thuật đạt yêu cầu. Đóng sự cố này lại.',
            created_at=now - timedelta(days=2)
        )

        # Notifications
        Notification.notify(
            recipient=cit1, type='report_resolved',
            title='Báo cáo đã được xử lý thành công!',
            message='Sự cố "Ổ gà dốc cầu Rồng phía Tây" mà bạn báo cáo đã được Đội kỹ thuật sửa chữa hoàn tất. Xin cảm ơn sự chung tay của bạn!',
            link=f'/reports/{r1.id}'
        )
        Notification.notify(
            recipient=tf1, type='task_assigned',
            title='Nhiệm vụ sửa chữa mới',
            message='Bạn được giao sửa chữa ổ gà tại Cầu Rồng đầu phía Tây.',
            link=f'/reports/{r1.id}'
        )
        # Activity Logs
        ActivityLog.log(actor=cit1, verb='created', target_type='IncidentReport', target_id=r1.id, details={'title': 'Ổ gà dốc Cầu Rồng'})
        ActivityLog.log(actor=op1, verb='assigned', target_type='Task', target_id=t1.id, details={'assigned_to': tf1.full_name})
        ActivityLog.log(actor=tf1, verb='started', target_type='Task', target_id=t1.id)
        ActivityLog.log(actor=tf1, verb='completed', target_type='Task', target_id=t1.id)
        ActivityLog.log(actor=op1, verb='resolved', target_type='IncidentReport', target_id=r1.id)


        # =========================================================================
        # STORY 2: Đèn tắt ngóm ở công viên APEC (IN_PROGRESS FLOW)
        # =========================================================================
        self.stdout.write("   - Seeding Story 2: Broken lamp at APEC Park (In Progress Workflow)")
        r2 = IncidentReport(
            reporter=cit2,
            incident_type='broken_lamp',
            severity='medium',
            description='Cột đèn LED chiếu sáng ở khu trung tâm công viên APEC bị tắt ngóm từ tối qua, làm cả một khoảng công viên tối sầm rất nguy hiểm cho các cháu nhỏ vui chơi.',
            status='in_progress',
            ai_confidence=0.884,
        )
        set_coordinates(r2, 16.0470, 108.2080)
        r2.save()
        r2.created_at = now - timedelta(days=1)
        r2.save(update_fields=['created_at'])

        # Task
        t2 = Task.objects.create(
            title='Sửa chữa cột đèn không sáng Công viên APEC',
            description='Kiểm tra tủ điện điều khiển, dây cáp ngầm và thay thế bóng đèn LED 150W của cột đèn chiếu sáng công viên APEC bị hỏng.',
            report=r2,
            related_asset=asset_objs['Cột đèn - Công viên APEC'],
            location_latitude=16.0470,
            location_longitude=108.2080,
            assigned_to=tf2,
            created_by=op2,
            priority='medium',
            status='in_progress',
        )
        t2.created_at = now - timedelta(hours=18)
        t2.save(update_fields=['created_at'])

        # Comments
        Comment.objects.create(
            report=r2, author=cit2, body='Đèn hỏng làm tối cả một góc công viên, dạo này tối trẻ con chơi dễ va vấp ngã lắm.',
            created_at=now - timedelta(days=1)
        )
        Comment.objects.create(
            report=r2, author=op2, body='Chào công dân! Chúng tôi đã tiếp nhận báo cáo và đã phân phối Đội thiết bị đô thị (Đội 2) kiểm tra ngay lập tức.',
            created_at=now - timedelta(hours=18)
        )
        Comment.objects.create(
            report=r2, author=tf2, body='Đã nhận nhiệm vụ. Đang chuẩn bị bóng LED và thang nâng chuyên dụng, sẽ tiến hành sửa chữa trong chiều nay.',
            created_at=now - timedelta(hours=6)
        )

        # Notifications
        n2_tf = Notification.notify(
            recipient=tf2, type='task_assigned',
            title='Nhiệm vụ kỹ thuật mới',
            message='Bạn được giao sửa chữa bóng đèn hỏng tại Công viên APEC.',
            link=f'/reports/{r2.id}'
        )
        n2_tf.is_read = False
        n2_tf.save()

        # Activity Logs
        ActivityLog.log(actor=cit2, verb='created', target_type='IncidentReport', target_id=r2.id)
        ActivityLog.log(actor=op2, verb='assigned', target_type='Task', target_id=t2.id, details={'assigned_to': tf2.full_name})
        ActivityLog.log(actor=tf2, verb='in_progress', target_type='Task', target_id=t2.id)


        # =========================================================================
        # STORY 3: Rác bừa bãi tại bãi biển Mỹ Khê (ASSIGNED FLOW)
        # =========================================================================
        self.stdout.write("   - Seeding Story 3: Littering at My Khe Beach (Assigned Workflow)")
        r3 = IncidentReport(
            reporter=cit3,
            incident_type='littering',
            severity='high',
            description='Rác thải nhựa, ly nhựa, vỏ dừa ngập tràn bãi tắm Mỹ Khê đoạn T20 do du khách vứt bừa bãi sau đêm cuối tuần, mùi hôi khó chịu và làm xấu hình ảnh bãi biển đẹp.',
            status='assigned',
            ai_confidence=0.812,
        )
        set_coordinates(r3, 16.0615, 108.2387)
        r3.save()
        r3.created_at = now - timedelta(hours=8)
        r3.save(update_fields=['created_at'])

        # Task
        t3 = Task.objects.create(
            title='Thu gom rác và dọn vệ sinh bãi biển Mỹ Khê T20',
            description='Khảo sát bãi cát bãi tắm Mỹ Khê T20, thu gom sạch toàn bộ chai nhựa, bao nilon và rác hữu cơ, bổ sung thùng rác công cộng mới nếu cần.',
            report=r3,
            related_asset=asset_objs['Thùng rác công cộng - Mỹ Khê T20'],
            location_latitude=16.0615,
            location_longitude=108.2387,
            assigned_to=tf3,
            created_by=op1,
            priority='high',
            status='assigned',
        )
        t3.created_at = now - timedelta(hours=6)
        t3.save(update_fields=['created_at'])

        # Comments
        Comment.objects.create(
            report=r3, author=cit3, body='Bãi cát đầy túi nilon thế này làm cá chết mất, mong đội môi trường đi thu dọn sớm hộ.',
            created_at=now - timedelta(hours=8)
        )
        Comment.objects.create(
            report=r3, author=op1, body='Đã nhận tin từ người dân. Đã phân phối cho Đội môi trường đô thị (Đội 3) xuống thực hiện thu gom rác.',
            created_at=now - timedelta(hours=6)
        )

        # Notifications
        n3_tf = Notification.notify(
            recipient=tf3, type='task_assigned',
            title='Yêu cầu dọn dẹp khẩn cấp',
            message='Thu gom rác bãi tắm Mỹ Khê đoạn T20 bị phản ánh bừa bãi.',
            link=f'/reports/{r3.id}'
        )
        n3_tf.is_read = False
        n3_tf.save()

        # Activity Logs
        ActivityLog.log(actor=cit3, verb='created', target_type='IncidentReport', target_id=r3.id)
        ActivityLog.log(actor=op1, verb='assigned', target_type='Task', target_id=t3.id, details={'assigned_to': tf3.full_name})


        # =========================================================================
        # STORY 4: Báo cáo giả tụ tập tại Helio (REJECTED FLOW)
        # =========================================================================
        self.stdout.write("   - Seeding Story 4: Crowd false report at Helio (Rejected Workflow)")
        r4 = IncidentReport(
            reporter=cit4,
            incident_type='crowd',
            severity='low',
            description='Có nhóm thanh niên tụ tập cực kỳ đông trước trung tâm Helio, la hét ầm ĩ và đỗ xe tràn ra lòng đường gây cản trở giao thông nghiêm trọng.',
            status='rejected',
            ai_confidence=0.741,
        )
        set_coordinates(r4, 16.0670, 108.2350)
        r4.save()
        r4.created_at = now - timedelta(days=2)
        r4.save(update_fields=['created_at'])

        # Comments
        Comment.objects.create(
            report=r4, author=cit4, body='Gây mất trật tự nghiêm trọng tại lối ra vào Helio, mong dẹp ngay.',
            created_at=now - timedelta(days=2)
        )
        Comment.objects.create(
            report=r4, author=op1, body='Chúng tôi đã phối hợp với công an phường Hòa Cường Nam kiểm tra. Đây là Lễ hội Ẩm thực Đường phố cuối tuần được cấp phép chính thức. Người dân gửi xe đúng nơi quy định, lực lượng chức năng đang phân luồng giao thông tốt. Thông tin của công dân phản ánh chưa chính xác. Xin phép từ chối báo cáo sự cố này.',
            created_at=now - timedelta(days=1)
        )

        # Notifications
        n4_cit = Notification.notify(
            recipient=cit4, type='report_rejected',
            title='Báo cáo của bạn bị từ chối',
            message='Sự cố phản ánh tụ tập đông người tại Helio đã bị hủy bỏ do đây là sự kiện chính thức được thành phố phê duyệt hoạt động.',
            link=f'/reports/{r4.id}'
        )
        n4_cit.is_read = False
        n4_cit.save()

        # Activity Logs
        ActivityLog.log(actor=cit4, verb='created', target_type='IncidentReport', target_id=r4.id)
        ActivityLog.log(actor=op1, verb='rejected', target_type='IncidentReport', target_id=r4.id, details={'reason': 'Sự kiện được cấp phép'})


        # =========================================================================
        # STORY 5: Cây đổ đè biển chỉ dẫn Bạch Đằng (CRITICAL IN_PROGRESS)
        # =========================================================================
        self.stdout.write("   - Seeding Story 5: Fallen tree on Bach Dang street (Critical Workflow)")
        r5 = IncidentReport(
            reporter=cit5,
            incident_type='other',
            severity='critical',
            description='Mưa giông chiều nay làm một cành phượng cổ thụ rất lớn bị tét nhánh và đổ sập hoàn toàn xuống chắn hết vỉa hè đi bộ Bạch Đằng, đè móp méo biển chỉ dẫn du lịch. Cực kỳ nguy hiểm cho người đi đường!',
            status='in_progress',
            ai_confidence=0.963,
        )
        set_coordinates(r5, 16.0697, 108.2171)
        r5.save()
        r5.created_at = now - timedelta(hours=4)
        r5.save(update_fields=['created_at'])

        # Task
        t5 = Task.objects.create(
            title='Cắt tỉa cành cây phượng gãy đổ Bạch Đằng',
            description='Khẩn cấp mang cưa máy ra hiện trường cắt hạ cành cây bị gãy đổ, dọn dẹp lối đi cho người bộ hành, phục hồi biển chỉ dẫn giao thông du lịch.',
            report=r5,
            related_asset=asset_objs['Cây xanh - Bờ sông Hàn (đoạn Bạch Đằng)'],
            location_latitude=16.0697,
            location_longitude=108.2171,
            assigned_to=tf1,
            created_by=op1,
            priority='urgent',
            status='in_progress',
        )
        t5.created_at = now - timedelta(hours=3)
        t5.save(update_fields=['created_at'])

        # Comments
        Comment.objects.create(
            report=r5, author=cit5, body='Nhánh cây to lắm, đè sập biển báo móp méo rồi, nãy có người đi suýt đụng trúng!',
            created_at=now - timedelta(hours=4)
        )
        Comment.objects.create(
            report=r5, author=op1, body='ĐÂY LÀ SỰ CỐ KHẨN CẤP! Đã điều động Đội phản ứng nhanh số 1 chuẩn bị trang bị cứu hộ ra hiện trường cắt tỉa cây xanh để giải phóng mặt bằng gấp.',
            created_at=now - timedelta(hours=3)
        )
        Comment.objects.create(
            report=r5, author=tf1, body='Đội 1 đã đến hiện trường với xe cẩu và cưa xích. Đang thực hiện phân làn cảnh báo nguy hiểm và bắt đầu cắt nhỏ cành phượng.',
            created_at=now - timedelta(hours=2)
        )

        # Notifications
        n5_tf = Notification.notify(
            recipient=tf1, type='task_assigned',
            title='[KHẨN CẤP] Xử lý cây đổ Bạch Đằng',
            message='Hãy đến ngay vị trí Bạch Đằng giải phóng cành phượng đổ đè lối đi bộ.',
            link=f'/reports/{r5.id}'
        )
        n5_tf.is_read = False
        n5_tf.save()

        # Activity Logs
        ActivityLog.log(actor=cit5, verb='created', target_type='IncidentReport', target_id=r5.id)
        ActivityLog.log(actor=op1, verb='assigned', target_type='Task', target_id=t5.id, details={'priority': 'urgent'})
        ActivityLog.log(actor=tf1, verb='started', target_type='Task', target_id=t5.id)


        # =========================================================================
        # STORY 6: Proactive Maintenance Logs
        # =========================================================================
        self.stdout.write("   - Seeding Story 6: Proactive scheduled & completed maintenance logs")
        # Proactive maintenance 1: Completed 1 week ago
        m_pro1 = MaintenanceLog.objects.create(
            asset=asset_objs['Biển báo - Cầu Thuận Phước (Đầu Tây)'],
            technician=tf2,
            status='completed',
            scheduled_at=now - timedelta(days=8),
            completed_at=now - timedelta(days=7),
            notes='Sơn bảo trì định kỳ cọc tiêu biển chỉ dẫn và lau chùi bề mặt biển phản quang bị bám bụi xi măng gần chân cầu Thuận Phước.',
        )
        m_pro1.created_at = now - timedelta(days=8)
        m_pro1.save(update_fields=['created_at'])

        # Proactive maintenance 2: Scheduled next week
        m_pro2 = MaintenanceLog.objects.create(
            asset=asset_objs['Nhà vệ sinh công cộng - Bến du thuyền DHC'],
            technician=tf3,
            status='scheduled',
            scheduled_at=now + timedelta(days=5),
            notes='Bảo trì định kỳ hệ thống điện nước, thay thế vòi xịt nước bị rò rỉ và tổng vệ sinh tẩy rửa toàn diện phục vụ lễ hội bắn pháo hoa.',
        )

        # 7. Additional general random reports to make graphs and maps look lively!
        self.stdout.write("7. Seeding additional reports for dynamic analytics charts and maps...")
        
        # We will add 15 more random historical reports
        incident_types = ['pothole', 'littering', 'broken_lamp', 'vandalism', 'flooding', 'crowd', 'other']
        severities = ['low', 'medium', 'high', 'critical']
        statuses = ['resolved', 'resolved', 'resolved', 'resolved', 'in_progress', 'pending', 'rejected']
        
        additional_locations = [
            (16.0664, 108.2247, 'Cầu Sông Hàn', 'broken_lamp', 'Đèn chiếu sáng trang trí cầu bị nhấp nháy liên tục'),
            (16.0749, 108.2240, 'Bến du thuyền DHC', 'vandalism', 'Có hình vẽ graffiti bậy lên bờ kè khu vực lan can ngắm sông'),
            (16.0512, 108.2095, 'Bảo tàng Chăm', 'littering', 'Khách du lịch vứt vỏ hộp sữa nhiều trước cổng bảo tàng'),
            (16.0712, 108.2197, 'Nhà hát Trưng Vương', 'vandalism', 'Mặt kính quảng cáo nhà hát bị nứt vỡ lớn nghi bị phá'),
            (16.0729, 108.2161, 'Chợ Hàn', 'crowd', 'Chợ Hàn tắc cứng lối vào do xe taxi đỗ đón khách sai quy định'),
            (16.0664, 108.2095, 'Chợ Cồn', 'littering', 'Vỏ trái cây chất đống góc ngã tư Hùng Vương - Ông Ích Khiêm'),
            (16.0628, 108.2155, 'Công viên 29/3', 'other', 'Ghế đá khu vực hồ nước bị sụt lún chân kê nghiêng ngả'),
            (16.0540, 108.2167, 'Đường Nguyễn Văn Linh', 'flooding', 'Nước rút chậm ngập nhẹ lòng đường mép vỉa hè khi có mưa lớn'),
            (16.0790, 108.2218, 'Vincom Plaza Ngô Quyền', 'pothole', 'Có vết lún sâu mặt đường Ngô Quyền đoạn lối quay đầu xe'),
            (16.0571, 108.2058, 'Đường Hùng Vương', 'broken_lamp', 'Đèn hành lang vỉa hè phố mua sắm Hùng Vương tắt'),
            (16.0506, 108.2130, 'Ga Đà Nẵng', 'crowd', 'Hành khách dồn đông ngoài sảnh ga lúc tàu SE1 đến'),
            (16.0428, 108.2168, 'Big C - Vĩnh Trung Plaza', 'other', 'Biển báo giao thông rẽ phải trước siêu thị bị che khuất bởi tán cây'),
            (16.0461, 108.2295, 'Cầu Trần Thị Lý (Đầu Đông)', 'pothole', 'Ổ gà nhỏ xuất hiện dải phân cách giữa cầu Trần Thị Lý'),
            (16.0755, 108.2369, 'Cầu Thuận Phước (Đầu Đông)', 'flooding', 'Đọng vũng nước mưa lớn đầu cầu Thuận Phước phía Đông'),
            (16.0905, 108.2382, 'Sơn Trà - Linh Ứng (Đường lên)', 'pothole', 'Có đoạn sụt lún mép taluy đường Hoàng Sa dẫn lên chùa Linh Ứng'),
        ]

        citizens_pool = [cit1, cit2, cit3, cit4, cit5]
        operators_pool = [op1, op2]
        tfs_pool = [tf1, tf2, tf3]

        for i, (lat, lng, name, itype, desc) in enumerate(additional_locations):
            # Deterministic status so the demo matches
            st = statuses[i % len(statuses)]
            sev = random.choice(severities) if st != 'resolved' else random.choice(['low', 'medium', 'high'])
            reporter = citizens_pool[i % len(citizens_pool)]
            
            r = IncidentReport(
                reporter=reporter,
                incident_type=itype,
                severity=sev,
                description=f"{desc} tại khu vực {name}. Cần được kiểm tra.",
                status=st,
                ai_confidence=round(random.uniform(0.60, 0.99), 3),
            )
            set_coordinates(r, lat, lng)
            r.save()
            
            # Scatter created_at over the last 15 days
            created_days_ago = random.randint(1, 15)
            r.created_at = now - timedelta(days=created_days_ago)
            r.save(update_fields=['created_at'])
            
            # If resolved, we create a matching Task and MaintenanceLog to make it fully linked and operational
            if st == 'resolved':
                tf = tfs_pool[i % len(tfs_pool)]
                op = operators_pool[i % len(operators_pool)]
                
                # Find or assign a related asset
                matched_asset = None
                for asset in asset_objs.values():
                    if asset.asset_type == itype:
                        matched_asset = asset
                        break
                if not matched_asset:
                    matched_asset = random.choice(list(asset_objs.values()))
                
                task = Task.objects.create(
                    title=f"Khắc phục sự cố {r.get_incident_type_display()} - {name}",
                    description=f"Nhiệm vụ kiểm tra và xử lý dứt điểm: {r.description}",
                    report=r,
                    related_asset=matched_asset,
                    location_latitude=lat,
                    location_longitude=lng,
                    assigned_to=tf,
                    created_by=op,
                    priority=r.severity,
                    status='completed',
                    completed_at=r.created_at + timedelta(hours=random.randint(12, 48)),
                    completion_notes=f"Đã cử kỹ thuật xuống thực tế hiện trường. Tiến hành kiểm tra và khắc phục xong sự cố {r.get_incident_type_display()} tại {name} đạt yêu cầu.",
                )
                task.created_at = r.created_at
                task.save(update_fields=['created_at'])
                
                m_log = MaintenanceLog.objects.create(
                    asset=matched_asset,
                    report=r,
                    technician=tf,
                    status='completed',
                    scheduled_at=r.created_at,
                    completed_at=task.completed_at,
                    notes=f"Sửa chữa hoàn thành sự cố theo tin phản ánh số #{str(r.id)[:8]}. Kỹ thuật viên: {tf.full_name}.",
                )
                m_log.created_at = r.created_at
                m_log.save(update_fields=['created_at'])
                
                # Comment
                Comment.objects.create(
                    report=r, author=reporter, body=f"Đã phản ánh tình trạng này tại {name}. Chờ sửa chữa.",
                    created_at=r.created_at
                )
                Comment.objects.create(
                    report=r, author=tf, body="Đã khắc phục hoàn thành tại thực địa. Gửi nghiệm thu.",
                    created_at=task.completed_at
                )
                
                # Notification
                Notification.notify(
                    recipient=reporter, type='report_resolved',
                    title=f'Sự cố {r.get_incident_type_display()} đã xong',
                    message=f'Phản ánh của bạn về {r.get_incident_type_display()} tại {name} đã được xử lý xong.',
                    link=f'/reports/{r.id}'
                )

        self.stdout.write(self.style.SUCCESS(f"   Seeded {len(additional_locations)} additional dynamic reports and resolved pipelines!"))

        # Final Summary
        self.stdout.write("=========================================")
        self.stdout.write(self.style.SUCCESS("DATABASE SEEDING COMPLETED SUCCESSFULLY!"))
        self.stdout.write(self.style.SUCCESS(f"  - Users Created: {User.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  - Areas Created: {Area.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  - Assets Created: {Asset.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  - Reports Created: {IncidentReport.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  - Tasks Created: {Task.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  - Maintenance Logs: {MaintenanceLog.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  - Comments Created: {Comment.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  - Notifications Created: {Notification.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  - Activity Logs: {ActivityLog.objects.count()}"))
        self.stdout.write("=========================================")
        self.stdout.write("Use these credentials to test the roles:")
        self.stdout.write("  - Admin: admin@infra.local / admin123456")
        self.stdout.write("  - Operator 1: operator1@infra.local / operator123")
        self.stdout.write("  - Operator 2: operator2@infra.local / operator123")
        self.stdout.write("  - Taskforce 1: tf1@infra.local / taskforce123")
        self.stdout.write("  - Taskforce 2: tf2@infra.local / taskforce123")
        self.stdout.write("  - Taskforce 3: tf3@infra.local / taskforce123")
        self.stdout.write("  - Citizen 1: citizen@infra.local / citizen123")
        self.stdout.write("=========================================")

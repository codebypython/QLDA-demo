from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0003_task_related_asset'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='location_latitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='location_longitude',
            field=models.FloatField(blank=True, null=True),
        ),
    ]

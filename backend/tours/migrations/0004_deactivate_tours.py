from django.db import migrations

def deactivate_all_tours(apps, schema_editor):
    Tour = apps.get_model('tours', 'Tour')
    Tour.objects.all().update(is_active=False)

class Migration(migrations.Migration):

    dependencies = [
        ('tours', '0003_create_admin'),
    ]

    operations = [
        migrations.RunPython(deactivate_all_tours),
    ]

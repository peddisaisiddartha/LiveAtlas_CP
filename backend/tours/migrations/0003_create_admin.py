from django.db import migrations
from django.contrib.auth import get_user_model

def create_superuser(apps, schema_editor):
    User = get_user_model()

    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="StrongPassword123"
        )

class Migration(migrations.Migration):

    dependencies = [
        ('tours', '0002_tour_is_active'),
    ]

    operations = [
        migrations.RunPython(create_superuser),
    ]

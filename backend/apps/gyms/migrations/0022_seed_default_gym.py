from django.db import migrations

def create_default_gym(apps, schema_editor):
    Gym = apps.get_model('gyms', 'Gym')
    # Use get_or_create to be idempotent and safe across deployments
    Gym.objects.get_or_create(
        subdomain='for-you-1-bqij',
        defaults={
            'name': 'Default Gym',
            'is_active': True,
            'is_approved': True,
            'status': 'approved'
        }
    )

def remove_default_gym(apps, schema_editor):
    Gym = apps.get_model('gyms', 'Gym')
    Gym.objects.filter(subdomain='for-you-1-bqij').delete()

class Migration(migrations.Migration):

    dependencies = [
        ('gyms', '0021_alter_equipment_gym'),
    ]

    operations = [
        migrations.RunPython(create_default_gym, reverse_code=remove_default_gym),
    ]

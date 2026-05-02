from rest_framework import serializers
from gyms.models import Gym, Plan, GymRequest, GymFeatureConfig, Equipment, Announcement
from users.models import User

class GymSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gym
        fields = [
            "id", "name", "subdomain", "logo", "background_image", 
            "branding_image", "primary_color", "theme_settings", 
            "is_approved", "is_active", "is_configured", "owner"
        ]

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = "__all__"

class GymRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymRequest
        fields = "__all__"
        read_only_fields = ("status", "created_at", "updated_at")

class GymRequestAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymRequest
        fields = "__all__"

class GymFeatureConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymFeatureConfig
        fields = "__all__"

class GymOnboardingSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(write_only=True)
    owner_email = serializers.EmailField(write_only=True)
    owner_password = serializers.CharField(write_only=True)

    class Meta:
        model = Gym
        fields = ("id", "name", "subdomain", "is_configured", "owner_name", "owner_email", "owner_password")
        read_only_fields = ("id", "is_configured")
        extra_kwargs = {
            "subdomain": {"required": False, "allow_blank": True}
        }

    def validate_owner_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Owner email already taken.")
        return value

    def validate_subdomain(self, value):
        if Gym.objects.filter(subdomain=value).exists():
            raise serializers.ValidationError("Subdomain already taken.")
        return value


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = "__all__"
        read_only_fields = ("id", "gym", "created_at", "updated_at")

class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = "__all__"
        read_only_fields = ("id", "gym", "created_at", "updated_at")
class PublicGymRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymRequest
        fields = ("id", "name", "subdomain", "owner_name", "owner_email", "phone", "message")
    
    def validate_subdomain(self, value):
        if Gym.objects.filter(subdomain=value).exists():
            raise serializers.ValidationError("This subdomain is already taken.")
        if GymRequest.objects.filter(subdomain=value, status="pending").exists():
            raise serializers.ValidationError("A request for this subdomain is already pending.")
        return value

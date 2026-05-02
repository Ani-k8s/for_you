from __future__ import annotations

from rest_framework import serializers

from gyms.models import Gym
from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    gym = serializers.PrimaryKeyRelatedField(queryset=Gym.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Notification
        fields = ["id", "gym", "title", "message", "type", "is_read", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        user_gym = getattr(user, "gym", None)
        tenant = getattr(request, "tenant", None)
        if user_gym is None or tenant is None or user_gym.id != tenant.id:
            raise serializers.ValidationError({"detail": "Gym mismatch."})
        provided_gym = attrs.get("gym")
        if provided_gym is not None and provided_gym.id != user_gym.id:
            raise serializers.ValidationError({"detail": "Gym mismatch."})

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        gym = validated_data.pop("gym", None)
        if gym is None:
            # Owners/trainer/member notifications always belong to their gym.
            gym = getattr(user, "gym", None)
        if gym is None:
            raise serializers.ValidationError({"detail": "Gym is required."})

        return Notification.all_objects.create(gym=gym, **validated_data)


from __future__ import annotations

from rest_framework import serializers

from attendance.models import Attendance
from members.models import Member


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ["id", "gym", "member", "date", "check_in", "check_out", "created_at"]
        read_only_fields = ["id", "gym", "date", "check_in", "check_out", "created_at"]


class AttendanceActionSerializer(serializers.Serializer):
    # Use `all_objects` to avoid binding an empty tenant queryset at import time.
    member_id = serializers.PrimaryKeyRelatedField(
        source="member",
        queryset=Member.all_objects.all(),
    )


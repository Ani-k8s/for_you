from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "email"

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims for global visibility
        token['email'] = user.email
        token['role'] = user.role
        token['gym_id'] = str(user.gym.id) if user.gym else None
        return token

class TenantTokenObtainPairSerializer(CustomTokenObtainPairSerializer):
    """
    Serializer specifically for tenant-isolated logins.
    Validates that the user belongs to the current_tenant (passed via context).
    """
    def validate(self, attrs):
        tenant = self.context.get("tenant")
        if not tenant:
            raise serializers.ValidationError({"detail": "Tenant context missing.", "code": "tenant_missing"})

        # Standard simplejwt validation (authenticates via default user/pass)
        data = super().validate(attrs)

        # Post-authentication: Ensure the user belongs to the resolved tenant
        if self.user.role != "super_admin" and self.user.gym != tenant:
            raise serializers.ValidationError({
                "detail": "Account mismatch. You do not have access to this gym terminal.",
                "code": "invalid_gym_access"
            })

        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'role', 'first_name', 'last_name', 
            'gym', 'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']

class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'role', 'first_name', 'last_name', 
            'gym', 'is_active', 'password'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

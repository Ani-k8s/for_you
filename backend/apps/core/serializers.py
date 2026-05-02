from core.models import SupportConfig, Documentation, SupportMessage, SupportNode


class SupportConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportConfig
        fields = '__all__'


class SupportMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportMessage
        fields = ['id', 'text', 'role', 'created_at']
        read_only_fields = ['id', 'created_at']


class SupportNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportNode
        fields = '__all__'


class DocumentationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Documentation
        fields = '__all__'

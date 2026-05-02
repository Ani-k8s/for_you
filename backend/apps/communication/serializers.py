from rest_framework import serializers
from communication.models import ChatMessage
from users.models import User

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source="sender.email", read_only=True)
    sender_name = serializers.CharField(source="sender.first_name", read_only=True)
    recipient_name = serializers.CharField(source="recipient.first_name", read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = ["id", "gym", "sender", "sender_email", "sender_name", "recipient", "recipient_name", "content", "is_read", "created_at"]
        read_only_fields = ["id", "gym", "sender", "is_read", "created_at"]

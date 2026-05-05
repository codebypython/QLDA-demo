from rest_framework import serializers
from .models import Comment


class CommentSerializer(serializers.ModelSerializer):
    author_email = serializers.CharField(source='author.email', read_only=True, default='')
    author_name = serializers.CharField(source='author.full_name', read_only=True, default='')
    author_role = serializers.CharField(source='author.role', read_only=True, default='')

    class Meta:
        model = Comment
        fields = ['id', 'report', 'author', 'author_email', 'author_name', 'author_role', 'body', 'created_at']
        read_only_fields = ['id', 'report', 'author', 'created_at']

from django.db import models
from django.conf import settings


class ChatMessage(models.Model):
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='chat_messages'
    )
    task = models.ForeignKey(
        'projects.Task', null=True, blank=True, on_delete=models.CASCADE, related_name='chat_messages'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_messages'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        room = f"task {self.task_id}" if self.task_id else f"project {self.project_id}"
        return f"{self.author} → {room}: {self.content[:40]}"

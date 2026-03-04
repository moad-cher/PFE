from django.db import models
from django.conf import settings


class Notification(models.Model):
    class Type(models.TextChoices):
        TASK_ASSIGNED = 'task_assigned', 'Tâche assignée'
        TASK_UPDATED = 'task_updated', 'Tâche mise à jour'
        DEADLINE = 'deadline', 'Échéance proche'
        APPLICATION = 'application', 'Nouvelle candidature'
        INTERVIEW = 'interview', 'Entretien planifié'
        REWARD = 'reward', 'Récompense'

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                   related_name='notifications')
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    link = models.CharField(max_length=300, blank=True,
                             help_text="URL vers l'objet concerné")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_type_display()}] {self.title}"

from django.db import models
from django.conf import settings
from django.utils import timezone


class Project(models.Model):
    name = models.CharField(max_length=200, verbose_name="Nom du projet")
    description = models.TextField(blank=True, verbose_name="Description")
    start_date = models.DateField(verbose_name="Date de début")
    end_date = models.DateField(verbose_name="Date de fin")
    manager = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                 related_name='managed_projects')
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True,
                                     related_name='projects')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Projet"

    def __str__(self):
        return self.name

    @property
    def progress(self):
        total = self.tasks.count()
        if total == 0:
            return 0
        done = self.tasks.filter(status='done').count()
        return int((done / total) * 100)


class TaskStatus(models.Model):
    """Configurable task statuses (Kanban columns)."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='statuses')
    name = models.CharField(max_length=50)
    slug = models.SlugField(max_length=50)
    order = models.IntegerField(default=0)
    color = models.CharField(max_length=7, default='#3498db', help_text="Hex color")

    class Meta:
        ordering = ['order']
        verbose_name = "Statut de tâche"
        unique_together = ('project', 'slug')

    def __str__(self):
        return f"{self.name} ({self.project.name})"


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = 'low', 'Basse'
        MEDIUM = 'medium', 'Moyenne'
        HIGH = 'high', 'Haute'
        URGENT = 'urgent', 'Urgente'

    class TimeSlot(models.TextChoices):
        MORNING = 'morning', 'Matin'
        AFTERNOON = 'afternoon', 'Après-midi'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200, verbose_name="Titre")
    description = models.TextField(blank=True, verbose_name="Description")
    status = models.CharField(max_length=50, default='todo', verbose_name="Statut")
    priority = models.CharField(max_length=10, choices=Priority.choices,
                                 default=Priority.MEDIUM)
    time_slot = models.CharField(max_length=10, choices=TimeSlot.choices,
                                  blank=True, verbose_name="Créneau")
    assigned_to = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True,
                                          related_name='assigned_tasks')
    deadline = models.DateField(null=True, blank=True, verbose_name="Échéance")
    points = models.IntegerField(default=10, verbose_name="Points de récompense")
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', 'deadline']
        verbose_name = "Tâche"

    def __str__(self):
        return self.title

    @property
    def is_overdue(self):
        if self.deadline and self.status != 'done':
            return self.deadline < timezone.now().date()
        return False

    @property
    def deadline_approaching(self):
        if self.deadline and self.status != 'done':
            delta = (self.deadline - timezone.now().date()).days
            return 0 <= delta <= 2
        return False


class Comment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField(verbose_name="Commentaire")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.author.username}: {self.content[:50]}"


class RewardLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name='reward_logs')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True)
    points = models.IntegerField()
    reason = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"+{self.points} → {self.user.username}"


class ProjectConfig(models.Model):
    """Per-project settings configurable by the project manager."""
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='config')
    points_on_time = models.IntegerField(default=10, verbose_name="Points (livraison à temps)")
    points_late = models.IntegerField(default=3, verbose_name="Points (livraison en retard)")
    notify_deadline_days = models.IntegerField(default=2,
                                                verbose_name="Notifier N jours avant échéance")

    def __str__(self):
        return f"Config: {self.project.name}"

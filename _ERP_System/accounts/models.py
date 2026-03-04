from django.db import models
from django.contrib.auth.models import AbstractUser


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Nom du département")
    description = models.TextField(blank=True, verbose_name="Description")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Département"
        verbose_name_plural = "Départements"

    def __str__(self):
        return self.name


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrateur'
        HR_MANAGER = 'hr_manager', 'Responsable RH'
        PROJECT_MANAGER = 'project_manager', 'Chef de Projet'
        TEAM_MEMBER = 'team_member', "Membre d'Équipe"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TEAM_MEMBER)
    skills = models.TextField(blank=True, help_text="Compétences séparées par des virgules")
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    reward_points = models.IntegerField(default=0)
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='members', verbose_name="Département"
    )

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_hr(self):
        return self.role == self.Role.HR_MANAGER

    @property
    def is_project_manager(self):
        return self.role == self.Role.PROJECT_MANAGER

    @property
    def is_team_member(self):
        return self.role == self.Role.TEAM_MEMBER

    @property
    def skills_list(self):
        return [s.strip() for s in self.skills.split(',') if s.strip()]

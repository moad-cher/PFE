from django.db import models
from django.conf import settings
from django.utils import timezone


class JobPosting(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Brouillon'
        PUBLISHED = 'published', 'Publiée'
        PAUSED = 'paused', 'En pause'
        CLOSED = 'closed', 'Clôturée'

    class ContractType(models.TextChoices):
        CDI = 'cdi', 'CDI'
        CDD = 'cdd', 'CDD'
        STAGE = 'stage', 'Stage'
        FREELANCE = 'freelance', 'Freelance'

    title = models.CharField(max_length=200, verbose_name="Titre du poste")
    description = models.TextField(verbose_name="Description")
    required_skills = models.TextField(verbose_name="Compétences requises",
                                       help_text="Séparées par des virgules")
    contract_type = models.CharField(max_length=20, choices=ContractType.choices,
                                      default=ContractType.CDI)
    location = models.CharField(max_length=200, blank=True, verbose_name="Lieu")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    deadline = models.DateField(verbose_name="Date limite")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                    related_name='job_postings')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Offre d'emploi"
        verbose_name_plural = "Offres d'emploi"

    def __str__(self):
        return self.title

    @property
    def skills_list(self):
        return [s.strip() for s in self.required_skills.split(',') if s.strip()]

    @property
    def application_count(self):
        return self.applications.count()

    @property
    def is_open(self):
        return self.status == self.Status.PUBLISHED and self.deadline >= timezone.now().date()


class Application(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        REVIEWED = 'reviewed', 'Examinée'
        INTERVIEW = 'interview', 'Entretien planifié'
        ACCEPTED = 'accepted', 'Acceptée'
        REJECTED = 'rejected', 'Rejetée'

    job = models.ForeignKey(JobPosting, on_delete=models.CASCADE, related_name='applications')
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    email = models.EmailField(verbose_name="Email")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    cover_letter = models.TextField(blank=True, verbose_name="Lettre de motivation")
    resume = models.FileField(upload_to='resumes/%Y/%m/', verbose_name="CV")
    resume_text = models.TextField(blank=True, verbose_name="Texte extrait du CV")
    ai_score = models.FloatField(null=True, blank=True, verbose_name="Score IA")
    ai_analysis = models.TextField(blank=True, verbose_name="Analyse IA")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-ai_score', '-created_at']
        verbose_name = "Candidature"

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.job.title}"

    @property
    def candidate_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def candidate_email(self):
        return self.email


class Interview(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE,
                                     related_name='interviews')
    date = models.DateField(verbose_name="Date")
    time = models.TimeField(verbose_name="Heure")
    location = models.CharField(max_length=200, blank=True, verbose_name="Lieu / Lien visio")
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'time']
        verbose_name = "Entretien"

    def __str__(self):
        return f"Entretien - {self.application} le {self.date}"

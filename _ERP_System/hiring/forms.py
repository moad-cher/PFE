from django import forms
from .models import JobPosting, Application, Interview

tw = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'


class JobPostingForm(forms.ModelForm):
    class Meta:
        model = JobPosting
        fields = ['title', 'description', 'required_skills', 'contract_type', 'location', 'status', 'deadline']
        widgets = {
            'title': forms.TextInput(attrs={'class': tw, 'placeholder': 'Titre du poste'}),
            'description': forms.Textarea(attrs={'class': tw, 'rows': 4}),
            'required_skills': forms.Textarea(attrs={'class': tw, 'rows': 2, 'placeholder': 'Python, Django, React...'}),
            'contract_type': forms.Select(attrs={'class': tw}),
            'location': forms.TextInput(attrs={'class': tw, 'placeholder': 'Ex: Casablanca, Télétravail...'}),
            'status': forms.Select(attrs={'class': tw}),
            'deadline': forms.DateInput(attrs={'class': tw, 'type': 'date'}),
        }


class ApplicationForm(forms.ModelForm):
    class Meta:
        model = Application
        fields = ['first_name', 'last_name', 'email', 'phone', 'cover_letter', 'resume']
        widgets = {
            'first_name': forms.TextInput(attrs={'class': tw, 'placeholder': 'Prénom'}),
            'last_name': forms.TextInput(attrs={'class': tw, 'placeholder': 'Nom'}),
            'email': forms.EmailInput(attrs={'class': tw, 'placeholder': 'email@example.com'}),
            'phone': forms.TextInput(attrs={'class': tw, 'placeholder': '+212 6...'}),
            'cover_letter': forms.Textarea(attrs={'class': tw, 'rows': 4}),
            'resume': forms.FileInput(attrs={'class': tw}),
        }


class InterviewForm(forms.ModelForm):
    class Meta:
        model = Interview
        fields = ['date', 'time', 'location', 'notes']
        widgets = {
            'date': forms.DateInput(attrs={'class': tw, 'type': 'date'}),
            'time': forms.TimeInput(attrs={'class': tw, 'type': 'time'}),
            'location': forms.TextInput(attrs={'class': tw, 'placeholder': 'Bureau / Lien Zoom'}),
            'notes': forms.Textarea(attrs={'class': tw, 'rows': 3}),
        }

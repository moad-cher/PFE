from django import forms
from .models import Project, Task, Comment, TaskStatus, ProjectConfig

tw = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'


class ProjectForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = ['name', 'description', 'start_date', 'end_date']
        widgets = {
            'name': forms.TextInput(attrs={'class': tw}),
            'description': forms.Textarea(attrs={'class': tw, 'rows': 3}),
            'start_date': forms.DateInput(attrs={'class': tw, 'type': 'date'}),
            'end_date': forms.DateInput(attrs={'class': tw, 'type': 'date'}),
        }


class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = ['title', 'description', 'status', 'priority', 'time_slot',
                  'assigned_to', 'deadline', 'points']
        widgets = {
            'title': forms.TextInput(attrs={'class': tw}),
            'description': forms.Textarea(attrs={'class': tw, 'rows': 3}),
            'status': forms.Select(attrs={'class': tw}),
            'priority': forms.Select(attrs={'class': tw}),
            'time_slot': forms.Select(attrs={'class': tw}),
            'assigned_to': forms.SelectMultiple(attrs={'class': tw}),
            'deadline': forms.DateInput(attrs={'class': tw, 'type': 'date'}),
            'points': forms.NumberInput(attrs={'class': tw}),
        }

    def __init__(self, *args, project=None, **kwargs):
        super().__init__(*args, **kwargs)
        if project:
            self.fields['assigned_to'].queryset = project.members.all()
            # Build status choices from project's configured statuses
            statuses = project.statuses.all()
            if statuses.exists():
                self.fields['status'] = forms.ChoiceField(
                    choices=[(s.slug, s.name) for s in statuses],
                    widget=forms.Select(attrs={'class': tw})
                )


class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['content']
        widgets = {
            'content': forms.Textarea(attrs={
                'class': tw, 'rows': 2, 'placeholder': 'Ajouter un commentaire...'
            }),
        }


class TaskStatusForm(forms.ModelForm):
    class Meta:
        model = TaskStatus
        fields = ['name', 'slug', 'order', 'color']
        widgets = {
            'name': forms.TextInput(attrs={'class': tw}),
            'slug': forms.TextInput(attrs={'class': tw}),
            'order': forms.NumberInput(attrs={'class': tw}),
            'color': forms.TextInput(attrs={'class': tw, 'type': 'color'}),
        }


class ProjectConfigForm(forms.ModelForm):
    class Meta:
        model = ProjectConfig
        fields = ['points_on_time', 'points_late', 'notify_deadline_days']
        widgets = {
            'points_on_time': forms.NumberInput(attrs={'class': tw}),
            'points_late': forms.NumberInput(attrs={'class': tw}),
            'notify_deadline_days': forms.NumberInput(attrs={'class': tw}),
        }

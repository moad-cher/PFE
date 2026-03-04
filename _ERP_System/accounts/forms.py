from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import User, Department

tw = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'


class LoginForm(AuthenticationForm):
    username = forms.CharField(widget=forms.TextInput(attrs={
        'class': tw,
        'placeholder': "Nom d'utilisateur",
    }))
    password = forms.CharField(widget=forms.PasswordInput(attrs={
        'class': tw,
        'placeholder': 'Mot de passe',
    }))


class RegisterForm(UserCreationForm):
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'role', 'skills')
        widgets = {
            'username': forms.TextInput(attrs={'class': tw}),
            'email': forms.EmailInput(attrs={'class': tw}),
            'first_name': forms.TextInput(attrs={'class': tw}),
            'last_name': forms.TextInput(attrs={'class': tw}),
            'role': forms.Select(attrs={'class': tw}),
            'skills': forms.Textarea(attrs={'class': tw, 'rows': 2, 'placeholder': 'Python, Django, React...'}),
        }


class ProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'skills', 'department', 'avatar']
        widgets = {
            'first_name': forms.TextInput(attrs={'class': tw, 'placeholder': 'Prénom'}),
            'last_name': forms.TextInput(attrs={'class': tw, 'placeholder': 'Nom'}),
            'email': forms.EmailInput(attrs={'class': tw, 'placeholder': 'email@exemple.com'}),
            'skills': forms.TextInput(attrs={'class': tw, 'placeholder': 'Python, Django, React...'}),
            'department': forms.Select(attrs={'class': tw}),
            'avatar': forms.FileInput(attrs={
                'class': 'block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100',
                'accept': 'image/*',
            }),
        }

from django import forms


class UploadForm(forms.Form):
    name = forms.CharField(max_length=255)
    category = forms.CharField(max_length=255, required=False)
    file = forms.FileField()

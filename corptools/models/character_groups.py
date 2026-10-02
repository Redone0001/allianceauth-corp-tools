import unicodedata

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _


def validate_group_name(value):
    if not value.strip() or len(value) > 60:
        raise ValidationError(_("Use a group name between 1 and 60 characters."))
    if any(unicodedata.category(char).startswith("C") or char in "<>" for char in value):
        raise ValidationError(_("Group names cannot contain control characters or angle brackets."))


class CharacterGroup(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=60, validators=[validate_group_name])
    characters = models.ManyToManyField("eveonline.EveCharacter", blank=True)

    class Meta:
        ordering = ["name", "pk"]
        constraints = [models.UniqueConstraint(fields=["owner", "name"], name="ct_character_group_owner_name")]

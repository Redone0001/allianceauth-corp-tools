from ninja import Field, Schema
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext as _

from corptools.api.helpers import resolve_character
from corptools.models import CharacterGroup
from corptools.models.character_groups import validate_group_name


class GroupInput(Schema):
    name: str = Field(min_length=1, max_length=60)


class CharacterGroupApiEndpoints:
    def __init__(self, api):
        def account(request, character_id, write=False):
            err, main, characters = resolve_character(request, character_id)
            if err:
                return err, None, None
            owner_id = main.character_ownership.user_id
            if write and owner_id != request.user.pk:
                return (403, _("Only the account owner can edit groups.")), None, None
            return None, owner_id, characters

        @api.get("account/{character_id}/groups", response={200: dict, 403: str}, tags=["Account"])
        def get_character_groups(request, character_id: int):
            err, owner_id, characters = account(request, character_id)
            if err:
                return err
            allowed = set(characters.values_list("character_id", flat=True))
            groups = CharacterGroup.objects.filter(owner_id=owner_id).prefetch_related("characters")
            return {
                "can_edit": owner_id == request.user.pk,
                "groups": [{"id": group.pk, "name": group.name,
                            "character_ids": [c.character_id for c in group.characters.all() if c.character_id in allowed]}
                           for group in groups],
                "characters": list(characters.order_by("character_name").values("character_id", "character_name")),
            }

        @api.post("account/{character_id}/groups", response={200: dict, 400: str, 403: str}, tags=["Account"])
        def create_character_group(request, character_id: int, payload: GroupInput):
            err, owner_id, _chars = account(request, character_id, write=True)
            if err:
                return err
            name = payload.name.strip()
            try:
                validate_group_name(payload.name)
            except ValidationError as exc:
                return 400, exc.messages[0]
            with transaction.atomic():
                get_user_model().objects.select_for_update().get(pk=owner_id)
                groups = CharacterGroup.objects.filter(owner_id=owner_id)
                if groups.count() >= 50:
                    return 400, _("You can create up to 50 groups.")
                if groups.filter(name__iexact=name).exists():
                    return 400, _("A group with this name already exists.")
                group = groups.create(owner_id=owner_id, name=name)
            return {"id": group.pk}

        @api.delete("account/{character_id}/groups/{group_id}", response={200: dict, 403: str}, tags=["Account"])
        def delete_character_group(request, character_id: int, group_id: int):
            err, owner_id, _chars = account(request, character_id, write=True)
            if err:
                return err
            get_object_or_404(CharacterGroup, pk=group_id, owner_id=owner_id).delete()
            return {"success": True}

        def membership(request, character_id, group_id, member_id, remove=False):
            err, owner_id, characters = account(request, character_id, write=True)
            if err:
                return err
            group = get_object_or_404(CharacterGroup, pk=group_id, owner_id=owner_id)
            character = get_object_or_404(characters, character_id=member_id)
            if remove:
                group.characters.remove(character)
            else:
                group.characters.add(character)
            return {"success": True}

        @api.put("account/{character_id}/groups/{group_id}/characters/{member_id}", response={200: dict, 403: str}, tags=["Account"])
        def add_group_character(request, character_id: int, group_id: int, member_id: int):
            return membership(request, character_id, group_id, member_id)

        @api.delete("account/{character_id}/groups/{group_id}/characters/{member_id}", response={200: dict, 403: str}, tags=["Account"])
        def remove_group_character(request, character_id: int, group_id: int, member_id: int):
            return membership(request, character_id, group_id, member_id, remove=True)

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from ninja import NinjaAPI
from ninja.testing import TestClient

from allianceauth.authentication.models import CharacterOwnership
from allianceauth.eveonline.models import EveCharacter
from corptools.api.character.groups import CharacterGroupApiEndpoints
from corptools.models import CharacterGroup


class CharacterGroupTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_user(username="group-owner")
        cls.other = get_user_model().objects.create_user(username="other-owner")
        cls.character = EveCharacter.objects.create(
            character_id=9001, character_name="Group Pilot", corporation_id=1,
            corporation_name="Corp", corporation_ticker="C")
        cls.foreign = EveCharacter.objects.create(
            character_id=9002, character_name="Other Pilot", corporation_id=1,
            corporation_name="Corp", corporation_ticker="C")
        CharacterOwnership.objects.create(user=cls.owner, character=cls.character, owner_hash="group-owner")
        CharacterOwnership.objects.create(user=cls.other, character=cls.foreign, owner_hash="other-owner")

    def setUp(self):
        api = NinjaAPI(urls_namespace="group-tests")
        CharacterGroupApiEndpoints(api)
        self.client = TestClient(api)
        self.resolve = patch("corptools.api.character.groups.resolve_character", return_value=(
            None, self.character, EveCharacter.objects.filter(pk=self.character.pk)))
        self.resolve.start()
        self.addCleanup(self.resolve.stop)
        self.path = "/account/9001/groups"

    def create(self, name="My pilots"):
        return self.client.post(self.path, json={"name": name}, user=self.owner)

    def test_names_are_trimmed_and_duplicates_rejected(self):
        self.assertEqual(self.create("  My pilots  ").status_code, 200)
        self.assertEqual(CharacterGroup.objects.get().name, "My pilots")
        self.assertEqual(self.create("my PILOTS").status_code, 400)

    def test_invalid_names_and_limit(self):
        for name in (" ", "<script>", "Pilot\x00", "Pilot\u202e"):
            with self.subTest(name=name):
                self.assertEqual(self.create(name).status_code, 400)
        self.assertEqual(self.create("a" * 61).status_code, 422)
        self.assertEqual(self.create("a" * 60).status_code, 200)
        CharacterGroup.objects.bulk_create([CharacterGroup(owner=self.owner, name=f"Group {i}") for i in range(49)])
        self.assertEqual(self.create("Too many").status_code, 400)

    def test_membership_and_delete(self):
        group_id = self.create().json()["id"]
        path = f"{self.path}/{group_id}/characters/9001"
        self.assertEqual(self.client.put(path, user=self.owner).status_code, 200)
        self.assertEqual(self.client.put(path, user=self.owner).status_code, 200)
        self.assertEqual(self.client.get(self.path, user=self.owner).json()["groups"][0]["character_ids"], [9001])
        self.assertEqual(self.client.delete(path, user=self.owner).status_code, 200)
        self.assertFalse(CharacterGroup.objects.get().characters.exists())
        self.assertEqual(self.client.delete(f"{self.path}/{group_id}", user=self.owner).status_code, 200)
        self.assertFalse(CharacterGroup.objects.exists())

    def test_cannot_edit_other_account_or_add_foreign_character(self):
        group_id = self.create().json()["id"]
        self.assertEqual(self.client.post(self.path, json={"name": "Other"}, user=self.other).status_code, 403)
        for method in (self.client.put, self.client.delete):
            self.assertEqual(method(f"{self.path}/{group_id}/characters/9001", user=self.other).status_code, 403)
        self.assertEqual(self.client.delete(f"{self.path}/{group_id}", user=self.other).status_code, 403)
        self.assertEqual(self.client.put(f"{self.path}/{group_id}/characters/9002", user=self.owner).status_code, 404)
        foreign_group = CharacterGroup.objects.create(owner=self.other, name="Foreign")
        self.assertEqual(self.client.delete(f"{self.path}/{foreign_group.pk}", user=self.owner).status_code, 404)

    def test_read_permission_and_transferred_characters(self):
        group = CharacterGroup.objects.create(owner=self.owner, name="Pilots")
        group.characters.add(self.character, self.foreign)
        response = self.client.get(self.path, user=self.other)
        self.assertFalse(response.json()["can_edit"])
        self.assertEqual(response.json()["groups"][0]["character_ids"], [9001])
        with patch("corptools.api.character.groups.resolve_character", return_value=((403, "Denied"), None, None)):
            self.assertEqual(self.client.get(self.path, user=self.other).status_code, 403)

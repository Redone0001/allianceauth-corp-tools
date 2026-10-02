from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import corptools.models.character_groups


class Migration(migrations.Migration):
    dependencies = [
        ("corptools", "0136_merge_upstream_3_4"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name="CharacterGroup",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=60, validators=[corptools.models.character_groups.validate_group_name])),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ("characters", models.ManyToManyField(blank=True, to="eveonline.evecharacter")),
            ],
            options={"ordering": ["name", "pk"], "constraints": [models.UniqueConstraint(fields=("owner", "name"), name="ct_character_group_owner_name")]},
        ),
    ]

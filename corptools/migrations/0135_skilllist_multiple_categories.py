from django.db import migrations, models


def migrate_categories(apps, schema_editor):
    SkillList = apps.get_model("corptools", "SkillList")
    SkillListCategory = apps.get_model("corptools", "SkillListCategory")

    skill_lists = SkillList.objects.exclude(category__isnull=True).exclude(category="")
    for skill_list in skill_lists.iterator():
        name = skill_list.category.strip()
        if name:
            category, _ = SkillListCategory.objects.get_or_create(name=name)
            skill_list.categories.add(category)


def restore_single_category(apps, schema_editor):
    SkillList = apps.get_model("corptools", "SkillList")

    for skill_list in SkillList.objects.prefetch_related("categories").iterator(
        chunk_size=2000
    ):
        skill_list.category = skill_list.categories.order_by("name").values_list(
            "name", flat=True
        ).first()
        skill_list.save(update_fields=["category"])


class Migration(migrations.Migration):

    dependencies = [
        ("corptools", "0134_merge_upstream_wallet_indexes"),
    ]

    operations = [
        migrations.CreateModel(
            name="SkillListCategory",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=255, unique=True)),
            ],
            options={
                "verbose_name_plural": "Skill list categories",
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="skilllist",
            name="categories",
            field=models.ManyToManyField(
                blank=True,
                related_name="skill_lists",
                to="corptools.skilllistcategory",
            ),
        ),
        migrations.RunPython(migrate_categories, restore_single_category),
        migrations.RemoveField(
            model_name="skilllist",
            name="category",
        ),
    ]

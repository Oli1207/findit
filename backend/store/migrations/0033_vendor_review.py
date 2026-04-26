# Generated manually on 2026-04-25

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0032_cartorder_escrow_status_cartorder_paystack_ref_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='VendorReview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.IntegerField(choices=[(1, '1 ★'), (2, '2 ★'), (3, '3 ★'), (4, '4 ★'), (5, '5 ★')])),
                ('comment', models.TextField(blank=True)),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='vendor_reviews',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('vendor', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reviews',
                    to='vendor.vendor',
                )),
            ],
            options={
                'verbose_name_plural': 'Vendor Reviews',
                'ordering': ['-date'],
                'unique_together': {('user', 'vendor')},
            },
        ),
    ]

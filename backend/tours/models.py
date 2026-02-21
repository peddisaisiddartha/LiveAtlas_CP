from django.db import models
from django.contrib.auth.models import User

# Profile to distinguish Guide vs Tourist
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    is_guide = models.BooleanField(default=False)
    bio = models.TextField(blank=True)

    def __str__(self):
        return self.user.username

# The Tour Model
class Tour(models.Model):
    guide = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tours')
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    thumbnail = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # This is the new field to track if the call is live
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title

# Bookings Model
class Booking(models.Model):
    tourist = models.ForeignKey(User, on_delete=models.CASCADE)
    tour = models.ForeignKey(Tour, on_delete=models.CASCADE)
    date_booked = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='confirmed')

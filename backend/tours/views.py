from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from .models import Tour
import json


def get_tours(request):
    # Only show tours that are Active (is_active=True)
    tours = list(Tour.objects.filter(is_active=True).values('id', 'title', 'description', 'guide__username', 'price', 'thumbnail'))
    return JsonResponse(tours, safe=False)

@csrf_exempt
def create_tour(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        description = request.POST.get('description')
        price = request.POST.get('price')
        thumbnail = request.FILES.get('thumbnail')

        guide = User.objects.first()
        if not guide:
            guide = User.objects.create_user(username='admin', password='password')

        tour = Tour.objects.create(
            guide=guide,
            title=title,
            description=description,
            price=price,
            thumbnail=thumbnail,
            is_active=True # Default to True
        )
        return JsonResponse({'status': 'success', 'tour_id': tour.id})

@csrf_exempt
def end_tour(request, tour_id):
    if request.method == 'POST':
        tour = get_object_or_404(Tour, id=tour_id)
        tour.is_active = False # Hides it from the dashboard
        tour.save()
        return JsonResponse({'status': 'success'})


def create_admin_once(request):
    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser(
            username="admin",
            email="admin@test.com",
            password="admin123"
        )
        return HttpResponse("Admin created")
    return HttpResponse("Admin already exists")

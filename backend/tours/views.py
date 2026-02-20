from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from .models import Tour
import json


def get_tours(request):
    tours = Tour.objects.filter(is_active=True)
    data = []

    for tour in tours:
        data.append({
            "id": tour.id,
            "title": tour.title,
            "description": tour.description,
            "guide_username": tour.guide.username,
            "price": str(tour.price),
            "thumbnail": request.build_absolute_uri(tour.thumbnail.url) if tour.thumbnail else None
        })

    return JsonResponse(data, safe=False)


@csrf_exempt
def create_tour(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        title = request.POST.get("title")
        description = request.POST.get("description")
        price = request.POST.get("price")
        thumbnail = request.FILES.get("thumbnail")

        guide = User.objects.first()
        if not guide:
            guide = User.objects.create_user(
                username="admin",
                password="password"
            )

        tour = Tour.objects.create(
            guide=guide,
            title=title,
            description=description,
            price=price,
            thumbnail=thumbnail,
            is_active=True
        )

        return JsonResponse({"status": "success", "tour_id": tour.id})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
def end_tour(request, tour_id):
    if request.method == 'POST':
        try:
            tour = Tour.objects.get(id=tour_id)
            tour.is_active = False
            tour.save()
            return JsonResponse({"status": "success"})
        except Tour.DoesNotExist:
            return JsonResponse({"error": "Tour not found"}, status=404)

    return JsonResponse({"error": "Invalid method"}, status=405)

def create_admin_once(request):
    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser(
            username="admin",
            email="admin@test.com",
            password="admin123"
        )
    return JsonResponse({"status": "Admin created"})

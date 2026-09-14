from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from .models import Tour
import json
import cloudinary.uploader
import os
import requests


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
           "thumbnail": tour.thumbnail if tour.thumbnail else None
        })

    return JsonResponse(data, safe=False)


@csrf_exempt
def create_tour(request):

    try:

        if request.method != "POST":
            return JsonResponse({"error": "Only POST allowed"}, status=405)

        title = request.POST.get("title")
        description = request.POST.get("description")
        price = request.POST.get("price")
        thumbnail = request.FILES.get("thumbnail")

        print("TITLE:", title)
        print("DESCRIPTION:", description)
        print("PRICE:", price)
        print("THUMBNAIL:", thumbnail)

        guide = User.objects.first()

        if not guide:
            guide = User.objects.create_user(
                username="admin",
                password="password"
            )

        thumbnail_url = None

        if thumbnail:
            upload_result = cloudinary.uploader.upload(thumbnail)
            thumbnail_url = upload_result.get("secure_url")

        tour = Tour.objects.create(
            title=title,
            description=description,
            price=price,
            thumbnail=thumbnail_url,
            guide=guide
        )

        return JsonResponse({
            "status": "success",
            "tour_id": tour.id
        })

    except Exception as e:

        print("CREATE TOUR ERROR:", str(e))

        return JsonResponse({
            "error": str(e)
        })


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

def get_turn_credentials(request):
    if request.method != "GET":
        return JsonResponse({"error": "Only GET allowed"}, status=405)

    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    key_id = os.getenv("CLOUDFLARE_TURN_KEY_ID")
    api_token = os.getenv("CLOUDFLARE_TURN_API_TOKEN")

    if not account_id or not key_id or not api_token:
        return JsonResponse(
            {"error": "Cloudflare TURN configuration is missing"},
            status=500,
        )

    url = (
        f"https://api.cloudflare.com/client/v4/accounts/"
        f"{account_id}/calls/turn/credentials"
    )

    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        },
        json={
            "ttl": 3600,
            "key_id": key_id,
        },
        timeout=10,
    )

    if not response.ok:
        return JsonResponse(
            {
                "error": "Failed to generate TURN credentials",
                "details": response.text,
            },
            status=response.status_code,
        )

    return JsonResponse(response.json())

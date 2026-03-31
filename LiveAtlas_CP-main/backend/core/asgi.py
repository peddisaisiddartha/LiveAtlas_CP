import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import re_path
from tours.consumers import TourConsumer # Import your consumer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            # This regex matches ws://localhost:8000/ws/tours/ANYTHING/
            re_path(r'ws/tours/(?P<room_name>[\w-]+)/$', TourConsumer.as_asgi()),
        ])
    ),
})
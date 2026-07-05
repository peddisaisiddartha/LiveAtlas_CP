
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class TourConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # 1. Get the room ID from the URL (e.g., "hyd-tour-1")
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'tour_{self.room_name}'

        # 2. Join the "Room" (a group of users talking to each other)
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave the room
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket (Frontend)
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        # Send this message to everyone else in the room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'video_signal',
                'data': data,
                'sender_channel_name': self.channel_name
            }
        )

    # Receive message from Room Group
    async def video_signal(self, event):
        # Send message to WebSocket, BUT NOT back to the sender
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps(event['data']))
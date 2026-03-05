import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return

        kwargs = self.scope['url_route']['kwargs']
        self.room_type = kwargs['room_type']   # 'project' or 'task'
        self.room_pk   = int(kwargs['pk'])
        self.room_group = f'chat_{self.room_type}_{self.room_pk}'

        if not await self._check_access():
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group'):
            await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        content = data.get('content', '').strip()
        if not content:
            return
        msg = await self._save_message(content)
        await self.channel_layer.group_send(self.room_group, {
            'type': 'chat_message',
            **msg,
        })

    async def chat_message(self, event):
        """Forward a group broadcast to this WebSocket client."""
        await self.send(text_data=json.dumps(event))

    # ── DB helpers ───────────────────────────────────────────

    @database_sync_to_async
    def _check_access(self):
        from projects.models import Project, Task
        user = self.user
        if user.is_superuser or user.role == 'admin':
            return True
        try:
            if self.room_type == 'project':
                project = Project.objects.get(pk=self.room_pk)
            else:
                project = Task.objects.select_related('project').get(pk=self.room_pk).project
            return project.manager == user or user in project.members.all()
        except Exception:
            return False

    @database_sync_to_async
    def _save_message(self, content):
        from .models import ChatMessage
        from projects.models import Project, Task
        if self.room_type == 'project':
            project = Project.objects.get(pk=self.room_pk)
            msg = ChatMessage.objects.create(project=project, task=None,
                                             author=self.user, content=content)
        else:
            task = Task.objects.select_related('project').get(pk=self.room_pk)
            msg = ChatMessage.objects.create(project=task.project, task=task,
                                             author=self.user, content=content)
        return {
            'content':        msg.content,
            'author_pk':      self.user.pk,
            'author_display': self.user.get_full_name() or self.user.username,
            'created_at':     msg.created_at.strftime('%d/%m %H:%M'),
        }

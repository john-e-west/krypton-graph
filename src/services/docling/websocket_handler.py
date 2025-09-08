"""
WebSocket handler for real-time conversion status updates
"""
import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.document_subscribers: Dict[str, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected")
    
    def disconnect(self, client_id: str):
        """Handle client disconnection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            
            for doc_id, subscribers in self.document_subscribers.items():
                if client_id in subscribers:
                    subscribers.remove(client_id)
            
            logger.info(f"Client {client_id} disconnected")
    
    async def send_personal_message(self, message: str, client_id: str):
        """Send message to specific client"""
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            await websocket.send_text(message)
    
    async def broadcast_to_document_subscribers(
        self,
        document_id: str,
        message: Dict
    ):
        """Broadcast message to all clients subscribed to a document"""
        if document_id not in self.document_subscribers:
            return
        
        message_json = json.dumps(message)
        disconnected_clients = []
        
        for client_id in self.document_subscribers[document_id]:
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_text(message_json)
                except Exception as e:
                    logger.error(f"Error sending to {client_id}: {e}")
                    disconnected_clients.append(client_id)
        
        for client_id in disconnected_clients:
            self.disconnect(client_id)
    
    def subscribe_to_document(self, client_id: str, document_id: str):
        """Subscribe client to document updates"""
        if document_id not in self.document_subscribers:
            self.document_subscribers[document_id] = set()
        
        self.document_subscribers[document_id].add(client_id)
        logger.info(f"Client {client_id} subscribed to document {document_id}")
    
    def unsubscribe_from_document(self, client_id: str, document_id: str):
        """Unsubscribe client from document updates"""
        if document_id in self.document_subscribers:
            self.document_subscribers[document_id].discard(client_id)
            
            if not self.document_subscribers[document_id]:
                del self.document_subscribers[document_id]
            
            logger.info(f"Client {client_id} unsubscribed from document {document_id}")


class ConversionStatusTracker:
    """Track and broadcast conversion status updates"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        self.conversion_status: Dict[str, Dict] = {}
    
    async def update_status(
        self,
        document_id: str,
        status: str,
        progress: int = 0,
        message: str = "",
        metadata: Dict = None
    ):
        """Update conversion status and notify subscribers"""
        timestamp = datetime.now().isoformat()
        
        status_update = {
            'type': 'conversion_status',
            'documentId': document_id,
            'status': status,
            'progress': progress,
            'message': message,
            'timestamp': timestamp,
            'metadata': metadata or {}
        }
        
        self.conversion_status[document_id] = status_update
        
        await self.connection_manager.broadcast_to_document_subscribers(
            document_id,
            status_update
        )
        
        logger.info(f"Status update for {document_id}: {status} ({progress}%)")
    
    async def start_conversion(self, document_id: str):
        """Mark conversion as started"""
        await self.update_status(
            document_id,
            'processing',
            0,
            'Starting PDF conversion...'
        )
    
    async def update_progress(
        self,
        document_id: str,
        current_page: int,
        total_pages: int
    ):
        """Update conversion progress"""
        progress = int((current_page / total_pages) * 100)
        await self.update_status(
            document_id,
            'processing',
            progress,
            f'Processing page {current_page} of {total_pages}'
        )
    
    async def complete_conversion(
        self,
        document_id: str,
        metadata: Dict
    ):
        """Mark conversion as completed"""
        await self.update_status(
            document_id,
            'completed',
            100,
            'Conversion completed successfully',
            metadata
        )
    
    async def fail_conversion(
        self,
        document_id: str,
        error: str
    ):
        """Mark conversion as failed"""
        await self.update_status(
            document_id,
            'failed',
            0,
            f'Conversion failed: {error}'
        )
    
    def get_status(self, document_id: str) -> Dict:
        """Get current status for a document"""
        return self.conversion_status.get(document_id, {
            'type': 'conversion_status',
            'documentId': document_id,
            'status': 'unknown',
            'progress': 0,
            'message': 'No status available',
            'timestamp': datetime.now().isoformat()
        })


manager = ConnectionManager()
status_tracker = ConversionStatusTracker(manager)
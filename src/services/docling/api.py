"""
FastAPI REST API for Docling service
"""
import os
import logging
from pathlib import Path
from typing import Optional
import asyncio

from fastapi import FastAPI, HTTPException, File, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import aiofiles

from docling_service import DoclingService
from config import API_CONFIG, UPLOAD_DIR
from websocket_handler import manager, status_tracker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Docling PDF Conversion Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=API_CONFIG['cors_origins'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

docling_service = DoclingService()


class ConversionRequest(BaseModel):
    documentId: str
    filePath: str
    options: Optional[dict] = None


class ConversionResponse(BaseModel):
    documentId: str
    markdown: str
    images: list
    metadata: dict
    status: str
    errors: Optional[list] = []


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "docling-pdf-converter"}


@app.post("/api/documents/convert", response_model=ConversionResponse)
async def convert_pdf(request: ConversionRequest):
    """
    Convert PDF to Markdown
    """
    try:
        file_path = Path(request.filePath)
        
        if not file_path.is_absolute():
            file_path = Path.cwd() / file_path
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
        
        if docling_service.check_pdf_encryption(str(file_path)):
            return ConversionResponse(
                documentId=request.documentId,
                markdown="",
                images=[],
                metadata={},
                status="failed",
                errors=["PDF_ENCRYPTED: PDF is password protected. Please unlock before uploading."]
            )
        
        await status_tracker.start_conversion(request.documentId)
        
        result = await docling_service.convert_pdf_to_markdown(
            str(file_path),
            request.documentId,
            request.options
        )
        
        if result['status'] == 'success':
            await status_tracker.complete_conversion(request.documentId, result['metadata'])
        elif result['status'] == 'failed':
            await status_tracker.fail_conversion(request.documentId, result['errors'][0] if result['errors'] else 'Unknown error')
        
        return ConversionResponse(**result)
        
    except Exception as e:
        logger.error(f"Conversion error: {e}")
        return ConversionResponse(
            documentId=request.documentId,
            markdown="",
            images=[],
            metadata={},
            status="failed",
            errors=[str(e)]
        )


@app.post("/api/documents/upload-convert")
async def upload_and_convert(
    documentId: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Upload PDF and convert to Markdown
    """
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        upload_path = UPLOAD_DIR / file.filename
        upload_path.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(upload_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        if docling_service.check_pdf_encryption(str(upload_path)):
            os.remove(upload_path)
            return ConversionResponse(
                documentId=documentId,
                markdown="",
                images=[],
                metadata={},
                status="failed",
                errors=["PDF_ENCRYPTED: PDF is password protected. Please unlock before uploading."]
            )
        
        result = await docling_service.convert_pdf_to_markdown(
            str(upload_path),
            documentId,
            None
        )
        
        return ConversionResponse(**result)
        
    except Exception as e:
        logger.error(f"Upload and conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("action") == "subscribe":
                document_id = data.get("documentId")
                if document_id:
                    manager.subscribe_to_document(client_id, document_id)
                    await websocket.send_json({
                        "type": "subscribed",
                        "documentId": document_id
                    })
            
            elif data.get("action") == "unsubscribe":
                document_id = data.get("documentId")
                if document_id:
                    manager.unsubscribe_from_document(client_id, document_id)
                    await websocket.send_json({
                        "type": "unsubscribed",
                        "documentId": document_id
                    })
            
            elif data.get("action") == "get_status":
                document_id = data.get("documentId")
                if document_id:
                    status = status_tracker.get_status(document_id)
                    await websocket.send_json(status)
                    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        manager.disconnect(client_id)


@app.get("/api/documents/status/{document_id}")
async def get_conversion_status(document_id: str):
    """Get current conversion status for a document"""
    status = status_tracker.get_status(document_id)
    return status


if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=API_CONFIG['host'],
        port=API_CONFIG['port'],
        reload=API_CONFIG['reload']
    )
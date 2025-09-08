"""
Docling service configuration
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = BASE_DIR / "public" / "uploads"
IMAGE_OUTPUT_DIR = UPLOAD_DIR / "images"

IMAGE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

DOCLING_CONFIG = {
    'pdf_backend': 'pypdf',
    'extract_images': True,
    'extract_tables': True,
    'preserve_formatting': True,
    'output_format': 'markdown',
    'max_processing_time': 120,
    'image_output_dir': str(IMAGE_OUTPUT_DIR),
    'table_format': 'github',
}

API_CONFIG = {
    'host': '0.0.0.0',
    'port': 8001,
    'reload': os.getenv('NODE_ENV', 'development') == 'development',
    'cors_origins': [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
}
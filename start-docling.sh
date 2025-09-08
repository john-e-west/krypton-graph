#!/bin/bash

# Start Docling PDF conversion service

echo "Starting Docling PDF conversion service..."

# Navigate to the docling service directory
cd src/services/docling

# Install dependencies if needed
echo "Installing/checking dependencies..."
pip install -r requirements.txt

# Start the service
echo "Starting Docling service on port 8001..."
python api.py
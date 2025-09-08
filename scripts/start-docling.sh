#!/bin/bash

# Start Docling PDF conversion service

echo "Starting Docling PDF conversion service..."

# Navigate to the docling service directory
cd src/services/docling

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Start the service
echo "Starting Docling service on port 8001..."
python api.py
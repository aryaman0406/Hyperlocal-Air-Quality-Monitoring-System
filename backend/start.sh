#!/bin/bash
# Render startup script for backend

# Print environment info
echo "Starting Hyperlocal AQI Backend..."
echo "Python version: $(python --version)"
echo "Port: $PORT"

# Start the application
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2

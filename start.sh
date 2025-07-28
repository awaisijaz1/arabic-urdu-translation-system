#!/bin/bash

# Translation Evaluation Tool Startup Script
# This script starts the entire microservices-based translation evaluation system

set -e

echo "🚀 Starting Translation Evaluation Tool..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p data uploads exports models

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping services..."
    docker-compose down
    echo "✅ Services stopped."
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Start services
echo "🐳 Starting microservices..."
if [ "$1" = "dev" ]; then
    echo "🔧 Starting in development mode..."
    docker-compose -f docker-compose.dev.yml up --build
else
    echo "🏭 Starting in production mode..."
    docker-compose up --build -d
    
    echo "⏳ Waiting for services to be ready..."
    sleep 30
    
    echo "📊 Checking service health..."
    curl -f http://localhost:8000/health || echo "⚠️  API Gateway not ready yet"
    
    echo ""
    echo "🎉 Translation Evaluation Tool is starting up!"
    echo ""
    echo "📱 Frontend: http://localhost:3000"
    echo "🔌 API Gateway: http://localhost:8000"
    echo ""
    echo "🔑 Demo credentials:"
    echo "   Admin: admin / admin123"
    echo "   Editor: editor / editor123"
    echo "   Viewer: viewer / viewer123"
    echo ""
    echo "📁 Sample data files available in:"
    echo "   sample-data/sample.srt"
    echo "   sample-data/sample.json"
    echo ""
    echo "🛑 Press Ctrl+C to stop all services"
    
    # Keep the script running
    docker-compose logs -f
fi 
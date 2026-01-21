#!/bin/bash

echo "🔨 EverlastAI - Audio Intelligence - Rebuild & Restart"
echo "======================================================"
echo ""

# Prüfe ob Docker läuft
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker läuft nicht! Bitte starte Docker Desktop."
    exit 1
fi

echo "🔨 Baue Docker Images neu..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ Build fehlgeschlagen!"
    exit 1
fi

echo ""
echo "🔄 Starte Container neu..."
docker-compose up -d

echo ""
echo "⏳ Warte auf Services..."
sleep 3

echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "✅ Rebuild und Restart abgeschlossen!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:4000"
echo "💚 Health:   http://localhost:4000/health"
echo ""
echo "📝 Logs anzeigen: docker-compose logs -f"

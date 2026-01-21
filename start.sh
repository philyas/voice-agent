#!/bin/bash

echo "🚀 Voice Agent - Start Script"
echo "=============================="
echo ""

# Prüfe ob .env existiert
if [ ! -f .env ]; then
    echo "⚠️  .env Datei nicht gefunden!"
    echo "📝 Erstelle .env aus .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  WICHTIG: Bitte trage deinen OPENAI_API_KEY in .env ein!"
    echo "   Öffne .env und setze: OPENAI_API_KEY=sk-dein-key-hier"
    echo ""
    read -p "Drücke Enter wenn du .env konfiguriert hast..."
fi

# Prüfe ob Docker läuft
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker läuft nicht! Bitte starte Docker Desktop."
    exit 1
fi

echo "🐳 Starte Docker Container..."
docker-compose up -d

echo ""
echo "⏳ Warte auf Services..."
sleep 5

echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "🗄️  Führe Datenbank-Migrationen aus..."
docker-compose exec -T backend npm run migrate

echo ""
echo "✅ Fertig!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:4000"
echo "💚 Health:   http://localhost:4000/health"
echo ""
echo "📝 Logs anzeigen: docker-compose logs -f"
echo "🛑 Stoppen:       docker-compose down"

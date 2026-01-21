# 🚀 Voice Agent - Startanleitung

## Option 1: Mit Docker (Empfohlen - Einfachste Methode)

### Schritt 1: Environment konfigurieren

```bash
# .env Datei erstellen
cp .env.example .env
```

**Wichtig:** Öffne `.env` und trage deinen OpenAI API Key ein:
```bash
OPENAI_API_KEY=sk-dein-api-key-hier
```

### Schritt 2: Container starten

```bash
# Alle Services starten (Frontend, Backend, Database)
docker-compose up -d

# Logs anzeigen (optional)
docker-compose logs -f
```

### Schritt 3: Datenbank-Migrationen ausführen

```bash
# Migrationen ausführen (einmalig)
docker-compose exec backend npm run migrate
```

### Schritt 4: App öffnen

Öffne im Browser: **http://localhost:3000**

---

## Option 2: Lokal ohne Docker

### Voraussetzungen
- Node.js 18+ installiert
- PostgreSQL 15 installiert und laufend

### Schritt 1: Datenbank erstellen

```bash
# PostgreSQL Datenbank erstellen
createdb voice_agent

# Oder mit psql:
psql -U postgres
CREATE DATABASE voice_agent;
\q
```

### Schritt 2: Backend starten

```bash
cd backend

# Dependencies installieren
npm install

# .env Datei erstellen
cp ../.env.example .env
# OPENAI_API_KEY in .env eintragen!

# Migrationen ausführen
npm run migrate

# Backend starten
npm run dev
```

Backend läuft auf: **http://localhost:4000**

### Schritt 3: Frontend starten (neues Terminal)

```bash
cd frontend

# Dependencies installieren
npm install

# Frontend starten
npm run dev
```

Frontend läuft auf: **http://localhost:3000**

---

## Nützliche Docker-Befehle

```bash
# Status prüfen
docker-compose ps

# Logs anzeigen
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Services stoppen
docker-compose stop

# Services komplett entfernen (inkl. Daten)
docker-compose down -v

# Einzelnen Service neustarten
docker-compose restart backend

# In Container-Shell gehen
docker-compose exec backend sh
docker-compose exec frontend sh
```

---

## Troubleshooting

### Backend startet nicht
```bash
# Prüfe Logs
docker-compose logs backend

# Prüfe ob OpenAI API Key gesetzt ist
docker-compose exec backend printenv OPENAI_API_KEY
```

### Datenbank-Verbindungsfehler
```bash
# Prüfe ob DB läuft
docker-compose ps db

# Prüfe DB Logs
docker-compose logs db
```

### Frontend kann Backend nicht erreichen
- Prüfe ob Backend auf Port 4000 läuft
- Prüfe `NEXT_PUBLIC_API_URL` in Frontend

### Migrationen fehlgeschlagen
```bash
# Migration Status prüfen
docker-compose exec backend npm run migrate:status

# Migrationen zurücksetzen und neu ausführen
docker-compose exec backend npm run migrate:reset
docker-compose exec backend npm run migrate
```

---

## Services & Ports

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:3000 | 3000 |
| Backend API | http://localhost:4000 | 4000 |
| Backend Health | http://localhost:4000/health | 4000 |
| PostgreSQL | localhost:5432 | 5432 |

---

## Erste Schritte nach dem Start

1. **App öffnen**: http://localhost:3000
2. **Mikrofon erlauben**: Browser fragt nach Berechtigung
3. **Aufnahme starten**: Klick auf den roten Button
4. **Sprechen**: Deine Spracheingabe aufnehmen
5. **Stoppen**: Button erneut klicken
6. **Verarbeiten**: "Aufnahme verarbeiten & transkribieren" klicken
7. **Enrichment**: Verschiedene KI-Anreicherungen ausprobieren

Viel Erfolg! 🎉

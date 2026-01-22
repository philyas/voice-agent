# Voice Agent

Eine Desktop-Anwendung zur Sprachaufnahme, Transkription und KI-gestützten Anreicherung von Spracheingaben.

## Inhaltsverzeichnis

- [Überblick](#überblick)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architektur](#architektur)
- [Design-Entscheidungen](#design-entscheidungen)
- [Projektstruktur](#projektstruktur)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [API-Dokumentation](#api-dokumentation)
- [Datenbank & Migrationen](#datenbank--migrationen)

## Überblick

Voice Agent ist eine Desktop-Anwendung zur Sprachaufnahme, Transkription und KI-gestützten Anreicherung von Spracheingaben. Die Anwendung ermöglicht die direkte Nutzung der Ergebnisse als strukturierte Notizen, formatierte Texte oder kontextbezogen aufbereitete Ausgaben.

## Tech Stack

**Frontend:** Next.js 14, Electron, TypeScript, Tailwind CSS  
**Backend:** Node.js 18+, Express.js, Knex.js, PostgreSQL 15  
**KI-Services:** OpenAI Whisper (Transkription), GPT-4o-mini (Enrichment)  
**DevOps:** Docker, Docker Compose

## Features

- **Desktop-App:** Native Anwendung für Windows, macOS und Linux
- **Globale Hotkeys:** `Cmd/Ctrl+Shift+V` zum Aktivieren von überall
- **Sprachaufnahme:** Browser-basierte Audioaufnahme
- **Transkription:** Automatische Umwandlung via OpenAI Whisper
- **KI-Anreicherung:** Verschiedene Enrichment-Typen mit GPT-4o-mini:
  - Zusammenfassung
  - Formatierung
  - Notizen
  - Aufgaben-Extraktion
  - Kernpunkte
  - Übersetzung
- **System-Tray:** App läuft im Hintergrund
- **Persistenz:** PostgreSQL Datenbank für alle Daten

## Hotkeys

- `Cmd/Ctrl+Shift+V` - App aktivieren & Aufnahme starten
- `Escape` - Aufnahme stoppen (wenn fokussiert)
- `Cmd/Ctrl+Shift+H` - App anzeigen/verstecken

## Architektur

### Voice-Pipeline

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Aufnahme   │───▶│ Transkription│───▶│  Enrichment  │───▶│    Output    │
│  (Browser)   │    │  (Whisper)   │    │ (GPT-4o-mini)│    │  (UI/API)    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Backend - Clean Architecture (Layered)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Routes Layer                                  │
│                 (API Endpoints, Request Routing)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                         Controllers Layer                                │
│           (Request Validation, Response Formatting)                     │
├─────────────────────────────────────────────────────────────────────────┤
│                          Services Layer                                  │
│        (Business Logic, OpenAI Integration, Orchestration)              │
├─────────────────────────────────────────────────────────────────────────┤
│                           Models Layer                                   │
│                  (Database Access, Knex Queries)                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### System-Architektur

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│     Frontend     │────▶│     Backend      │────▶│    PostgreSQL    │
│   (Next.js)      │     │   (Express.js)   │     │                  │
│     :3000        │     │     :4000        │     │     :5432        │
│                  │     │                  │     │                  │
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    OpenAI API    │
                         │  Whisper + GPT   │
                         └──────────────────┘
```

## Design-Entscheidungen

**Frontend:** Next.js für App Router, Static Export (Electron-kompatibel), Code-Splitting. Electron für Cross-Platform Desktop-App mit globalen Hotkeys und System-Tray. TypeScript für Type Safety und bessere Wartbarkeit. Tailwind CSS für schnelle UI-Entwicklung.

**Backend:** Express.js für Einfachheit und Flexibilität. Clean Architecture (Routes → Controllers → Services → Models) für klare Trennung, Testbarkeit und Skalierbarkeit. Knex.js statt ORM für direkten SQL-Zugriff und PostgreSQL-Features (z.B. pgvector).

**Datenbank:** PostgreSQL statt SQLite für pgvector (RAG-Features), bessere Skalierbarkeit und Cloud-Deployment. Relationale DB für strukturierte Daten, ACID-Garantien und komplexe Queries.

**KI-Services:** OpenAI Whisper für beste Transkriptionsqualität ohne lokale GPU. GPT-4o-mini für kosteneffiziente Text-Enrichment mit ausreichender Qualität.

**DevOps:** Docker & Docker Compose für reproduzierbare Umgebungen und einfaches Multi-Service-Setup.

**Weitere:** Statischer Next.js-Export für Electron, UUIDs für Sicherheit und Offline-First, separate Services für asynchrone Transkription/Enrichment.

## Projektstruktur

```
voice-agent/
├── frontend/          # Next.js + Electron
│   ├── electron/      # Main Process (main.js, preload.js)
│   └── src/
│       ├── app/       # Pages (page.tsx, history/)
│       ├── components/# UI Components
│       ├── hooks/     # Custom Hooks
│       └── lib/       # API Client
├── backend/           # Express.js Backend
│   ├── migrations/    # DB Migrationen
│   └── src/
│       ├── routes/    # API Routes
│       ├── controllers/# Request Handling
│       ├── services/  # Business Logic
│       ├── models/    # Database Access
│       └── middleware/# Error & Validation
└── database/          # PostgreSQL Init
```

## Quick Start

### Für Endnutzer (Desktop-App)

Installieren Sie die bereitgestellte Desktop-App (`.dmg`/`.exe`/`.AppImage`). Keine weitere Konfiguration erforderlich, die App verbindet sich automatisch mit dem konfigurierten Backend.

### Für Entwickler

**Option 1: Desktop-App (Empfohlen)**
```bash
git clone <repository-url> && cd voice-agent
cp .env.example .env
# OpenAI API Key in .env eintragen
docker-compose up -d db backend
docker-compose exec backend npm run migrate
cd frontend && npm install && npm run electron:dev
```

**Option 2: Docker (Web-Version)**
```bash
git clone <repository-url> && cd voice-agent
cp .env.example .env
# OpenAI API Key in .env eintragen
docker-compose up -d
docker-compose exec backend npm run migrate
# Öffnen Sie http://localhost:3000 im Browser
```

**Option 3: Lokal (ohne Docker)**
```bash
# Terminal 1: PostgreSQL-Datenbank erstellen
createdb voice_agent

# Terminal 2: Backend starten
cd backend && npm install && cp ../.env.example .env
npm run migrate && npm run dev

# Terminal 3: Frontend starten
cd frontend && npm install && npm run dev
```

## Installation & Build

**Voraussetzungen:** Node.js >= 18, Docker & Docker Compose (optional), OpenAI API Key

**Services:** Frontend (Port 3000), Backend (Port 4000), PostgreSQL (Port 5432)

**Desktop-App Build:**
```bash
cd frontend && npm install
# Lokal: npm run electron:build (verbindet mit localhost:4000)
# Production: NEXT_PUBLIC_API_URL=https://api.example.com npm run electron:build
```
Output: `.dmg` (macOS), `.exe` (Windows), `.AppImage` (Linux) in `frontend/dist-electron/`

**Docker Befehle:**
```bash
docker-compose up -d              # Services starten
docker-compose up --build -d       # Services mit neuem Build starten
docker-compose restart backend     # Service neustarten (ohne neuen Build)
docker-compose logs -f             # Logs anzeigen
docker-compose down [-v]           # Services stoppen (optional: mit Volume-Löschung)
```

## API-Dokumentation

**Base URL:** `http://localhost:4000/api/v1`

**Endpoints:**
- **Recordings:** `GET /recordings`, `GET /recordings/:id`, `POST /recordings` (multipart/form-data), `DELETE /recordings/:id`, `POST /recordings/:id/transcribe`
- **Transcriptions:** `GET /transcriptions`, `GET /transcriptions/:id`, `PATCH /transcriptions/:id`, `DELETE /transcriptions/:id`, `POST /transcriptions/:id/enrich`
- **Enrichments:** `GET /enrichments`, `GET /enrichments/:id`, `GET /enrichments/types`, `PATCH /enrichments/:id`, `DELETE /enrichments/:id`

**Enrichment-Typen:** `summary`, `formatted`, `notes`, `action_items`, `key_points`, `translation`, `custom`

**Response Format:**
```json
{ "success": true, "data": {...}, "message": "..." }
{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }
```

## Datenbank & Migrationen

**Schema:** `recordings` (1:1) → `transcriptions` (1:N) → `enrichments`

**Knex Befehle:**
```bash
npm run migrate              # Migrationen ausführen
npm run migrate:rollback     # Letzte Migration zurückrollen
npm run migrate:reset       # Alle Migrationen zurücksetzen
npm run migrate:status      # Migrationsstatus anzeigen
npm run migrate:make <name>  # Neue Migration erstellen
```

## Umgebungsvariablen

**Backend:** `NODE_ENV` (development), `PORT` (4000), `DB_HOST` (localhost), `DB_PORT` (5432), `DB_NAME` (voice_agent), `DB_USER` (postgres), `DB_PASSWORD` (postgres), `OPENAI_API_KEY` (**Required**)

**Frontend:** `NEXT_PUBLIC_API_URL` (http://localhost:4000)

---

## Lizenz

MIT License

## Beitragen

1. Fork erstellen
2. Feature Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

# Voice Agent

Eine Desktop-Anwendung zur Sprachaufnahme, Transkription und KI-gestützten Anreicherung von Spracheingaben.

## 📋 Inhaltsverzeichnis

- [Überblick](#überblick)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architektur](#architektur)
- [Projektstruktur](#projektstruktur)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [API-Dokumentation](#api-dokumentation)
- [Datenbank & Migrationen](#datenbank--migrationen)

## 🎯 Überblick

Voice Agent ist eine Desktop-Anwendung, die Spracheingaben aufnimmt, transkribiert und durch KI-gestützte Verarbeitung anreichert. Das Ergebnis ist direkt nutzbar - z.B. als strukturierte Notiz, formatierter Text, oder kontextbezogen aufbereiteter Output.

## 🛠 Tech Stack

### Frontend & Desktop
| Technologie | Beschreibung |
|-------------|--------------|
| Next.js 14 | React Framework mit App Router |
| Electron | Desktop-Runtime für Windows, macOS, Linux |
| TypeScript | Type-safe JavaScript |
| Tailwind CSS | Utility-first CSS |
| Lucide React | Icon Library |

### Backend
| Technologie | Beschreibung |
|-------------|--------------|
| Node.js 18+ | JavaScript Runtime |
| Express.js | Web Framework |
| Knex.js | SQL Query Builder & Migrationen |
| PostgreSQL 15 | Relationale Datenbank |

### KI-Services
| Service | Modell | Verwendung |
|---------|--------|------------|
| OpenAI Whisper | whisper-1 | Audio-Transkription |
| OpenAI GPT | gpt-4o-mini | Text-Enrichment |

### DevOps
| Technologie | Beschreibung |
|-------------|--------------|
| Docker | Containerisierung |
| Docker Compose | Multi-Container Orchestrierung |

## ✨ Features

- 🖥️ **Desktop-App** - Native Anwendung für Windows, macOS und Linux
- ⌨️ **Globale Hotkeys** - `Cmd/Ctrl+Shift+V` zum Aktivieren von überall
- 🎤 **Sprachaufnahme** - Browser-basierte Audioaufnahme
- 📝 **Transkription** - Automatische Umwandlung via OpenAI Whisper
- 🤖 **KI-Anreicherung** - Verschiedene Enrichment-Typen mit GPT-4o-mini:
  - Zusammenfassung
  - Formatierung
  - Notizen
  - Aufgaben-Extraktion
  - Kernpunkte
  - Übersetzung
- 🔔 **System-Tray** - App läuft im Hintergrund
- 🗄️ **Persistenz** - PostgreSQL Datenbank für alle Daten

## ⌨️ Hotkeys

| Tastenkombination | Aktion |
|-------------------|--------|
| `Cmd/Ctrl+Shift+V` | App aktivieren & Aufnahme starten |
| `Escape` | Aufnahme stoppen (wenn fokussiert) |
| `Cmd/Ctrl+Shift+H` | App anzeigen/verstecken |

## 🏗 Architektur

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

## 📁 Projektstruktur

```
voice-agent/
├── docker-compose.yml           # Docker Compose Konfiguration
├── .env.example                 # Umgebungsvariablen Template
├── .gitignore
├── README.md
│
├── frontend/                    # Next.js + Electron Frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── electron/                # Electron Main Process
│   │   ├── main.js              # Electron Entry Point
│   │   └── preload.js           # IPC Bridge
│   └── src/
│       ├── app/
│       │   ├── layout.tsx       # Root Layout
│       │   ├── page.tsx         # Hauptseite
│       │   └── globals.css      # Global Styles
│       ├── components/
│       │   ├── RecordButton.tsx
│       │   ├── AudioPlayer.tsx
│       │   ├── TranscriptionCard.tsx
│       │   └── StatusMessage.tsx
│       ├── hooks/
│       │   ├── useAudioRecorder.ts
│       │   └── useElectron.ts   # Electron Integration
│       └── lib/
│           └── api.ts           # API Client
│
├── backend/                     # Express.js Backend
│   ├── Dockerfile
│   ├── package.json
│   ├── knexfile.js              # Knex Konfiguration
│   ├── migrations/              # Datenbank Migrationen
│   │   ├── 20260121000001_create_recordings_table.js
│   │   ├── 20260121000002_create_transcriptions_table.js
│   │   └── 20260121000003_create_enrichments_table.js
│   ├── uploads/                 # Audio-Dateien Storage
│   └── src/
│       ├── index.js             # Entry Point
│       ├── app.js               # Express App Setup
│       ├── config/
│       │   ├── env.js           # Environment Config
│       │   └── database.js      # Knex Instance
│       ├── routes/
│       │   ├── index.js
│       │   ├── recording.routes.js
│       │   ├── transcription.routes.js
│       │   └── enrichment.routes.js
│       ├── controllers/
│       │   ├── recording.controller.js
│       │   ├── transcription.controller.js
│       │   └── enrichment.controller.js
│       ├── services/
│       │   ├── openai.service.js      # Whisper & GPT
│       │   ├── recording.service.js
│       │   ├── transcription.service.js
│       │   └── enrichment.service.js
│       ├── models/
│       │   ├── base.model.js          # Base CRUD Model
│       │   ├── recording.model.js
│       │   ├── transcription.model.js
│       │   └── enrichment.model.js
│       └── middleware/
│           ├── error.middleware.js
│           └── validation.middleware.js
│
└── database/                    # PostgreSQL
    ├── Dockerfile
    └── init/
        └── 01_init.sql          # Initialisierungsskript
```

## 🚀 Quick Start

### Desktop-App (Empfohlen)

```bash
# 1. Repository klonen
git clone <repository-url>
cd voice-agent

# 2. Environment konfigurieren
cp .env.example .env
# Trage deinen OpenAI API Key in .env ein

# 3. Backend starten (mit Docker)
docker-compose up -d db backend

# 4. Migrationen ausführen
docker-compose exec backend npm run migrate

# 5. Desktop-App starten
cd frontend
npm install
npm run electron:dev
```

### Mit Docker (Web-Version)

```bash
# 1. Repository klonen
git clone <repository-url>
cd voice-agent

# 2. Environment konfigurieren
cp .env.example .env
# Trage deinen OpenAI API Key in .env ein

# 3. Container starten
docker-compose up -d

# 4. Migrationen ausführen
docker-compose exec backend npm run migrate

# 5. Öffne http://localhost:3000
```

### Ohne Docker

```bash
# Terminal 1: Datenbank (PostgreSQL muss installiert sein)
createdb voice_agent

# Terminal 2: Backend
cd backend
npm install
cp ../.env.example .env
npm run migrate
npm run dev

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

## 📦 Installation

### Voraussetzungen

- Node.js >= 18
- Docker & Docker Compose (für Docker-Setup)
- PostgreSQL 15 (für lokales Setup)
- OpenAI API Key

### Docker Compose Services

| Service | Port | Beschreibung |
|---------|------|--------------|
| frontend | 3000 | Next.js App |
| backend | 4000 | Express API |
| db | 5432 | PostgreSQL |

### Desktop-App Befehle

```bash
cd frontend

# Development-Modus (Next.js + Electron)
npm run electron:dev

# Production-Build erstellen
npm run electron:build

# Electron direkt starten (Next.js muss laufen)
npm run electron:start
```

### Docker Befehle

```bash
# Alle Services starten (ohne neuen Build)
docker-compose up -d

# Services mit neuem Build starten
docker-compose up --build -d

# Nur Images neu bauen (ohne zu starten)
docker-compose build

# Images ohne Cache neu bauen
docker-compose build --no-cache

# Logs anzeigen
docker-compose logs -f

# Einzelnen Service neustarten (KEIN neuer Build!)
docker-compose restart backend

# Services stoppen
docker-compose down

# Mit Volume-Löschung (DB zurücksetzen)
docker-compose down -v

# Container-Shell öffnen
docker-compose exec backend sh
```

**Wichtig:** `docker-compose restart` macht **keinen** neuen Build! Es startet nur die Container neu. Für einen neuen Build verwende `docker-compose build` oder `docker-compose up --build`.

## 📡 API-Dokumentation

### Base URL
```
http://localhost:4000/api/v1
```

### Endpoints

#### Recordings

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/recordings` | Alle Aufnahmen abrufen |
| GET | `/recordings/:id` | Einzelne Aufnahme abrufen |
| POST | `/recordings` | Audio hochladen (multipart/form-data) |
| DELETE | `/recordings/:id` | Aufnahme löschen |
| POST | `/recordings/:id/transcribe` | Mit Whisper transkribieren |

#### Transcriptions

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/transcriptions` | Alle Transkriptionen |
| GET | `/transcriptions/:id` | Einzelne Transkription (mit Enrichments) |
| PATCH | `/transcriptions/:id` | Text aktualisieren |
| DELETE | `/transcriptions/:id` | Transkription löschen |
| POST | `/transcriptions/:id/enrich` | Mit GPT-4o-mini anreichern |

#### Enrichments

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/enrichments` | Alle Enrichments |
| GET | `/enrichments/:id` | Einzelnes Enrichment |
| GET | `/enrichments/types` | Verfügbare Typen |
| DELETE | `/enrichments/:id` | Enrichment löschen |

### Enrichment-Typen

| Type | Beschreibung |
|------|--------------|
| `summary` | Kurze Zusammenfassung |
| `formatted` | Formatierter, strukturierter Text |
| `notes` | Aufzählungspunkte/Notizen |
| `action_items` | Extrahierte Aufgaben |
| `key_points` | Kernpunkte |
| `translation` | Englische Übersetzung |
| `custom` | Eigener Prompt |

### Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description",
    "details": [...]
  }
}
```

## 🗄️ Datenbank & Migrationen

### Schema

```
┌─────────────────────┐
│     recordings      │
├─────────────────────┤
│ id (UUID, PK)       │
│ filename            │
│ original_filename   │
│ mime_type           │
│ file_size           │
│ duration_ms         │
│ storage_path        │
│ created_at          │
│ updated_at          │
└─────────┬───────────┘
          │ 1:1
          ▼
┌─────────────────────┐
│   transcriptions    │
├─────────────────────┤
│ id (UUID, PK)       │
│ recording_id (FK)   │
│ text                │
│ language            │
│ duration_seconds    │
│ provider            │
│ model_used          │
│ created_at          │
│ updated_at          │
└─────────┬───────────┘
          │ 1:N
          ▼
┌─────────────────────┐
│    enrichments      │
├─────────────────────┤
│ id (UUID, PK)       │
│ transcription_id(FK)│
│ type                │
│ content             │
│ prompt_used         │
│ model_used          │
│ tokens_used         │
│ created_at          │
│ updated_at          │
└─────────────────────┘
```

### Knex Befehle

```bash
# Migrationen ausführen
npm run migrate

# Migration zurückrollen
npm run migrate:rollback

# Alle Migrationen zurücksetzen
npm run migrate:reset

# Status anzeigen
npm run migrate:status

# Neue Migration erstellen
npm run migrate:make migration_name
```

## 🔧 Umgebungsvariablen

| Variable | Beschreibung | Default |
|----------|--------------|---------|
| `NODE_ENV` | Environment | development |
| `PORT` | Backend Port | 4000 |
| `DB_HOST` | Datenbank Host | localhost |
| `DB_PORT` | Datenbank Port | 5432 |
| `DB_NAME` | Datenbank Name | voice_agent |
| `DB_USER` | Datenbank User | postgres |
| `DB_PASSWORD` | Datenbank Passwort | postgres |
| `OPENAI_API_KEY` | OpenAI API Key | **Required** |
| `NEXT_PUBLIC_API_URL` | Backend URL | http://localhost:4000 |

---

## 📝 Lizenz

MIT License

## 🤝 Beitragen

1. Fork erstellen
2. Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen
# voice-agent

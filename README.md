# Voice Agent

## Kurzbeschreibung des Problems

**Problem:** Sprachaufnahmen bleiben oft Rohdaten – schwer durchsuchbar, mühsam in Notizen oder Exporte zu überführen. In vielen Aufnahmen gezielt etwas wiederfinden – z.B. per Suche oder Chat – ist schwierig. Schnell per Sprache erfassen und zugleich strukturiert nutzen erfordert meist mehrere Tools und manuellen Aufwand.

**Lösung:** Voice Agent verbindet beides: Aufnahme → Transkription (Whisper) → KI-Anreicherung (GPT) → Notizen, Export (PDF, E-Mail, Google Docs), RAG-Chat. Desktop- und Web-App.

**Web:** [ptw-audio-intelligence.vercel.app](https://ptw-audio-intelligence.vercel.app) – greift auf Prod-Backend und Prod-DB zu.

**Hotkeys:** `Cmd/Ctrl+Shift+V` Aufnahme, `Escape` Stopp, `Cmd/Ctrl+Shift+H` App ein/aus

---

## Architektur-Überblick

**Pipeline:** Aufnahme (Browser) → Transkription (Whisper) → Enrichment (GPT-4o-mini) → Output (UI/API)

**System:**
```
Frontend (Next.js :3000) → Backend (Express :4000) → PostgreSQL (:5432)
                                    ↓
                              OpenAI (Whisper + GPT)
```

**Backend:** Routes → Controllers → Services → Models (Knex). RAG über pgvector.

**Tech:** Next.js 14, Electron, TypeScript, Tailwind · Node, Express, Knex, PostgreSQL 15, pgvector · Docker

---

## Setup-Anleitung

**Voraussetzungen:** Node.js ≥ 18, OpenAI API Key, optional Docker

```bash
git clone <repo> && cd voice-agent
cp .env.example .env   # OPENAI_API_KEY eintragen
```

**Mit Docker:**
```bash
docker compose up -d db backend
docker compose exec backend npm run migrate
cd frontend && npm i && npm run electron:dev
```

**Ohne Docker:**
```bash
createdb voice_agent
# Terminal 1: cd backend && npm i && cp ../.env . && npm run migrate && npm run dev
# Terminal 2: cd frontend && npm i && npm run dev
```

**Web only:** `docker compose up -d` → [localhost:3000](http://localhost:3000)

**Desktop-Build:** `cd frontend && npm run electron:build` → `dist-installers/`. Für Prod: `NEXT_PUBLIC_API_URL` setzen.

Env-Details: `.env.example`

---

## Design-Entscheidungen

| Bereich | Entscheidung | Begründung |
|--------|--------------|------------|
| **Frontend** | Next.js + Electron, Static Export, TypeScript, Tailwind | App Router, Electron-kompatibel, Type Safety |
| **Backend** | Clean Architecture, BaseController, Knex | Trennung, Testbarkeit, direkter SQL + pgvector |
| **DB** | PostgreSQL + pgvector | RAG, Skalierbarkeit, ACID |
| **KI** | Whisper + GPT-4o-mini | Qualität ohne lokale GPU, kosteneffizient |
| **DevOps** | Docker Compose | Reproduzierbare Umgebungen |

UUIDs, asynchrone Transkription/Enrichment.

---

MIT License

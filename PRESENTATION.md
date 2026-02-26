# Voice Agent - Kurze Demo-Präsentation (2-3 Min)

## Über mich

**Phi Nguyen** · Softwareentwickler  
- **Hauptberuflich:** Unternehmen für Logistiksoftwarelösungen – optimiere interne Lagerlogistikprozesse (Server, Client, DevOps: TeamCity, GitHub Actions)  
- **Nebenberuflich:** Projekte u. a. Klinikbereich, Großhandel (E‑Commerce, Kassenintegrationen), Automatisierungen mit und ohne KI  

---

## 1. Problem

**Das Problem:**
- Meetings, Kundengespräche, Interviews, **persönliche Notizen** → Sprachaufnahmen
- **Mittendrin Notizen manuell aufschreiben** – gleichzeitig zuhören und schreiben
- Aufnahmen bleiben **Rohdaten** – schwer durchsuchbar und nicht geordnet
- Mühsam in **geordnete Notizen** zu überführen
- In vielen Aufnahmen gezielt etwas wiederfinden → manuell durchhören
- Workflow: Aufnahme → Transkription → Strukturierung → Export
- Erfordert **mehrere Tools** und viel **manuellen Aufwand**

**Die Lösung:**
- Aufnahme → automatische Transkription (Whisper) → KI-Anreicherung (GPT)
- Strukturierte Notizen, Export (PDF, E-Mail, Google Docs)
- RAG-Chat für semantische Suche über alle Aufnahmen

---

## 2. Architektur

```
Frontend (Next.js :3000) → Backend (Express :4000) → PostgreSQL (:5432)
                                    ↓
                              OpenAI (Whisper + GPT)
```

**Pipeline:**
```
Aufnahme → Upload → Transkription (Whisper) → Enrichment (GPT) → Output
```

**Tech-Stack:**
- Frontend: Next.js 14 + Electron + TypeScript
- Backend: Node.js + Express + Knex.js
- Database: PostgreSQL 15 + pgvector (für RAG)
- AI: OpenAI Whisper + GPT-4o-mini

---

## 3. Installation & Start

### Option 1: Desktop-App (Empfohlen)
```bash
# Installer öffnen
open "frontend/dist-electron/EverlastAI - Audio Intelligence-1.0.0-arm64.dmg"
# App installieren und starten
```

### Option 2: Docker (Schnellstart)
```bash
git clone <repo> && cd voice-agent
cp .env.example .env  # OPENAI_API_KEY eintragen
docker compose up -d
# → Frontend: http://localhost:3000
```

### Option 3: Lokal
```bash
# Terminal 1: Backend
cd backend && npm i && npm run migrate && npm run dev

# Terminal 2: Frontend
cd frontend && npm i && npm run dev
```

---

## 4. Nutzung - Demo-Ablauf

### Schritt 1: Aufnahme starten
- **Record-Button klicken** oder **Hotkey: `Cmd/Ctrl+Shift+V`**
- Waveform zeigt Live-Audio
- **Demo-Text sprechen:** *"Ich muss morgen um 10 Uhr ein Meeting vorbereiten. Die wichtigsten Punkte sind: Budget-Planung, Team-Update und Q4-Review."*

### Schritt 2: Aufnahme stoppen & verarbeiten
- **`Escape`** oder **Stop-Button**
- **"Aufnahme verarbeiten & transkribieren"** klicken
- Transkription erscheint automatisch (Whisper)

### Schritt 3: KI-Anreicherung
- **"Zusammenfassung erstellen"** → Kurze Zusammenfassung
- **"Action Items"** → To-Dos werden extrahiert
- **"Complete Enrichment"** → Vollständige Notizen mit Struktur
- Alle Enrichments sind editierbar

### Schritt 4: Export & Sharing
- **"Als PDF exportieren"** → Download
- **"Per E-Mail senden"** → E-Mail-Versand
- **"Zu Google Docs"** → Google Docs Integration

### Schritt 5: RAG-Chat (Optional)
- **Chat-Tab** öffnen
- Frage: *"Was muss ich morgen vorbereiten?"*
- System findet relevante Aufnahme über semantische Suche

---

## 🎯 Zusammenfassung

**Workflow:** Aufnahme → Transkription → Enrichment → Export  
**Besonderheit:** RAG-Chat für semantische Suche über alle Aufnahmen  
**Hotkeys:** `Cmd/Ctrl+Shift+V` (Record), `Escape` (Stop)

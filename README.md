# SynapseAI

**AI-powered Adaptive Learning OS** — Upload any document, and SynapseAI extracts key concepts, maps prerequisite relationships into a knowledge graph, and guides you through a personalized learning loop.

## What it does

1. **Upload** — Drop a PDF, image, or audio file. Gemini extracts concepts and builds a structured knowledge graph.
2. **Pre-Quiz** — Diagnose what you already know. Skip what's familiar, focus on what matters.
3. **Study** — AI-generated explanations with LaTeX rendering. Key terms and formulas are never altered (Fixed-Point Transformation). Toggle ESL mode to read in your native language while preserving original notation.
4. **Post-Quiz** — Reinforce learning with fill-in-the-blank, keyword matching, and multiple choice. Missed questions automatically reappear after 3 steps.
5. **Audio Mode** — SSML-powered audio that explains concepts, asks questions, pauses for you to think, and reveals the answer. Learn on your commute.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), Tailwind CSS, Framer Motion, KaTeX |
| Backend | Python 3.12+, FastAPI |
| AI | Gemini 2.5 Flash |
| Database | PostgreSQL 16 + pgvector |
| Audio | Google Cloud Text-to-Speech (SSML) |
| PDF Parsing | PyMuPDF |

## Project Structure

```
SynapseAI/
├── frontend/          # Next.js 15
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── upload/page.tsx       # File upload
│   │   └── learn/[sessionId]/
│   │       ├── page.tsx          # Knowledge graph view
│   │       └── node/[nodeId]/
│   │           ├── page.tsx      # Study page
│   │           ├── pre-quiz/     # Diagnostic quiz
│   │           └── post-quiz/    # Reinforcement quiz
│   ├── components/
│   │   ├── graph/                # Knowledge graph visualization
│   │   ├── study/                # Focus/Faded layers, KaTeX
│   │   ├── quiz/                 # Quiz components
│   │   └── audio/                # SSML audio player
│   └── lib/api.ts                # API client
│
├── backend/           # FastAPI
│   ├── app/
│   │   ├── api/routes/           # upload, graph, quiz, audio endpoints
│   │   ├── services/             # Gemini, concept extraction, quiz gen, audio gen, PDF parsing
│   │   ├── models/               # SQLAlchemy ORM (Node, Edge)
│   │   └── db/                   # Database session & migrations
│   └── requirements.txt
│
└── CLAUDE.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL 16 with pgvector extension
- Google Cloud credentials (Gemini API, Cloud TTS, Cloud Speech)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your credentials

uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key Design Principles

- **Fixed-Point Transformation** — Formulas, variable names, and key technical terms are tagged as Protected Identifiers and never modified. Only the surrounding explanation adapts to the learner's level.
- **ESL Terminology Master** — Explanations translate to the learner's native language, but all notation and technical terms remain in their original form.
- **3-Step Retry** — Wrong answers re-appear after 3 quiz generations on the same node, using an in-memory queue.
- **Max 20 Nodes** — Knowledge graphs are capped at 20 concepts for visual clarity.

## Environment Variables

```
GEMINI_API_KEY=
DATABASE_URL=postgresql+asyncpg://...
GOOGLE_APPLICATION_CREDENTIALS=
```

## License

MIT

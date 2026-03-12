# Architecture

## High-Level Overview

Slide Creator is a Next.js 16 application with a Python sidecar for PPTX generation. The frontend handles authentication, the editor UI, and AI orchestration. Supabase provides auth, relational storage, and file storage. Azure OpenAI powers content generation and image creation.

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Dashboard │  │  Chat Panel  │  │ Slide Preview    │  │
│  │ (decks)   │  │  (AI prompt) │  │ Grid + Detail    │  │
│  └──────────┘  └──────┬───────┘  └──────────────────┘  │
│                       │                                  │
└───────────────────────┼──────────────────────────────────┘
                        │ fetch
┌───────────────────────┼──────────────────────────────────┐
│                  Next.js App Router                       │
│                                                          │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ /api/ai/*  │  │ /api/    │  │ /api/generate-pptx   │ │
│  │ chat, img, │  │ decks/*  │  │ (spawns Python or    │ │
│  │ outline,   │  │ images/* │  │  calls serverless fn)│ │
│  │ rewrite... │  │          │  │                      │ │
│  └─────┬──────┘  └────┬─────┘  └──────────┬───────────┘ │
│        │              │                    │              │
└────────┼──────────────┼────────────────────┼─────────────┘
         │              │                    │
    ┌────▼────┐   ┌─────▼──────┐   ┌────────▼─────────┐
    │  Azure  │   │  Supabase  │   │  python-pptx     │
    │ OpenAI  │   │  Auth / DB │   │  (PPTX template  │
    │ GPT-4o  │   │  / Storage │   │   generation)    │
    └─────────┘   └────────────┘   └──────────────────┘
```

## Directory Structure

```
app/
├── (app)/              # Authenticated routes (dashboard, editor)
├── (auth)/             # Login, signup, OAuth callback
├── api/                # API routes
│   ├── ai/             # AI endpoints (chat, image, outline, rewrite, summarize, data-to-chart)
│   ├── decks/          # CRUD for decks and slides
│   ├── generate-pptx/  # PPTX generation proxy
│   └── images/         # Image search and upload
├── globals.css
└── layout.tsx          # Root layout (fonts, toaster, tooltip provider)

api/
└── generate-pptx/
    └── index.py        # Vercel Python serverless function for PPTX generation

components/
├── dashboard/          # DeckCard, DeckGrid
├── editor/             # ChatPanel, EditorHeader, LayoutPicker,
│                       # SlideDetailPanel, SlidePreviewCard, SlidePreviewGrid
└── ui/                 # shadcn/ui primitives

lib/
├── ai/                 # Azure OpenAI client (chatCompletion, generateImage)
├── hooks/              # use-autosave
├── store/              # Zustand editor store
├── supabase/           # Supabase client, server client, middleware
├── templates/          # Layout definitions (JSON + TS), theme, types
└── utils.ts            # cn() helper

scripts/
├── extract_template.py # Extract layout metadata from PPTX template → layouts.json
└── generate_pptx.py    # Local PPTX generation script

public/template/
└── PPT_Template.pptx   # Company PowerPoint template
```

## Data Model

### Supabase Tables

```
decks
├── id             uuid        PK
├── user_id        uuid        FK → auth.users
├── title          text
├── description    text
├── thumbnail_url  text
├── created_at     timestamptz
└── updated_at     timestamptz

slides
├── id             uuid        PK
├── deck_id        uuid        FK → decks (cascade delete)
├── order_index    integer
├── layout_key     text        (references a layout name from layouts.json)
├── content        jsonb       { title, subtitle, body, imageUrl, imagePrompt,
│                                presenterInfo, tableData, chartData }
├── notes          text
├── thumbnail_url  text
├── created_at     timestamptz
└── updated_at     timestamptz

company_images
├── id             uuid        PK
├── uploaded_by    uuid        FK → auth.users
├── storage_path   text
├── filename       text
├── tags           text[]      (GIN indexed)
└── created_at     timestamptz
```

Row-level security ensures users can only access their own decks and slides. Company images are readable by all authenticated users.

### Frontend State (Zustand)

The `editor-store` holds all editor state in memory:

- `deck` — Current deck metadata
- `slides` — Ordered array of `SlideData` objects
- `messages` — Chat message history for the current session
- `activeSlideId` / `expandedSlideId` — Selection state
- `undoStack` / `redoStack` — History entries (snapshots of slides + active ID)
- `isDirty` / `isSaving` / `isGenerating` — Status flags

State is reset via `resetEditor()` when navigating to a new deck to ensure a fresh chat and clean history.

## Key Flows

### 1. AI Chat → Slide Generation

```
User types prompt
        │
        ▼
  ChatPanel.tsx
  POST /api/ai/chat
  { messages, currentSlides, deckTitle }
        │
        ▼
  route.ts builds system prompt
  (includes layout catalog, brand guidelines,
   instructions to return JSON with action + slides)
        │
        ▼
  Azure OpenAI GPT-4o
  returns JSON: { message, action, slides }
  action ∈ { replace_all, update, add, delete, none }
        │
        ▼
  ChatPanel applies action to Zustand store:
  - replace_all → replaceAllSlides()
  - update     → updateSlide() per slide
  - add        → addSlide() + updateSlide()
  - delete     → removeSlide()
        │
        ▼
  SlidePreviewGrid re-renders with new slides
  Auto-save triggers after 2s of inactivity
```

### 2. PPTX Export

```
User clicks "Generate PPTX"
        │
        ▼
  EditorHeader.tsx
  POST /api/generate-pptx
  { slides, title }
        │
        ▼
  ┌─ Local dev ─────────────────────┐  ┌─ Vercel ──────────────────────┐
  │ route.ts spawns Python process  │  │ api/generate-pptx/index.py   │
  │ → scripts/generate_pptx.py     │  │ (serverless function)        │
  └─────────────┬───────────────────┘  └──────────────┬────────────────┘
                │                                      │
                ▼                                      ▼
        python-pptx loads PPT_Template.pptx
        For each slide:
          1. Find matching layout by name
          2. Fill placeholders (title, subtitle, body)
          3. Strip bullet prefixes to avoid doubles
          4. Download and insert images
          5. Remove unfilled placeholders from XML
        Return .pptx bytes as download
```

### 3. Auto-Save

```
Any slide/deck mutation sets isDirty = true
        │
        ▼
  use-autosave hook (2s debounce)
  PATCH /api/decks/[id]
  { title, slides: [{ id, order_index, layout_key, content, notes }] }
        │
        ▼
  Supabase upsert slides, update deck.updated_at
  isDirty = false
```

### 4. Authentication

```
Unauthenticated request
        │
        ▼
  middleware.ts (Next.js middleware)
  Calls lib/supabase/middleware.ts to refresh session
        │
        ├── Has session → allow access to /app routes
        └── No session  → redirect to /login
                              │
                              ▼
                        Supabase Auth
                        (email/password or OAuth)
                              │
                              ▼
                        /auth/callback exchanges code
                        Redirect to dashboard
```

## Template System

The company PowerPoint template (`public/template/PPT_Template.pptx`) contains 56 slide layouts. The `scripts/extract_template.py` script parses every layout and placeholder into a JSON file:

```json
{
  "name": "Title Slide",
  "category": "title",
  "placeholders": [
    {
      "idx": 0,
      "type": "title",
      "name": "Title 1",
      "x": 720000,
      "y": 2336800,
      "width": 10515600,
      "height": 1325563,
      "defaultText": "Click to edit Master title style",
      "fontSize": 40
    }
  ]
}
```

This data is used in three places:

1. **AI system prompt** — The chat route includes layout names and placeholder descriptions so the AI can choose appropriate layouts.
2. **CSS slide previews** — `SlidePreviewCard` and `SlideDetailPanel` position elements using the EMU coordinates converted to percentages.
3. **PPTX generation** — The Python script matches `layoutKey` to the template layout and fills the corresponding placeholders.

## API Route Summary

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/decks` | GET | Yes | List user's decks |
| `/api/decks` | POST | Yes | Create new deck |
| `/api/decks/[id]` | GET | Yes | Fetch deck with slides |
| `/api/decks/[id]` | PATCH | Yes | Update deck and slides |
| `/api/decks/[id]` | DELETE | Yes | Delete deck |
| `/api/ai/chat` | POST | Yes | Conversational slide generation |
| `/api/ai/generate-outline` | POST | Yes | Generate slide outline from topic |
| `/api/ai/generate-text` | POST | Yes | Generate text content |
| `/api/ai/generate-image` | POST | Yes | Generate image via Azure OpenAI |
| `/api/ai/summarize` | POST | Yes | Summarize long text into slide content |
| `/api/ai/rewrite` | POST | Yes | Rewrite text with specified tone |
| `/api/ai/data-to-chart` | POST | Yes | Convert data to chart configuration |
| `/api/images/search` | GET | Yes | Search stock image providers |
| `/api/images/upload` | POST | Yes | Upload image to Supabase storage |
| `/api/generate-pptx` | POST | Yes | Generate and download PPTX file |

## Deployment

- **Frontend + API routes**: Vercel (automatic from git push)
- **Python serverless function**: `api/generate-pptx/index.py` deployed as a Vercel Python function (`@vercel/python@4.0.0`, 60s timeout)
- **Database & Auth**: Supabase (managed)
- **AI**: Azure OpenAI (managed)

The `vercel.json` configures the Python function build and routing. All other routes are handled by Next.js.

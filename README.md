# Slide Creator

An AI-powered presentation builder that generates professional PowerPoint decks through conversational prompts. Users describe what they want, and the AI creates slides that conform to a company-branded template — ready for download as a `.pptx` file.

## Features

- **Prompt-based slide generation** — Describe a deck topic and the AI produces a complete set of slides with titles, body content, and layout assignments.
- **Conversational editing** — Refine slides through follow-up messages: rewrite, expand, reorder, add, or remove slides.
- **56 template layouts** — Extracted pixel-for-pixel from the company PowerPoint template so every generated deck matches brand standards.
- **Live CSS previews** — Slide thumbnails render in the browser using the same layout data that drives PPTX export, so what you see is what you get.
- **Inline detail editor** — Click any slide to zoom in and edit title, subtitle, body, notes, and image fields directly.
- **PPTX export** — One-click download produces a real PowerPoint file built on the company template via `python-pptx`.
- **AI image generation** — Generate images with Azure OpenAI (gpt-image-1.5) and place them on slides.
- **Stock image search** — Search Unsplash, Pexels, and Pixabay for royalty-free images.
- **Company image library** — Upload and tag images in Supabase storage for reuse across decks.
- **Tables and charts** — AI can convert data descriptions or CSV into chart configurations rendered with Chart.js.
- **Auto-save** — Decks are saved automatically to Supabase every 2 seconds after changes.
- **Undo / Redo** — Full history stack with keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z).
- **Auth** — Email/password authentication via Supabase with protected routes.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS v4, shadcn/ui v4 |
| State | Zustand 5 |
| Animation | Framer Motion 12 |
| Charts | Chart.js 4 + react-chartjs-2 |
| Auth & DB | Supabase (Auth, PostgreSQL, Storage) |
| AI | Azure OpenAI (GPT-4o chat, gpt-image-1.5 images) |
| PPTX | python-pptx (Python 3.10+) |
| Deployment | Vercel |

## Prerequisites

- Node.js 20+
- Python 3.10+ (for PPTX generation)
- A Supabase project
- Azure OpenAI resource with GPT-4o and gpt-image-1.5 deployments
- (Optional) API keys for Unsplash, Pexels, Pixabay

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/TLorino/Slide-Creator.git
cd Slide-Creator
npm install
pip install python-pptx Pillow requests
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in the values:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT` | Chat model deployment name (e.g. `gpt-4o`) |
| `AZURE_OPENAI_IMAGE_DEPLOYMENT` | Image model deployment name (e.g. `gpt-image-1.5`) |
| `UNSPLASH_ACCESS_KEY` | Unsplash API key (optional) |
| `PEXELS_API_KEY` | Pexels API key (optional) |
| `PIXABAY_API_KEY` | Pixabay API key (optional) |

### 3. Set up the database

Run the migration against your Supabase project:

```bash
supabase db push
```

Or apply `supabase/migrations/001_initial_schema.sql` manually in the Supabase SQL editor. The migration creates `decks`, `slides`, and `company_images` tables with row-level security policies.

Create three storage buckets in Supabase: `slide-images`, `generated-pptx`, `company-images`.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, create a deck, and start prompting.

### 5. Deploy to Vercel

```bash
vercel --prod
```

The `vercel.json` configures the Python serverless function at `api/generate-pptx/index.py` for PPTX generation in production.

## Usage

1. **Create a deck** — Click "Create New Deck" on the dashboard.
2. **Prompt the AI** — Use the chat panel on the left to describe what you need: _"Create a 10-slide deck about Q3 revenue performance with an executive summary, key metrics, and regional breakdown."_
3. **Iterate** — Send follow-up messages to refine: _"Make the executive summary more concise"_ or _"Add a slide about customer retention."_
4. **Edit directly** — Click any slide thumbnail to open the detail editor and adjust content by hand.
5. **Export** — Click "Generate PPTX" in the header to download a branded PowerPoint file.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |
| `python scripts/extract_template.py` | Re-extract layout data from the PPTX template into `lib/templates/layouts.json` |
| `python scripts/generate_pptx.py` | Generate a PPTX file locally (used by the dev API route) |

## License

Private — internal use only.

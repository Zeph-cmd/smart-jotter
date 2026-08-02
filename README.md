# smart-jotter

Smart Jotter — a Next.js app for capturing, organizing, and learning from notes with AI-powered features.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Backend/Auth/DB:** Supabase
- **AI:** OpenAI, Deepgram (speech-to-text)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp frontend/.env.example frontend/.env.local
```

Required variables (see `frontend/.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `DEEPGRAM_API_KEY`

> **Note:** `frontend/.env.local` is git-ignored and never committed.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm start` — start the app via the launcher
- `npm run lint` — run ESLint

## Project Structure

```
.
├── frontend/        # Next.js application
│   ├── app/         # App Router pages & API routes
│   ├── components/  # React components
│   ├── lib/         # Utilities & services
│   ├── supabase/    # SQL migrations
│   └── types/       # TypeScript types
├── scripts/         # Helper scripts
└── package.json
```

## License

This project is private.
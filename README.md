# My Voting Guide

A personalized voter values guide powered by Claude AI. Complete a 22-question values questionnaire, then get AI-powered analysis of any race's candidates ranked by alignment with your profile.

## Deploy to Vercel (15 minutes)

### 1. Get the code onto GitHub

- Create a free account at [github.com](https://github.com) if you don't have one
- Create a new repository called `voter-guide` (make it private if you prefer)
- Upload all these files to the repo (drag and drop the folder in GitHub's UI, or use the GitHub Desktop app)

### 2. Deploy on Vercel

- Create a free account at [vercel.com](https://vercel.com)
- Click **"Add New Project"**
- Connect your GitHub account and select the `voter-guide` repository
- Click **Deploy** — Vercel will detect it's a Next.js app automatically

### 3. Add your Anthropic API key

- Go to your project in the Vercel dashboard
- Click **Settings → Environment Variables**
- Add a new variable:
  - **Name:** `ANTHROPIC_API_KEY`
  - **Value:** your API key from [console.anthropic.com](https://console.anthropic.com)
- Click **Save**, then go to **Deployments** and click **Redeploy**

### 4. Share your URL

Vercel gives you a URL like `voter-guide-abc123.vercel.app` — share that with anyone. Each visitor gets their own private profile stored in their browser's localStorage.

---

## How it works

- **Questionnaire** — 22 questions across 6 topics build your values profile
- **My Profile** — plain-language summary of your positions
- **Race Analysis** — pick a race, click Analyze, and all candidates are scored and ranked by alignment with your profile. The 🧪 button loads a test profile for development.

## Local development

```bash
npm install
echo "ANTHROPIC_API_KEY=your-key-here" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
voter-guide/
├── pages/
│   ├── index.js          # Main app (questionnaire, profile, analysis)
│   └── api/
│       └── analyze.js    # Server-side Anthropic API proxy
├── lib/
│   └── data.js           # Questions, races, and profile builder
├── next.config.js
└── package.json
```

## Adding new races

In `lib/data.js`, add entries to the `PRESET_RACES` array:

```js
{
  id: "tx_senate_2026",
  label: "2026 Texas Senate",
  candidates: [
    { name: "Candidate Name", party: "D", note: "Background and positions..." },
    // ...
  ]
}
```

## Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required) |

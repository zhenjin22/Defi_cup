## Défi Cup Juniors Été 2026 (MVP)

Mobile-first web app for parents to schedule and confirm junior tennis matches.

### Tech
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)
- Vercel-ready

---

## 1) Supabase setup

### Create a Supabase project
- Create a new project in Supabase.

### Run the SQL schema
- In Supabase SQL Editor, run:
  - `supabase/schema.sql`
  - then `supabase/seed.sql`

### Configure Auth
- Enable **Email** provider (magic links).
- Add a Redirect URL:
  - Local: `http://localhost:3000/auth/callback`
  - Production: `https://<your-vercel-domain>/auth/callback`

> Parents do **not** need to log in for the MVP. Auth is kept for future admin use.

---

## 2) Local development

### Install deps

```bash
npm install
```

### Environment variables
- Copy `.env.local.example` to `.env.local` and fill:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

```bash
cp .env.local.example .env.local
```

### Run

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## 3) Using the app

- On first visit, go to `/choose-child`.
- Select your child and enter the parent phone number (spaces are ignored).
- Or use **demo mode** to pick any child without verification.
- Use **“Changer d’enfant”** in the header to switch.

---

## 4) Vercel deployment

1. Push to GitHub
2. Import into Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

Optional: set up a Vercel Cron to hit:
- `GET /api/cron/reminders`

---

## Notes / MVP trade-offs

- RLS policies are intentionally permissive for MVP (any authenticated user can read/write).  
  If you need strict per-parent authorization, tighten the policies to only allow parents of the involved players to update a match/score.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

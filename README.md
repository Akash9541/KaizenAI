# KaizenAI

KaizenAI is an AI-powered career coach that helps users with:
- personalized industry insights
- resume building
- cover letter generation
- interview preparation and progress tracking

## Tech Stack

- Next.js 15
- React 19
- Tailwind CSS
- shadcn/ui
- Clerk Authentication
- Prisma ORM
- PostgreSQL / Neon
- Gemini API
- Inngest

## Coding Profile

- GitHub: [Akash9541](https://github.com/Akash9541)

## Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

## Run Locally

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Production Build

```bash
npm run build
npm run start
```

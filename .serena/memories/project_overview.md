# Business Idea AI - Project Overview

## Purpose
A PWA (Progressive Web App) for brainstorming and refining business ideas through voice-based AI conversation. Users can speak their ideas, receive AI feedback, and save conversation summaries to Obsidian.

## Tech Stack
- **Framework**: Next.js 16.1.2 (App Router)
- **React**: 19.2.3
- **TypeScript**: 5.x (strict mode enabled)
- **Styling**: Tailwind CSS v4 + PostCSS
- **Animations**: Framer Motion 12.26.2
- **PWA**: @ducanh2912/next-pwa 10.2.9
- **AI**: Anthropic SDK 0.71.2 (Claude API)
- **Speech**: Google Cloud Speech-to-Text & Text-to-Speech (v7.2.1 & v6.4.0)
- **Linting**: ESLint 9 + Next.js config

## Project Structure
```
src/
├── app/              # Next.js App Router pages & API routes
│   ├── api/          # API endpoints
│   │   ├── claude/   # Claude AI integration
│   │   ├── speech-to-text/
│   │   └── text-to-speech/
│   ├── layout.tsx    # Root layout with PWA metadata
│   └── page.tsx      # Landing page
├── components/       # React components
├── hooks/            # Custom React hooks
├── lib/              # Utility libraries
└── types/            # TypeScript type definitions

docs/                 # Implementation plans & documentation
public/               # Static assets (icons, manifest)
```

## Key Features
1. Voice input with visual feedback
2. Real-time AI conversation (Claude)
3. Text-to-speech responses
4. Obsidian integration (save as markdown)
5. PWA capabilities (installable, offline-ready)
6. Japanese language support (Noto Sans JP font)
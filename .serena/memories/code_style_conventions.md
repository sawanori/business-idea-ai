# Code Style & Conventions

## TypeScript
- **Strict mode enabled**: All types must be explicit
- **JSX**: react-jsx (automatic runtime)
- **Module**: ESNext with bundler resolution
- **Path aliases**: `@/*` maps to `./src/*`
- **Target**: ES2017

## File Naming
- Components: PascalCase (e.g., `VoiceInput.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useChat.ts`)
- Libraries: camelCase (e.g., `speech.ts`)
- Types: camelCase (e.g., `chat.ts`)
- API routes: kebab-case directories with `route.ts`

## Component Patterns
- **Client Components**: Use `'use client'` directive at top
- **Hooks**: Always at top of component, before any conditionals
- **Props**: Define interface/type for component props
- **State**: Use TypeScript for state typing
- **Export**: Default export for components, named exports for utilities

## Styling
- **Tailwind CSS**: Utility-first classes
- **Responsive**: Mobile-first design (`sm:`, `md:`, `lg:` breakpoints)
- **Colors**: Slate for neutrals, Orange for primary actions, Purple for secondary
- **Dark Mode**: Default dark theme (slate-900 background)
- **Animations**: Framer Motion for complex animations, Tailwind for simple transitions

## Code Organization
- Group imports: React → Next.js → External libs → Internal (@/)
- One component per file
- Export interfaces/types from dedicated `types/` directory
- Keep hooks in `hooks/` directory
- Business logic in `lib/` directory

## Accessibility
- Always include `aria-label` for icon-only buttons
- Use semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- Ensure keyboard navigation works
- Provide loading states with visual indicators
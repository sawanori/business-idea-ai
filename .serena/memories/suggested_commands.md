# Suggested Commands

## Development
```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Code Quality
```bash
# Run linter
npm run lint

# TypeScript type checking (no emit)
npx tsc --noEmit
```

## Testing Workflow
After making changes:
1. Run `npx tsc --noEmit` to check types
2. Run `npm run lint` to check code style
3. Run `npm run build` to ensure build succeeds
4. Test manually in browser at http://localhost:3000

## Git Operations (Linux WSL2)
```bash
# Check status
git status

# Add files
git add <file>

# Commit
git commit -m "message"

# View log
git log --oneline
```

## File Operations (Linux)
```bash
# List files
ls -la

# Find files
find . -name "*.tsx"

# Search content
grep -r "pattern" src/

# Create directory
mkdir -p path/to/dir

# View file
cat filename
```

## Environment Setup
- Ensure `.env.local` exists with required API keys:
  - `ANTHROPIC_API_KEY`
  - Google Cloud credentials for Speech APIs
- See `.env.example` for reference
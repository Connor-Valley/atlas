## Visual Debugging

ALWAYS inspect the running dev server first before asking for screenshots:
- Vite direct: http://localhost:5173
- API: http://localhost:3000

For layout/styling issues:
1. Navigate to the relevant page
2. Inspect the component/element
3. Identify the CSS issue
4. Fix it

Only ask for screenshots when:
- Bug is hard to reproduce
- Need approval on complex interaction states
- Comparing before/after for design decisions

## Design References

Visual targets live in `/design-refs/`. Reference by filename instead of uploading:
- "Match the layout in /design-refs/crextio-inspired-layout.png"
- "Use spacing from /design-refs/housing-detail-spacing.png"

When user uploads new design inspo, save it to /design-refs/ with descriptive name.

## Development Setup

**Monorepo structure:**
- `packages/web` - Vue/Vite frontend
- `packages/api` - TypeScript API

**Supabase:**
- Anon key is safe to expose client-side
- Service role key never goes in frontend code
- RLS is the security layer, not key secrecy
- 
## CSS Organization

CSS is split per-feature:
- `base.css` / `layout.css` - shared foundations
- `housing-detail.css`, `comparison.css`, `mobile.css` - feature-specific



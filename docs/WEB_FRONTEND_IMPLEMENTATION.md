# Web Frontend Implementation

## Scope
This document describes the `apps/web` frontend implementation that introduces a production-style landing experience for the Proof-of-Learning project.

## Stack and Tooling
- Framework: Next.js (App Router)
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS v4 + PostCSS
- Motion and interactions:
  - Framer Motion for interactive UI transitions and micro-interactions
  - GSAP + ScrollTrigger for timeline-based hero and scroll choreography
  - Lenis for smooth scrolling behavior
- UI primitives:
  - shadcn-style component patterns
  - Radix UI primitives (tabs, dialog, avatar, separator)

## Architecture Added

### App-level foundation
- Global styles and design tokens in `apps/web/app/globals.css`
- Application shell in `apps/web/app/layout.tsx`
- Main page composition in `apps/web/app/page.tsx`

### Reusable UI system
Created reusable UI primitives under `apps/web/components/ui/`:
- `button.tsx`
- `card.tsx`
- `badge.tsx`
- `tabs.tsx`
- `dialog.tsx`
- `avatar.tsx`
- `separator.tsx`

### Layout components
Created layout components under `apps/web/components/layout/`:
- `site-header.tsx`
- `site-footer.tsx`
- `smooth-scroll.tsx`

### Landing sections
Created feature sections under `apps/web/components/landing/`:
- `hero-section.tsx`
- `what-we-do-section.tsx`
- `proof-stats.tsx`
- `feature-bento.tsx`
- `learning-timeline.tsx`
- `role-experiences.tsx`
- `magic-background.tsx`

## Hero and Dome Interaction Notes
The hero includes a bottom dome visualization with:
- Bottom-up load entrance with spring settle
- Boundary shadows on the dome arc (SVG shadow filters)
- Scroll-based dim/fade/collapse choreography via GSAP ScrollTrigger
- Product-specific content replacing generic placeholder content

## Ngrok and Remote Preview Support
To support remote preview during development, `apps/web/next.config.js` includes `allowedDevOrigins` for ngrok domains. This prevents cross-origin blocking of dev assets such as HMR endpoints and chunk files.

If the ngrok domain changes, update `allowedDevOrigins` and restart the dev server.

## Local Run
From repository root:

```powershell
Set-Location D:/Documents/hack/apps/web
pnpm dev
```

## Notes
- The `.claude/settings.local.json` change is unrelated to frontend implementation and was intentionally left out of frontend commits.
- The frontend is currently optimized for the landing and presentation flow; route-specific sponsor and student pages can be layered next on top of the same design system.

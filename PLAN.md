# Website Build Plan — javi.dev

## Stack Decision
- **Astro 5** — zero-JS static output, content collections for blog, islands for interactive pieces
- **Three.js** — liquid-metal blob in hero (pure vanilla, no React dep)
- **Tailwind CSS** — utility classes for layout, dark theme
- **TypeScript** — strict mode throughout
- **Cloudflare Pages** — deployment target (static export)

## Design System
- Background: `#080808` (near-black)
- Surface: `#111111`
- Border: `#1f1f1f`
- Text primary: `#e2e2e2`
- Text muted: `#666666`
- Accent: `#4ade80` (terminal green)
- Font mono: JetBrains Mono (via Fontsource)
- Font sans: Geist (via Fontsource)
- ASCII box-drawing characters used for structural decoration

## Site Sections
1. **Hero** — Name, "Software Engineer at Google", ASCII decoration, 3D blob
2. **Experience** — Minimal timeline: Google (current) → Acciona → Education
3. **Projects** — Selected work, results-forward, no brag framing
4. **Writing** — Blog section (placeholder → real posts later)
5. **Footer** — Email, GitHub, LinkedIn. Nothing else.

---

## Commits Plan

### 1. `init: scaffold Astro project with TypeScript and Tailwind`
- `npm create astro` with minimal template
- Add `@astrojs/tailwind`, configure `tailwind.config.mjs`
- Add `@fontsource/jetbrains-mono` and `geist` font packages
- Verify `astro dev` runs

### 2. `feat: design system and global styles`
- CSS custom properties for colors, spacing, border-radius
- Dark background set on `<html>`
- Typography scale — monospace for headings/labels, sans for body
- ASCII-style utility classes (box borders, dividers)
- Reset/base styles

### 3. `feat: base layout, nav, and footer`
- `layouts/Base.astro` — HTML shell, font preloads, meta tags
- `components/Nav.astro` — minimal fixed nav: `fjbt` monogram left, links right, ASCII underline on hover
- `components/Footer.astro` — single line: `── contact ──` with icon links

### 4. `feat: hero section with ASCII framing`
- `components/Hero.astro`
- Left column: ASCII box with name/title inside, subtle position subtitle
- Right column: reserved for 3D blob
- ASCII decorative divider below hero

### 5. `feat: Three.js liquid-metal blob`
- `components/Blob.astro` — Astro island (`client:only`)
- `src/lib/blob.ts` — Three.js setup: scene, camera, renderer, lights
- Chrome `MeshPhysicalMaterial` (metalness 1, roughness 0.05, envMap)
- Vertex shader noise displacement for organic breathing motion
- Mouse parallax: subtle tilt based on cursor position
- Transparent canvas overlaid on hero right column

### 6. `feat: experience timeline`
- `components/Experience.astro`
- Vertical timeline with ASCII connector (`│`)
- Each entry: role + company + date range + 1-line summary
- No bullet lists — prose, single sentence per role

### 7. `feat: projects section`
- `components/Projects.astro`
- 3-column grid on desktop, stacked on mobile
- Each card: project name, stack tags (monospace chips), one-line description
- Selected: Crypto Bot, Shift Manager, Algorithm Visualizers, Game Jam Snake

### 8. `feat: writing/blog section with content collections`
- `src/content/config.ts` — Astro content collection schema for blog
- `src/content/blog/` — empty dir with `.gitkeep`
- `pages/blog/index.astro` — listing page
- `pages/blog/[slug].astro` — post page
- `components/Writing.astro` — homepage section: "coming soon" state if no posts

### 9. `polish: responsive, transitions, meta, final pass`
- Mobile layout adjustments (blob moves below text on small screens)
- Subtle fade-in on scroll for sections (Intersection Observer, no deps)
- OG meta tags, favicon (ASCII-styled), page title
- Accessibility: focus rings, reduced-motion media query for blob
- Final color and spacing review

---

## Running locally
```bash
npm install
npm run dev
# → http://localhost:4321
```

## Deploy
```bash
npm run build
# Output in /dist — deploy to Cloudflare Pages or Vercel
```

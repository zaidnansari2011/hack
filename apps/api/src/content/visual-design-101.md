---
title: Visual Design & Typography
slug: visual-design-101
---

# Hierarchy: the first thing the eye learns

Visual hierarchy is the order in which a viewer's eye moves through your design. Strong hierarchy means the most important thing is unmissable, the second-most important is obvious in context, and the least important politely steps aside. Hierarchy is created with **size**, **weight**, **colour**, **spacing**, and **position** — usually combined.

Beginners reach for size first ("make it bigger"). Pros reach for **contrast in spacing** before size — adding 32px of breathing room around a heading does more than bumping it from 24px to 28px. White space is not empty; it's where attention goes. The most common amateur mistake is filling every pixel: cramped layouts have no hierarchy because nothing is allowed to be more important than anything else.

# Typography fundamentals

Type is the workhorse of digital design. Three decisions cover 80% of typographic quality: **typeface pairing**, **line height**, and **measure** (line length).

Pair fonts by intention, not by genre. A common reliable system: one neutral sans-serif for UI and body (Inter, Söhne, IBM Plex Sans), one expressive display face for headings (a serif like GT Sectra or a high-contrast sans like Druk). Stop at two families. Three is rarely better and usually worse.

Body text wants **1.5–1.7× line height** and **45–75 characters per line**. Tighter than 1.5 and lines visually merge; wider than 75 characters and the reader's eye loses its place returning to the next line. These rules come from typography research dating back to print and still apply on screen.

# Colour with intent

Colour is the easiest design choice to get wrong because everyone has opinions on it. The professional approach: pick a **restrained palette**, define semantic roles, and stick to them.

A common minimal system: one neutral (a near-black for text, plus a few greys), one brand accent for important interactive elements, plus muted semantic colours for success/warning/error. That's six to eight colours total. Tools like Radix Colors or Tailwind's defaults give you full scales (50–950) so you can pick `slate-700` for text and `slate-200` for borders without inventing values.

Accessibility floor: text must have **4.5:1 contrast ratio** against its background (WCAG AA). Use a contrast checker — your "definitely visible" grey is usually 3.2:1 and unreadable for anyone over 50 or anyone on a sunny train ride.

# Spacing and the 8-point grid

Most great UIs are built on an 8-point spacing system: every margin, padding, gap, and dimension is a multiple of 8 (or 4 for tighter values). 8, 16, 24, 32, 48, 64. The benefit isn't aesthetic dogma — it's that decisions become faster and components compose without weird leftover gaps.

The rule of proximity: items that belong together are closer; unrelated items get more space. Group a heading with the paragraph it introduces (tight gap), then space generously before the next section starts. Use this consistently and a page reads itself.

# Iconography and image craft

Icons should be from one family (Lucide, Feather, Heroicons, Phosphor — pick one). Mixing icon styles in the same UI is the single most common mark of amateur work. Keep stroke weight consistent (usually 1.5px or 2px), align to the same grid, and use icons sparingly — every icon you add competes with text and other icons for attention.

Images need craft too. Compress aggressively (WebP or AVIF, never PNG screenshots for product imagery). Set explicit width/height attributes so the browser reserves space and the page doesn't jump as images load. Treat decorative images as background to keep them out of the document flow, and reserve meaningful images as actual content.

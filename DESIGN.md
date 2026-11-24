# DESIGN.md

## Direction
Simple and literary, modelled on the Inherent Labs site (inherentlabs.ai): warm paper, one ink colour, a reading serif, a single centred column of prose. The opening screen is just the mark, the name, one line ("In pursuit of understanding the human brain."), an italic invitation, a "New:" link and a scroll cue, with vintage specimen-plate butterflies scattered in the margins behind the whole page (`assets/butterflies/`).

## Colour (one ink on paper)
| Token | Value | Use |
|---|---|---|
| `--ground` | `#faf6ee` | Paper (near-white, warm) |
| `--panel` | `#fdfbf7` | EEG figure panel |
| `--ink` | `#1d2f5c` | All text, links, the mark, EEG traces |
| `--ink-2` / `--ink-3` | `#4d5a7a` / `#565f7c` | Secondary text, captions |
| `--grid` / `--grid-strong` | `#ebe4d6` / `#d8cdb8` | Rules, borders |

## Type (deliberately uncommon)
- Cormorant Garamond (high-contrast display Garamond): the hero name, and the hero line in italic.
- Brygada 1918 (serif, revival of a 1918 Polish typeface): section headings, body at 21px / 1.72, italics for meta lines and captions.
- Gantari (sans): wordmark, nav, small UI.
- Geist Mono: EEG channel labels and readout only.
Self-hosted in `fonts/`, except Cormorant Garamond, which loads from Google Fonts for now.

## Layout
- Opening screen: 100svh, content in the same 44rem column as the text below.
- Header hidden on the opening screen; it fades in once you scroll past 55% of it.
- Long-form column: intro, EEG figure with italic caption, Research, ornament, Software, Contact, footer.

## Motion
- Opening lines fade up once on load (700ms, ease-out, staggered 40/120/200/280ms); opacity only under reduced motion.
- EEG montage: draws in when scrolled to, pause button, paused under reduced motion; eyes closed/open toggle slides (220ms ease-in-out).
- Hover effects gated by `(hover: hover) and (pointer: fine)`.

## Rules
- Every claim is true; in-progress work says so.
- No labels above headings, no gradients, no cards.

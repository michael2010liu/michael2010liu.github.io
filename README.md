# Michael Liu · personal research site

Plain HTML, CSS and JS. No build step.

## Preview
Open a terminal in this folder and run:

    python3 -m http.server 8000

then visit http://localhost:8000. (Opening index.html directly works too, but the fonts only load over http.)

## Before publishing
In `index.html`, replace:
- `hello@yourdomain.com` with your email (appears twice on one line).
- The `#` links for GitHub, LinkedIn and CV. Put a CV PDF in this folder and link it as `cv.pdf`.

## Publish
Any static host works: GitHub Pages, Netlify (drag the folder in) or Vercel.

## Files
- `index.html`, `styles.css`, `main.js`: the site. `main.js` draws the synthetic EEG montage.
- `assets/traces.svg`: the faint background lines on the opening screen.
- `fonts/`: self-hosted Brygada 1918 (serif), Gantari (sans), Geist Mono (EEG labels).
- `PRODUCT.md`, `DESIGN.md`: context for Impeccable and other design skills when you keep working on the site with Claude Code.
- `.claude/skills/`, `.mcp.json`: your installed skills and the Figma MCP server.

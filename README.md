# Textforge: free text & developer tools

Static site, no build step needed to serve, no backend and no tracking of user text. Everything runs in the browser.

**Tools (one crawlable page each):** Word Counter (`/`), Case Converter (`/case-converter/`), JSON Formatter (`/json-formatter/`), Base64 (`/base64-encode-decode/`), URL encode/decode + HTML entities (`/url-encode-decode/`), Text Diff (`/text-diff/`), Lorem Ipsum (`/lorem-ipsum-generator/`), Regex Tester (`/regex-tester/`).

## Files
- `template.html`: the single source page. **Edit this, never the generated `index.html` files.**
- `build_pages.py`: generates `index.html` + 7 tool folders (title, description, canonical, H1, lead, How-to, 4 FAQs, FAQPage + BreadcrumbList JSON-LD, cross-links) and `sitemap.xml`. Run `python3 build_pages.py` after any change to the template or page copy.
- `app.js`: all logic and UI (no inline scripts or handlers; strict CSP friendly). `worker.js`: regex engine in a Web Worker with a 1.5 s kill switch.
- `styles.css`, `privacy.html`, `terms.html`, `_headers`, `robots.txt`, `sitemap.xml`, `ads.txt`.

## Local preview
The regex worker needs http (not file://): from the parent of a folder named `textforge` containing this repo: `python3 -m http.server 8000` then open http://localhost:8000/textforge/ (mirrors the Pages sub-path)

## GitHub Pages (https://cinch2108.github.io/textforge/)
This folder is the repo root for the `textforge` repo under `cinch2108` (Settings → Pages → Deploy from branch `main`, folder `/`). It is served from the `/textforge/` sub-path, so:
- All internal links and assets are relative (`styles.css`, `../case-converter/`, `./`). Never add root-absolute links like `href="/..."`; they would point at `cinch2108.github.io/` instead of the site.
- The base URL `https://cinch2108.github.io/textforge` is set in `DOMAIN` at the top of `build_pages.py` (canonical, og:url, JSON-LD, sitemap) plus `template.html`, `robots.txt`, `privacy.html`, `terms.html`. To move to a custom domain later, change it there, run `python3 build_pages.py`, and add a `CNAME` file.
- `404.html` is served by Pages for any missing URL at any depth, so it uses `<base href="/textforge/">` (the one intentional root-relative path) to keep its CSS and links working. If the repo is renamed, update that line.
- `.nojekyll` is present so Pages serves files as-is (no Jekyll processing).
- `robots.txt` here is informational only: crawlers read robots.txt only at the domain root (`cinch2108.github.io/robots.txt`). Submit the sitemap directly in Search Console (URL-prefix property `https://cinch2108.github.io/textforge/`).
- All three sites share the `cinch2108.github.io` origin, so local storage is shared between them; this site's keys are all prefixed (`textforge.*`) so nothing collides.

### Headers GitHub Pages can't set
GitHub Pages ignores `_headers` (kept only for a future move to Netlify/Cloudflare Pages). What is covered instead:
- **Content-Security-Policy** and **Referrer-Policy**: set as `<meta>` tags on every page (tool pages, privacy, terms, 404).
- **frame-ancestors** (CSP, not allowed in a meta tag) and **X-Frame-Options**: cannot be set. `app.js` starts with a frame-buster that breaks out of (or blanks the page inside) any frame from another origin. Privacy, terms and 404 have no JS and nothing interactive, so they aren't covered.
- **Strict-Transport-Security**: can't be set by you, but github.io is HSTS-preloaded and Pages enforces HTTPS (tick "Enforce HTTPS" if you add a custom domain).
- **X-Content-Type-Options**, **Permissions-Policy**, **Cross-Origin-Opener-Policy**: cannot be set on Pages (not valid as meta tags).

### Contact email
The privacy and terms pages use the placeholder **contact@example.com**. Change it to a real address you read before launch: `grep -rl contact@example.com .`

## Launch checklist
1. [x] Base URL set to `https://cinch2108.github.io/textforge` (see GitHub Pages above).
2. [ ] Replace the placeholder `contact@example.com` in `privacy.html` and `terms.html` with a real address.
3. [ ] Create the `cinch2108/textforge` repo, push this folder as the root, enable Pages (branch `main`, `/`), and check https://cinch2108.github.io/textforge/ and a random missing URL (should show the 404 page).
4. [ ] Apply to AdSense (or another network). Put your publisher line in `ads.txt`.
5. [ ] Paste ad units into the four `data-ad-slot` containers in `template.html` (top 970x90, rail 300x250 ×2, footer 728x90) and rebuild.
6. [ ] Add the ad network domains to the CSP in the `<meta http-equiv="Content-Security-Policy">` in `template.html` (and `_headers` if you ever move hosts) (script-src, img-src, frame-src, connect-src). For EU/UK traffic use a Google-certified CMP or wire the banner's choice (`localStorage['textforge.consent']`) to Consent Mode.
7. [ ] Make a 1200x630 `og.png` and add `og:image` / `twitter:image` tags to `template.html`.
8. [ ] Submit `https://cinch2108.github.io/textforge/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
9. [ ] Test on a phone and in Lighthouse (aim for 95+ on all four scores).

## Limits (by design, to keep the page responsive)
Counter/Case 2M chars · JSON & encoder 5M · files 10 MB · diff 1M chars and 50k lines per side · regex text 500k, 5,000 highlighted matches, 1.5 s timeout.

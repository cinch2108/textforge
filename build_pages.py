# Generates one SEO page per tool from template.html. Run: python3 build_pages.py
import re, json, os
DOMAIN = "https://cinch2108.github.io/textforge"
SELF = "textforge"
# ---- "More free tools" team footer: edit this ONE list, then run `python3 build_pages.py`. ----
# Applied to every generated page plus privacy.html, terms.html and 404.html. The current site is left out.
TEAM = [
    ("chroma",     "Chroma",     "https://cinch2108.github.io/chroma/",     "Color palettes, contrast checker & gradients"),
    ("textforge",  "Textforge",  "https://cinch2108.github.io/textforge/",  "Word counter, JSON, Base64, diff & regex"),
    ("hourlark",   "Hourlark",   "https://cinch2108.github.io/hourlark/",   "Timer, stopwatch, Pomodoro & world clock"),
    ("numora",     "Numora",     "https://cinch2108.github.io/numora/",     "30 calculators & a unit converter"),
    ("pixelsmith", "Pixelsmith", "https://cinch2108.github.io/pixelsmith/", "Compress, resize & convert images"),
    ("mintkit",    "Mintkit",    "https://cinch2108.github.io/mintkit/",    "QR codes, barcodes & passwords"),
    ("tagloom",    "Tagloom",    "https://cinch2108.github.io/tagloom/",    "SEO tools: meta tags, sitemaps & schema"),
    ("postsmith",  "Postsmith",  "https://cinch2108.github.io/postsmith/",  "Social media tools: fancy text, counters & hashtags"),
    ("localforge", "LocalForge PDF", "https://cinch2108.github.io/",        "Merge, split, compress & sign PDFs"),
]
def team_html():
    items = ''.join(f'<li><a href="{u}" rel="noopener">{n}</a><span>{d.replace("&", "&amp;")}</span></li>' for k, n, u, d in TEAM if k != SELF)
    return f'<!--team--><nav class="more-tools" aria-label="More free tools"><h2>More free tools</h2><ul>{items}</ul></nav><!--/team-->'
def add_team(s):
    import re as _re
    if '<!--team-->' in s: return _re.sub(r'<!--team-->.*?<!--/team-->', lambda m: team_html(), s, flags=_re.S)
    if '<footer>' in s: return s.replace('<footer>', '<footer>' + team_html(), 1)
    return s.replace('</main>', '</main><footer>' + team_html() + '</footer>', 1)

BRAND = "Textforge"
T = open('template.html', encoding='utf-8').read()
PAGES = [
 dict(p='count', v='count', slug='', tab='Counter', name='Word Counter',
  title='Word Counter: Free Character, Sentence &amp; Reading Time Counter | Textforge',
  desc='Count words, characters, sentences, paragraphs and lines as you type. See reading time, keyword density and X, SEO and SMS length limits. Free and private.',
  h1='Word counter that <span>counts everything, live.</span>',
  lead='Paste or type your text to see words, characters, sentences, reading time, keyword density and how it fits X, meta description and SMS limits. Your text never leaves your browser.',
  how=['Type in the box or paste your text with Ctrl+V (⌘V on Mac). Everything updates as you type.',
       'Read the word and character counts at the top right, plus sentences, paragraphs, lines and unique words.',
       'Check reading and speaking time for blog posts, talks and video scripts.',
       'Use the length limits panel to see how many characters you have left for an X post, SEO title, meta description, SMS and more.',
       'Look at Top keywords to spot words you repeat too often. Switch to 2 or 3 words to find repeated phrases.'],
  faq=[('How are words counted?','A word is any run of letters or numbers, so contractions like “don’t” and hyphenated words like “well-known” count as one word, the same way Microsoft Word counts them. Chinese, Japanese and Thai text is split into words using your browser’s built-in language rules.'),
       ('Do spaces count as characters?','Yes, the main character count includes spaces and punctuation, which is how X, Google and most forms count. The “Without spaces” figure leaves out all spaces, tabs and line breaks. Emoji and accented letters count as one character each.'),
       ('How is reading time calculated?','Reading time assumes an average silent reading speed of 238 words per minute, and speaking time assumes 150 words per minute, which is a comfortable pace for presentations and voiceovers.'),
       ('Is my text saved or uploaded?','No. All counting happens in your browser. Nothing you type is sent to a server or stored, so it is safe for private documents.')]),
 dict(p='case', v='case', slug='case-converter', tab='Case', name='Case Converter',
  title='Case Converter: Title Case, UPPER, lower, camelCase &amp; snake_case | Textforge',
  desc='Convert text to Title Case, Sentence case, UPPERCASE, lowercase, camelCase, PascalCase, snake_case, kebab-case and more. Remove extra spaces, sort and dedupe lines. Free.',
  h1='Change text case <span>in one click.</span>',
  lead='Smart Title Case that keeps small words lowercase, every programming case from camelCase to CONSTANT_CASE, and clean-up tools for spaces, line breaks and duplicate lines.',
  how=['Paste your text into the box.','Click any case button. The text changes in place, and each line is converted separately, so whole lists of names or variables work at once.',
       'Use the clean-up buttons to trim extra spaces, remove line breaks or empty lines, sort lines A to Z, remove duplicates or reverse the order.',
       'Made a mistake? Click Undo to step back through your last 25 changes.','Copy the result or download it as a .txt file.'],
  faq=[('How does Title Case decide which words to capitalize?','It follows the common style used by AP and Chicago: short words like “a”, “and”, “of”, “the” and “to” stay lowercase unless they are the first or last word or follow a colon. Words that already have mixed capitals such as iPhone, and acronyms like NASA, are left alone.'),
       ('What is the difference between camelCase and PascalCase?','camelCase starts with a lowercase letter and capitalizes each following word (userFirstName), and is common for JavaScript variables. PascalCase capitalizes every word (UserFirstName), and is common for class and component names.'),
       ('When should I use snake_case or kebab-case?','snake_case (user_first_name) is the convention in Python and many databases, CONSTANT_CASE is used for constants and environment variables, and kebab-case (user-first-name) is standard for URLs, CSS classes and file names.'),
       ('Can I convert a whole list at once?','Yes. Every line is converted on its own, so you can paste hundreds of names, headings or variable names and convert them all in one click.')]),
 dict(p='json', v='json', slug='json-formatter', tab='JSON', name='JSON Formatter',
  title='JSON Formatter &amp; Validator: Beautify, Minify &amp; Fix JSON Online | Textforge',
  desc='Format, validate and minify JSON with exact error line and column, syntax highlighting, sort keys, a collapsible tree view and one-click repair. Free, private, no upload.',
  h1='JSON formatter that <span>shows exactly what’s wrong.</span>',
  lead='Beautify or minify JSON, see the exact line and column of any error, repair common mistakes in one click, and explore big files in a collapsible tree. Your data stays in your browser.',
  how=['Paste your JSON into the Input box. It is checked as you type, and the badge shows whether it is valid.',
       'Click <b>Format</b> (or press Ctrl+Enter) to beautify it with 2 spaces, 4 spaces or tabs, or <b>Minify</b> to strip all whitespace.',
       'If it is invalid, the error box shows the message, the line and column, and highlights the exact character. Click <b>Go to error</b> to jump there.',
       'Click <b>Repair</b> to fix trailing commas, comments, single quotes, unquoted keys and Python-style True, False and None automatically.',
       'Switch to <b>Tree</b> view to expand and collapse objects. Click any value to copy its path, such as <code>$.users[0].email</code>.'],
  faq=[('Is it safe to paste private JSON here?','Yes. Formatting and validation run entirely in your browser with no server involved, so API keys, tokens and customer data never leave your device.'),
       ('What does the Repair button fix?','It fixes the most common reasons JSON fails to parse: trailing commas, // and /* */ comments, single-quoted strings, unquoted property names, and True, False, None, undefined or NaN values. If the JSON is still invalid afterwards, the exact error is shown.'),
       ('Why does it warn about large numbers?','JavaScript, and many JSON parsers, can only store whole numbers exactly up to 9,007,199,254,740,991. Larger IDs lose precision when parsed, so the formatter flags them so you can store them as strings instead.'),
       ('How big a file can I format?','Up to 5 MB of JSON. Syntax highlighting is used up to about 1.5 MB of output, and larger results are shown as plain text so the page stays fast. The tree view loads big arrays in chunks as you expand them.')]),
 dict(p='b64', v='encode', mode='b64', slug='base64-encode-decode', tab='Base64', name='Base64 Encoder',
  title='Base64 Encode &amp; Decode: Text, Files &amp; URL-Safe Base64 | Textforge',
  desc='Encode and decode Base64 with full UTF-8 and emoji support, URL-safe Base64, and file to Base64 or data URI conversion up to 10 MB. Free and nothing is uploaded.',
  h1='Base64 encode and decode, <span>emoji and files included.</span>',
  lead='Convert text to and from Base64 with proper UTF-8 support, switch to URL-safe Base64 for tokens, or turn any file into Base64 or a data URI. Everything happens on your device.',
  how=['Choose <b>Encode</b> or <b>Decode</b>, then type or paste into the left box. The result updates instantly.',
       'Tick <b>URL-safe</b> to use - and _ instead of + and / and drop the = padding, which is what JWTs and many APIs expect. Decoding accepts both forms automatically.',
       'To encode a file, drop it on the File to Base64 area. You can copy it as plain Base64, a data URI, a CSS background or an &lt;img&gt; tag.',
       'If decoded Base64 is an image, PDF or other binary file, click <b>Decode Base64 input to a file</b> to download it.',
       'Use ⇄ Swap to send the result back to the input and flip direction, which makes round-trip checks easy.'],
  faq=[('Is Base64 encryption?','No. Base64 is an encoding that turns bytes into plain text so they can travel through email, JSON or URLs. Anyone can decode it, so never use it to protect passwords or secrets.'),
       ('Why does my emoji or accented text decode wrong on other sites?','Many tools use the browser’s btoa function directly, which only handles Latin-1. Textforge converts text to UTF-8 bytes first, so emoji, accents and every language round-trip correctly.'),
       ('What is URL-safe Base64?','It is a variant that replaces + with - and / with _ and usually removes the trailing = padding, so the result can be used in URLs, file names and JSON Web Tokens without escaping.'),
       ('Are my files uploaded?','No. Files are read with your browser’s FileReader and encoded locally. Files up to 10 MB are supported; Base64 makes data about 33% larger.')]),
 dict(p='url', v='encode', mode='url', slug='url-encode-decode', tab='URL', name='URL Encoder',
  title='URL Encode &amp; Decode Online: Percent-Encoding &amp; Query Parser | Textforge',
  desc='Percent-encode or decode URLs and query strings, choose component or full-URL encoding, treat + as space, and see every query parameter decoded. Free and private.',
  h1='URL encode and decode, <span>with every parameter explained.</span>',
  lead='Percent-encode text for query strings, decode messy links, and paste any URL to see its host, path and every query parameter decoded in a clean table.',
  how=['Choose <b>Encode</b> or <b>Decode</b> and paste your text or URL on the left.',
       'Pick <b>Component</b> to encode a single query value (it escapes &amp;, =, / and ?), or <b>Full URL</b> to keep the structure of a complete link intact.',
       'When decoding form data or search queries, tick <b>+ means space</b> so plus signs turn into spaces.',
       'Paste a complete link starting with https:// to see the URL breakdown: protocol, host, path, fragment and each query parameter, already decoded.',
       'The HTML entities tab converts &lt; &gt; &amp; and quotes to safe entities and back.'],
  faq=[('What is URL encoding?','URL encoding, or percent-encoding, replaces characters that are not allowed in URLs with a % followed by two hex digits. A space becomes %20 and é becomes %C3%A9, because non-ASCII characters are first converted to UTF-8 bytes.'),
       ('Should I use component or full URL encoding?','Use Component for anything you put inside a URL, such as a search term or a redirect address in a query parameter. Use Full URL only for a whole address you want to make valid while keeping its :, /, ? and &amp; characters working.'),
       ('Why does decoding fail with “Malformed % sequence”?','A % must be followed by two hex digits that form valid UTF-8. A stray % sign, or a link cut off in the middle of a character, can’t be decoded. Encode the literal % as %25 instead.'),
       ('Why do I see + instead of spaces?','HTML forms and many search engines encode spaces as +. Tick “+ means space” when decoding those. In other parts of a URL a + is a real plus sign, so leave it off.')]),
 dict(p='diff', v='diff', slug='text-diff', tab='Diff', name='Text Diff Checker',
  title='Text Diff Checker: Compare Two Texts Side by Side | Textforge',
  desc='Compare two texts or code files and see every change highlighted side by side or inline, line by line or word by word. Ignore whitespace or case. Free, nothing uploaded.',
  h1='Compare text and <span>see every change instantly.</span>',
  lead='Paste two versions and see added and removed lines side by side, with the exact changed words highlighted inside each line. Works for documents, code, configs and contracts.',
  how=['Paste the original on the left and the changed version on the right. The comparison runs as you type.',
       'Choose <b>Side by side</b> or <b>Inline</b> layout, and <b>Lines</b> for code or <b>Words</b> for prose.',
       'Changed lines are paired and the exact words that differ are highlighted in red and green.',
       'Tick <b>Ignore whitespace</b> or <b>Ignore case</b> to hide changes that don’t matter, and <b>Hide unchanged</b> to collapse long identical sections.',
       'Read the summary for added, removed and unchanged lines and an overall similarity score.'],
  faq=[('How does the diff work?','It uses the Myers diff algorithm, the same approach used by Git, to find the smallest set of added and removed lines. Lines that were edited are then compared word by word so you can see exactly what changed inside them.'),
       ('Can I compare code?','Yes. Line mode with a monospace font and line numbers is designed for code, JSON, YAML and config files. Turn on Ignore whitespace to skip indentation-only changes.'),
       ('Is there a size limit?','Each side can be up to 1 million characters and 50,000 lines. Very different texts are shown as a simplified replace so the page stays responsive.'),
       ('Is my text private?','Yes. Both texts are compared in your browser and are never uploaded, which makes it safe for contracts, drafts and source code.')]),
 dict(p='lorem', v='lorem', slug='lorem-ipsum-generator', tab='Lorem', name='Lorem Ipsum Generator',
  title='Lorem Ipsum Generator: Paragraphs, Words, Lists &amp; HTML | Textforge',
  desc='Generate lorem ipsum placeholder text by paragraphs, sentences, words or list items, in classic Latin or fun tech, corporate, space and coffee flavors, with optional HTML tags.',
  h1='Lorem ipsum generator <span>with a little personality.</span>',
  lead='Get exactly the placeholder text you need, as paragraphs, sentences, words or list items, in classic Latin or one of four fun flavors, as plain text or ready-to-paste HTML.',
  how=['Enter how many you need and choose paragraphs, sentences, words or list items.',
       'Pick a flavor: Classic Latin, Tech and startup, Corporate speak, Space or Coffee shop.',
       'Keep “Start with Lorem ipsum…” on for the traditional opening, or turn it off for random text.',
       'Tick <b>HTML tags</b> to wrap paragraphs in &lt;p&gt; and lists in &lt;ul&gt;&lt;li&gt;.',
       'Click <b>Generate</b> (or press Ctrl+Enter) for fresh text, then Copy.'],
  faq=[('What is lorem ipsum?','Lorem ipsum is scrambled Latin adapted from Cicero’s “De finibus bonorum et malorum”, written in 45 BC. Printers and designers have used it since the 1500s as filler text, because it looks like real writing without distracting readers with meaning.'),
       ('Why use placeholder text instead of real copy?','It lets you judge layout, typography and spacing before the final words are ready, and stops reviewers from getting sidetracked by the content itself.'),
       ('Can I use the generated text commercially?','Yes. The text is randomly generated and free to use in any project, mockup or product.'),
       ('How much text can I generate?','Up to 200 paragraphs or list items, 2,000 sentences or 10,000 words at a time.')]),
 dict(p='regex', v='regex', slug='regex-tester', tab='Regex', name='Regex Tester',
  title='Regex Tester: Test JavaScript Regular Expressions Online | Textforge',
  desc='Test JavaScript regex with live match highlighting, capture and named groups, replace preview, flags, a cheat sheet and ready-made patterns for email, URL, phone, date and IP.',
  h1='Regex tester with <span>live highlighting.</span>',
  lead='Write a pattern and see every match highlighted as you type, with numbered and named groups, a live replace preview, a cheat sheet and patterns for emails, URLs, dates and more.',
  how=['Type your pattern between the slashes, and toggle flags such as g (all matches), i (ignore case) and m (multiline).',
       'Paste your test text. Every match is highlighted in alternating colors, and empty matches show as a thin marker.',
       'Read the Matches panel for each match’s position, its numbered groups ($1, $2) and its named groups.',
       'Type a replacement such as <code>$1</code> or <code>$&lt;year&gt;</code> to preview the result of a find-and-replace.',
       'Pick a pattern from Common patterns, or click any token in the cheat sheet to insert it.'],
  faq=[('Which regex flavor does this use?','It uses your browser’s JavaScript (ECMAScript) regex engine, so results match exactly what you get in JavaScript, TypeScript and Node.js, including named groups, lookbehind and the u and s flags.'),
       ('What happens if my pattern is too slow?','Patterns run in a separate background worker. If one takes longer than 1.5 seconds, usually because of catastrophic backtracking from nested quantifiers like (a+)+, it is stopped automatically and the page stays responsive.'),
       ('How do I use capture groups in a replacement?','Use $1, $2 and so on for numbered groups, $&lt;name&gt; for named groups, $&amp; for the whole match and $$ for a literal dollar sign.'),
       ('Why do I only get one match?','Without the g (global) flag, JavaScript stops after the first match. Turn on g to find every match, which is on by default.')]),
]

def rel(d, p): return ('../' * d) + p
def href(d, q): return rel(d, q['slug'] + '/' if q['slug'] else '') or './'
def page_url(p): return f"{DOMAIN}/{p['slug'] + '/' if p['slug'] else ''}"
strip = lambda s: re.sub(r'<[^>]+>', '', s).replace('&amp;', '&')

for p in PAGES:
    d = 1 if p['slug'] else 0
    s = T
    s = re.sub(r'<title>.*?</title>', f"<title>{p['title']}</title>", s, flags=re.S)
    s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{p["desc"]}">', s)
    s = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{page_url(p)}">', s)
    s = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{page_url(p)}">', s)
    s = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{p["title"]}">', s)
    s = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{p["desc"]}">', s)
    s = re.sub(r'<meta name="twitter:title" content="[^"]*">', f'<meta name="twitter:title" content="{p["title"]}">', s)
    s = re.sub(r'<meta name="twitter:description" content="[^"]*">', f'<meta name="twitter:description" content="{p["desc"]}">', s)
    attrs = f' data-view="{p["v"]}" data-page="{p["p"]}"' + (f' data-mode="{p["mode"]}"' if p.get('mode') else '') + ('' if p['slug'] else ' data-home="1"')
    s = s.replace('<body>', f'<body{attrs}>', 1)
    s = re.sub(r'<h1>.*?</h1>', f"<h1>{p['h1']}</h1>", s, count=1, flags=re.S)
    s = re.sub(r'(<section class="hero">.*?)<p>.*?</p>', lambda m: m.group(1) + f"<p>{p['lead']}</p>", s, count=1, flags=re.S)
    s = s.replace('<div class="logo"><i></i>Textforge</div>', f'<a class="logo" href="{href(d, PAGES[0])}" aria-label="{BRAND} home" style="color:inherit;text-decoration:none"><i></i>{BRAND}</a>', 1)
    tabs = ''.join(f'<a class="tab{" active" if q is p else ""}" data-p="{q["p"]}" data-v="{q["v"]}" data-name="{q["name"]}" href="{href(d, q)}"{" aria-current=" + chr(34) + "page" + chr(34) if q is p else ""} title="{q["name"]} (Alt+{i + 1})">{q["tab"]}</a>' for i, q in enumerate(PAGES))
    s = re.sub(r'<nav class="tabs" id="tabs" aria-label="Tools">.*?</nav>', f'<nav class="tabs" id="tabs" aria-label="Tools">{tabs}</nav>', s, flags=re.S)
    s = s.replace('class="view active"', 'class="view"').replace(f'class="view" id="v-{p["v"]}"', f'class="view active" id="v-{p["v"]}"')
    if p.get('mode') == 'url':  # start the shared encode panel in URL mode for no-JS crawlers too
        s = s.replace('<button class="on" data-mode="b64">', '<button data-mode="b64">').replace('<button data-mode="url">', '<button class="on" data-mode="url">')
    for a in ['styles.css', 'app.js', 'privacy.html', 'terms.html']:
        s = s.replace(f'"{a}"', f'"{rel(d, a)}"')
    others = ''.join(f'<a href="{href(d, q)}">{q["name"]}<span>{q["desc"].split(". ")[0].rstrip(".")}.</span></a>' for q in PAGES if q is not p)
    art = f'''<article class="seo">
<h2>How to use the {p["name"].lower() if p["p"] not in ("json","b64","url") else p["name"].replace("Encoder","encoder").replace("Formatter","formatter")}</h2>
<ol>{''.join(f"<li>{x}</li>" for x in p["how"])}</ol>
<h2>Frequently asked questions</h2>
{''.join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in p["faq"])}
<h2>More free text and developer tools</h2>
<div class="toollinks">{others}</div>
</article>'''
    s = s.replace('<!-- AD SLOT: footer 728x90 -->', art + '\n<!-- AD SLOT: footer 728x90 -->', 1)
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": strip(q), "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in p["faq"]]}
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": BRAND, "item": DOMAIN + "/"}] + ([{"@type": "ListItem", "position": 2, "name": p["name"], "item": page_url(p)}] if p['slug'] else [])}
    ld = lambda o: json.dumps(o, ensure_ascii=False).replace('</', '<\\/')
    s = s.replace('</head>', f'<script type="application/ld+json">{ld(faq)}</script>\n<script type="application/ld+json">{ld(crumbs)}</script>\n</head>', 1)
    out = (p['slug'] + '/index.html') if p['slug'] else 'index.html'
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    s = add_team(s)
    open(out, 'w', encoding='utf-8').write(s)

open('sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{page_url(p)}</loc><lastmod>2026-10-25</lastmod></url>\n' for p in PAGES)
    + f'  <url><loc>{DOMAIN}/privacy.html</loc></url>\n  <url><loc>{DOMAIN}/terms.html</loc></url>\n</urlset>\n')
print('built', len(PAGES), 'pages')

# team footer on the static pages
for _f in ['privacy.html', 'terms.html', '404.html']:
    _s = open(_f, encoding='utf-8').read()
    open(_f, 'w', encoding='utf-8').write(add_team(_s))

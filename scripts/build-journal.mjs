// Turns posts written in /admin (content/journal/*.json) into pages on the site.
// Runs on every Vercel deploy. If a post is invalid this stops with an error before
// writing anything, so the deploy fails and the current live site stays up.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from './vendor/marked.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content/journal');
const INDEX = path.join(ROOT, 'journal/index.html');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const SITE = 'https://www.raneemghalion.com';
const WORDS_PER_MINUTE = 200;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoDate = (d) => String(d ?? '').slice(0, 10);
const prettyDate = (d) => new Date(`${isoDate(d)}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const replaceBetween = (text, start, end, body) => {
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a < 0 || b < a) throw new Error(`Missing markers ${start} ... ${end}`);
  return text.slice(0, a + start.length) + body + text.slice(b);
};

function loadPosts() {
  if (!fs.existsSync(CONTENT)) return [];
  const legacy = readLegacy().map((p) => p.href.replace(/\.html$/, ''));
  const errors = [];
  const posts = [];
  for (const file of fs.readdirSync(CONTENT).filter((f) => f.endsWith('.json')).sort()) {
    const slug = file.slice(0, -'.json'.length).normalize('NFC').toLowerCase()
      .replace(/['’‘`]/g, '').replace(/[^\p{L}\p{N}\p{M}-]+/gu, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let post;
    try {
      post = JSON.parse(fs.readFileSync(path.join(CONTENT, file), 'utf8'));
    } catch (e) {
      errors.push(`${file}: not valid JSON (${e.message})`);
      continue;
    }
    if (post.draft === true) continue;
    if (!String(post.title ?? '').trim()) errors.push(`${file}: needs a title`);
    if (!/^\d{4}-\d{2}-\d{2}/.test(String(post.date ?? '')) || Number.isNaN(Date.parse(isoDate(post.date)))) errors.push(`${file}: needs a valid date`);
    if (!String(post.body ?? '').trim()) errors.push(`${file}: needs some text in the body`);
    if (slug === 'index' || legacy.includes(slug)) errors.push(`${file}: this title clashes with an existing page, please change it`);
    if (slug.includes('/') || slug.includes('..')) errors.push(`${file}: invalid file name`);
    if (posts.some((p) => p.slug === slug)) errors.push(`${file}: another post has the same web address, please change the title`);
    posts.push({ ...post, slug });
  }
  if (errors.length) throw new Error(`Cannot publish:\n  ${errors.join('\n  ')}`);
  return posts;
}

function readLegacy() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/journal-legacy.json'), 'utf8'));
}

// Header, footer and head parts come from the Journal page, so posts always match the site.
function sharedParts(html) {
  const grab = (re, name) => {
    const m = html.match(re);
    if (!m) throw new Error(`Could not find the ${name} in journal/index.html`);
    return m[0];
  };
  const header = grab(/<a class="skip-link"[\s\S]*?<\/header>/, 'header');
  return {
    header,
    footer: grab(/<footer class="site-footer">[\s\S]*?<\/footer>/, 'footer'),
    icon: grab(/<link rel="icon"[^>]*\/>/, 'favicon'),
    fonts: grab(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter[^>]*\/>/, 'fonts'),
    anim: grab(/<script>if\(!matchMedia[\s\S]*?<\/script>/, 'animation setup'),
    analytics: grab(/<!-- Vercel Web Analytics -->[\s\S]*?\/_vercel\/insights\/script\.js"><\/script>/, 'analytics'),
    libs: html.match(/<script defer src="[^"]*(?:gsap|ScrollTrigger|site)[^"]*"><\/script>/g).join('\n'),
    calendar: header.match(/href="(https:\/\/calendar\.google\.com\/[^"]+)"/)[1],
  };
}

function renderPost(post, shared) {
  const words = String(post.body).trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  const url = `${SITE}/journal/${encodeURI(post.slug)}.html`;
  const cover = String(post.cover ?? '').trim();
  const shareImage = cover ? new URL(cover, `${SITE}/`).href : `${SITE}/raneem.jpg`;
  const description = String(post.description ?? '').trim();
  const category = String(post.category ?? '').trim();
  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    datePublished: isoDate(post.date),
    url,
    image: shareImage,
    author: { '@type': 'Person', name: 'Raneem Ghalion', url: `${SITE}/` },
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>${esc(post.title)} | Raneem Ghalion</title>
<meta name="description" content="${esc(description)}"/>
<meta name="author" content="Raneem Ghalion"/>
<link rel="canonical" href="${esc(url)}"/>

<meta property="og:type" content="article"/>
<meta property="og:site_name" content="Raneem Ghalion"/>
<meta property="og:title" content="${esc(post.title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:url" content="${esc(url)}"/>
<meta property="og:image" content="${esc(shareImage)}"/>
<meta property="article:published_time" content="${esc(isoDate(post.date))}"/>

<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(post.title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(shareImage)}"/>

${shared.icon}

<script type="application/ld+json">${ld}</script>

<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
${shared.fonts}
<link href="../assets/site.css" rel="stylesheet"/>
${shared.anim}
${shared.analytics}
</head>
<body>
${shared.header}
<main id="main">
  <article>
    <section class="page-hero${cover ? ' page-hero--plain' : ''}">
      ${cover ? '' : '<img alt="" class="page-hero__media" decoding="async" fetchpriority="high" src="../assets/img/page-journal.webp"/>'}
      <div class="page-hero__inner">
        <nav aria-label="Breadcrumb"><a href="../index.html">Home</a><span class="crumb-sep">/</span><a href="index.html">Journal</a><span class="crumb-sep">/</span><span>${esc(post.title)}</span></nav>
        <p class="post-hero__meta">${category ? `${esc(category)}<span class="crumb-sep">·</span>` : ''}<time datetime="${esc(isoDate(post.date))}">${esc(prettyDate(post.date))}</time><span class="crumb-sep">·</span>${minutes} min read</p>
        <h1 dir="auto">${esc(post.title)}</h1>
        ${description ? `<p class="page-hero__lede" dir="auto">${esc(description)}</p>` : ''}
      </div>
    </section>
    ${cover ? `<figure class="article-cover"><img alt="" decoding="async" fetchpriority="high" src="${esc(encodeURI(cover))}"/></figure>` : ''}
    <div class="article-body" dir="auto">
${marked.parse(String(post.body))}
    </div>
  </article>

  <section class="cta-band">
    <img alt="" class="band-media" decoding="async" height="900" loading="lazy" src="../assets/img/band-cta.webp" width="1600"/>
    <div class="cta-band__inner">
      <h2 data-reveal>Ready to put AI to work safely in your business?</h2>
      <p data-reveal>Let's schedule a free 30-minute call. We'll talk through your team, the work you want to make easier, and which offer fits.</p>
      <div data-reveal><a class="btn btn--light" href="${esc(shared.calendar)}" rel="noopener" target="_blank">Book a Call</a></div>
    </div>
  </section>
</main>
${shared.footer}
${shared.libs}
</body></html>
`;
}

const ARROW = '<svg aria-hidden="true" class="post__arrow" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24"><path d="M6 18 18 6M8 6h10v10"/></svg>';

function renderList(entries) {
  return `\n${entries.map((e) => `      <a class="post" data-reveal href="${esc(e.href)}">
        <div class="post__meta"><span>${esc(prettyDate(e.date))}</span><span>${esc(e.category)}</span></div>
        <div>
          <h3 class="post__title" dir="auto">${esc(e.title)}</h3>
          <p class="body" dir="auto">${esc(e.description)}</p>
        </div>
        ${ARROW}
      </a>`).join('\n')}\n      `;
}

function main() {
  // Everything is prepared first, so a problem leaves the files as they were.
  const posts = loadPosts();
  const indexHtml = fs.readFileSync(INDEX, 'utf8');
  const shared = sharedParts(indexHtml);
  const pages = posts.map((p) => [path.join(ROOT, 'journal', `${p.slug}.html`), renderPost(p, shared)]);

  const entries = [
    ...posts.map((p) => ({ title: p.title, description: p.description, category: p.category, date: p.date, href: `${encodeURI(p.slug)}.html` })),
    ...readLegacy(),
  ].sort((a, b) => isoDate(b.date).localeCompare(isoDate(a.date)));

  const newIndex = replaceBetween(indexHtml, '<!-- journal:list:start -->', '<!-- journal:list:end -->', renderList(entries));
  const newestDate = entries.length ? isoDate(entries[0].date) : '';
  const newSitemap = replaceBetween(fs.readFileSync(SITEMAP, 'utf8'), '<!-- journal:posts:start -->', '<!-- journal:posts:end -->',
    `\n${posts.map((p) => `  <url>
    <loc>${esc(`${SITE}/journal/${encodeURI(p.slug)}.html`)}</loc>
    <lastmod>${esc(isoDate(p.date))}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}\n  `)
    .replace(/(<loc>https:\/\/www\.raneemghalion\.com\/journal\/<\/loc>\s*<lastmod>)[^<]*/, `$1${newestDate}`);

  for (const [file, html] of pages) fs.writeFileSync(file, html);
  fs.writeFileSync(INDEX, newIndex);
  fs.writeFileSync(SITEMAP, newSitemap);
  console.log(`Journal built: ${posts.length} published post(s), ${entries.length} listed.`);
}

try {
  main();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

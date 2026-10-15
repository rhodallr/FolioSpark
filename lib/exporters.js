// Export a case study as Markdown, JSON, or a standalone HTML/CSS page.

import { THEMES } from './caseStudy';
import { isImageUrl } from './utils';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paragraphs(text) {
  return String(text || '')
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');
}

// ---------- Markdown ----------

export function toMarkdown(content) {
  const lines = [];
  lines.push(`# ${content.title || 'Untitled case study'}`);
  if (content.summary) lines.push('', `> ${content.summary}`);

  const meta = [
    content.role && `**Role:** ${content.role}`,
    content.team && `**Team:** ${content.team}`,
    content.timeline && `**Timeline & tools:** ${content.timeline}`,
  ].filter(Boolean);
  if (meta.length) lines.push('', meta.join('  \n'));

  if (content.context) lines.push('', '## Context', '', content.context);
  if (content.problem) lines.push('', '## The problem', '', content.problem);
  if (content.value) lines.push('', '## Why it mattered', '', content.value);

  if (content.decisions.length) {
    lines.push('', '## Key decisions', '');
    content.decisions.forEach((d, i) => {
      lines.push(`${i + 1}. **${d.title}**${d.tradeoff ? ` — _Trade-off:_ ${d.tradeoff}` : ''}`);
    });
  }

  content.diagrams.forEach((d) => {
    lines.push('', `### ${d.title || (d.type === 'timeline' ? 'Timeline' : 'Process')}`, '');
    lines.push(d.steps.map((s) => `\`${s}\``).join(' → '));
  });

  if (content.before || content.after) {
    lines.push('', '## Before & after', '');
    const render = (label, v) =>
      isImageUrl(v) ? `**${label}**\n\n![${label}](${v.trim()})` : `**${label}:** ${v}`;
    if (content.before) lines.push(render('Before', content.before));
    if (content.after) lines.push('', render('After', content.after));
  }

  if (content.metrics.length || content.outcomes.length) {
    lines.push('', '## Impact', '');
    if (content.metrics.length) {
      lines.push('| Metric | Result |', '| --- | --- |');
      content.metrics.forEach((m) => lines.push(`| ${m.label.replace(/\|/g, '\\|')} | ${m.value.replace(/\|/g, '\\|')} |`));
    }
    if (content.outcomes.length) {
      lines.push('');
      content.outcomes.forEach((o) => lines.push(`- ${o}`));
    }
  }

  if (content.reflection) lines.push('', '## Reflection', '', content.reflection);
  lines.push('');
  return lines.join('\n');
}

// ---------- JSON ----------

export function toJSON(project) {
  return JSON.stringify(
    {
      schema: 'foliospark.case-study/v1',
      exportedAt: new Date().toISOString(),
      title: project.title,
      targetRoles: project.target_roles,
      status: project.status,
      completion: project.completion,
      onboarding: project.onboarding,
      content: project.content,
    },
    null,
    2
  );
}

// ---------- HTML ----------

function mediaOrText(value) {
  if (isImageUrl(value)) return `<img src="${esc(value.trim())}" alt="" />`;
  return `<div class="ba-text">${paragraphs(value)}</div>`;
}

function processHTML(content) {
  const decisions = content.decisions;
  if (!decisions.length) return '';
  const layout = content.processLayout;

  if (layout === 'carousel') {
    return `<div class="carousel" data-carousel>
      <div class="carousel-track">${decisions
        .map(
          (d, i) => `<div class="slide"><span class="num">${String(i + 1).padStart(2, '0')}</span><h3>${esc(d.title)}</h3>${
            d.tradeoff ? `<p class="tradeoff"><strong>Trade-off</strong> ${esc(d.tradeoff)}</p>` : ''
          }</div>`
        )
        .join('')}</div>
      <div class="carousel-nav"><button type="button" data-prev aria-label="Previous">&larr;</button><span data-count>1 / ${
        decisions.length
      }</span><button type="button" data-next aria-label="Next">&rarr;</button></div>
    </div>`;
  }

  if (layout === 'timeline') {
    return `<ol class="timeline">${decisions
      .map(
        (d) => `<li><h3>${esc(d.title)}</h3>${d.tradeoff ? `<p class="tradeoff"><strong>Trade-off</strong> ${esc(d.tradeoff)}</p>` : ''}</li>`
      )
      .join('')}</ol>`;
  }

  return `<div class="flip-grid">${decisions
    .map(
      (d, i) => `<button type="button" class="flip" data-flip aria-label="Flip card">
        <span class="flip-inner">
          <span class="flip-face front"><span class="num">${String(i + 1).padStart(2, '0')}</span><span class="h3">${esc(
        d.title
      )}</span><span class="hint">Tap to see the trade-off</span></span>
          <span class="flip-face back"><span class="label">Trade-off</span><span>${esc(
            d.tradeoff || 'No trade-off recorded.'
          )}</span></span>
        </span>
      </button>`
    )
    .join('')}</div>`;
}

function diagramHTML(d) {
  if (d.type === 'timeline') {
    return `<figure class="diagram"><figcaption>${esc(d.title || 'Timeline')}</figcaption><div class="dg-timeline">${d.steps
      .map((s) => `<div class="dg-t"><span class="dot"></span><span>${esc(s)}</span></div>`)
      .join('')}</div></figure>`;
  }
  return `<figure class="diagram"><figcaption>${esc(d.title || 'Process')}</figcaption><div class="dg-flow">${d.steps
    .map((s, i) => `${i ? '<span class="arrow">&rarr;</span>' : ''}<span class="node">${esc(s)}</span>`)
    .join('')}</div></figure>`;
}

export function toHTML(content) {
  const theme = THEMES[content.theme] || THEMES.warm;
  const vars = Object.entries(theme.vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  const title = content.title || 'Untitled case study';

  const meta = [
    ['Role', content.role],
    ['Team', content.team],
    ['Timeline & tools', content.timeline],
  ].filter(([, v]) => v);

  const body = `
  <header class="hero">
    <p class="eyebrow">Case study</p>
    <h1>${esc(title)}</h1>
    ${content.summary ? `<p class="lede">${esc(content.summary)}</p>` : ''}
    ${
      meta.length
        ? `<dl class="meta">${meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`
        : ''
    }
  </header>
  ${content.context ? `<section><h2>Context</h2>${paragraphs(content.context)}</section>` : ''}
  ${
    content.problem || content.value
      ? `<section class="pair">${content.problem ? `<div class="card"><h2>The problem</h2>${paragraphs(content.problem)}</div>` : ''}${
          content.value ? `<div class="card accent"><h2>Why it mattered</h2>${paragraphs(content.value)}</div>` : ''
        }</section>`
      : ''
  }
  ${content.decisions.length ? `<section><h2>Key decisions</h2>${processHTML(content)}</section>` : ''}
  ${content.diagrams.length ? `<section>${content.diagrams.map(diagramHTML).join('')}</section>` : ''}
  ${
    content.before || content.after
      ? `<section><h2>Before &amp; after</h2>
        <div class="ba" data-ba data-state="after">
          <div class="ba-toggle"><button type="button" data-ba-btn="before">Before</button><button type="button" class="on" data-ba-btn="after">After</button></div>
          <div class="ba-pane before">${mediaOrText(content.before || 'Not provided.')}</div>
          <div class="ba-pane after">${mediaOrText(content.after || 'Not provided.')}</div>
        </div></section>`
      : ''
  }
  ${
    content.metrics.length || content.outcomes.length
      ? `<section><h2>Impact</h2>${
          content.metrics.length
            ? `<div class="metrics">${content.metrics
                .map((m) => `<div class="metric"><span class="value">${esc(m.value)}</span><span class="mlabel">${esc(m.label)}</span></div>`)
                .join('')}</div>`
            : ''
        }${content.outcomes.length ? `<ul class="outcomes">${content.outcomes.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}</section>`
      : ''
  }
  ${content.reflection ? `<section><h2>Reflection</h2><blockquote>${paragraphs(content.reflection)}</blockquote></section>` : ''}
  <footer>Made with FolioSpark</footer>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
${content.summary ? `<meta name="description" content="${esc(content.summary)}" />` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
:root{${vars}}
*{box-sizing:border-box}
html{-webkit-font-smoothing:antialiased}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 Inter,system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:64px 20px 48px}
h1,h2,h3,.h3{font-family:Fraunces,Georgia,serif;font-weight:600;line-height:1.15;margin:0}
h1{font-size:clamp(2.2rem,5vw,3.2rem);letter-spacing:-.02em}
h2{font-size:1.5rem;margin-bottom:14px}
h3,.h3{font-size:1.15rem;display:block}
p{margin:0 0 12px}
section{margin-top:56px}
.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:.72rem;font-weight:600;color:var(--accent);margin-bottom:14px}
.lede{font-size:1.2rem;color:var(--muted);margin-top:16px}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin:32px 0 0;padding-top:24px;border-top:1px solid var(--line)}
.meta dt{font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);font-weight:600}
.meta dd{margin:4px 0 0;font-weight:500}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:24px}
.card.accent{background:var(--accent-soft);border-color:transparent}
.num{font-family:Fraunces,Georgia,serif;color:var(--accent);font-size:.9rem;font-weight:600;display:block;margin-bottom:8px}
.tradeoff{color:var(--muted);margin-top:10px}
.tradeoff strong{color:var(--fg);font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;margin-right:6px}
.flip-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.flip{all:unset;cursor:pointer;perspective:1000px;min-height:190px;display:block}
.flip-inner{position:relative;display:block;height:100%;min-height:190px;transition:transform .6s;transform-style:preserve-3d}
.flip.flipped .flip-inner{transform:rotateY(180deg)}
.flip-face{position:absolute;inset:0;border-radius:18px;padding:22px;display:flex;flex-direction:column;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:1px solid var(--line)}
.front{background:var(--card)}
.back{background:var(--accent);color:var(--bg);transform:rotateY(180deg);gap:8px}
.hint{margin-top:auto;font-size:.8rem;color:var(--muted)}
.label{font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;font-weight:600;opacity:.8}
.carousel-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:16px;scrollbar-width:none}
.carousel-track::-webkit-scrollbar{display:none}
.slide{flex:0 0 100%;scroll-snap-align:start;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:28px;min-height:180px}
.carousel-nav{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:14px;color:var(--muted);font-size:.9rem}
.carousel-nav button{all:unset;cursor:pointer;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;color:var(--fg)}
.timeline{list-style:none;padding:0 0 0 22px;margin:0;border-left:2px solid var(--line)}
.timeline li{position:relative;padding:0 0 26px 14px}
.timeline li:before{content:"";position:absolute;left:-30px;top:6px;width:12px;height:12px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--bg)}
.diagram{margin:0 0 24px;padding:24px;border:1px dashed var(--line);border-radius:18px}
.diagram figcaption{font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;font-weight:600;color:var(--muted);margin-bottom:16px}
.dg-flow{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.node{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;font-weight:500;font-size:.92rem}
.arrow{color:var(--accent);font-weight:600}
.dg-timeline{display:flex;justify-content:space-between;gap:8px;position:relative;padding-top:4px}
.dg-timeline:before{content:"";position:absolute;left:6px;right:6px;top:10px;height:2px;background:var(--line)}
.dg-t{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;flex:1;text-align:center;font-size:.85rem}
.dot{width:14px;height:14px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--bg)}
.ba{border:1px solid var(--line);border-radius:18px;overflow:hidden}
.ba-toggle{display:flex;gap:4px;padding:6px;background:var(--card);border-bottom:1px solid var(--line)}
.ba-toggle button{all:unset;cursor:pointer;flex:1;text-align:center;padding:8px;border-radius:10px;font-weight:500;font-size:.9rem;color:var(--muted)}
.ba-toggle button.on{background:var(--bg);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.ba-pane{padding:24px;display:none}
.ba[data-state=before] .before,.ba[data-state=after] .after{display:block}
.ba-pane img{width:100%;border-radius:12px;display:block}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.metric{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:6px}
.metric .value{font-family:Fraunces,Georgia,serif;font-size:1.8rem;font-weight:600;color:var(--accent);line-height:1.1}
.mlabel{color:var(--muted);font-size:.9rem}
.outcomes{margin:20px 0 0;padding-left:20px}
.outcomes li{margin-bottom:6px}
blockquote{margin:0;padding:4px 0 4px 20px;border-left:3px solid var(--accent);font-family:Fraunces,Georgia,serif;font-size:1.15rem}
footer{margin-top:72px;padding-top:20px;border-top:1px solid var(--line);font-size:.8rem;color:var(--muted)}
</style>
</head>
<body style="${vars}">
<main>${body}</main>
<script>
document.querySelectorAll('[data-flip]').forEach(function(c){c.addEventListener('click',function(){c.classList.toggle('flipped')})});
document.querySelectorAll('[data-ba]').forEach(function(w){var b=w.querySelectorAll('[data-ba-btn]');b.forEach(function(btn){btn.addEventListener('click',function(){w.setAttribute('data-state',btn.getAttribute('data-ba-btn'));b.forEach(function(x){x.classList.toggle('on',x===btn)})})})});
document.querySelectorAll('[data-carousel]').forEach(function(c){var t=c.querySelector('.carousel-track'),n=t.children.length,i=0,lab=c.querySelector('[data-count]');function go(k){i=Math.max(0,Math.min(n-1,k));t.scrollTo({left:t.children[i].offsetLeft-t.offsetLeft,behavior:'smooth'});lab.textContent=(i+1)+' / '+n}c.querySelector('[data-prev]').addEventListener('click',function(){go(i-1)});c.querySelector('[data-next]').addEventListener('click',function(){go(i+1)})});
</script>
</body>
</html>
`;
}

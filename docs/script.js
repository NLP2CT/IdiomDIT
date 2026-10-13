'use strict';

// Transcribed from Figure 3 of the supplied paper (Qwen3.5-9B).
const results = {
  'en-fa': { name: 'English → Persian', n: 200, basic: 9.0, meaning: 8.0, anti: 3.5, super: 4.5 },
  'fr-en': { name: 'French → English', n: 138, basic: 22.5, meaning: 18.8, anti: 13.0, super: 13.8 },
  'ko-en': { name: 'Korean → English', n: 422, basic: 4.5, meaning: 3.8, anti: 3.6, super: 3.3 },
  'fa-en': { name: 'Persian → English', n: 200, basic: 20.0, meaning: 16.0, anti: 14.5, super: 17.0 },
  'fi-en': { name: 'Finnish → English', n: 85, basic: 32.9, meaning: 32.9, anti: 29.4, super: 30.6 },
  'ja-en': { name: 'Japanese → English', n: 1188, basic: 14.4, meaning: 14.9, anti: 11.4, super: 12.3 }
};

const labels = { basic: 'Basic', meaning: 'Meaning-First', anti: 'Anti-Literal', super: 'Super' };
const directionButtons = document.querySelectorAll('[data-direction]');

function setDirection(key) {
  const row = results[key];
  if (!row) return;
  directionButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.direction === key)));
  const heading = document.getElementById('direction-title');
  heading.replaceChildren(document.createTextNode(row.name + ' '));
  const count = document.createElement('span');
  count.textContent = row.n.toLocaleString('en-US') + ' instances';
  heading.append(count);
  Object.keys(labels).forEach(prompt => {
    document.querySelector(`[data-bar="${prompt}"]`).style.width = `${row[prompt] / 35 * 100}%`;
    document.querySelector(`[data-value="${prompt}"]`).textContent = `${row[prompt].toFixed(1)}%`;
  });
  document.getElementById('prompt-chart').setAttribute('aria-label', `${row.name} LTE rates: ${Object.keys(labels).map(prompt => `${labels[prompt]} ${row[prompt].toFixed(1)}%`).join(', ')}.`);
  const best = row.super < row.anti ? 'super' : 'anti';
  const improvement = (row.basic - row[best]).toFixed(1);
  const insight = document.getElementById('chart-insight');
  const strong = document.createElement('strong');
  strong.textContent = `${improvement} percentage points lower`;
  insight.replaceChildren(strong, document.createTextNode(` with ${labels[best]} than Basic. A ${row[best].toFixed(1)}% literal error rate still remains.`));
}

directionButtons.forEach(button => button.addEventListener('click', () => setDirection(button.dataset.direction)));

const copyButton = document.getElementById('copy-citation');
const copyStatus = document.getElementById('copy-status');
let copyReset;
copyButton.addEventListener('click', async () => {
  const citation = document.getElementById('bibtex').textContent;
  let copied = false;
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(citation); copied = true; } catch { /* Try local-file compatible copying below. */ }
  }
  if (!copied) {
    const field = document.createElement('textarea');
    field.value = citation;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    try { copied = document.execCommand('copy'); } catch { copied = false; }
    field.remove();
    copyButton.focus({ preventScroll: true });
  }
  copyStatus.textContent = copied ? 'Citation copied to clipboard.' : 'Copy unavailable. Select the citation text or use Download .bib.';
  copyButton.querySelector('span').textContent = copied ? 'Copied!' : 'Copy citation';
  window.clearTimeout(copyReset);
  copyReset = window.setTimeout(() => {
    copyButton.querySelector('span').textContent = 'Copy citation';
    copyStatus.textContent = '';
  }, 4000);
});

const dialog = document.getElementById('figure-dialog');
const dialogImage = document.getElementById('dialog-image');
document.querySelectorAll('[data-figure]').forEach(button => {
  button.addEventListener('click', () => {
    if (typeof dialog.showModal !== 'function') {
      window.open(button.dataset.figure, '_blank', 'noopener');
      return;
    }
    dialogImage.src = button.dataset.figure;
    dialogImage.alt = button.querySelector('img').alt;
    document.getElementById('figure-dialog-caption').textContent = button.dataset.caption;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  });
});
document.getElementById('close-figure').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));

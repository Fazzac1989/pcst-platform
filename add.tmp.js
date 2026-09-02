const fs = require('fs');
const p = 'components/slides/deck.css';
let s = fs.readFileSync(p, 'utf8');
const anchor = `  .sl-body{padding:11mm 13mm}`;
const add = `  .sl-body{padding:11mm 13mm 14mm}

  /* A running footer, drawn inside the slide because there is no page margin
     to put one in. One slide is one page, so counting slides counts pages. */
  .sl-deck{counter-reset:pg}
  .sl-page{counter-increment:pg;position:relative!important}
  .sl-page::after{
    content:counter(pg);
    position:absolute;right:13mm;bottom:6mm;
    font-size:8pt;color:var(--muted);
  }
  .sl-cover::after,.sl-closing::after{color:rgba(255,255,255,.45)}`;
if (!s.includes(anchor)) throw new Error('body padding anchor not found');
fs.writeFileSync(p, s.replace(anchor, add));
console.log('per-slide running footer added');

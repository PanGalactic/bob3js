// apps.js — DOM mockups of the eight programs that shipped with Microsoft Bob,
// plus Bob Clock. Layouts modeled on the original 1995 screenshots:
//   Letter Writer · Calendar · Checkbook · Address Book · Household Manager
//   Financial Guide · E-Mail (@BOB.COM) · GeoSafari — and the Options menu.

import { makeGuidePortrait } from './portrait.js';
import { APP_GUIDES } from './guides.js';
import { BobOS } from './os.js';

const $ = (sel, el = document) => el.querySelector(sel);
// storage now flows through the BobOS virtual filesystem (same keys, so existing data carries over)
const store = {
  get: (k, fallback) => BobOS.fs.read(k, fallback),
  set: (k, v) => BobOS.fs.write(k, v),
};

let ctx = null;
export function initApps(c) { ctx = c; BobOS.boot(c); }

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

let openWin = null;
let activePortrait = null;
export function closeApp() {
  if (activePortrait) { activePortrait.__dispose?.(); activePortrait = null; }
  if (openWin) { openWin.remove(); openWin = null; ctx.sound('pop'); }
}

// mount the app's dedicated 3D guide (real three.js character) in a corner
function mountAppGuide(win, appId, cls) {
  const gid = APP_GUIDES[appId];
  if (!gid) return;
  const canvas = makeGuidePortrait(gid, 180);
  canvas.className = 'app-guide ' + cls;
  win.querySelector('.app-frame').appendChild(canvas);
  activePortrait = canvas;
}

// ── the ONE icon-grid renderer: every emoji-icon + label button grid goes
// through here. Icon and label spans always carry a class, and bob.css only
// targets .g-face / .g-label — a bare `span` selector once out-specified the
// TOC icon size and shrank it to 12px.
function iconGrid(items, { key, cols, variant = '' } = {}) {
  const style = cols ? ` style="grid-template-columns:repeat(${cols},1fr)"` : '';
  return `<div class="guide-grid${variant ? ' ' + variant : ''}"${style}>${items.map(it =>
    `<button class="guide-card${it.current ? ' current' : ''}" data-${key}="${it.id}"><span class="g-face">${it.icon}</span><span class="g-label">${it.label}</span></button>`).join('')}</div>`;
}

function frame(cls, inner, title) {
  closeApp();
  const w = el(`<div class="app-win"><div class="app-frame ${cls}">
    <button class="app-close" title="Back to the room">DONE</button>${inner}</div></div>`);
  w.addEventListener('click', (e) => { if (e.target === w) closeApp(); });
  $('.app-close', w).addEventListener('click', closeApp);
  document.getElementById('appLayer').appendChild(w);
  openWin = w;
  ctx.sound('open');
  return w;
}

// ══════════ BOB CALENDAR ══════════
// spiral-bound day view, mini month, moon panel, Day/Week/Month/To Do tabs
function moonPhaseSVG() {
  // real moon phase, drawn like the original's night panel
  const synodic = 29.530588853;
  const known = Date.UTC(2000, 0, 6, 18, 14); // new moon
  const age = ((Date.now() - known) / 86400000) % synodic;
  const ill = (1 - Math.cos(2 * Math.PI * age / synodic)) / 2;
  const waxing = age < synodic / 2;
  const k = (ill * 2 - 1) * 60; // -60..60 terminator offset
  const stars = Array.from({ length: 40 }, (_, i) =>
    `<circle cx="${(i * 83.7) % 300}" cy="${(i * 47.3) % 200}" r="${1 + (i % 2)}" fill="#e8e4ff"/>`).join('');
  return `<svg viewBox="0 0 300 200" style="position:absolute;inset:0;width:100%;height:100%">
    <rect width="300" height="200" fill="#16215c"/>${stars}
    <circle cx="150" cy="100" r="62" fill="#0c1440"/>
    <path d="M 150 38 A 62 62 0 0 ${waxing ? 1 : 0} 150 162 A ${Math.abs(k)} 62 0 0 ${(waxing ? k < 0 : k > 0) ? 1 : 0} 150 38 Z" fill="#f2edd8"/>
  </svg>`;
}

function openCalendar() {
  const now = new Date();
  const user = ctx.user();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let mini = '<table><tr>' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<th>${d}</th>`).join('') + '</tr><tr>';
  for (let i = 0; i < first.getDay(); i++) mini += '<td></td>';
  for (let d = 1; d <= dim; d++) {
    mini += `<td class="${d === now.getDate() ? 'today' : ''}">${d}</td>`;
    if ((first.getDay() + d) % 7 === 0) mini += '</tr><tr>';
  }
  mini += '</tr></table>';
  const rings = Array.from({ length: 14 }, () => '<span class="cal-ring"></span>').join('');
  const hours = ['8', '9', '10', '11', 'Noon', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const dayKey = `cal.${now.toDateString()}`;
  const saved = store.get(dayKey, {});
  const hourRows = hours.map((h, i) =>
    `<div class="hr"><b>${h}</b><span contenteditable="true" data-h="${i}">${saved[i] ?? ''}</span></div>`).join('');

  const w = frame('cal-frame', `
    <div class="cal-rings">${rings}</div>
    <div class="cal-body">
      <div class="cal-owner" style="grid-column:1/-1">${user}'s Calendar ${now.getFullYear()}</div>
      <div class="cal-left">
        <div class="cal-mini"><h4>${months[now.getMonth()]}</h4>${mini}</div>
        <div class="cal-art">${moonPhaseSVG()}</div>
      </div>
      <div class="cal-mid" style="display:flex;flex-direction:column;min-height:0">
        <div class="cal-dayname">${now.toLocaleDateString('en', { weekday: 'long' })}</div>
        <div class="cal-daynum">${now.getDate()}</div>
        <div class="cal-hours" id="calView">${hourRows}</div>
      </div>
      <div class="balloon inline">
        <div class="balloon-title">Can I help you?</div>
        <div class="balloon-options">
          ${['Add an event', 'Change an event', 'Remove an event', 'Go to another day or month', 'See by day, week, or month', 'See To-Do List', 'Other options']
            .map(o => `<button class="opt" data-o="${o}"><span class="ring"></span>${o}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="cal-tabs">
      ${['Day', 'Week', 'Month', 'To Do'].map((t, i) => `<button class="cal-tab ${i === 0 ? 'active' : ''}" data-t="${t}">${t}</button>`).join('')}
    </div>`);

  const view = $('#calView', w);
  view.addEventListener('input', (e) => {
    const h = e.target.dataset.h;
    if (h == null) return;
    const cur = store.get(dayKey, {});
    cur[h] = e.target.textContent;
    store.set(dayKey, cur);
  });
  const renderMonth = () => {
    let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="head">${d}</div>`).join('');
    for (let i = 0; i < first.getDay(); i++) cells += '<div class="cell"></div>';
    for (let d = 1; d <= dim; d++) {
      const evts = store.get(`cal.${new Date(now.getFullYear(), now.getMonth(), d).toDateString()}`, {});
      const chips = Object.values(evts).filter(Boolean).slice(0, 2).map(e => `<div class="cal-evt">${e}</div>`).join('');
      cells += `<div class="cell ${d === now.getDate() ? 'today' : ''}"><span class="d">${d}</span>${chips}</div>`;
    }
    return `<div class="cal-month-grid">${cells}</div>`;
  };
  w.querySelectorAll('.cal-tab').forEach(tab => tab.addEventListener('click', () => {
    w.querySelectorAll('.cal-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    ctx.sound('pop');
    const t = tab.dataset.t;
    const mid = $('.cal-mid', w);
    if (t === 'Day') { mid.innerHTML = `<div class="cal-dayname">${now.toLocaleDateString('en', { weekday: 'long' })}</div><div class="cal-daynum">${now.getDate()}</div><div class="cal-hours">${hourRows}</div>`; }
    else if (t === 'Month' || t === 'Week') { mid.innerHTML = `<div class="cal-dayname">${months[now.getMonth()]}</div>${renderMonth()}`; }
    else { mid.innerHTML = `<div class="cal-dayname">To Do</div><div class="cal-hours">${['Feed Rover', 'Write a letter on the Letter Writer', 'Balance the checkbook', 'Beat Hank at GeoSafari'].map(x => `<div class="hr"><b>☐</b><span contenteditable="true">${x}</span></div>`).join('')}</div>`; }
  }));
  w.querySelectorAll('.opt').forEach(o => o.addEventListener('click', () => {
    ctx.sound('pop');
    ctx.say('Can I help you?', ({
      'Add an event': 'Click any hour line and just start typing — I\'ll remember it for you.',
      'Change an event': 'Click into the event text and edit it. I save as you type.',
      'Remove an event': 'Select the event text and delete it. Gone — no fuss.',
      'Go to another day or month': 'Click a day in the little month at the top left.',
      'See by day, week, or month': 'Use the Day, Week and Month tabs along the bottom.',
      'See To-Do List': 'The To Do tab at the bottom keeps your list.',
      'Other options': 'That\'s everything a calendar needs. It\'s ' + ctx.guideWord() + '.',
    })[o.dataset.o]);
  }));
}

// ══════════ BOB CHECKBOOK ══════════
function openCheckbook() {
  const user = ctx.user();
  const entries = store.get('chk', [
    { num: 101, date: '07/01', payee: 'Star London Ltd — hosting', spend: '48.00', recv: '', },
    { num: '', date: '07/03', payee: 'Deposit — consulting', spend: '', recv: '850.00' },
    { num: 102, date: '07/08', payee: 'Rover\'s Kibble Emporium', spend: '23.50', recv: '' },
  ]);
  const render = () => entries.map((e, i) => {
    const bal = entries.slice(0, i + 1).reduce((a, x) => a + (parseFloat(x.recv) || 0) - (parseFloat(x.spend) || 0), 0);
    return `<tr><td class="num">${e.num || ''}</td><td>${e.date}</td><td>${e.payee}</td><td class="money">${e.spend || ''}</td><td class="money">${e.recv || ''}</td><td class="money">${bal.toFixed(2)}</td></tr>`;
  }).join('');
  const total = () => entries.reduce((a, x) => a + (parseFloat(x.recv) || 0) - (parseFloat(x.spend) || 0), 0).toFixed(2);

  const w = frame('chk-frame', `
    <div class="chk-inner">
      <div class="chk-register">
        <div class="chk-pull"></div>
        <div class="chk-table-wrap"><table class="chk-table">
          <thead><tr><th>Num</th><th>Date</th><th>Payee / Category / Memo</th><th>Spend</th><th>Receive</th><th>Balance</th></tr></thead>
          <tbody id="chkRows">${render()}</tbody>
        </table></div>
        <div class="chk-balance">Ending Balance: <output id="chkTotal">${total()}</output></div>
      </div>
      <div class="chk-tabs">
        ${['Check', 'Receive', 'Spend', 'Transfer'].map((t, i) => `<button class="chk-tab ${i === 0 ? 'active' : ''}">${t}</button>`).join('')}
      </div>
      <div class="chk-check">
        <svg class="meadow" viewBox="0 0 500 200" preserveAspectRatio="none">
          <circle cx="70" cy="40" r="26" fill="#fff" opacity=".8"/><circle cx="96" cy="46" r="18" fill="#fff" opacity=".8"/>
          <circle cx="400" cy="30" r="22" fill="#fff" opacity=".8"/>
          <path d="M0 140 Q 120 100 250 135 T 500 130 V 200 H 0 Z" fill="#9fd88a" opacity=".9"/>
          ${Array.from({ length: 14 }, (_, i) => `<circle cx="${30 + i * 36}" cy="${150 + (i % 3) * 14}" r="4" fill="#fff"/><circle cx="${30 + i * 36}" cy="${150 + (i % 3) * 14}" r="1.6" fill="#f2c422"/>`).join('')}
        </svg>
        <div style="display:flex;justify-content:space-between;position:relative;z-index:1">
          <b style="font:italic bold 17px Georgia">Check</b>
          <span>No. <b id="chkNum">103</b> &nbsp; Date <u>&nbsp;${new Date().toLocaleDateString()}&nbsp;</u></span>
        </div>
        <div class="chk-field"><label>Pay to:</label><input id="chkPayee" placeholder="Who gets this one?"></div>
        <div class="chk-field"><label>Amount:</label><input id="chkAmt" placeholder="0.00" style="max-width:140px"> <button class="bob-btn ok" id="chkWrite">Record it</button></div>
        <div class="chk-field"><label>Category:</label><input id="chkCat" placeholder="Household"><label>Memo:</label><input id="chkMemo"></div>
      </div>
      <div class="chk-bottom">
        ${['ACCOUNT BOOK', 'BILL BASKET', 'REPORT FOLDER'].map(b => `<button class="chk-big-btn">${b}</button>`).join('')}
      </div>
    </div>`);

  mountAppGuide(w, 'checkbook', 'chk-guide3d');
  setTimeout(() => ctx.say('Hi there!', `I'm the Checkbook's own guide — ${ctx.guideName()} handed you over to me. Welcome to Bob Checkbook, ${user}, where keeping track of your money is as important to me as it is to you!`), 350);

  $('#chkWrite', w).addEventListener('click', () => {
    const payee = $('#chkPayee', w).value.trim();
    const amt = parseFloat($('#chkAmt', w).value);
    if (!payee || !amt) { ctx.say('Hold on…', 'A check needs a payee <b>and</b> an amount before I can record it.'); return; }
    entries.push({ num: $('#chkNum', w).textContent, date: new Date().toLocaleDateString('en', { month: '2-digit', day: '2-digit' }), payee, spend: amt.toFixed(2), recv: '' });
    store.set('chk', entries);
    $('#chkRows', w).innerHTML = render();
    $('#chkTotal', w).textContent = total();
    $('#chkNum', w).textContent = String(Number($('#chkNum', w).textContent) + 1);
    $('#chkPayee', w).value = ''; $('#chkAmt', w).value = '';
    ctx.sound('ding');
    ctx.say('Recorded!', `Check to <b>${payee}</b> is in the register. Your balance keeps itself — that's the ${ctx.guideWord()} part.`);
  });
  w.querySelectorAll('.chk-tab').forEach(t => t.addEventListener('click', () => {
    w.querySelectorAll('.chk-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active'); ctx.sound('pop');
    ctx.say(t.textContent + ' tab', {
      Check: 'Write a check below and I\'ll record it in the register.',
      Receive: 'Money coming in — deposits, salary, birthday cash from Aunt Vera.',
      Spend: 'Cash spending that isn\'t a check. It still counts, sadly.',
      Transfer: 'Move money between accounts. In this mock-up, we have just the one.',
    }[t.textContent]);
  }));
  w.querySelectorAll('.chk-big-btn').forEach(b => b.addEventListener('click', () => {
    ctx.sound('pop');
    ctx.say(b.textContent, {
      'ACCOUNT BOOK': 'All your accounts lived here. This tribute keeps one cheerful account.',
      'BILL BASKET': 'Bills waiting to be paid. The basket is empty. Savor this moment.',
      'REPORT FOLDER': `Spending reports by category. Verdict: everything is ${ctx.guideWord()}.`,
    }[b.textContent]);
  }));
}

// ══════════ BOB ADDRESS BOOK ══════════
function openAddressBook() {
  const user = ctx.user();
  let pages = store.get('addr', [
    { title: 'Mr.', first: 'Rover', last: 'The Dog', home: '555-WOOF', work: '', fax: '', other: '', notes: 'Good boy. Likes: tennis balls, the letter W. Dislikes: the vacuum.', email: 'rover@bob.com' },
    { title: '', first: 'Hank', last: 'Elephant', home: '', work: '555-GEOS', fax: '', other: '', notes: 'GeoSafari quiz master. Never forgets. Obviously.', email: 'hank@bob.com' },
  ]);
  let idx = store.get('addr.idx', 0);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'PQ', 'R', 'S', 'T', 'U', 'V', 'WX', 'YZ'];

  const w = frame('adr-frame', `
    <div class="adr-book">
      <div class="adr-spine">${Array.from({ length: 7 }, () => '<span class="adr-ring"></span>').join('')}</div>
      <div class="adr-page">
        <div class="adr-fields">
          <span class="fl">title</span><span class="fl">first</span><span class="fl">last</span>
          <input class="adr-line" data-f="title"><input class="adr-line" data-f="first"><input class="adr-line" data-f="last">
        </div>
        <div class="adr-phones">
          <span class="fl">home</span><input class="adr-line" data-f="home"><span class="fl">fax</span><input class="adr-line" data-f="fax">
          <span class="fl">work</span><input class="adr-line" data-f="work"><span class="fl">other</span><input class="adr-line" data-f="other">
          <span class="fl">e-mail</span><input class="adr-line" data-f="email" style="grid-column:2/5">
        </div>
        <div class="adr-notes"><span class="fl">notes</span><textarea data-f="notes"></textarea></div>
        <div class="adr-footer">
          <span>${user}'s Address Book</span>
          <span class="adr-nav">
            <span id="adrPos"></span>
            <button id="adrPrev">◀</button><button id="adrNext">▶</button>
            <button id="adrNew" class="bob-btn" style="font-size:11px;padding:3px 12px">New page</button>
          </span>
        </div>
      </div>
      <div class="adr-tabs">${letters.map(l => `<button class="adr-tab" data-l="${l}">${l}</button>`).join('')}</div>
    </div>`);

  const fields = w.querySelectorAll('[data-f]');
  const load = () => {
    const p = pages[idx] || {};
    fields.forEach(f => f.value = p[f.dataset.f] ?? '');
    $('#adrPos', w).textContent = `${idx + 1} / ${pages.length}`;
  };
  const save = () => {
    pages[idx] = pages[idx] || {};
    fields.forEach(f => pages[idx][f.dataset.f] = f.value);
    store.set('addr', pages); store.set('addr.idx', idx);
  };
  fields.forEach(f => f.addEventListener('input', save));
  $('#adrPrev', w).addEventListener('click', () => { idx = (idx - 1 + pages.length) % pages.length; load(); ctx.sound('page'); });
  $('#adrNext', w).addEventListener('click', () => { idx = (idx + 1) % pages.length; load(); ctx.sound('page'); });
  $('#adrNew', w).addEventListener('click', () => {
    pages.push({}); idx = pages.length - 1; load(); save(); ctx.sound('page');
    ctx.say('A fresh page!', 'Each part of the address has its own place. Type each part in its place, just like 1995.');
  });
  w.querySelectorAll('.adr-tab').forEach(t => t.addEventListener('click', () => {
    const l = t.dataset.l;
    const found = pages.findIndex(p => (p.last || p.first || '').toUpperCase().split('').some(chc => l.includes(chc[0])) && (p.last || p.first));
    const target = pages.findIndex(p => l.split('').includes(((p.last || p.first || ' ')[0] || ' ').toUpperCase()));
    idx = target >= 0 ? target : idx;
    load(); ctx.sound('page');
    if (target < 0) ctx.say('Hmm.', `Nobody filed under “${l}” yet. Turn to a new page and add somebody ${ctx.guideWord()}.`);
  }));
  load();
  setTimeout(() => ctx.say("Here's how addresses work…", 'Each part of the address has its own place. Click <b>New page</b> to add a person, or the letter tabs to jump around.'), 350);
}

// ══════════ BOB LETTER WRITER ══════════
function openLetterWriter() {
  const user = ctx.user();
  const DEFAULT_LTR = `Dear Rover,\n\nI am writing to inform you that the can opener (model 1347B) is terribly unsafe. I nearly hurt myself just getting it out of the box.\n\nPlease consider investigating this product before someone is seriously injured.\n\nThank you for your time and consideration.\n\nSincerely,\n${user}`;
  const docs = store.get('letters', { 'Can-opener complaint': DEFAULT_LTR });
  let curName = store.get('letterCur', Object.keys(docs)[0]);
  if (!docs[curName]) curName = Object.keys(docs)[0] || 'Untitled letter';
  const saved = docs[curName] ?? '';
  const opts = () => Object.keys(docs).map(n => `<option ${n === curName ? 'selected' : ''}>${n}</option>`).join('');
  const w = frame('ltr-frame', `
    <div class="ltr-page-wrap"><div class="ltr-page b-classic" id="ltrPage">
      <div class="ltr-text" id="ltrText" contenteditable="true" spellcheck="true">${saved.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>
    </div></div>
    <div class="ltr-panel">
      <div class="ltr-docbar">
        <b>Letter:</b>
        <select id="ltrDoc">${opts()}</select>
        <button class="bob-btn ok" id="ltrNew">＋ New</button>
        <button class="bob-btn" id="ltrSaveAs">Save As…</button>
        <button class="bob-btn" id="ltrRename">Rename</button>
        <button class="bob-btn no" id="ltrDel">Delete</button>
        <span id="ltrSaved" class="ltr-savenote">saved ✓</span>
      </div>
      <div class="ltr-toolbar">
        <select id="ltrFont"><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Courier New</option><option>Comic Sans MS</option></select>
        <select id="ltrSize"><option>12</option><option selected>15</option><option>18</option><option>24</option></select>
        <button class="tb-btn" data-cmd="bold"><b>B</b></button>
        <button class="tb-btn" data-cmd="italic"><i>I</i></button>
        <button class="tb-btn" data-cmd="underline"><u>U</u></button>
        <button class="tb-btn" data-cmd="justifyLeft">⟸</button>
        <button class="tb-btn" data-cmd="justifyCenter">⇔</button>
        <button class="tb-btn" data-cmd="justifyRight">⟹</button>
      </div>
      <div class="ltr-opts">
        ${['Zoom out to see whole page', 'Print or send', 'Navigate within your letter', 'Change text or check spelling', 'Add an object', 'Change an object', 'Change the border', 'Other options']
          .map(o => `<button class="opt" data-o="${o}"><span class="ring"></span>${o}</button>`).join('')}
      </div>
    </div>`);
  const page = $('#ltrPage', w);
  const text = $('#ltrText', w);
  const persist = () => { docs[curName] = text.innerText; store.set('letters', docs); store.set('letterCur', curName); };
  let saveTimer;
  const flashSaved = () => { const s = $('#ltrSaved', w); if (!s) return; s.style.opacity = '1'; clearTimeout(saveTimer); saveTimer = setTimeout(() => s.style.opacity = '0', 900); };
  text.addEventListener('input', () => { persist(); flashSaved(); });
  const refreshDocs = () => { $('#ltrDoc', w).innerHTML = opts(); };
  const loadDoc = (name) => { curName = name; text.innerText = docs[name] ?? ''; store.set('letterCur', curName); refreshDocs(); ctx.sound('page'); };
  $('#ltrDoc', w).addEventListener('change', (e) => loadDoc(e.target.value));
  $('#ltrNew', w).addEventListener('click', () => {
    const n = (prompt('Name your new letter:', 'Untitled letter') || '').trim(); if (!n) return;
    docs[n] = ''; curName = n; text.innerText = ''; persist(); refreshDocs(); ctx.sound('ding'); text.focus();
    ctx.say('Fresh page', `A blank letter called <b>${n}</b>. Type away — I save every keystroke.`);
  });
  $('#ltrSaveAs', w).addEventListener('click', () => {
    const n = (prompt('Save this letter as:', curName + ' copy') || '').trim(); if (!n) return;
    docs[n] = text.innerText; curName = n; persist(); refreshDocs(); ctx.sound('ding'); flashSaved();
  });
  $('#ltrRename', w).addEventListener('click', () => {
    const n = (prompt('Rename letter:', curName) || '').trim(); if (!n || n === curName) return;
    docs[n] = docs[curName]; delete docs[curName]; curName = n; persist(); refreshDocs(); ctx.sound('pop');
  });
  $('#ltrDel', w).addEventListener('click', () => {
    if (Object.keys(docs).length <= 1) { ctx.say('Can\'t delete', 'This is your only letter — write another first.'); return; }
    delete docs[curName]; curName = Object.keys(docs)[0]; text.innerText = docs[curName]; persist(); refreshDocs(); ctx.sound('pop');
  });
  w.querySelectorAll('.tb-btn').forEach(b => b.addEventListener('click', () => {
    document.execCommand(b.dataset.cmd); text.focus(); ctx.sound('pop');
  }));
  $('#ltrFont', w).addEventListener('change', (e) => { text.style.fontFamily = e.target.value; });
  $('#ltrSize', w).addEventListener('change', (e) => { text.style.fontSize = e.target.value + 'px'; });
  const borders = ['b-classic', 'b-ivy', 'b-none'];
  let bi = 0;
  w.querySelectorAll('.ltr-opts .opt').forEach(o => o.addEventListener('click', () => {
    ctx.sound('pop');
    const a = o.dataset.o;
    if (a === 'Change the border') {
      bi = (bi + 1) % borders.length;
      page.classList.remove(...borders); page.classList.add(borders[bi]);
      ctx.say('New border!', `This one is very ${ctx.guideWord()}. Click again to keep browsing borders.`);
    } else if (a === 'Zoom out to see whole page') {
      page.style.transform = page.style.transform ? '' : 'scale(0.62)';
      page.style.transformOrigin = 'top center';
    } else if (a === 'Print or send') {
      ctx.say('Print or send', 'In 1995 this went to a dot-matrix printer or MCI Mail. Today: <b>Ctrl/Cmd-P</b> works a charm.');
    } else if (a === 'Change text or check spelling') {
      ctx.say('Type here…', 'The blinking cursor shows where your typing will appear. Your browser underlines anything suspicious in red — the 2026 spell checker.');
    } else {
      ctx.say(a, `The original had a whole flow for “${a.toLowerCase()}”. Consider this balloon the ${ctx.guideWord()} placeholder.`);
    }
  }));
}

// ══════════ HOUSEHOLD MANAGER + FINANCIAL GUIDE ══════════
const HHM_TOPICS = [
  ['🚗', 'Auto Information'], ['🧹', 'Cleaning'], ['🏺', 'Collections'], ['🎁', 'Gifts'],
  ['⛑️', 'Health and Safety'], ['🧰', 'Home Maintenance'], ['🏠', 'Household Records'],
  ['🍲', 'Kitchen Information'], ['📦', 'Moving'], ['🧠', 'Personal Growth'], ['🐕', 'Pets'],
  ['📔', 'Scrapbook'], ['⛳', 'Sports and Activities'], ['🏖️', 'Vacations'],
];
const FIN_TOPICS = [
  ['📊', 'Budgeting'], ['🏦', 'Savings Plan'], ['🏠', 'Mortgage and Loans'], ['🧾', 'Taxes'],
  ['☂️', 'Insurance'], ['🌅', 'Retirement'], ['🎓', 'College Fund'], ['💼', 'Investments'],
  ['📈', 'Net Worth'], ['💳', 'Credit Cards'],
];
const SAMPLE_LISTS = {
  'Auto Information': ['Maintenance Schedule', [['Task', 'Do it yourself?', 'At this mileage'],
    ['Radiator — clean grill', 'Yes', '12,000'], ['PCV system — check', 'No', '15,000'],
    ['Radiator — change coolant', 'No', '30,000'], ['Fuel filter — replace', 'No', '30,000'],
    ['Air filter — replace', 'Yes', '15,000'], ['Timing belt — replace', 'Absolutely not', '90,000']]],
  'Pets': ['Pet Care Checklist', [['Task', 'How often', 'Assigned to'],
    ['Feed Rover', 'Twice daily', ctxUser], ['Refill water bowl', 'Daily', ctxUser],
    ['Walkies', 'Daily, rain or shine', 'Everyone'], ['Vet check-up', 'Yearly', ctxUser],
    ['Tell Rover he is a good boy', 'Hourly', 'The household']]],
  'Household Records': ['Home Inventory', [['Item', 'Room', 'Value'],
    ['Plaid sofa', 'Family Room', '$450'], ['GeoSafari', 'Family Room', 'Priceless'],
    ['Grandfather clock', 'Study', '$1,200'], ['Moose antlers (decorative)', 'Attic', '$35'],
    ['Postmodern kitchen (entire)', 'Kitchen', 'Regrettable']]],
  'Budgeting': ['Monthly Budget', [['Category', 'Budgeted', 'Actual'],
    ['Groceries', '$420', '$445'], ['Utilities', '$180', '$171'],
    ['Dog treats', '$20', '$68'], ['Software (nostalgic)', '$0', '$99'], ['Savings', '$300', '$300']]],
  'Savings Plan': ['Savings Goals', [['Goal', 'Target', 'Saved so far'],
    ['Emergency fund', '$5,000', '$3,250'], ['New computer (486, 8MB RAM)', '$2,400', '$2,400'],
    ['Holiday', '$1,500', '$620']]],
};
function ctxUser() { return ctx ? ctx.user() : 'you'; }

function openManager(kind) {
  const isFin = kind === 'financial';
  const topics = isFin ? FIN_TOPICS : HHM_TOPICS;
  const title = isFin ? 'BOB FINANCIAL GUIDE' : 'TABLE OF CONTENTS';
  const w = frame('hhm-frame', `
    <div class="hhm-head"><span class="hhm-screw"></span><h2>${title}</h2><span class="hhm-screw"></span></div>
    <div class="hhm-body" id="hhmBody">
      ${iconGrid(topics.map(([ico, name]) => ({ id: name, icon: ico, label: name })), { key: 't', variant: 'toc' })}
    </div>`);
  const body = $('#hhmBody', w);
  const grid = body.innerHTML;

  // headers per topic (default 3 columns); seeded from the sample data where present
  const headersFor = (name) => {
    const s = SAMPLE_LISTS[name];
    if (s) return s[1][0];
    return isFin ? ['Item', 'Amount', 'Notes'] : ['Item', 'Detail', 'Done?'];
  };
  // seed a topic's rows once, then it's fully user-editable and persisted
  const keyFor = (name) => `hhm.${kind}.${name}`;
  const seedFor = (name) => {
    const s = SAMPLE_LISTS[name];
    if (!s) return [];
    return s[1].slice(1).map(r => r.map(c => (typeof c === 'function' ? c() : c)));
  };
  const loadRows = (name) => store.get(keyFor(name), null) ?? seedFor(name);
  const saveRows = (name, rows) => store.set(keyFor(name), rows);

  const showTopic = (name) => {
    const headers = headersFor(name);
    const listName = SAMPLE_LISTS[name] ? SAMPLE_LISTS[name][0] : name;
    let rows = loadRows(name);

    const render = () => {
      const rowsHtml = rows.map((r, i) => `<tr data-r="${i}">
        <td class="rownum">${i + 1}</td>
        ${headers.map((_, c) => `<td contenteditable="true" data-c="${c}">${(r[c] ?? '')}</td>`).join('')}
        <td class="hhm-del" data-r="${i}" title="Delete row">✕</td></tr>`).join('');
      $('.hhm-list', body).innerHTML = `<h3>${name}: ${listName}</h3><table>
        <tr>${headers.map(h => `<th>${h}</th>`).join('')}<th></th></tr>
        ${rowsHtml || `<tr><td class="rownum">1</td><td colspan="${headers.length + 1}"><i>Empty — click “Add a row” to start your ${ctx.guideWord()} list.</i></td></tr>`}
      </table>`;
      // wire cell edits
      $('.hhm-list', body).querySelectorAll('td[contenteditable]').forEach(td => td.addEventListener('input', () => {
        const ri = +td.parentElement.dataset.r, ci = +td.dataset.c;
        rows[ri] = rows[ri] || [];
        rows[ri][ci] = td.textContent;
        saveRows(name, rows);
      }));
      $('.hhm-list', body).querySelectorAll('.hhm-del').forEach(x => x.addEventListener('click', () => {
        rows.splice(+x.dataset.r, 1); saveRows(name, rows); render(); ctx.sound('page');
      }));
    };

    body.innerHTML = `<div class="hhm-toolbar">
        <button class="bob-btn hhm-back">◀ Table of Contents</button>
        <button class="bob-btn ok hhm-add">＋ Add a row</button>
        <button class="bob-btn hhm-reset">↺ Reset list</button>
      </div><div class="hhm-list"></div>`;
    render();
    $('.hhm-back', body).addEventListener('click', () => { body.innerHTML = grid; wire(); ctx.sound('page'); });
    $('.hhm-add', body).addEventListener('click', () => { rows.push(headers.map(() => '')); saveRows(name, rows); render(); ctx.sound('ding');
      const last = body.querySelector('tr[data-r="' + (rows.length - 1) + '"] td[contenteditable]'); last && last.focus(); });
    $('.hhm-reset', body).addEventListener('click', () => { rows = seedFor(name); saveRows(name, rows); render(); ctx.sound('pop'); });
    ctx.sound('page');
  };

  const wire = () => body.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => showTopic(b.dataset.t)));
  wire();
  setTimeout(() => ctx.say(`Where to, ${ctx.user()}?`, `Click a topic. Every list is fully editable — add rows, type in any cell, delete what you don't need. It all saves. ${isFin ? 'Sound planning, 1995 style.' : 'Fourteen working topics.'}`), 350);
}

// ══════════ BOB E-MAIL ══════════
function openEmail() {
  const user = ctx.user();
  const inbox = [
    { from: 'Rover <rover@bob.com>', subj: 'Welcome to your house!', body: `Dear ${user},<br><br>Welcome to Bob E-Mail! In 1995 this connected to <b>MCI Mail</b> — $5.00 a month for up to 15 messages of 5,000 characters each. A Welcome Kit would be mailed to you within 10 business days.<br><br>Today it is considerably faster, and the dog runs the mailroom.<br><br>Woof,<br>Rover` },
    { from: 'The Friends of Bob', subj: 'All twelve of us say hi', body: 'Blythe, Chaos, Hopper, Java, Orby, Ruby, Scuzz, Shelly, Digger, Speaker and the Invisible Guide all send their regards. Rover typed this because most of us lack thumbs.' },
    { from: 'MCI Mail (Subscription Dept.)', subj: 'Re: Your e-mail service', body: 'To start your e-mail service in the U.S. or Canada, call MCI Mail toll-free, or mail in the Business Reply Card from your Bob Magazine. Please have your credit card and the number of e-mail addresses you\'ll need handy.<br><br><i>(This offer expired approximately thirty years ago.)</i>' },
  ];
  const outgoing = store.get('outbox', []);
  const holes = Array.from({ length: 12 }, (_, i) => `<div class="eml-hole ${i % 4 === 1 || i === 6 ? 'full' : ''}"></div>`).join('');
  const w = frame('eml-frame', `
    <div class="eml-sign">@BOB.COM</div>
    <div class="eml-holes">${holes}</div>
    <div class="eml-desk">
      <div class="eml-tray">
        <button class="eml-tray-label" id="emlNew">New Mail (${inbox.length})</button>
        <div class="eml-tray-box"><span class="paper" style="bottom:10px"></span><span class="paper" style="bottom:22px;transform:rotate(-3deg)"></span></div>
        <button class="eml-tray-label" id="emlOut">Outgoing (${outgoing.length})</button>
        <div class="eml-tray-box">${outgoing.length ? '<span class="paper" style="bottom:12px"></span>' : ''}</div>
        <button class="eml-tray-label" id="emlCompose">✍ Write a letter</button>
      </div>
      <div class="eml-reader" id="emlReader"></div>
    </div>`);
  const reader = $('#emlReader', w);
  const list = (items, empty) => {
    reader.innerHTML = items.length ? items.map((m, i) => `<div class="eml-list-item" data-i="${i}"><b>${m.subj}</b><small>${m.from}</small></div>`).join('') : `<p><i>${empty}</i></p>`;
    reader.querySelectorAll('.eml-list-item').forEach(item => item.addEventListener('click', () => {
      const m = items[item.dataset.i];
      reader.innerHTML = `<h3>${m.subj}</h3><div class="eml-meta">From: ${m.from}</div><div>${m.body}</div>`;
      ctx.sound('page');
    }));
  };
  $('#emlNew', w).addEventListener('click', () => { list(inbox, 'No new mail.'); ctx.sound('pop'); });
  $('#emlOut', w).addEventListener('click', () => { list(outgoing, 'Nothing waiting to go out.'); ctx.sound('pop'); });
  $('#emlCompose', w).addEventListener('click', () => {
    ctx.sound('pop');
    reader.innerHTML = `<h3>New letter</h3>
      <div class="eml-compose">
        <p>To: <input class="bob-input" id="emlTo" placeholder="somebody@bob.com"></p>
        <p>Subject: <input class="bob-input" id="emlSubj"></p>
        <textarea class="bob-input" id="emlBody" placeholder="Dear…"></textarea>
        <div class="btn-row"><button class="bob-btn ok" id="emlSend">Put in Outgoing</button></div>
      </div>`;
    $('#emlSend', reader).addEventListener('click', () => {
      const m = { from: user, subj: $('#emlSubj', reader).value || '(no subject)', body: ($('#emlBody', reader).value || '').replace(/</g, '&lt;').replace(/\n/g, '<br>') + `<br><br>— ${user}, via Bob E-Mail`, };
      outgoing.push(m); store.set('outbox', outgoing);
      $('#emlOut', w).textContent = `Outgoing (${outgoing.length})`;
      list(outgoing, '');
      ctx.sound('ding');
      ctx.say('In the tray!', 'Your letter sits in <b>Outgoing</b>, ready for the next MCI dial-up window. Which is to say: forever. Very authentic.');
    });
  });
  list(inbox, '');
  setTimeout(() => ctx.say('Subscribing to the Bob E-Mail service…', 'The Bob E-Mail service was operated by <b>MCI Mail</b>. This tribute mailroom is fully local — the pigeonholes are just for show, exactly as handsome as 1995.'), 350);
}

// ══════════ GEOSAFARI ══════════
const TILE_MAP = {
  AK: [0, 0], ME: [12, 0],
  WA: [1, 1], MT: [2, 1], ND: [3, 1], MN: [4, 1], WI: [5, 1], MI: [7, 1], NY: [10, 1], VT: [11, 1], NH: [12, 1],
  OR: [1, 2], ID: [2, 2], WY: [3, 2], SD: [4, 2], IA: [5, 2], IL: [6, 2], IN: [7, 2], OH: [8, 2], PA: [9, 2], NJ: [10, 2], CT: [11, 2], MA: [12, 2],
  CA: [1, 3], NV: [2, 3], UT: [3, 3], CO: [4, 3], NE: [5, 3], MO: [6, 3], KY: [7, 3], WV: [8, 3], VA: [9, 3], MD: [10, 3], DE: [11, 3], RI: [12, 3],
  AZ: [2, 4], NM: [3, 4], KS: [4, 4], OK: [5, 4], AR: [6, 4], TN: [7, 4], NC: [8, 4], SC: [9, 4],
  TX: [4, 5], LA: [6, 5], MS: [7, 5], AL: [8, 5], GA: [9, 5],
  HI: [0, 6], FL: [10, 6],
};
const GEO_QUESTIONS = [
  ['the Grand Canyon', 'AZ'], ['the Statue of Liberty', 'NY'], ['the Golden Gate Bridge', 'CA'],
  ['the Space Needle', 'WA'], ['Mount Rushmore', 'SD'], ['Walt Disney World', 'FL'],
  ['the Alamo', 'TX'], ['Graceland', 'TN'], ['the Gateway Arch', 'MO'],
  ['Denali, the highest peak', 'AK'], ['Pearl Harbor', 'HI'], ['the French Quarter', 'LA'],
  ['Yellowstone (most of it)', 'WY'], ['the Las Vegas Strip', 'NV'], ['the Liberty Bell', 'PA'],
];
function openGeoSafari() {
  const user = ctx.user();
  const colors = ['#e8734a', '#f2c94c', '#8fce5a', '#b48fd8', '#6fc3d8'];
  const CW = 66, CH = 56, GAP = 6;
  const states = Object.entries(TILE_MAP).map(([ab, [c, r]], i) =>
    `<g class="geo-state-g" data-ab="${ab}">
      <rect class="geo-state" data-ab="${ab}" x="${c * (CW + GAP) + 14}" y="${r * (CH + GAP) + 12}" width="${CW}" height="${CH}" rx="8" fill="${colors[(c * 3 + r * 5 + i) % 5]}"/>
      <text class="geo-state-label" x="${c * (CW + GAP) + 14 + CW / 2}" y="${r * (CH + GAP) + 12 + CH / 2 + 4}" text-anchor="middle">${ab}</text>
    </g>`).join('');
  const w = frame('geo-frame', `
    <div class="geo-inner">
      <div class="geo-head">
        <span class="geo-logo">GeoSafari</span>
        <span class="geo-title"><small>GEOGRAPHY</small>U.S.A. Attractions</span>
        <span class="geo-stars"><span class="geo-star" data-s="3">3</span><span class="geo-star" data-s="2">2</span><span class="geo-star" data-s="1">1</span></span>
      </div>
      <div class="geo-map-wrap">
        <svg viewBox="0 0 960 460" preserveAspectRatio="xMidYMid meet">${states}</svg>
      </div>
      <div class="geo-foot">
        <span class="geo-timer"><i id="geoHand"></i></span>
        <span class="geo-name"><span class="geo-plate">${user}</span><span class="geo-plate score" id="geoScore">0</span></span>
        <span class="geo-question" id="geoQ">Are you ready to begin? Click any state to start the quiz!</span>
      </div>
    </div>`);

  mountAppGuide(w, 'geosafari', 'geo-guide3d');

  let qs = [...GEO_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
  let qi = -1, tries = 3, score = 0, t0 = Date.now();
  const hand = $('#geoHand', w);
  const timer = setInterval(() => { if (hand.isConnected) hand.style.transform = `rotate(${((Date.now() - t0) / 1000) * 30}deg)`; else clearInterval(timer); }, 100);
  const stars = () => w.querySelectorAll('.geo-star').forEach(s => s.classList.toggle('dim', Number(s.dataset.s) > tries));
  const ask = () => {
    qi++;
    tries = 3; stars();
    if (qi >= qs.length) {
      $('#geoQ', w).textContent = `Quiz over! ${score} points out of a possible ${qs.length * 3}. ${score > qs.length * 2 ? 'Hank the elephant salutes you! 🐘' : 'Hank believes in you. Play again!'}`;
      qi = -1; score = 0;
      setTimeout(() => { $('#geoScore', w).textContent = '0'; }, 50);
      qs = [...GEO_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
      return;
    }
    $('#geoQ', w).innerHTML = `<b>Question ${qi + 1}:</b> Click the state where you'd find <b>${qs[qi][0]}</b>.`;
  };
  let started = false;
  w.querySelectorAll('.geo-state').forEach(r => r.addEventListener('click', () => {
    if (!started) { started = true; t0 = Date.now(); ask(); ctx.sound('ding'); return; }
    if (qi < 0) { ask(); return; }
    const [, answer] = qs[qi];
    if (r.dataset.ab === answer) {
      score += tries; $('#geoScore', w).textContent = score;
      r.classList.add('correct');
      ctx.sound('ding');
      $('#geoQ', w).innerHTML = `✅ <b>${answer}</b> it is! +${tries} point${tries > 1 ? 's' : ''}.`;
      setTimeout(() => { r.classList.remove('correct'); ask(); }, 900);
    } else {
      tries--; stars(); ctx.sound('buzz');
      if (tries <= 0) {
        $('#geoQ', w).innerHTML = `❌ It was <b>${answer}</b>. On to the next one…`;
        setTimeout(ask, 1200);
      } else {
        $('#geoQ', w).innerHTML = `Not ${r.dataset.ab}! <b>${tries}</b> ${tries > 1 ? 'chances' : 'chance'} left — where is <b>${qs[qi][0]}</b>?`;
      }
    }
  }));
  setTimeout(() => ctx.say('Hi, I\'m Hank!', `${ctx.guideName()} handed you over to me — I'm <b>Hank</b>, GeoSafari's own guide, and yes, I'm the elephant in the corner. Here are the rules: you, ${user}, get precisely <b>3</b> opportunities to answer each question. Maximum score: 30. Have fun!`), 350);
}

// ══════════ BOB CLOCK ══════════
function openClock() {
  const w = frame('clk-frame', `
    <div class="clk-face" id="clkFace">
      <span class="clk-num" style="top:6%;left:50%;transform:translateX(-50%)">12</span>
      <span class="clk-num" style="right:7%;top:50%;transform:translateY(-50%)">3</span>
      <span class="clk-num" style="bottom:6%;left:50%;transform:translateX(-50%)">6</span>
      <span class="clk-num" style="left:7%;top:50%;transform:translateY(-50%)">9</span>
      <div class="clk-hand clk-h" id="clkH"></div>
      <div class="clk-hand clk-m" id="clkM"></div>
      <div class="clk-hand clk-s" id="clkS"></div>
      <div class="clk-pin"></div>
      <div class="clk-digital" id="clkD"></div>
    </div>
    <div class="clk-alarms">
      <h3>⏰ Alarms</h3>
      <div class="clk-setrow">
        <input type="time" id="clkTime" value="07:30">
        <input type="text" id="clkMsg" placeholder="Wake the whole house!" maxlength="40">
        <button class="bob-btn ok" id="clkAdd">Set alarm</button>
      </div>
      <ul id="clkList"></ul>
    </div>`);
  const alarms = store.get('alarms', []);
  const renderAlarms = () => {
    const ul = $('#clkList', w); if (!ul) return;
    ul.innerHTML = alarms.length ? alarms.map((a, i) =>
      `<li><b>${a.t}</b> — ${a.msg || 'Alarm'} <span class="clk-del" data-i="${i}">✕</span></li>`).join('')
      : '<li class="clk-none"><i>No alarms set.</i></li>';
    ul.querySelectorAll('.clk-del').forEach(x => x.addEventListener('click', () => { alarms.splice(+x.dataset.i, 1); store.set('alarms', alarms); renderAlarms(); ctx.sound('pop'); }));
  };
  $('#clkAdd', w).addEventListener('click', () => {
    const t = $('#clkTime', w).value; if (!t) return;
    alarms.push({ t, msg: $('#clkMsg', w).value.trim(), fired: '' });
    store.set('alarms', alarms); renderAlarms(); ctx.sound('ding');
    ctx.say('Alarm set!', `I'll ring at <b>${t}</b>. ${$('#clkMsg', w).value.trim() || ''}`);
    $('#clkMsg', w).value = '';
  });
  renderAlarms();
  const tick = () => {
    if (!$('#clkH', w)) return;
    const n = new Date();
    $('#clkH', w).style.transform = `rotate(${(n.getHours() % 12 + n.getMinutes() / 60) * 30}deg)`;
    $('#clkM', w).style.transform = `rotate(${(n.getMinutes() + n.getSeconds() / 60) * 6}deg)`;
    $('#clkS', w).style.transform = `rotate(${n.getSeconds() * 6}deg)`;
    $('#clkD', w).textContent = n.toLocaleTimeString();
    requestAnimationFrame(tick);
  };
  tick();
  setTimeout(() => ctx.say('Bob Clock', `It is <b>${new Date().toLocaleTimeString()}</b>. Set an alarm below — the original woke the whole house, and now this one can too.`), 300);
}

// ══════════ OPTIONS MENU / GUIDE PICKER / DIALOGS ══════════
export function openOptions() {
  closeDialogs();
  const d = el(`<div class="dialog-scrim"><div class="dialog" style="min-width:340px">
    <h3>See what you want?</h3>
    <div class="balloon-options">
      ${['Find a program', 'Go to another room', 'Redecorate — open the catalogue', 'Restyle the room or house', 'Rearrange the room (move furniture)', 'Reset the room', 'Change your guide', 'Voice & brains setup', 'Turn labels on or off (F1)', 'Get a tour of the home', "Rover's Ramblings", 'About the Home', 'Exit Bob Home']
        .map(o => `<button class="opt" data-o="${o}"><span class="ring"></span>${o}</button>`).join('')}
    </div>
    <div class="btn-row"><button class="bob-btn no" data-o="cancel">Cancel</button></div>
  </div></div>`);
  document.body.appendChild(d);
  d.addEventListener('click', (e) => {
    const o = e.target.closest('[data-o]')?.dataset.o;
    if (!o) { if (e.target === d) d.remove(); return; }
    ctx.sound('pop'); d.remove();
    if (o === 'Find a program') openProgramFinder();
    else if (o === 'Go to another room') openRoomPicker();
    else if (o === 'Redecorate — open the catalogue') ctx.openDesigner();
    else if (o === 'Restyle the room or house') ctx.restyle();
    else if (o === 'Rearrange the room (move furniture)') ctx.arrange();
    else if (o === 'Reset the room') ctx.resetRoom();
    else if (o === 'Change your guide') ctx.openGuides();
    else if (o === 'Voice & brains setup') openVoiceSetup();
    else if (o === 'Turn labels on or off (F1)') ctx.toggleLabels();
    else if (o === 'Get a tour of the home') ctx.startTour();
    else if (o === "Rover's Ramblings") ctx.rambling();
    else if (o === 'About the Home') ctx.say('About the Home', 'A tribute to <b>Microsoft Bob</b> (1995) — the house-shaped interface with rooms, guides and a big red door. Rebuilt in three.js with real lighting and thirty years of hindsight. Fun fact: Comic Sans was designed <i>for</i> Bob\'s speech balloons but missed the ship date.<br><br>Original: 8 programs, 12 guides, ~58,000 copies sold.');
    else if (o === 'Exit Bob Home') showExitDialog();
  });
}

// ── Voice & brains setup: your own endpoints, or your OpenAI key ──
// Everything is stored in THIS browser (BobOS.fs) and sent only to the
// provider you configure. Works from static hosting too.
export function openVoiceSetup() {
  closeDialogs();
  const p = BobOS.fs.read('settings/providers', {});
  const field = (id, label, val, ph, type = 'text') =>
    `<label style="display:block;font-size:12px;margin:8px 0 2px">${label}</label>
     <input class="bob-input" id="${id}" type="${type}" value="${val || ''}" placeholder="${ph}" autocomplete="off">`;
  // themed dropdowns — populated by “List available models”, open straight down
  const modelField = (id, label, val, def) =>
    `<label style="display:block;font-size:12px;margin:8px 0 2px">${label}</label>
     <div class="bob-select" id="${id}" data-value="${val || ''}" data-def="${def}">
       <button type="button" class="bob-input bs-face">${val || '(default: ' + def + ')'}</button>
       <div class="bob-select-menu hiddenMenu">
         <button type="button" data-m="">(default: ${def})</button>
         ${val ? `<button type="button" data-m="${val}" class="sel">${val}</button>` : ''}
       </div>
     </div>`;
  const d = el(`<div class="dialog-scrim"><div class="dialog" style="min-width:440px;max-width:500px;max-height:86vh;overflow-y:auto">
    <h3>Voice &amp; brains setup</h3>
    <p style="font-size:12px;margin:2px 0 6px">Give the guides ears, voices and wits. Settings stay in this
    browser and are sent only to the service you choose. Leave everything blank to use the built-in fallbacks.</p>
    ${field('vsKey', 'OpenAI API key (easiest — voices are steered per guide)', p.openaiKey, 'sk-…', 'password')}
    <button class="bob-btn" data-v="models" style="margin-top:8px">List available models</button>
    <span id="vsModelsNote" style="font-size:11px;color:#6b5a2a;margin-left:8px"></span>
    ${modelField('vsChatModel', 'Brains (chat model)', p.chatModel, 'gpt-5.6-luna')}
    ${modelField('vsTtsModel', 'Voice (speech model)', p.ttsModel, 'gpt-4o-mini-tts')}
    ${modelField('vsSttModel', 'Ears (transcription model)', p.sttModel, 'gpt-4o-mini-transcribe')}
    <p style="font-size:11px;margin:4px 0 0;color:#6b5a2a">Click “List available models” to fill these from the models endpoint.</p>
    <details style="margin-top:10px"${p.sttUrl || p.ttsUrl || p.chatUrl ? ' open' : ''}><summary style="font-size:12px;cursor:pointer">Or your own servers (OpenAI-compatible URLs)</summary>
      ${field('vsStt', 'Speech-to-text URL (Whisper)', p.sttUrl, 'http://mybox:8765/v1/audio/transcriptions')}
      ${field('vsTts', 'Text-to-speech URL (Chatterbox, Kokoro…)', p.ttsUrl, 'http://mybox:8093/v1/audio/speech')}
      ${field('vsChat', 'Chat URL (ollama, vLLM…)', p.chatUrl, 'http://mybox:11434/v1/chat/completions')}
      <p style="font-size:11px;margin:6px 0 0;color:#6b5a2a">Heads-up: the browser calls these directly, so your
      server must allow CORS — and if the house is served over https, plain-http LAN URLs are blocked
      (localhost is exempt). Running <b>serve.py</b> locally avoids both: it proxies without CORS.
      “List available models” asks your chat server when a chat URL is set, otherwise OpenAI.</p>
    </details>
    <div class="btn-row">
      <button class="bob-btn ok" data-v="save">Save</button>
      <button class="bob-btn" data-v="clear">Forget all</button>
      <button class="bob-btn no" data-v="cancel">Cancel</button>
    </div>
  </div></div>`);
  document.body.appendChild(d);
  const val = (id) => $('#' + id, d).value.trim() || null;

  // populate the model pickers from the /v1/models endpoint — never guess.
  // The models list is free metadata: it works even when inference quota is 0.
  async function listModels() {
    const note = $('#vsModelsNote', d);
    note.textContent = 'asking…';
    try {
      const chatUrl = val('vsChat'), key = val('vsKey');
      let url, headers = {};
      if (chatUrl) url = chatUrl.replace(/\/chat\/completions\/?$/, '') + '/models';
      else if (key) { url = 'https://api.openai.com/v1/models'; headers = { Authorization: 'Bearer ' + key }; }
      else { note.textContent = 'enter a key or a chat URL first'; return; }
      const r = await fetch(url, { headers });
      if (!r.ok) { note.textContent = 'models endpoint said ' + r.status; return; }
      const ids = ((await r.json()).data || []).map(m => m.id).sort().reverse();
      const fill = (selId, filter, def) => {
        const wrap = $('#' + selId, d);
        const cur = wrap.dataset.value;
        wrap.querySelector('.bob-select-menu').innerHTML =
          `<button type="button" data-m="">(default: ${def})</button>` +
          ids.filter(filter).map(id => `<button type="button" data-m="${id}"${id === cur ? ' class="sel"' : ''}>${id}</button>`).join('');
      };
      fill('vsChatModel', id => !/(embed|tts|transcribe|whisper|dall|image|moderation|audio|realtime|search|similarity|edit)/.test(id), 'gpt-5.6-luna');
      fill('vsTtsModel', id => /tts/.test(id), 'gpt-4o-mini-tts');
      fill('vsSttModel', id => /whisper|transcribe/.test(id), 'gpt-4o-mini-transcribe');
      note.textContent = ids.length + ' models — pick from the dropdowns';
    } catch (e) { note.textContent = 'could not reach the models endpoint'; }
  }

  d.addEventListener('click', (e) => {
    // themed dropdowns: face toggles its menu (closing others); an option picks & closes
    const face = e.target.closest('.bs-face');
    if (face) {
      const menu = face.parentElement.querySelector('.bob-select-menu');
      d.querySelectorAll('.bob-select-menu').forEach(m => { if (m !== menu) m.classList.add('hiddenMenu'); });
      menu.classList.toggle('hiddenMenu');
      return;
    }
    const opt = e.target.closest('.bob-select-menu button');
    if (opt) {
      const wrap = opt.closest('.bob-select');
      wrap.dataset.value = opt.dataset.m;
      wrap.querySelector('.bs-face').textContent = opt.dataset.m || `(default: ${wrap.dataset.def})`;
      wrap.querySelectorAll('.bob-select-menu button').forEach(b => b.classList.toggle('sel', b === opt));
      opt.closest('.bob-select-menu').classList.add('hiddenMenu');
      return;
    }
    d.querySelectorAll('.bob-select-menu').forEach(m => m.classList.add('hiddenMenu'));

    const v = e.target.closest('[data-v]')?.dataset.v;
    if (!v) { if (e.target === d) d.remove(); return; }
    if (v === 'models') { listModels(); return; }
    if (v === 'save') {
      const pick = (id) => $('#' + id, d).dataset.value || null;
      BobOS.fs.write('settings/providers', {
        openaiKey: val('vsKey'), sttUrl: val('vsStt'), ttsUrl: val('vsTts'), chatUrl: val('vsChat'),
        chatModel: pick('vsChatModel'), ttsModel: pick('vsTtsModel'), sttModel: pick('vsSttModel'),
      });
      d.remove(); ctx.sound('ding');
      ctx.say('Voice setup saved', 'Hold the mic and say hello — if the connection works, your guide will answer out loud.');
    } else if (v === 'clear') {
      BobOS.fs.remove('settings/providers');
      d.remove(); ctx.sound('pop');
      ctx.say('Forgotten', 'All voice settings cleared from this browser.');
    } else { d.remove(); }
  });
}

export function openProgramFinder() {
  closeDialogs();
  const apps = BobOS.apps.list();   // includes any third-party apps registered with the kernel
  const d = el(`<div class="dialog-scrim"><div class="dialog">
    <h3>Find a program</h3>
    ${iconGrid(apps.map(a => ({ id: a.id, icon: a.icon, label: a.name })), { key: 'a', cols: 3 })}
    <div class="btn-row"><button class="bob-btn no">Cancel</button></div>
  </div></div>`);
  document.body.appendChild(d);
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('.bob-btn')) { d.remove(); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a) { d.remove(); openApp(a); }
  });
}

export function openRoomPicker() {
  closeDialogs();
  const rooms = ctx.roomList();
  const icons = { family: '🛋️', study: '📚', kitchen: '🍳', attic: '🏰' };
  const d = el(`<div class="dialog-scrim"><div class="dialog">
    <h3>Go to another room</h3>
    ${iconGrid(rooms.map(r => ({ id: r.id, icon: icons[r.id] ?? '🚪', label: r.title })), { key: 'r', cols: 2 })}
    <div class="btn-row"><button class="bob-btn no">Cancel</button></div>
  </div></div>`);
  document.body.appendChild(d);
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('.bob-btn')) { d.remove(); return; }
    const r = e.target.closest('[data-r]')?.dataset.r;
    if (r) { d.remove(); ctx.gotoRoom(r); }
  });
}

export function openGuidePicker(guides, currentId) {
  closeDialogs();
  const d = el(`<div class="dialog-scrim"><div class="dialog" style="max-width:520px">
    <h3>Choose your personal guide</h3>
    <p style="margin:4px 0 0;font-size:12px">All twelve Friends of Bob, from version 1.00. Each has its own vocabulary.</p>
    ${iconGrid(Object.entries(guides).map(([id, g]) => ({ id, icon: g.emoji, label: g.name, current: id === currentId })), { key: 'g' })}
    <div class="btn-row"><button class="bob-btn no">Cancel</button></div>
  </div></div>`);
  document.body.appendChild(d);
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('.bob-btn')) { d.remove(); return; }
    const g = e.target.closest('[data-g]')?.dataset.g;
    if (g) { d.remove(); ctx.setGuide(g); }
  });
}

export function showExitDialog() {
  closeDialogs();
  const d = el(`<div class="dialog-scrim"><div class="dialog">
    <h3>Are you sure you want to exit Bob Home?</h3>
    <p style="font-size:12.5px">Shortcut: next time, just double-click on the Exit sign.</p>
    <div class="btn-row">
      <button class="bob-btn no" data-x="cancel">Cancel</button>
      <button class="bob-btn ok" data-x="exit">Yes, Exit</button>
    </div>
  </div></div>`);
  document.body.appendChild(d);
  d.addEventListener('click', (e) => {
    const x = e.target.closest('[data-x]')?.dataset.x;
    if (x === 'exit') { d.remove(); ctx.exit(); }
    else if (x === 'cancel' || e.target === d) d.remove();
  });
}

export function showSignIn(onDone) {
  closeDialogs();
  const prev = store.get('user', '');
  const d = el(`<div class="dialog-scrim" style="background:rgba(10,6,2,.25)"><div class="dialog">
    <h3>Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}.</h3>
    <p>Who's at the door? Type your name so the house knows you.</p>
    <input class="bob-input" id="signName" value="${prev}" placeholder="Your name" maxlength="24">
    <div class="btn-row"><button class="bob-btn ok" id="signGo">Come on in</button></div>
  </div></div>`);
  document.body.appendChild(d);
  const go = () => {
    const name = $('#signName', d).value.trim() || 'Friend';
    store.set('user', name);
    d.remove();
    onDone(name);
  };
  $('#signGo', d).addEventListener('click', go);
  $('#signName', d).addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  setTimeout(() => $('#signName', d).focus(), 60);
}

function closeDialogs() { document.querySelectorAll('.dialog-scrim').forEach(x => x.remove()); }

// ── register every built-in program with the BobOS kernel ──
export const BUILTIN_APPS = [
  { id: 'letter', name: 'Letter Writer', icon: '✍️', launch: openLetterWriter },
  { id: 'calendar', name: 'Calendar', icon: '📅', launch: openCalendar },
  { id: 'checkbook', name: 'Checkbook', icon: '🖋️', launch: openCheckbook },
  { id: 'address', name: 'Address Book', icon: '📖', launch: openAddressBook },
  { id: 'household', name: 'Household Manager', icon: '🏠', launch: () => openManager('household') },
  { id: 'financial', name: 'Financial Guide', icon: '💰', launch: () => openManager('financial') },
  { id: 'email', name: 'E-Mail', icon: '✉️', launch: openEmail },
  { id: 'geosafari', name: 'GeoSafari', icon: '🌎', launch: openGeoSafari },
  { id: 'clock', name: 'Clock', icon: '🕰️', launch: openClock },
];
BUILTIN_APPS.forEach(a => BobOS.apps.register(a));

// launch any registered app (built-in or third-party) by id
export function openApp(id) {
  const a = BobOS.apps.get(id);
  if (a) { a.launch(ctx); return; }
  console.warn('[apps] unknown app', id);
}

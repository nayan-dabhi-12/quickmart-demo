/* QuickMart Demo — UI helpers shared by all four apps */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (n) => { n = Number(n || 0); const a = Math.abs(n); return (n < 0 ? '−' : '') + '₹' + a.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: Math.round(a * 100) % 100 ? 2 : 0 }); };
  const inr0 = (n) => { n = Math.round(Number(n || 0)); return (n < 0 ? '−' : '') + '₹' + Math.abs(n).toLocaleString('en-IN'); };
  const time = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const date = (t) => new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const dt = (t) => date(t) + ', ' + time(t);
  const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); if (s < 60) return s + 's ago'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; };
  const mins = (ms) => { if (!ms && ms !== 0) return '-'; const m = ms / 60000; return m < 1 ? Math.round(ms / 1000) + 's' : m.toFixed(1) + ' min'; };
  const isToday = (t) => new Date(t).toDateString() === new Date().toDateString();
  const catColor = (cid) => (QM.state.categories.find(c => c.id === cid) || {}).color || '#f3f4f6';
  const pctOff = (p) => p.mrp > p.price ? Math.round((p.mrp - p.price) / p.mrp * 100) : 0;

  function toast(msg, type) {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const el = document.createElement('div'); el.className = 'toast ' + (type || ''); el.textContent = msg; box.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }
  function modal(title, body, opts = {}) {
    closeModal();
    const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.id = 'modal';
    bg.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}"><div class="modal-h no-print"><h3>${title}</h3><button class="x" onclick="UI.closeModal()">✕</button></div><div class="modal-b">${body}</div></div>`;
    bg.addEventListener('click', (e) => { if (e.target === bg && !opts.sticky) closeModal(); });
    document.body.appendChild(bg);
    const f = bg.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 50);
    return bg;
  }
  function closeModal() { const m = document.getElementById('modal'); if (m) m.remove(); }
  const modalOpen = () => !!document.getElementById('modal');

  let actx = null;
  function beep(kind) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const seq = kind === 'err' ? [[220, .18], [180, .25]] : kind === 'new' ? [[880, .12], [1175, .12], [1568, .22]] : [[1320, .08]];
      let t = actx.currentTime;
      seq.forEach(([f, d]) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = kind === 'err' ? 'sawtooth' : 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d); t += d * .9; });
    } catch (e) {}
  }

  const STATUS = {
    PLACED: ['Order placed', 'o'], PICKING: ['Picking', 'b'], PACKED: ['Packed · Ready', 'p'], ASSIGNED: ['Rider assigned', 'p'],
    ACCEPTED: ['Rider on the way to store', 'b'], PICKED_UP: ['Out for delivery', 'b'], DELIVERED: ['Delivered', 'g'], CANCELLED: ['Cancelled', 'r'],
  };
  const statusPill = (s) => `<span class="pill ${STATUS[s] ? STATUS[s][1] : ''}">${STATUS[s] ? STATUS[s][0] : s}</span>`;
  const PAY = { UPI: 'UPI', CARD: 'Card', NB: 'Net Banking', COD: 'Cash on Delivery' };
  const payPill = (o) => {
    const m = { PAID: ['Paid', 'g'], COD_DUE: ['COD due', 'o'], COD_COLLECTED: ['COD collected', 'g'], REFUNDED: ['Refunded', 'r'] }[o.payStatus] || [o.payStatus, ''];
    return `<span class="pill ${m[1]}">${PAY[o.payMode]} · ${m[0]}</span>`;
  };

  // Stylised map: store + customer + rider (SVG, no external map needed for the demo)
  function mapSVG(o, pos) {
    const s = QM.STORE_POS, c = { x: o.address.x, y: o.address.y };
    const dist = Math.hypot(c.x - s.x, c.y - s.y);
    const w = Math.max(34, dist * 2.3), h = w * 0.55, cx = (s.x + c.x) / 2, cy = (s.y + c.y) / 2;
    const k = w / 95; // marker scale
    const vb = `${(cx - w / 2).toFixed(2)} ${(cy - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
    let roads = '';
    for (let v = -20; v <= 120; v += 8) roads += `<line x1="-20" y1="${v}" x2="120" y2="${v}" stroke="#fff" stroke-width="${(1.4 * k).toFixed(2)}"/><line x1="${v}" y1="-20" x2="${v}" y2="120" stroke="#fff" stroke-width="${(1.4 * k).toFixed(2)}"/>`;
    const mk = (x, y, fill, emo, r) => `<g transform="translate(${x.toFixed(2)},${y.toFixed(2)}) scale(${k.toFixed(3)})"><circle r="${r}" fill="${fill}" stroke="#fff" stroke-width=".8"/><text y="1.9" text-anchor="middle" font-size="5">${emo}</text></g>`;
    const rider = pos ? mk(pos.x, pos.y, '#1f2937', '🛵', 4.2) : '';
    return `<svg class="map" viewBox="${vb}" preserveAspectRatio="xMidYMid slice">
      <rect x="-20" y="-20" width="140" height="140" fill="#e8efe6"/>
      <rect x="62" y="6" width="22" height="14" rx="2" fill="#cfe8cc"/><rect x="6" y="80" width="26" height="14" rx="2" fill="#cfe8cc"/><rect x="30" y="30" width="10" height="8" rx="1.5" fill="#cfe8cc"/>
      <path d="M-20 86 Q40 76 120 84" stroke="#b9d7f0" stroke-width="5" fill="none"/>
      ${roads}
      <line x1="${s.x}" y1="${s.y}" x2="${c.x}" y2="${c.y}" stroke="#0c831f" stroke-width="${(1.1 * k).toFixed(2)}" stroke-dasharray="${(2.5 * k).toFixed(2)} ${(1.6 * k).toFixed(2)}"/>
      ${mk(s.x, s.y, '#f8cb46', '🏪', 4)}
      ${mk(c.x, c.y, '#e53935', '🏠', 4)}
      ${rider}
    </svg>`;
  }

  function invoiceHTML(o) {
    const st = QM.state.settings;
    const rows = o.items.filter(i => i.qty > 0).map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.name)}<div class="mut tiny">${esc(i.unit)} · GST ${i.gst}%</div></td><td class="r">${i.qty}</td><td class="r">${inr(i.mrp)}</td><td class="r">${inr(i.price)}</td><td class="r">${inr(i.price * i.qty)}</td></tr>`).join('');
    return `<div class="print-area invoice">
      <div class="row between"><div><div class="xb" style="font-size:18px">${esc(st.shopName)}</div><div class="mut small">${esc(st.shopAddress)}</div><div class="mut small">GSTIN ${st.gstin} · FSSAI ${st.fssai}</div></div>
      <div style="text-align:right"><div class="b">TAX INVOICE</div><div class="small">Invoice #INV-${o.id.slice(2)}</div><div class="small">${dt(o.created)}</div></div></div>
      <div class="hr"></div>
      <div class="small"><b>Bill to:</b> ${esc(o.customer.name)} · ${esc(o.customer.phone)}<br>${esc(o.address.line)}</div>
      <table class="mt12"><thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">MRP</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="max-width:280px;margin-left:auto" class="mt12">
        <div class="bill-row"><span>Item total</span><span>${inr(o.itemTotal)}</span></div>
        <div class="bill-row"><span>Delivery charge</span><span>${o.deliveryCharge ? inr(o.deliveryCharge) : 'FREE'}</span></div>
        <div class="bill-row"><span>Handling fee</span><span>${inr(o.handlingFee)}</span></div>
        ${o.couponDisc ? `<div class="bill-row green"><span>Coupon ${esc(o.coupon)}</span><span>-${inr(o.couponDisc)}</span></div>` : ''}
        <div class="bill-row b" style="border-top:1px solid #ddd;margin-top:4px;padding-top:6px"><span>Grand total</span><span>${inr(o.total)}</span></div>
        <div class="bill-row mut small"><span>Incl. GST</span><span>${inr(o.gstAmt)}</span></div>
        ${o.refundTotal ? `<div class="bill-row redt small"><span>Refunded</span><span>-${inr(o.refundTotal)}</span></div>` : ''}
        <div class="bill-row small"><span>Payment</span><span>${PAY[o.payMode]}${o.payRef ? ' · ' + o.payRef : ''}</span></div>
      </div>
      <div class="mut tiny mt12">This is a computer generated invoice (demo). Thank you for shopping with us!</div>
    </div>
    <div class="row mt16 no-print print-btn"><button class="btn block" onclick="window.print()">🖨️ Print / Save PDF</button></div>`;
  }

  function csvDownload(name, rows) {
    const csv = rows.map(r => r.map(v => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ''));
  }

  window.UI = { esc, inr, inr0, time, date, dt, ago, mins, isToday, catColor, pctOff, toast, modal, closeModal, modalOpen, beep, STATUS, statusPill, PAY, payPill, mapSVG, invoiceHTML, csvDownload, parseCSV };
})();

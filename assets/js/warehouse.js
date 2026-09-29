/* =====================  WAREHOUSE APP  ===================== */
(function () {
  const { esc, inr, time, dt, ago, mins, catColor, toast, modal, closeModal, statusPill, payPill, beep, invoiceHTML } = UI;
  const st = { sec: 'board', orderId: null, lastScan: null, invQ: '', invPage: 0, grnPid: null, sound: false };
  let root = null; let seen = null;
  const S = () => QM.state;
  const live = (s) => S().orders.filter(o => s.includes(o.status));

  function checkNew() {
    const ids = live(['PLACED']).map(o => o.id);
    if (seen === null) { seen = new Set(ids); return false; }
    const fresh = ids.filter(id => !seen.has(id)); ids.forEach(id => seen.add(id));
    if (fresh.length) { if (st.sound) beep('new'); toast('🔔 New order ' + fresh.join(', '), 'ok'); return true; }
    return false;
  }

  function side() {
    const n = live(['PLACED']).length, h = live(['ACCEPTED']).length;
    const items = [['board', '📋', 'Live orders', n], ['handover', '🤝', 'Rider handover', h], ['grn', '📥', 'Stock-In (GRN)'], ['adjust', '⚠️', 'Stock adjustment'], ['lookup', '🔎', 'Item lookup'], ['alerts', '⏰', 'Low stock & expiry']];
    return `<div class="side"><div class="st">Warehouse · ${esc(S().settings.shopName)}</div>${items.map(([k, i, l, c]) => `<button class="${st.sec === k ? 'on' : ''}" onclick="W.go('${k}')">${i} ${l}${c ? `<span class="cnt">${c}</span>` : ''}</button>`).join('')}
      <div class="st">Device</div><button onclick="W.toggleSound()">${st.sound ? '🔊 Sound alerts ON' : '🔇 Enable sound alerts'}</button></div>`;
  }

  function oc(o) {
    const r = o.riderId ? QM.rider(o.riderId) : null;
    return `<div class="oc ${o.status === 'PLACED' ? 'new' : ''}" onclick="W.open('${o.id}')">
      <div class="row between"><span class="id">${o.id}</span><span class="tiny mut">${ago(o.created)}</span></div>
      <div class="small">${o.items.length} items · ${o.items.reduce((s, i) => s + i.qty, 0)} units · <b>${inr(o.total)}</b></div>
      <div class="tiny mut">${esc(o.customer.name)} · ${esc(o.address.loc)} (${o.address.km} km)</div>
      <div class="row wrap mt8" style="gap:4px">${statusPill(o.status)}${o.payMode === 'COD' ? '<span class="pill o">COD</span>' : '<span class="pill g">Prepaid</span>'}${r ? `<span class="pill">🛵 ${esc(r.name.split(' ')[0])}</span>` : ''}</div>
    </div>`;
  }

  function board() {
    const lanes = [['🆕 New orders', ['PLACED']], ['🛍️ Picking', ['PICKING']], ['📦 Packed / awaiting rider', ['PACKED', 'ASSIGNED', 'ACCEPTED']], ['🛵 Out for delivery', ['PICKED_UP']]];
    const today = S().orders.filter(o => UI.isToday(o.created));
    const newCount = live(['PLACED']).length;
    return `
      ${newCount ? `<div class="alert-banner">🔔 ${newCount} new order${newCount > 1 ? 's' : ''} waiting — start picking now!</div>` : ''}
      <div class="row between wrap"><div><h2>Live orders</h2><div class="mut small">Orders refresh automatically. Click an order to open the pick list.</div></div>
      <div class="row"><span class="pill g">Today: ${today.filter(o => o.status === 'DELIVERED').length} delivered</span><span class="pill">${today.length} total</span></div></div>
      <div class="orders-board mt12">${lanes.map(([t, s]) => { const L = live(s).sort((a, b) => a.created - b.created); return `<div class="lane"><h4>${t}<span class="pill">${L.length}</span></h4>${L.map(oc).join('') || '<div class="tiny mut" style="padding:8px">No orders</div>'}</div>`; }).join('')}</div>
      <div class="card mt16 small"><b>Tip for demo:</b> open the <b>Customer app</b> in another tab (or use <b>All-in-one view</b>), place an order and it will appear here instantly with a sound alert.</div>`;
  }

  function orderView() {
    const o = QM.order(st.orderId); if (!o) return 'Not found';
    const items = o.items.slice().sort((a, b) => a.rack.localeCompare(b.rack));
    const allPicked = o.items.every(i => i.picked >= i.qty);
    const units = o.items.reduce((s, i) => s + i.qty, 0), picked = o.items.reduce((s, i) => s + Math.min(i.picked, i.qty), 0);
    const r = o.riderId ? QM.rider(o.riderId) : null;
    let action = '';
    if (o.status === 'PLACED') action = `<button class="btn lg" onclick="W.start('${o.id}')">▶ Start picking</button>`;
    else if (o.status === 'PICKING') action = `<button class="btn lg" ${allPicked ? '' : 'disabled'} onclick="W.pack('${o.id}')">📦 Packing complete → Mark READY</button>`;
    return `
      <div class="row wrap between"><div class="row"><button class="btn ghost sm" onclick="W.go('board')">← Board</button><div><h2 style="margin:0">${o.id}</h2><div class="small mut">Placed ${time(o.created)} (${ago(o.created)}) · ${esc(o.customer.name)} · ${esc(o.address.loc)}</div></div></div>
      <div class="row wrap">${statusPill(o.status)} ${payPill(o)} <button class="btn ghost sm" onclick="W.invoice('${o.id}')">🧾 Print invoice</button>${['PLACED', 'PICKING'].includes(o.status) ? `<button class="btn ghost sm" onclick="W.cancel('${o.id}')">Cancel</button>` : ''}</div></div>
      ${o.status === 'PICKING' ? `
      <div class="card mt12"><div class="scanbox"><span style="font-size:22px">📷</span><input id="scan" placeholder="Scan barcode with scanner (or type & press Enter)" onkeydown="if(event.key==='Enter'){W.scan('${o.id}',this.value);this.value=''}" autofocus><button class="btn org" onclick="const i=document.getElementById('scan');W.scan('${o.id}',i.value);i.value=''">Enter</button></div>
      ${st.lastScan ? `<div class="scan-msg ${st.lastScan.ok ? 'ok' : 'err'}">${esc(st.lastScan.msg)}</div>` : ''}
      <div class="row between mt12"><div class="b">Progress: ${picked}/${units} units</div><div class="tr" style="flex:1;margin-left:12px;height:10px;background:var(--bg);border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:${units ? picked / units * 100 : 0}%;background:var(--g)"></i></div></div></div>` : ''}
      <div class="card mt12" style="padding:0">
        <div class="pick-row" style="background:#fafafa;font-size:11px;font-weight:700;color:var(--mut)"><div>RACK</div><div>ITEM</div><div>QTY</div><div>ACTION</div></div>
        ${items.map(i => { const done = i.picked >= i.qty && i.qty > 0; return `<div class="pick-row ${done ? 'done' : ''} ${i.oos ? 'oosr' : ''}">
          <div class="rack">${esc(i.rack)}</div>
          <div class="row"><div style="font-size:28px;background:${catColor(QM.product(i.pid)?.cat)};border-radius:8px;width:44px;height:44px;display:grid;place-items:center;flex-shrink:0">${i.emoji}</div><div><div class="b small">${esc(i.name)}</div><div class="tiny mut">${esc(i.unit)} · <span style="font-family:monospace">${i.barcode}</span></div><div class="tiny mut">Batch (FEFO): ${i.alloc.map(a => a.batch + '×' + a.qty).join(', ') || '-'}</div></div></div>
          <div class="b" style="font-size:16px">${Math.min(i.picked, i.qty)} / ${i.qty}${i.shortQty ? `<div class="tiny redt">${i.shortQty} OOS</div>` : ''}</div>
          <div class="row wrap">${o.status === 'PICKING' && !done && !i.oos ? `<button class="btn sm" onclick="W.scan('${o.id}','${i.barcode}')">✔ Scan</button><button class="btn sm red" onclick="W.oos('${o.id}','${i.pid}')">Out of stock</button>` : done ? '<span class="pill g">✔ Picked</span>' : i.oos ? '<span class="pill r">Out of stock</span>' : ''}</div>
        </div>`; }).join('')}
      </div>
      <div class="row between mt16 wrap">
        <div class="small">Items total <b>${inr(o.itemTotal)}</b> · Grand total <b>${inr(o.total)}</b>${o.refundTotal ? ` · <span class="redt">Refunded ${inr(o.refundTotal)}</span>` : ''} · Scan errors: <b>${o.scanErrors}</b></div>
        ${action}
      </div>
      ${['PACKED', 'ASSIGNED', 'ACCEPTED'].includes(o.status) ? riderBox(o, r) : ''}
      ${o.status === 'PICKED_UP' ? `<div class="card mt16" style="background:var(--bluel)">🛵 Handed over to <b>${esc(r.name)}</b> at ${time(o.pickedUpAt)} — out for delivery.</div>` : ''}
      ${o.status === 'DELIVERED' ? `<div class="card mt16" style="background:var(--gl)">✅ Delivered at ${time(o.deliveredAt)} by ${esc(r?.name || '')}. Total time ${mins(o.deliveredAt - o.created)}.</div>` : ''}
    `;
  }

  function riderBox(o, r) {
    const riders = S().riders;
    return `<div class="card mt16"><div class="b mb8">🛵 Rider assignment</div>
      ${o.status === 'PACKED' ? `<div class="small mb8">${riders.some(x => x.online) ? 'Select a rider (or enable auto-assign in Admin → Settings):' : '<span class="redt b">No rider online right now.</span> Ask a rider to go online.'}</div>
        <div class="row wrap">${riders.map(x => `<button class="btn sm ${x.online ? 'sec' : 'ghost'}" ${x.online ? '' : 'disabled'} onclick="W.assign('${o.id}','${x.id}')">${esc(x.name)} · ${x.online ? QM.riderLoad(x.id) + ' active' : 'offline'}</button>`).join('')}</div>` : ''}
      ${o.status === 'ASSIGNED' ? `<div class="small">Assigned to <b>${esc(r.name)}</b> (${r.phone}) — waiting for rider to accept… <button class="btn sm ghost" onclick="W.unassign('${o.id}')">Re-assign</button></div>` : ''}
      ${o.status === 'ACCEPTED' ? `<div class="small mb8"><b>${esc(r.name)}</b> accepted and is at the store. Ask the rider for the <b>Pickup OTP</b> shown in the Rider app and enter it to hand over the order.</div>
        <div class="row"><input id="potp" class="inp" style="max-width:180px;font-size:20px;letter-spacing:6px;text-align:center" maxlength="4" placeholder="OTP" onkeydown="if(event.key==='Enter')W.handover('${o.id}',this.value)"><button class="btn" onclick="W.handover('${o.id}',document.getElementById('potp').value)">Verify & hand over</button></div>` : ''}
    </div>`;
  }

  function handover() {
    const L = live(['ASSIGNED', 'ACCEPTED']);
    return `<h2>Rider handover</h2><div class="mut small mb12">Verify the rider's Pickup OTP before giving the packet.</div>
      ${L.length ? L.map(o => { const r = QM.rider(o.riderId); return `<div class="card mb12 row wrap between"><div><div class="b">${o.id} · ${o.items.length} items · ${inr(o.total)}</div><div class="small mut">Rider: ${esc(r.name)} · ${o.status === 'ACCEPTED' ? '<span class="green b">At store / accepted</span>' : 'Waiting for accept'}</div></div>
      ${o.status === 'ACCEPTED' ? `<div class="row"><input id="po-${o.id}" class="inp" style="width:120px;text-align:center;font-size:18px;letter-spacing:4px" maxlength="4" placeholder="OTP"><button class="btn" onclick="W.handover('${o.id}',document.getElementById('po-${o.id}').value)">Verify</button></div>` : '<span class="pill o">Pending accept</span>'}</div>`; }).join('') : '<div class="empty"><div class="e">🤝</div>No riders waiting for pickup</div>'}`;
  }

  function productPicker(id, onchange) {
    return `<input id="${id}-q" class="inp" placeholder="Search product name / barcode / ID…" oninput="W.pp('${id}',this.value)"><div id="${id}-res" class="mt8"></div><input type="hidden" id="${id}">`;
  }

  function grnSec() {
    const recent = S().grns.slice(0, 12);
    return `<h2>Stock-In (GRN)</h2><div class="mut small mb12">Record goods received from supplier with batch & expiry. Stock becomes available to customers immediately.</div>
      <div class="grid2">
      <div class="card">
        <label class="f">Product</label>${productPicker('gp')}
        <div class="grid2" style="gap:10px"><div><label class="f">Quantity received</label><input id="gq" type="number" class="inp" min="1" value="24"></div><div><label class="f">Purchase price / unit (₹)</label><input id="gc" type="number" step="0.01" class="inp"></div></div>
        <div class="grid2" style="gap:10px"><div><label class="f">Batch no.</label><input id="gb" class="inp" placeholder="auto"></div><div><label class="f">Expiry date</label><input id="ge" type="date" class="inp"></div></div>
        <div class="grid2" style="gap:10px"><div><label class="f">Supplier</label><input id="gs" class="inp" value="Shree Traders"></div><div><label class="f">Supplier invoice no.</label><input id="gi" class="inp" placeholder="INV-..."></div></div>
        <button class="btn block mt16" onclick="W.saveGrn()">📥 Save stock-in</button>
      </div>
      <div class="card"><div class="b mb8">Recent GRNs</div>${recent.length ? `<table class="t"><thead><tr><th>GRN</th><th>Item</th><th class="num">Qty</th><th>Expiry</th></tr></thead><tbody>${recent.map(g => `<tr><td>${g.id}<div class="tiny mut">${ago(g.t)}</div></td><td class="small">${esc(g.name)}<div class="tiny mut">${esc(g.supplier)} · ${esc(g.batch)}</div></td><td class="num b">+${g.qty}</td><td class="small">${g.exp ? UI.date(g.exp) : '-'}</td></tr>`).join('')}</tbody></table>` : '<div class="small mut">No stock-in yet in this demo. Add one on the left.</div>'}</div>
      </div>`;
  }

  function adjustSec() {
    const logs = S().stockLog.filter(l => l.type === 'ADJ').slice(0, 15);
    return `<h2>Stock adjustment</h2><div class="mut small mb12">Remove damaged / expired / lost stock from a specific batch.</div>
      <div class="grid2"><div class="card">
        <label class="f">Product</label>${productPicker('ap')}
        <div id="ap-batches"></div>
        <label class="f">Quantity to remove</label><input id="aq" type="number" class="inp" min="1" value="1">
        <label class="f">Reason</label><select id="ar" class="inp"><option>Damaged</option><option>Expired</option><option>Lost / missing</option><option>Quality issue</option><option>Stock count correction</option></select>
        <button class="btn red block mt16" onclick="W.saveAdj()">Save adjustment</button>
        <div class="hr"></div><button class="btn ghost block" onclick="W.writeOff()">🗑️ Write-off ALL expired stock</button>
      </div>
      <div class="card"><div class="b mb8">Recent adjustments</div>${logs.length ? logs.map(l => `<div class="small" style="padding:6px 0;border-bottom:1px solid var(--line)"><b class="redt">${l.qty}</b> · ${esc(l.name)}<div class="tiny mut">${esc(l.note)} · ${esc(l.batch)} · ${ago(l.t)}</div></div>`).join('') : '<div class="small mut">No adjustments yet</div>'}</div></div>`;
  }

  function lookup() {
    const q = st.invQ.trim().toLowerCase();
    const res = q ? S().products.filter(p => (p.name + ' ' + p.barcode + ' ' + p.id + ' ' + p.rack).toLowerCase().includes(q)).slice(0, 40) : [];
    return `<h2>Item lookup</h2><div class="mut small mb12">Scan or search any of the ${S().products.length} SKUs to see rack location & batch-wise stock.</div>
      <div class="scanbox"><span style="font-size:22px">📷</span><input id="lq" value="${esc(st.invQ)}" placeholder="Scan barcode or type name / rack (e.g. A1-03)" oninput="W.lookupQ(this.value)" autofocus></div>
      <div class="mt12" id="lres">${lookupRes(res, q)}</div>`;
  }
  function lookupRes(res, q) {
    if (!q) return '<div class="small mut">Try: <b>milk</b>, <b>8900000100001</b>, <b>C1-</b></div>';
    if (!res.length) return '<div class="empty">No product found</div>';
    return `<div class="tbl-wrap"><table class="t"><thead><tr><th>Rack</th><th>Product</th><th>Barcode</th><th class="num">Available</th><th>Batches (qty · expiry)</th></tr></thead><tbody>${res.map(p => `<tr><td><span class="rack" style="font-size:12px;padding:3px 6px">${p.rack}</span></td><td>${p.emoji} <b>${esc(p.name)}</b><div class="tiny mut">${esc(p.unit)} · ${p.id}</div></td><td style="font-family:monospace">${p.barcode}</td><td class="num b ${QM.avail(p) <= p.reorder ? 'redt' : ''}">${QM.avail(p)}</td><td class="small">${p.batches.map(b => `<span class="pill ${QM.isExpired(b) ? 'r' : ''}" style="margin:1px">${b.batch}: ${b.qty} · ${b.exp ? UI.date(b.exp) : 'no expiry'}</span>`).join(' ')}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function alerts() {
    const days = S().settings.expiryAlertDays; const lim = Date.now() + days * QM.DAY;
    const low = S().products.filter(p => QM.avail(p) <= p.reorder).sort((a, b) => QM.avail(a) - QM.avail(b));
    const exp = []; S().products.forEach(p => p.batches.forEach(b => { if (b.qty > 0 && b.exp && b.exp < lim) exp.push({ p, b }); }));
    exp.sort((a, b) => a.b.exp - b.b.exp);
    return `<h2>Low stock & expiry</h2>
      <div class="grid2 mt12">
      <div class="card"><div class="b mb8">📉 Low / out of stock (${low.length})</div><div style="max-height:520px;overflow:auto"><table class="t"><thead><tr><th>Product</th><th>Rack</th><th class="num">Avail</th><th></th></tr></thead><tbody>${low.map(p => `<tr><td class="small">${p.emoji} ${esc(p.name)} <span class="tiny mut">${esc(p.unit)}</span></td><td class="small">${p.rack}</td><td class="num b ${QM.avail(p) ? 'orgt' : 'redt'}">${QM.avail(p)}</td><td><button class="btn sm sec" onclick="W.quickGrn('${p.id}')">Stock-in</button></td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><div class="b mb8">⏰ Expiring within ${days} days / expired (${exp.length})</div><div style="max-height:520px;overflow:auto"><table class="t"><thead><tr><th>Product · batch</th><th class="num">Qty</th><th>Expiry</th></tr></thead><tbody>${exp.map(({ p, b }) => `<tr><td class="small">${p.emoji} ${esc(p.name)}<div class="tiny mut">${b.batch} · ${p.rack}</div></td><td class="num b">${b.qty}</td><td>${QM.isExpired(b) ? '<span class="pill r">Expired</span>' : `<span class="pill o">${UI.date(b.exp)}</span>`}</td></tr>`).join('')}</tbody></table></div></div>
      </div>`;
  }

  function render() {
    if (!root) return;
    const newOnes = checkNew();
    let body;
    if (st.sec === 'order') body = orderView();
    else if (st.sec === 'handover') body = handover();
    else if (st.sec === 'grn') body = grnSec();
    else if (st.sec === 'adjust') body = adjustSec();
    else if (st.sec === 'lookup') body = lookup();
    else if (st.sec === 'alerts') body = alerts();
    else body = board();
    const focus = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : null;
    root.innerHTML = `<div class="app">${side()}<div class="main">${body}</div></div>`;
    if (focus) { const el = document.getElementById(focus); if (el) { el.focus(); if (el.setSelectionRange && el.type === 'text') el.setSelectionRange(el.value.length, el.value.length); } }
    else { const sc = document.getElementById('scan'); if (sc) sc.focus(); }
  }

  const W = window.W = {
    mount(el) { root = el; render(); },
    render,
    onData() {
      if (!root) return;
      // don't disturb typing in forms
      if (['grn', 'adjust'].includes(st.sec)) { if (checkNew()) {} return; }
      if (UI.modalOpen()) { checkNew(); return; }
      render();
    },
    go(sec) { st.sec = sec; st.lastScan = null; render(); window.scrollTo(0, 0); },
    open(id) { st.orderId = id; st.sec = 'order'; st.lastScan = null; render(); window.scrollTo(0, 0); },
    toggleSound() { st.sound = !st.sound; if (st.sound) beep('ok'); render(); },
    start(id) { QM.startPicking(id); st.lastScan = null; render(); },
    scan(id, code) {
      if (!String(code).trim()) return;
      const r = QM.scan(id, code); st.lastScan = r; beep(r.ok ? 'ok' : 'err');
      if (!r.ok) toast(r.msg, 'err');
      render();
    },
    oos(id, pid) {
      const o = QM.order(id); const it = o.items.find(i => i.pid === pid);
      modal('Mark out of stock?', `<p><b>${esc(it.name)}</b> — ${it.qty - it.picked} unit(s) not found on rack <b>${it.rack}</b>.</p><p class="small mut">The item will be removed from the order, the customer will be notified and ${o.payMode === 'COD' ? 'the COD amount reduced' : 'a partial refund initiated automatically'}. System stock for this item will be set to 0.</p><div class="row mt16"><button class="btn ghost grow" onclick="UI.closeModal()">Cancel</button><button class="btn red grow" onclick="QM.markOOS('${id}','${pid}');UI.closeModal();W.render();UI.toast('Marked out of stock · customer notified','ok')">Confirm</button></div>`);
    },
    pack(id) { try { QM.markPacked(id); const o = QM.order(id); toast(o.riderId ? 'Ready! Auto-assigned to ' + QM.rider(o.riderId).name : 'Order ready — assign a rider', 'ok'); render(); } catch (e) { toast(e.message, 'err'); } },
    assign(id, rid) { QM.assignRider(id, rid); toast('Assigned to ' + QM.rider(rid).name, 'ok'); render(); },
    unassign(id) { QM.rejectOrder(id); render(); },
    handover(id, otp) { try { QM.verifyPickupOtp(id, otp); beep('ok'); toast('✔ OTP verified — order handed over to rider', 'ok'); render(); } catch (e) { beep('err'); toast(e.message, 'err'); } },
    cancel(id) { modal('Cancel order?', `<p>Cancel ${id}? Stock will be returned and prepaid amount refunded.</p><div class="row"><button class="btn ghost grow" onclick="UI.closeModal()">No</button><button class="btn red grow" onclick="QM.cancelOrder('${id}','warehouse','Cancelled by store');UI.closeModal();W.go('board')">Yes, cancel</button></div>`); },
    invoice(id) { modal('Invoice', invoiceHTML(QM.order(id)), { wide: true }); },
    pp(id, v) {
      const q = v.trim().toLowerCase(); const box = document.getElementById(id + '-res');
      if (!q) { box.innerHTML = ''; return; }
      const res = S().products.filter(p => (p.name + ' ' + p.barcode + ' ' + p.id).toLowerCase().includes(q)).slice(0, 8);
      box.innerHTML = res.map(p => `<div class="opt mb8" style="padding:8px" onclick="W.pick('${id}','${p.id}')">${p.emoji}<div class="grow small"><b>${esc(p.name)}</b> · ${esc(p.unit)}<div class="tiny mut">${p.id} · ${p.barcode} · Stock ${QM.avail(p)}</div></div></div>`).join('') || '<div class="small mut">No match</div>';
    },
    pick(id, pid) {
      const p = QM.product(pid); document.getElementById(id).value = pid; document.getElementById(id + '-q').value = p.name + ' (' + p.unit + ')';
      document.getElementById(id + '-res').innerHTML = `<div class="pill g">Selected: ${esc(p.name)} · current stock ${QM.avail(p)} · rack ${p.rack}</div>`;
      if (id === 'gp') { document.getElementById('gc').value = p.cost; }
      if (id === 'ap') { document.getElementById('ap-batches').innerHTML = `<label class="f">Batch</label><select id="ab" class="inp">${p.batches.filter(b => b.qty > 0).map(b => `<option value="${b.batch}">${b.batch} · qty ${b.qty} · ${b.exp ? 'exp ' + UI.date(b.exp) : 'no expiry'}${QM.isExpired(b) ? ' (EXPIRED)' : ''}</option>`).join('') || '<option value="">No stock</option>'}</select>`; }
    },
    quickGrn(pid) { st.sec = 'grn'; render(); W.pick('gp', pid); },
    saveGrn() {
      try {
        const g = QM.grn({ pid: document.getElementById('gp').value, qty: document.getElementById('gq').value, cost: document.getElementById('gc').value, batch: document.getElementById('gb').value.trim(), exp: document.getElementById('ge').value, supplier: document.getElementById('gs').value, invoice: document.getElementById('gi').value });
        toast(`${g.id} saved · +${g.qty} ${g.name}`, 'ok'); render();
      } catch (e) { toast(e.message, 'err'); }
    },
    saveAdj() {
      try { const ab = document.getElementById('ab'); QM.adjust({ pid: document.getElementById('ap').value, batch: ab ? ab.value : '', qty: document.getElementById('aq').value, reason: document.getElementById('ar').value }); toast('Stock adjusted', 'ok'); render(); }
      catch (e) { toast(e.message, 'err'); }
    },
    writeOff() { const n = QM.writeOffExpired(); toast(n ? n + ' expired units written off' : 'No expired stock found', n ? 'ok' : ''); render(); },
    lookupQ(v) { st.invQ = v; const q = v.trim().toLowerCase(); const res = q ? S().products.filter(p => (p.name + ' ' + p.barcode + ' ' + p.id + ' ' + p.rack).toLowerCase().includes(q)).slice(0, 40) : []; document.getElementById('lres').innerHTML = lookupRes(res, q); },
  };
})();

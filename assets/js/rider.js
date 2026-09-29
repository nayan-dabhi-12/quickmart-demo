/* =====================  RIDER APP  ===================== */
(function () {
  const { esc, inr, time, ago, toast, modal, closeModal, statusPill, beep } = UI;
  const KEY = 'qm_rider_id';
  const st = { tab: 'home', orderId: null };
  let root = null; let seen = null;
  const S = () => QM.state;
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const setId = (v) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} };
  const me = () => { const id = get(); return id ? QM.rider(id) : null; };
  const mine = (r, s) => S().orders.filter(o => o.riderId === r.id && s.includes(o.status));

  function login() {
    return `<div style="padding:26px 20px;flex:1;background:linear-gradient(180deg,#1f2937,#374151);color:#fff">
      <div style="font-size:50px;text-align:center">🛵</div><h2 style="text-align:center;margin:6px 0">QuickMart Rider</h2>
      <p style="text-align:center;opacity:.8;margin:0 0 18px">Select your rider profile to log in (demo)</p>
      ${S().riders.map(r => `<div class="opt mb8" style="background:#fff;color:#111" onclick="R.login('${r.id}')"><span style="font-size:24px">🧑🏽‍🦱</span><div class="grow"><div class="b">${esc(r.name)}</div><div class="tiny mut">${r.phone} · ${esc(r.vehicle)}</div></div><span class="pill ${r.online ? 'g' : ''}">${r.online ? 'Online' : 'Offline'}</span></div>`).join('')}
      <p class="tiny" style="opacity:.7;text-align:center">In the live app riders log in with mobile OTP.</p></div>`;
  }

  function todayStats(r) {
    const done = S().orders.filter(o => o.riderId === r.id && o.status === 'DELIVERED' && UI.isToday(o.deliveredAt));
    return { n: done.length, earn: done.length * S().settings.riderPayPerOrder, list: done };
  }

  function orderCard(o) {
    const r = me();
    const base = `<div class="row between"><div class="b" style="font-size:16px">${o.id}</div>${statusPill(o.status)}</div>
      <div class="small mt8">📦 ${o.items.length} items · ${o.items.reduce((s, i) => s + i.qty, 0)} units</div>
      <div class="small">🏠 ${esc(o.customer.name)} · ${esc(o.address.line)}</div>
      <div class="small">📏 ${o.address.km} km from store · 💰 Earn ${inr(S().settings.riderPayPerOrder)}</div>
      <div class="small">${o.payMode === 'COD' ? `<span class="pill o">💵 Collect cash ${inr(o.total)}</span>` : '<span class="pill g">Prepaid – no cash to collect</span>'}</div>`;
    if (o.status === 'ASSIGNED') return `<div class="card mb12" style="border:2px solid var(--org)">${base}<div class="row mt12"><button class="btn ghost grow" onclick="R.reject('${o.id}')">Reject</button><button class="btn grow" onclick="R.accept('${o.id}')">✔ Accept order</button></div></div>`;
    if (o.status === 'ACCEPTED') return `<div class="card mb12">${base}
      <div class="otpbox mt12"><div class="small b">Show this PICKUP OTP at the store counter</div><div class="o">${o.pickupOtp}</div><div class="tiny mut">Warehouse staff will verify it and hand over the packet</div></div>
      <a class="btn sec block mt8" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S().settings.shopAddress)}">🧭 Navigate to store</a></div>`;
    if (o.status === 'PICKED_UP') {
      const pos = QM.riderPosition(o);
      return `<div class="card mb12">${base}
        <div class="mt12">${UI.mapSVG(o, pos)}</div>
        <div class="row mt8"><a class="btn sec grow" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o.address.line + ', Ahmedabad')}">🧭 Navigate</a><a class="btn ghost grow" href="tel:${o.customer.phone}">📞 Call customer</a></div>
        <div class="hr"></div>
        <div class="b small mb8" style="text-align:center">Enter DELIVERY OTP from customer</div>
        <div class="otp-in">${[0, 1, 2, 3].map(i => `<input id="d${i}" maxlength="1" inputmode="numeric" oninput="R.otpNext(${i},this)">`).join('')}</div>
        ${o.payMode === 'COD' ? `<label class="opt mt12" style="background:var(--orgl)"><input type="checkbox" id="cod"> <span class="b small">I have collected ${inr(o.total)} cash</span></label>` : ''}
        <button class="btn lg block mt12" onclick="R.deliver('${o.id}')">✅ Complete delivery</button>
        <div class="tiny mut mt8" style="text-align:center">Demo tip: the Delivery OTP is visible in the Customer app → order tracking</div></div>`;
    }
    return '';
  }

  function home() {
    const r = me(); const t = todayStats(r);
    const act = mine(r, ['ASSIGNED', 'ACCEPTED', 'PICKED_UP']).sort((a, b) => a.created - b.created);
    return `
      <div class="online-toggle"><div><div class="b">${r.online ? "You're online" : "You're offline"}</div><div class="tiny" style="opacity:.8">${r.online ? 'You will receive new orders' : 'Go online to receive orders'}</div></div><button class="sw ${r.online ? 'on' : ''}" onclick="R.toggle()"></button></div>
      <div class="grid2 mt12" style="grid-template-columns:repeat(3,1fr);gap:8px">
        <div class="card" style="padding:10px;text-align:center"><div class="xb" style="font-size:20px">${t.n}</div><div class="tiny mut">Deliveries today</div></div>
        <div class="card" style="padding:10px;text-align:center"><div class="xb green" style="font-size:20px">${inr(t.earn)}</div><div class="tiny mut">Earnings today</div></div>
        <div class="card" style="padding:10px;text-align:center"><div class="xb orgt" style="font-size:20px">${inr(r.cash)}</div><div class="tiny mut">COD cash in hand</div></div>
      </div>
      <div class="sec-t"><h3>Active orders</h3><span class="pill">${act.length}</span></div>
      ${act.length ? act.map(orderCard).join('') : `<div class="empty"><div class="e">${r.online ? '⏳' : '😴'}</div>${r.online ? 'Waiting for new orders…<div class="tiny mt8">Orders are auto-assigned when the warehouse marks them READY.</div>' : 'Go online to start receiving orders'}</div>`}`;
  }

  function history() {
    const r = me(); const list = S().orders.filter(o => o.riderId === r.id && o.status === 'DELIVERED').sort((a, b) => b.deliveredAt - a.deliveredAt).slice(0, 40);
    const t = todayStats(r);
    return `<h3 style="margin:4px 0 10px">Earnings & history</h3>
      <div class="card mb12"><div class="row between"><span>Today's deliveries</span><b>${t.n}</b></div><div class="row between"><span>Today's earnings</span><b class="green">${inr(t.earn)}</b></div><div class="row between"><span>COD to deposit</span><b class="orgt">${inr(r.cash)}</b></div><div class="row between"><span>Rating</span><b>⭐ ${r.rating}</b></div></div>
      ${list.map(o => `<div class="card mb8" style="padding:10px"><div class="row between"><b>${o.id}</b><span class="small">${UI.date(o.deliveredAt)} ${time(o.deliveredAt)}</span></div><div class="small mut">${esc(o.address.loc)} · ${o.address.km} km · ${UI.mins(o.deliveredAt - o.pickedUpAt)} ride · ${o.payMode === 'COD' ? 'COD ' + inr(o.total) : 'Prepaid'}</div></div>`).join('') || '<div class="empty">No deliveries yet</div>'}`;
  }

  function profile() {
    const r = me();
    return `<div class="card mb12 row"><div style="font-size:40px">🧑🏽‍🦱</div><div><div class="b" style="font-size:16px">${esc(r.name)}</div><div class="small mut">${r.phone}</div><div class="small">${esc(r.vehicle)}</div></div></div>
      <div class="card mb12 small col"><div>⭐ Rating: <b>${r.rating}</b></div><div>🏪 Store: ${esc(S().settings.shopName)}</div><div>💰 Pay per delivery: ${inr(S().settings.riderPayPerOrder)}</div></div>
      <button class="btn ghost block" onclick="R.logout()">Switch rider / Log out</button>`;
  }

  function render() {
    if (!root) return;
    const r = me(); let html;
    if (!r) html = login();
    else {
      const n = mine(r, ['ASSIGNED']).length;
      html = `<div class="ph-head" style="background:#1f2937;color:#fff;border:0"><div class="row between"><div><div class="tiny" style="opacity:.7">Rider app</div><div class="b">Hi, ${esc(r.name.split(' ')[0])} 👋</div></div><span class="pill ${r.online ? 'g' : ''}">${r.online ? '● Online' : '○ Offline'}</span></div></div>
        <div class="ph-body" id="rbody">${st.tab === 'home' ? home() : st.tab === 'history' ? history() : profile()}</div>
        <div class="ph-nav">${[['home', '🛵', 'Orders'], ['history', '💰', 'Earnings'], ['profile', '👤', 'Profile']].map(([k, i, l]) => `<button class="${st.tab === k ? 'on' : ''}" onclick="R.set('${k}')"><span class="i">${i}</span>${l}${k === 'home' && n ? `<span class="badge">${n}</span>` : ''}</button>`).join('')}</div>`;
    }
    // keep typed OTP digits across live refreshes
    const keep = [0, 1, 2, 3].map(i => document.getElementById('d' + i)?.value || '');
    const cod = document.getElementById('cod')?.checked; const sc = document.getElementById('rbody')?.scrollTop || 0;
    const foc = document.activeElement?.id;
    root.innerHTML = `<div class="phone-wrap"><div class="phone">${html}</div></div>`;
    keep.forEach((v, i) => { const el = document.getElementById('d' + i); if (el) el.value = v; });
    if (cod) { const c = document.getElementById('cod'); if (c) c.checked = true; }
    const b = document.getElementById('rbody'); if (b) b.scrollTop = sc;
    if (foc && /^d\d$/.test(foc)) document.getElementById(foc)?.focus();
  }

  const R = window.R = {
    mount(el) { root = el; render(); },
    render,
    onData() {
      if (!root || !me()) { render(); return; }
      const ids = mine(me(), ['ASSIGNED']).map(o => o.id);
      if (seen) { const fresh = ids.filter(i => !seen.has(i)); if (fresh.length) { beep('new'); toast('🛵 New order assigned: ' + fresh.join(', '), 'ok'); } }
      seen = new Set(ids);
      if (!UI.modalOpen()) render();
    },
    tick() { const r = me(); if (root && r && st.tab === 'home' && mine(r, ['PICKED_UP']).length && !UI.modalOpen()) render(); },
    set(t) { st.tab = t; render(); },
    login(id) { setId(id); seen = null; render(); toast('Logged in as ' + QM.rider(id).name, 'ok'); },
    logout() { setId(null); st.tab = 'home'; render(); },
    toggle() { const r = me(); QM.setOnline(r.id, !r.online); toast(r.online ? 'You are online' : 'You are offline', 'ok'); render(); },
    accept(id) { QM.acceptOrder(id); toast('Accepted! Go to store and show the Pickup OTP', 'ok'); render(); },
    reject(id) { QM.rejectOrder(id); toast('Order rejected — reassigned to another rider'); render(); },
    otpNext(i, el) { el.value = el.value.replace(/\D/g, ''); if (el.value && i < 3) document.getElementById('d' + (i + 1)).focus(); },
    deliver(id) {
      const otp = [0, 1, 2, 3].map(i => document.getElementById('d' + i).value).join('');
      const cod = document.getElementById('cod');
      try { QM.deliver(id, otp, cod ? cod.checked : true); beep('ok'); modal('Delivered! 🎉', `<div class="empty" style="padding:10px"><div class="e">✅</div><div class="b">Order ${id} delivered</div><p class="small">You earned ${inr(S().settings.riderPayPerOrder)}${QM.order(id).payMode === 'COD' ? ' · Cash ' + inr(QM.order(id).total) + ' added to COD wallet' : ''}</p><button class="btn" onclick="UI.closeModal()">OK</button></div>`); render(); }
      catch (e) { beep('err'); toast(e.message, 'err'); }
    },
  };
})();

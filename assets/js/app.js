/* QuickMart Demo — router, landing page and all-in-one view */
(function () {
  const embed = !!window.QM_EMBED || new URLSearchParams(location.search).has('embed');
  if (embed) document.body.classList.add('embed');
  if (window.QM_ARTIFACT) document.body.classList.add('artifact');
  const root = document.getElementById('root');
  const ROUTES = { '': 'home', customer: 'customer', warehouse: 'warehouse', rider: 'rider', admin: 'admin', split: 'split' };
  let current = null;

  function topbar(r) {
    const tabs = [['', '🏠 Start'], ['customer', '🛒 Customer app'], ['warehouse', '🏭 Warehouse app'], ['rider', '🛵 Rider app'], ['admin', '📊 Admin'], ['split', '🪟 All-in-one view']];
    document.getElementById('roles').innerHTML = tabs.map(([k, l]) => `<a href="#/${k}" class="${(ROUTES[k] === r) ? 'on' : ''}">${l}</a>`).join('');
  }

  function landing() {
    const s = QM.state; const P = s.products;
    const units = P.reduce((a, p) => a + QM.avail(p), 0);
    return `<div class="landing">
      <div class="hero"><div style="flex:1;min-width:260px"><div class="pill" style="background:rgba(255,255,255,.2);color:#fff">Working demo · 1 dark store · 1000 products</div>
        <h1 class="mt8">Quick Commerce App — Demo</h1><p>Complete order flow across <b>Customer app</b>, <b>Warehouse app</b>, <b>Rider app</b> and <b>Admin dashboard</b> for <b>${UI.esc(s.settings.shopName)}</b>.</p>
        <div class="stats"><div>${P.length}<small>Products (SKUs)</small></div><div>${s.categories.length}<small>Categories</small></div><div>${units.toLocaleString('en-IN')}<small>Units in stock</small></div><div>1<small>Dark store</small></div><div>${s.riders.length}<small>Riders</small></div></div></div>
        <div style="font-size:90px">🛒</div></div>
      <div class="roles-grid">
        <a class="role-card" href="#/customer"><span class="ic">🛒</span><h3>Customer app</h3><span class="small mut">Login → Products → Cart → Payment → Order tracking</span><ol><li>OTP login (demo OTP 1234)</li><li>Browse 1000 products, search, offers</li><li>Cart, coupon, UPI / card / COD</li><li>Live tracking + Delivery OTP</li></ol></a>
        <a class="role-card" href="#/warehouse"><span class="ic">🏭</span><h3>Warehouse app</h3><span class="small mut">New order → Pick list → Barcode scan → Packing → Ready → Rider</span><ol><li>New order alert with sound</li><li>Pick list sorted by rack</li><li>Barcode scan verify, out-of-stock</li><li>Pickup OTP handover, GRN, stock adjust</li></ol></a>
        <a class="role-card" href="#/rider"><span class="ic">🛵</span><h3>Rider app</h3><span class="small mut">Assigned → Accept → Navigate → Pickup OTP → Delivery OTP</span><ol><li>Online / offline toggle</li><li>Accept / reject orders</li><li>Google Maps navigation, call customer</li><li>Delivery OTP, COD cash, earnings</li></ol></a>
        <a class="role-card" href="#/admin"><span class="ic">📊</span><h3>Admin dashboard</h3><span class="small mut">Sales, inventory, expiry, riders, profit</span><ol><li>Today's orders, sales, live orders</li><li>Catalog (1000 SKUs), inventory, low stock, expiry</li><li>Rider & warehouse performance</li><li>Profit, refunds, COD vs online, GST</li></ol></a>
      </div>
      <div class="grid2 mt16">
        <div class="card"><h3 style="margin-top:0">▶ 5-minute demo script</h3><ol class="steps">
          <li>Open <a href="#/split"><b>All-in-one view</b></a> (best on laptop) — all 4 apps side by side, updating live.</li>
          <li><b>Customer:</b> login with <b>9876543210</b> / OTP <b>1234</b>, add items worth ₹199+, apply <b>WELCOME50</b>, pay by UPI.</li>
          <li><b>Warehouse:</b> new order pops up with a sound → <i>Start picking</i> → press <i>✔ Scan</i> on each item (or scan real barcodes) → <i>Packing complete</i>. Rider is auto-assigned.</li>
          <li><b>Rider:</b> (logged in as Ramesh) → <i>Accept</i> → show Pickup OTP → Warehouse enters it in <i>Rider handover</i>.</li>
          <li><b>Customer</b> sees rider moving on the map + Delivery OTP → <b>Rider</b> types that OTP → <i>Complete delivery</i>.</li>
          <li><b>Admin:</b> dashboard, sales, profit, stock and rider stats update instantly.</li></ol></div>
        <div class="card"><h3 style="margin-top:0">ℹ️ About this demo</h3>
          <div class="small col" style="gap:8px">
            <div>• Runs fully in the browser — no install, works on phone, tablet and laptop.</div>
            <div>• All apps share one live database in this browser, so an order placed in the Customer app appears instantly in the Warehouse, Rider and Admin apps (also across browser tabs).</div>
            <div>• Payment (Razorpay), SMS OTP and maps are <b>simulated</b> for the demo; the production build connects the real services.</div>
            <div>• Stock is batch-wise with expiry and <b>FEFO</b> picking; ${P.filter(p => !QM.avail(p)).length} products are intentionally out of stock and some batches are near expiry, to show alerts.</div>
            <div>• 14 days of sample order history is pre-loaded so the dashboard has real numbers.</div>
            <div class="row mt8"><a class="btn" href="#/split">Open all-in-one view</a><button class="btn ghost" onclick="A.reset && A.reset()">Reset demo data</button></div>
          </div></div>
      </div>
      <p class="tiny mut" style="text-align:center;margin-top:24px">Demo build · QuickMart is a placeholder brand name · Data is sample data</p>
    </div>`;
  }

  function split() {
    const panes = [['customer', '🛒 Customer'], ['warehouse', '🏭 Warehouse'], ['rider', '🛵 Rider'], ['admin', '📊 Admin']];
    return `<div class="split">${panes.map(([k, l]) => `<div class="pane"><div class="ph"><span>${l}</span><a href="#/${k}" style="color:var(--y);text-decoration:none">open full ↗</a></div><iframe src="embed.html#/${k}" title="${l}"></iframe></div>`).join('')}</div>`;
  }

  function route() {
    const key = (location.hash.replace(/^#\/?/, '').split('?')[0]) || '';
    const r = ROUTES[key] || 'home';
    current = r; if (!embed) topbar(r);
    UI.closeModal();
    if (r === 'customer') C.mount(root);
    else if (r === 'warehouse') W.mount(root);
    else if (r === 'rider') { if (embed && !localStorage.getItem('qm_rider_id')) { try { localStorage.setItem('qm_rider_id', 'R1'); } catch (e) {} } R.mount(root); }
    else if (r === 'admin') A.mount(root);
    else if (r === 'split') { try { if (!localStorage.getItem('qm_rider_id')) localStorage.setItem('qm_rider_id', 'R1'); if (!localStorage.getItem('qm_customer_phone')) localStorage.setItem('qm_customer_phone', '9876543210'); } catch (e) {} root.innerHTML = split(); }
    else root.innerHTML = landing();
    window.scrollTo(0, 0);
  }

  // detach other apps so only the active one re-renders
  const unmountAll = () => { ['C', 'W', 'R', 'A'].forEach(n => { /* each app keeps its own root; reset by mount */ }); };
  window.addEventListener('hashchange', () => { unmountAll(); route(); });
  QM.on(() => {
    if (current === 'customer') C.onData(); else if (current === 'warehouse') W.onData(); else if (current === 'rider') R.onData(); else if (current === 'admin') A.onData();
  });
  setInterval(() => { if (current === 'customer') C.tick(); else if (current === 'rider') R.tick(); }, 1500);
  // cross-tab updates arrive via storage events (handled in store.js) -> QM.on listeners above
  route();
})();

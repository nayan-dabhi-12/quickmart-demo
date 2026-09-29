/* =====================  ADMIN DASHBOARD  ===================== */
(function () {
  const { esc, inr, inr0, time, dt, ago, mins, isToday, toast, modal, closeModal, statusPill, payPill, invoiceHTML, csvDownload, parseCSV } = UI;
  const st = { sec: 'dash', oq: '', ostatus: 'ALL', orange: 'today', cq: '', ccat: 'ALL', cpage: 0, cstock: 'ALL', frange: '7', ipage: 0 };
  let root = null;
  const S = () => QM.state;
  const DAY = QM.DAY;
  const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const inRange = (o, r) => r === 'all' ? true : r === 'today' ? isToday(o.created) : o.created >= startOfDay(Date.now()) - (Number(r) - 1) * DAY;
  const delivered = (list) => list.filter(o => o.status === 'DELIVERED');
  const claims = (o) => o.refunds.filter(r => r.kind === 'claim').reduce((s, r) => s + r.amt, 0);
  const cogs = (o) => o.items.reduce((s, i) => s + i.cost * i.qty, 0);
  const avg = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

  function fin(list) {
    const d = delivered(list);
    const gmv = d.reduce((s, o) => s + o.total, 0);
    const cl = d.reduce((s, o) => s + claims(o), 0);
    const gst = d.reduce((s, o) => s + o.gstAmt, 0);
    const c = d.reduce((s, o) => s + cogs(o), 0);
    const disc = d.reduce((s, o) => s + o.couponDisc, 0);
    const fees = d.reduce((s, o) => s + o.deliveryCharge + o.handlingFee, 0);
    const online = d.filter(o => o.payMode !== 'COD'), cod = d.filter(o => o.payMode === 'COD');
    const pg = online.reduce((s, o) => s + o.total, 0) * 0.02;
    const rider = d.length * S().settings.riderPayPerOrder;
    const net = gmv - cl; const netEx = net - gst; const gp = netEx - c;
    const allRefunds = list.reduce((s, o) => s + o.refundTotal, 0);
    return { d, gmv, cl, gst, c, disc, fees, online, cod, pg, rider, net, netEx, gp, contrib: gp - pg - rider, allRefunds,
      onlineAmt: online.reduce((s, o) => s + o.total, 0), codAmt: cod.reduce((s, o) => s + o.total, 0), aov: d.length ? gmv / d.length : 0 };
  }

  function side() {
    const pendRef = S().orders.filter(o => o.refundRequest && o.refundRequest.status === 'PENDING').length;
    const live = S().orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;
    const low = S().products.filter(p => QM.avail(p) <= p.reorder).length;
    const g = [
      ['Overview', [['dash', '📊', 'Dashboard'], ['orders', '🧾', 'Orders', live + pendRef]]],
      ['Store', [['catalog', '🏷️', 'Catalog (products)'], ['inventory', '📦', 'Inventory', low], ['expiry', '⏰', 'Expiry'], ['purchase', '📥', 'Purchases (GRN)']]],
      ['Operations', [['riders', '🛵', 'Riders'], ['wh', '🏭', 'Warehouse performance']]],
      ['Business', [['finance', '💰', 'Finance & profit'], ['marketing', '📣', 'Marketing'], ['settings', '⚙️', 'Settings']]],
    ];
    return `<div class="side">${g.map(([t, items]) => `<div class="st">${t}</div>` + items.map(([k, i, l, c]) => `<button class="${st.sec === k ? 'on' : ''}" onclick="A.go('${k}')">${i} ${l}${c ? `<span class="cnt">${c}</span>` : ''}</button>`).join('')).join('')}</div>`;
  }

  // ---------- charts ----------
  function bars(data, fmt) {
    const max = Math.max(1, ...data.map(d => d.v));
    return `<div class="bars">${data.map(d => `<div class="bar"><i style="height:${d.v / max * 100}%;${d.c ? 'background:' + d.c : ''}" data-v="${fmt ? fmt(d.v) : d.v}"></i><span>${d.l}</span></div>`).join('')}</div>`;
  }
  function hbars(data, fmt) {
    const max = Math.max(1, ...data.map(d => d.v));
    return data.map(d => `<div class="hbar"><span class="lb">${d.l}</span><span class="tr"><i style="width:${d.v / max * 100}%"></i></span><span class="vv">${fmt ? fmt(d.v) : d.v}</span></div>`).join('');
  }
  function donut(parts) {
    const tot = parts.reduce((s, p) => s + p.v, 0) || 1; let acc = 0;
    const grad = parts.map(p => { const a = acc; acc += p.v / tot * 360; return `${p.c} ${a}deg ${acc}deg`; }).join(',');
    return `<div class="row" style="gap:18px"><div class="donut" style="background:conic-gradient(${grad})"></div><div class="legend">${parts.map(p => `<div><i style="background:${p.c}"></i>${p.l}: <b>${p.f || p.v}</b> (${Math.round(p.v / tot * 100)}%)</div>`).join('')}</div></div>`;
  }
  const kpi = (l, v, s) => `<div class="kpi"><div class="l">${l}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;

  // ---------- dashboard ----------
  function dash() {
    const all = S().orders; const today = all.filter(o => isToday(o.created)); const f = fin(today);
    const yest = all.filter(o => isToday(o.created + DAY) && o.created <= Date.now() - DAY); const fy = fin(yest);
    const live = all.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
    const dtimes = f.d.map(o => o.deliveredAt - o.created);
    const days = []; for (let i = 13; i >= 0; i--) { const s0 = startOfDay(Date.now()) - i * DAY; const L = all.filter(o => o.created >= s0 && o.created < s0 + DAY && o.status === 'DELIVERED'); days.push({ l: new Date(s0).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), v: Math.round(L.reduce((s, o) => s + o.total, 0)), c: i === 0 ? 'var(--y)' : '' }); }
    const hours = []; for (let h = 6; h <= 23; h++) hours.push({ l: h, v: today.filter(o => new Date(o.created).getHours() === h).length });
    const catSales = {}; delivered(all.filter(o => inRange(o, '7'))).forEach(o => o.items.forEach(i => { const c = QM.product(i.pid)?.cat; catSales[c] = (catSales[c] || 0) + i.price * i.qty; }));
    const cats = Object.entries(catSales).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, v]) => { const cc = S().categories.find(x => x.id === c); return { l: cc ? cc.emoji + ' ' + cc.name : c, v }; });
    const prod = {}; delivered(all.filter(o => inRange(o, '7'))).forEach(o => o.items.forEach(i => { prod[i.pid] = prod[i.pid] || { n: i.name, e: i.emoji, q: 0, v: 0 }; prod[i.pid].q += i.qty; prod[i.pid].v += i.qty * i.price; }));
    const top = Object.values(prod).sort((a, b) => b.q - a.q).slice(0, 8);
    const low = S().products.filter(p => QM.avail(p) <= p.reorder).length, oos = S().products.filter(p => !QM.avail(p)).length;
    const lim = Date.now() + S().settings.expiryAlertDays * DAY; let exp = 0, expd = 0; S().products.forEach(p => p.batches.forEach(b => { if (b.qty > 0 && b.exp) { if (b.exp < Date.now()) expd++; else if (b.exp < lim) exp++; } }));
    const pend = all.filter(o => o.refundRequest && o.refundRequest.status === 'PENDING');
    const delta = (a, b) => b ? `<span class="${a >= b ? 'green' : 'redt'}">${a >= b ? '▲' : '▼'} ${Math.abs(Math.round((a - b) / b * 100))}%</span> vs yesterday` : '';
    return `
      <div class="row between wrap"><div><h2>Dashboard</h2><div class="mut small">${esc(S().settings.shopName)} · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
      <div class="row"><span class="pill ${QM.isOpen() ? 'g' : 'r'}">● Store ${QM.isOpen() ? 'open' : 'closed'}</span><span class="pill">${S().riders.filter(r => r.online).length}/${S().riders.length} riders online</span></div></div>
      <div class="kpis">
        ${kpi("Today's orders", today.length, `${f.d.length} delivered · ${today.filter(o => o.status === 'CANCELLED').length} cancelled`)}
        ${kpi("Today's sales", inr0(f.gmv), delta(f.gmv, fy.gmv))}
        ${kpi('Avg order value', inr0(f.aov), `${f.d.length} delivered orders`)}
        ${kpi('Avg delivery time', dtimes.length ? mins(avg(dtimes)) : '-', 'order placed → delivered')}
        ${kpi('Live orders', live.length, `${live.filter(o => o.status === 'PLACED').length} new · ${live.filter(o => o.status === 'PICKED_UP').length} on the way`)}
        ${kpi('Gross profit today', inr0(f.gp), f.netEx ? Math.round(f.gp / f.netEx * 100) + '% margin (ex-GST)' : '')}
      </div>
      ${pend.length ? `<div class="card mb12" style="background:var(--orgl)">⚠️ <b>${pend.length} refund request(s)</b> waiting for approval. <a href="javascript:A.go('orders')">Review →</a></div>` : ''}
      <div class="grid3">
        <div class="card"><div class="row between"><div class="b">Sales – last 14 days</div><span class="small mut">Delivered order value</span></div>${bars(days, inr0)}</div>
        <div class="card"><div class="b mb12">Payment mode (today)</div>${donut([{ l: 'Online (UPI/Card/NB)', v: f.onlineAmt, c: '#0c831f', f: inr0(f.onlineAmt) }, { l: 'Cash on Delivery', v: f.codAmt, c: '#f8cb46', f: inr0(f.codAmt) }])}
          <div class="hr"></div><div class="small">Refunds today: <b class="redt">${inr(f.allRefunds)}</b></div></div>
      </div>
      <div class="grid2 mt16">
        <div class="card"><div class="b mb8">Top categories (7 days)</div>${hbars(cats, inr0)}</div>
        <div class="card"><div class="b mb8">Best selling products (7 days)</div><table class="t"><tbody>${top.map(t => `<tr><td>${t.e} ${esc(t.n)}</td><td class="num">${t.q} units</td><td class="num b">${inr0(t.v)}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="grid2 mt16">
        <div class="card"><div class="b mb8">Orders by hour (today)</div>${bars(hours)}</div>
        <div class="card"><div class="b mb8">Inventory alerts</div>
          <div class="kpis" style="margin:0;grid-template-columns:1fr 1fr">
            <div class="kpi" style="cursor:pointer" onclick="A.go('inventory')"><div class="l">Low stock SKUs</div><div class="v orgt">${low}</div><div class="s">${oos} out of stock</div></div>
            <div class="kpi" style="cursor:pointer" onclick="A.go('expiry')"><div class="l">Expiring ≤ ${S().settings.expiryAlertDays} days</div><div class="v orgt">${exp}</div><div class="s"><span class="redt">${expd} batches expired</span></div></div>
          </div></div>
      </div>
      <div class="card mt16"><div class="row between mb8"><div class="b">Live orders</div><a href="javascript:A.go('orders')" class="small b">All orders →</a></div>${ordersTable(live.slice().reverse())}</div>`;
  }

  function ordersTable(list) {
    if (!list.length) return '<div class="small mut" style="padding:10px">No orders</div>';
    return `<div class="tbl-wrap" style="box-shadow:none"><table class="t"><thead><tr><th>Order</th><th>Time</th><th>Customer</th><th class="num">Items</th><th class="num">Amount</th><th>Payment</th><th>Status</th><th>Rider</th></tr></thead><tbody>${list.map(o => `<tr style="cursor:pointer" onclick="A.order('${o.id}')"><td class="b">${o.id}</td><td class="small">${isToday(o.created) ? time(o.created) : dt(o.created)}</td><td class="small">${esc(o.customer.name)}<div class="tiny mut">${esc(o.address.loc)}</div></td><td class="num">${o.items.length}</td><td class="num b">${inr(o.total)}</td><td>${payPill(o)}</td><td>${statusPill(o.status)}${o.refundRequest?.status === 'PENDING' ? ' <span class="pill o">Refund req.</span>' : ''}</td><td class="small">${o.riderId ? esc(QM.rider(o.riderId).name) : '-'}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function orders() {
    let list = S().orders.filter(o => inRange(o, st.orange));
    if (st.ostatus !== 'ALL') list = list.filter(o => st.ostatus === 'LIVE' ? !['DELIVERED', 'CANCELLED'].includes(o.status) : st.ostatus === 'REFUND' ? (o.refundRequest || o.refundTotal) : o.status === st.ostatus);
    const q = st.oq.trim().toLowerCase(); if (q) list = list.filter(o => (o.id + ' ' + o.customer.name + ' ' + o.customer.phone).toLowerCase().includes(q));
    list = list.slice().reverse();
    const pend = S().orders.filter(o => o.refundRequest && o.refundRequest.status === 'PENDING');
    return `<h2>Orders</h2>
      ${pend.length ? `<div class="card mt12" style="background:var(--orgl)"><div class="b mb8">Pending refund requests</div>${pend.map(o => `<div class="row between wrap" style="padding:6px 0;border-bottom:1px solid #f3dcb4"><div class="small"><b>${o.id}</b> · ${esc(o.customer.name)} · ${esc(o.refundRequest.reason)} · ${ago(o.refundRequest.t)}</div><div class="row"><button class="btn sm red" onclick="A.refund('${o.id}',false)">Reject</button><button class="btn sm" onclick="A.refund('${o.id}',true)">Approve refund</button></div></div>`).join('')}</div>` : ''}
      <div class="toolbar"><input class="inp" placeholder="Search order id / customer / phone" value="${esc(st.oq)}" oninput="A.set({oq:this.value},'oq')" id="oq">
        <select class="inp" onchange="A.set({orange:this.value})">${[['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['all', 'All time']].map(([v, l]) => `<option value="${v}" ${st.orange === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select class="inp" onchange="A.set({ostatus:this.value})">${[['ALL', 'All statuses'], ['LIVE', 'Live (in progress)'], ['DELIVERED', 'Delivered'], ['CANCELLED', 'Cancelled'], ['REFUND', 'With refunds']].map(([v, l]) => `<option value="${v}" ${st.ostatus === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <span class="small mut">${list.length} orders</span><button class="btn sm ghost" style="margin-left:auto" onclick="A.exportOrders()">⬇ Export CSV</button></div>
      <div class="card" style="padding:0">${ordersTable(list.slice(0, 300))}</div>`;
  }

  function orderModal(id) {
    const o = QM.order(id); const r = o.riderId ? QM.rider(o.riderId) : null;
    modal('Order ' + o.id, `
      <div class="row wrap">${statusPill(o.status)} ${payPill(o)} ${o.coupon ? `<span class="pill p">${o.coupon}</span>` : ''}</div>
      <div class="grid2 mt12" style="gap:12px"><div class="small"><b>Customer</b><br>${esc(o.customer.name)} · ${o.customer.phone}<br>${esc(o.address.line)} (${o.address.km} km)</div>
      <div class="small"><b>Rider</b><br>${r ? esc(r.name) + ' · ' + r.phone : '-'}<br><b>OTPs</b> pickup ${o.pickupOtp} · delivery ${o.deliveryOtp}</div></div>
      <table class="t mt12"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Cost</th><th class="num">Margin</th></tr></thead><tbody>${o.items.map(i => `<tr><td class="small">${i.emoji} ${esc(i.name)}${i.shortQty ? ` <span class="pill r">${i.shortQty} OOS</span>` : ''}</td><td class="num">${i.qty}</td><td class="num">${inr(i.price)}</td><td class="num">${inr(i.cost)}</td><td class="num">${inr((i.price - i.cost) * i.qty)}</td></tr>`).join('')}</tbody></table>
      <div class="grid2 mt12" style="gap:12px">
        <div class="small"><b>Timeline</b>${o.timeline.map(t => `<div>${time(t.t)} · ${UI.STATUS[t.s] ? UI.STATUS[t.s][0] : t.s}</div>`).join('')}</div>
        <div class="small"><div class="bill-row"><span>Items</span><span>${inr(o.itemTotal)}</span></div><div class="bill-row"><span>Delivery + handling</span><span>${inr(o.deliveryCharge + o.handlingFee)}</span></div><div class="bill-row"><span>Coupon</span><span>-${inr(o.couponDisc)}</span></div><div class="bill-row b"><span>Total</span><span>${inr(o.total)}</span></div>${o.refunds.map(x => `<div class="bill-row redt"><span>Refund · ${esc(x.reason)}</span><span>${inr(x.amt)}</span></div>`).join('')}${o.rating ? `<div>Rating: ${'★'.repeat(o.rating)}</div>` : ''}</div>
      </div>
      <div class="row wrap mt16"><button class="btn ghost" onclick="A.invoice('${o.id}')">🧾 Invoice</button>${!['DELIVERED', 'CANCELLED'].includes(o.status) ? `<button class="btn red" onclick="A.cancelOrder('${o.id}')">Cancel & refund</button>` : ''}${o.refundRequest?.status === 'PENDING' ? `<button class="btn" onclick="A.refund('${o.id}',true)">Approve refund</button>` : ''}</div>`, { wide: true });
  }

  // ---------- catalog ----------
  function catalog() {
    let list = S().products;
    if (st.ccat !== 'ALL') list = list.filter(p => p.cat === st.ccat);
    if (st.cstock === 'LOW') list = list.filter(p => QM.avail(p) <= p.reorder && QM.avail(p) > 0); else if (st.cstock === 'OOS') list = list.filter(p => !QM.avail(p)); else if (st.cstock === 'INACTIVE') list = list.filter(p => !p.active);
    const q = st.cq.trim().toLowerCase(); if (q) list = list.filter(p => (p.name + ' ' + p.barcode + ' ' + p.id + ' ' + p.brand).toLowerCase().includes(q));
    const per = 50, pages = Math.max(1, Math.ceil(list.length / per)); st.cpage = Math.min(st.cpage, pages - 1);
    const slice = list.slice(st.cpage * per, st.cpage * per + per);
    return `<div class="row between wrap"><div><h2>Catalog</h2><div class="mut small">${S().products.length} products in ${S().categories.length} categories · 1 store</div></div>
      <div class="row wrap"><button class="btn sm ghost" onclick="A.exportProducts()">⬇ Export CSV</button><label class="btn sm ghost" style="margin:0">⬆ Bulk upload CSV<input type="file" accept=".csv" class="hidden" onchange="A.importCSV(this)"></label><button class="btn sm" onclick="A.editProduct()">+ Add product</button></div></div>
      <div class="toolbar"><input id="cq" class="inp" placeholder="Search name / barcode / ID / brand" value="${esc(st.cq)}" oninput="A.set({cq:this.value,cpage:0},'cq')">
        <select class="inp" onchange="A.set({ccat:this.value,cpage:0})"><option value="ALL">All categories</option>${S().categories.map(c => `<option value="${c.id}" ${st.ccat === c.id ? 'selected' : ''}>${c.emoji} ${esc(c.name)}</option>`).join('')}</select>
        <select class="inp" onchange="A.set({cstock:this.value,cpage:0})">${[['ALL', 'All stock'], ['LOW', 'Low stock'], ['OOS', 'Out of stock'], ['INACTIVE', 'Inactive']].map(([v, l]) => `<option value="${v}" ${st.cstock === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <span class="small mut">${list.length} results</span></div>
      <div class="tbl-wrap"><table class="t"><thead><tr><th>ID</th><th>Product</th><th>Category</th><th>Barcode</th><th>Rack</th><th class="num">MRP</th><th class="num">Price</th><th class="num">Cost</th><th class="num">Margin</th><th class="num">Stock</th><th>Status</th><th></th></tr></thead><tbody>
      ${slice.map(p => { const a = QM.avail(p); const c = S().categories.find(x => x.id === p.cat); return `<tr><td class="small mut">${p.id}</td><td>${p.emoji} <b class="small">${esc(p.name)}</b><div class="tiny mut">${esc(p.unit)} · ${esc(p.brand)}${p.best ? ' · ⭐ bestseller' : ''}</div></td><td class="small">${c ? esc(c.name) : p.cat}<div class="tiny mut">${esc(p.sub)}</div></td><td class="small" style="font-family:monospace">${p.barcode}</td><td class="small">${p.rack}</td><td class="num">${inr(p.mrp)}</td><td class="num b">${inr(p.price)}</td><td class="num">${inr(p.cost)}</td><td class="num">${Math.round((p.price - p.cost) / p.price * 100)}%</td><td class="num b ${!a ? 'redt' : a <= p.reorder ? 'orgt' : ''}">${a}</td><td>${p.active ? '<span class="pill g">Active</span>' : '<span class="pill">Hidden</span>'}</td><td><button class="btn sm ghost" onclick="A.editProduct('${p.id}')">Edit</button></td></tr>`; }).join('')}
      </tbody></table><div class="pager"><span class="small mut">Page ${st.cpage + 1} of ${pages}</span><button class="btn sm ghost" ${st.cpage ? '' : 'disabled'} onclick="A.set({cpage:${st.cpage - 1}})">‹ Prev</button><button class="btn sm ghost" ${st.cpage < pages - 1 ? '' : 'disabled'} onclick="A.set({cpage:${st.cpage + 1}})">Next ›</button></div></div>`;
  }

  // ---------- inventory ----------
  function inventory() {
    const P = S().products;
    const units = P.reduce((s, p) => s + QM.avail(p), 0);
    const val = P.reduce((s, p) => s + p.batches.reduce((a, b) => a + (QM.isExpired(b) ? 0 : b.qty * (b.cost || p.cost)), 0), 0);
    const rv = P.reduce((s, p) => s + QM.avail(p) * p.price, 0);
    const low = P.filter(p => QM.avail(p) <= p.reorder && QM.avail(p) > 0), oos = P.filter(p => !QM.avail(p));
    const byCat = S().categories.map(c => ({ l: c.emoji + ' ' + c.name, v: P.filter(p => p.cat === c.id).reduce((s, p) => s + QM.avail(p) * p.cost, 0) })).sort((a, b) => b.v - a.v);
    const log = S().stockLog.slice(0, 30);
    return `<h2>Inventory</h2><div class="mut small">Batch-wise stock with FEFO (first-expiry-first-out) allocation.</div>
      <div class="kpis">${kpi('Total SKUs', P.length, P.filter(p => p.active).length + ' active')}${kpi('Units in stock', units.toLocaleString('en-IN'), 'sellable (non-expired)')}${kpi('Stock value (cost)', inr0(val), 'retail value ' + inr0(rv))}${kpi('Low stock', `<span class="orgt">${low.length}</span>`, 'at or below reorder level')}${kpi('Out of stock', `<span class="redt">${oos.length}</span>`, 'need purchase')}</div>
      <div class="grid2">
        <div class="card"><div class="b mb8">Stock value by category</div>${hbars(byCat, inr0)}</div>
        <div class="card"><div class="row between mb8"><div class="b">Reorder list (low & out of stock)</div><button class="btn sm ghost" onclick="A.exportReorder()">⬇ Purchase list CSV</button></div><div style="max-height:360px;overflow:auto"><table class="t"><thead><tr><th>Product</th><th class="num">Stock</th><th class="num">Suggested qty</th></tr></thead><tbody>${[...oos, ...low].slice(0, 80).map(p => `<tr><td class="small">${p.emoji} ${esc(p.name)} <span class="tiny mut">${esc(p.unit)}</span></td><td class="num b ${QM.avail(p) ? 'orgt' : 'redt'}">${QM.avail(p)}</td><td class="num">${Math.max(12, p.reorder * 3 - QM.avail(p))}</td></tr>`).join('')}</tbody></table></div></div>
      </div>
      <div class="card mt16"><div class="b mb8">Stock movement log (latest)</div>${log.length ? `<table class="t"><thead><tr><th>Time</th><th>Type</th><th>Product</th><th class="num">Qty</th><th>Note</th></tr></thead><tbody>${log.map(l => `<tr><td class="small">${dt(l.t)}</td><td><span class="pill ${l.type === 'GRN' ? 'g' : l.type === 'SALE' ? 'b' : l.type === 'RETURN' ? 'p' : 'r'}">${l.type}</span></td><td class="small">${esc(l.name)}</td><td class="num b">${l.qty > 0 ? '+' : ''}${l.qty}</td><td class="small mut">${esc(l.note)} ${esc(l.batch)}</td></tr>`).join('')}</tbody></table>` : '<div class="small mut">Stock movements (sales, GRN, adjustments) will appear here as you use the demo.</div>'}</div>`;
  }

  function expiry() {
    const days = S().settings.expiryAlertDays; const lim = Date.now() + days * DAY; const lim30 = Date.now() + 30 * DAY;
    const rows = []; S().products.forEach(p => p.batches.forEach(b => { if (b.qty > 0 && b.exp && b.exp < lim30) rows.push({ p, b }); }));
    rows.sort((a, b) => a.b.exp - b.b.exp);
    const ex = rows.filter(r => r.b.exp < Date.now()), soon = rows.filter(r => r.b.exp >= Date.now() && r.b.exp < lim), m = rows.filter(r => r.b.exp >= lim);
    const loss = ex.reduce((s, r) => s + r.b.qty * (r.b.cost || r.p.cost), 0);
    return `<h2>Expiry management</h2>
      <div class="kpis">${kpi('Expired batches', `<span class="redt">${ex.length}</span>`, 'value at cost ' + inr0(loss))}${kpi(`Expiring ≤ ${days} days`, `<span class="orgt">${soon.length}</span>`, 'push offers / return to supplier')}${kpi('Expiring in 30 days', m.length, 'plan ahead')}</div>
      <div class="row mb12"><button class="btn red sm" onclick="A.writeOff()">🗑️ Write-off all expired stock</button><span class="small mut">Expired stock is automatically blocked from sale (FEFO skips it).</span></div>
      <div class="tbl-wrap"><table class="t"><thead><tr><th>Product</th><th>Batch</th><th>Rack</th><th class="num">Qty</th><th>Expiry</th><th class="num">Value (cost)</th></tr></thead><tbody>${rows.map(({ p, b }) => `<tr><td class="small">${p.emoji} ${esc(p.name)} <span class="tiny mut">${esc(p.unit)}</span></td><td class="small">${b.batch}</td><td class="small">${p.rack}</td><td class="num b">${b.qty}</td><td>${b.exp < Date.now() ? '<span class="pill r">Expired ' + UI.date(b.exp) + '</span>' : b.exp < lim ? '<span class="pill o">' + UI.date(b.exp) + '</span>' : '<span class="pill">' + UI.date(b.exp) + '</span>'}</td><td class="num">${inr(b.qty * (b.cost || p.cost))}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function purchase() {
    const g = S().grns;
    return `<div class="row between wrap"><div><h2>Purchases (GRN)</h2><div class="mut small">Goods received notes entered from the Warehouse app.</div></div><a class="btn sm" href="#/warehouse" onclick="setTimeout(()=>W.go('grn'),50)">+ New stock-in (Warehouse app)</a></div>
      <div class="kpis">${kpi('GRNs', g.length)}${kpi('Units received', g.reduce((s, x) => s + x.qty, 0))}${kpi('Purchase value', inr0(g.reduce((s, x) => s + x.qty * x.cost, 0)))}</div>
      ${g.length ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>GRN</th><th>Date</th><th>Supplier</th><th>Invoice</th><th>Product</th><th>Batch</th><th>Expiry</th><th class="num">Qty</th><th class="num">Cost</th><th class="num">Value</th></tr></thead><tbody>${g.map(x => `<tr><td class="b">${x.id}</td><td class="small">${dt(x.t)}</td><td class="small">${esc(x.supplier)}</td><td class="small">${esc(x.invoice)}</td><td class="small">${esc(x.name)}</td><td class="small">${esc(x.batch)}</td><td class="small">${x.exp ? UI.date(x.exp) : '-'}</td><td class="num">${x.qty}</td><td class="num">${inr(x.cost)}</td><td class="num b">${inr(x.qty * x.cost)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty"><div class="e">📥</div>No purchases recorded yet in this demo session.</div>'}`;
  }

  // ---------- riders ----------
  function riders() {
    const all = S().orders;
    return `<div class="row between wrap"><div><h2>Riders</h2><div class="mut small">Performance, live status and COD cash settlement.</div></div><button class="btn sm" onclick="A.addRider()">+ Add rider</button></div>
      <div class="tbl-wrap mt12"><table class="t"><thead><tr><th>Rider</th><th>Status</th><th class="num">Active</th><th class="num">Today</th><th class="num">Last 7 days</th><th class="num">Avg ride time</th><th class="num">Rating</th><th class="num">COD in hand</th><th></th></tr></thead><tbody>
      ${S().riders.map(r => { const d = all.filter(o => o.riderId === r.id && o.status === 'DELIVERED'); const t = d.filter(o => isToday(o.deliveredAt)); const w = d.filter(o => o.deliveredAt >= startOfDay(Date.now()) - 6 * DAY); const rt = avg(w.map(o => o.deliveredAt - o.pickedUpAt)); const rated = d.filter(o => o.rating); return `<tr><td><b>${esc(r.name)}</b><div class="tiny mut">${r.phone} · ${esc(r.vehicle)}</div></td><td>${r.online ? '<span class="pill g">● Online</span>' : '<span class="pill">Offline</span>'}</td><td class="num">${QM.riderLoad(r.id)}</td><td class="num b">${t.length}</td><td class="num">${w.length}</td><td class="num">${mins(rt)}</td><td class="num">⭐ ${rated.length ? avg(rated.map(o => o.rating)).toFixed(1) : r.rating}</td><td class="num b orgt">${inr(r.cash)}</td><td>${r.cash > 0 ? `<button class="btn sm" onclick="A.settle('${r.id}')">Settle cash</button>` : ''}</td></tr>`; }).join('')}
      </tbody></table></div>
      <div class="card mt16"><div class="b mb8">Deliveries per rider (last 7 days)</div>${hbars(S().riders.map(r => ({ l: r.name, v: all.filter(o => o.riderId === r.id && o.status === 'DELIVERED' && o.deliveredAt >= startOfDay(Date.now()) - 6 * DAY).length })))}</div>`;
  }

  function wh() {
    const all = S().orders; const days = [];
    for (let i = 6; i >= 0; i--) {
      const s0 = startOfDay(Date.now()) - i * DAY; const L = all.filter(o => o.created >= s0 && o.created < s0 + DAY && o.packEnd);
      const pick = avg(L.map(o => o.pickEnd - o.pickStart)), pack = avg(L.map(o => o.packEnd - o.pickEnd)), wait = avg(L.filter(o => o.pickedUpAt).map(o => o.pickedUpAt - o.packEnd));
      const acc = L.length ? L.filter(o => !o.scanErrors && !o.items.some(x => x.shortQty)).length / L.length * 100 : 0;
      days.push({ d: new Date(s0).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }), n: L.length, pick, pack, wait, acc, total: avg(L.filter(o => o.deliveredAt).map(o => o.deliveredAt - o.created)) });
    }
    const w = all.filter(o => o.created >= startOfDay(Date.now()) - 6 * DAY && o.packEnd);
    const accAll = w.length ? w.filter(o => !o.scanErrors && !o.items.some(x => x.shortQty)).length / w.length * 100 : 0;
    const oosCount = w.reduce((s, o) => s + o.items.filter(x => x.shortQty).length, 0);
    return `<h2>Warehouse performance</h2><div class="mut small">Measured automatically from scan & status timestamps (last 7 days).</div>
      <div class="kpis">${kpi('Avg picking time', mins(avg(w.map(o => o.pickEnd - o.pickStart))))}${kpi('Avg packing time', mins(avg(w.map(o => o.packEnd - o.pickEnd))))}${kpi('Order → ready', mins(avg(w.map(o => o.packEnd - o.created))), 'target < 4 min')}${kpi('Order accuracy', accAll.toFixed(1) + '%', 'no scan errors & no OOS')}${kpi('Items marked OOS', oosCount, 'during picking')}</div>
      <div class="grid2"><div class="card"><div class="b mb8">Orders packed per day</div>${bars(days.map(d => ({ l: d.d.split(',')[0], v: d.n })))}</div>
      <div class="card"><div class="b mb8">Accuracy % per day</div>${bars(days.map(d => ({ l: d.d.split(',')[0], v: Math.round(d.acc) })), v => v + '%')}</div></div>
      <div class="tbl-wrap mt16"><table class="t"><thead><tr><th>Day</th><th class="num">Orders</th><th class="num">Pick</th><th class="num">Pack</th><th class="num">Rider wait</th><th class="num">Placed → delivered</th><th class="num">Accuracy</th></tr></thead><tbody>${days.slice().reverse().map(d => `<tr><td>${d.d}</td><td class="num">${d.n}</td><td class="num">${mins(d.pick)}</td><td class="num">${mins(d.pack)}</td><td class="num">${mins(d.wait)}</td><td class="num b">${mins(d.total)}</td><td class="num">${d.acc.toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ---------- finance ----------
  function finance() {
    const list = S().orders.filter(o => inRange(o, st.frange)); const f = fin(list);
    const slabs = {}; f.d.forEach(o => o.items.forEach(i => { const v = i.price * i.qty; const tax = v * i.gst / (100 + i.gst); slabs[i.gst] = slabs[i.gst] || { taxable: 0, tax: 0 }; slabs[i.gst].taxable += v - tax; slabs[i.gst].tax += tax; }));
    const nDays = st.frange === 'today' ? 1 : st.frange === 'all' ? 14 : Number(st.frange);
    const daily = []; for (let i = Math.min(nDays, 14) - 1; i >= 0; i--) { const s0 = startOfDay(Date.now()) - i * DAY; const ff = fin(S().orders.filter(o => o.created >= s0 && o.created < s0 + DAY)); daily.push({ ...ff, day: new Date(s0).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) }); }
    return `<div class="row between wrap"><div><h2>Finance & profit</h2><div class="mut small">Profit = selling price − purchase price (batch cost). All figures from delivered orders.</div></div>
      <div class="row"><select class="inp" style="width:auto" onchange="A.set({frange:this.value})">${[['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['all', 'All time']].map(([v, l]) => `<option value="${v}" ${st.frange === v ? 'selected' : ''}>${l}</option>`).join('')}</select><button class="btn sm ghost" onclick="A.exportFinance()">⬇ Export</button></div></div>
      <div class="kpis">${kpi('Gross sales (GMV)', inr0(f.gmv), f.d.length + ' delivered orders')}${kpi('Refunds', `<span class="redt">${inr0(f.allRefunds)}</span>`, 'incl. cancellations & OOS')}${kpi('GST collected', inr0(f.gst), 'output tax')}${kpi('Cost of goods', inr0(f.c))}${kpi('Gross profit', `<span class="green">${inr0(f.gp)}</span>`, f.netEx ? (f.gp / f.netEx * 100).toFixed(1) + '% margin' : '')}${kpi('Contribution', inr0(f.contrib), 'after rider pay & PG fees')}</div>
      <div class="grid2">
        <div class="card"><div class="b mb8">Profit & loss summary</div>
          ${[['Gross sales (incl. GST, fees)', f.gmv], ['Less: customer refunds (claims)', -f.cl], ['Net sales', f.net], ['Less: GST payable', -f.gst], ['Net sales (ex-GST)', f.netEx], ['Less: cost of goods sold', -f.c], ['Gross profit', f.gp], ['Less: rider payouts', -f.rider], ['Less: payment gateway fees (~2%)', -f.pg], ['Contribution margin', f.contrib]].map(([l, v], i) => `<div class="bill-row ${[2, 4, 6, 9].includes(i) ? 'b' : ''}" ${[2, 6, 9].includes(i) ? 'style="border-top:1px solid var(--line);padding-top:6px"' : ''}><span>${l}</span><span class="${v < 0 ? 'redt' : ''}">${inr(v)}</span></div>`).join('')}
          <div class="hr"></div><div class="small mut">Included in sales: delivery & handling fees ${inr(f.fees)} · coupon discounts given ${inr(f.disc)}</div></div>
        <div class="card"><div class="b mb12">COD vs online</div>${donut([{ l: 'Online', v: f.onlineAmt, c: '#0c831f', f: inr0(f.onlineAmt) }, { l: 'COD', v: f.codAmt, c: '#f8cb46', f: inr0(f.codAmt) }])}
          <div class="small mt12">Online orders: <b>${f.online.length}</b> · COD orders: <b>${f.cod.length}</b><br>COD cash with riders (not yet settled): <b class="orgt">${inr(S().riders.reduce((s, r) => s + r.cash, 0))}</b></div>
          <div class="hr"></div><div class="b mb8">GST report (by slab)</div><table class="t"><thead><tr><th>GST rate</th><th class="num">Taxable value</th><th class="num">GST</th></tr></thead><tbody>${Object.entries(slabs).sort((a, b) => a[0] - b[0]).map(([r, v]) => `<tr><td>${r}%</td><td class="num">${inr(v.taxable)}</td><td class="num">${inr(v.tax)}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="card mt16"><div class="b mb8">Daily sales & profit</div>${bars(daily.map(d => ({ l: d.day, v: Math.round(d.gp) })), inr0)}<div class="tbl-wrap mt12" style="box-shadow:none"><table class="t"><thead><tr><th>Date</th><th class="num">Orders</th><th class="num">Sales</th><th class="num">COGS</th><th class="num">Gross profit</th><th class="num">Online</th><th class="num">COD</th><th class="num">Refunds</th></tr></thead><tbody>${daily.slice().reverse().map(d => `<tr><td>${d.day}</td><td class="num">${d.online.length + d.cod.length}</td><td class="num">${inr0(d.gmv)}</td><td class="num">${inr0(d.c)}</td><td class="num b green">${inr0(d.gp)}</td><td class="num">${inr0(d.onlineAmt)}</td><td class="num">${inr0(d.codAmt)}</td><td class="num redt">${inr0(d.allRefunds)}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  // ---------- marketing ----------
  function marketing() {
    return `<h2>Marketing</h2>
      <div class="grid2 mt12">
        <div class="card"><div class="row between mb8"><div class="b">🎟️ Coupons</div><button class="btn sm" onclick="A.addCoupon()">+ New coupon</button></div>
          ${S().coupons.map((c, i) => { const used = S().orders.filter(o => o.coupon === c.code).length; return `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><div><b>${c.code}</b> <span class="pill">${c.type === 'flat' ? '₹' + c.value + ' off' : c.type === 'pct' ? c.value + '% off' : 'Free delivery'}</span><div class="small mut">${esc(c.desc)} · used ${used}×</div></div><button class="sw ${c.active ? 'on' : ''}" onclick="A.toggleCoupon(${i})"></button></div>`; }).join('')}
        </div>
        <div class="card"><div class="row between mb8"><div class="b">🖼️ Home banners</div><button class="btn sm" onclick="A.addBanner()">+ New banner</button></div>
          ${S().banners.map((b, i) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="row"><span style="width:18px;height:18px;border-radius:5px;background:${b.color};display:inline-block"></span><div><b class="small">${esc(b.title)}</b><div class="tiny mut">${esc(b.sub)}</div></div></div><button class="sw ${b.active ? 'on' : ''}" onclick="A.toggleBanner(${i})"></button></div>`).join('')}
        </div>
      </div>
      <div class="card mt16"><div class="b mb8">🔔 Send push notification to all customers</div>
        <div class="row wrap"><input id="pn" class="inp grow" placeholder="e.g. Weekend sale! Flat 10% off with SAVE10 🎉"><button class="btn" onclick="A.push()">Send</button></div>
        <div class="tiny mut mt8">In the live app this is sent via Firebase Cloud Messaging. In the demo it appears in Customer app → Account → Notifications.</div></div>`;
  }

  function settings() {
    const s = S().settings;
    const f = (k, l, t = 'text', extra = '') => `<div><label class="f">${l}</label><input class="inp" id="s-${k}" type="${t}" value="${esc(s[k])}" ${extra}></div>`;
    return `<h2>Settings</h2><div class="mut small">Store configuration — changes apply instantly in all apps.</div>
      <div class="card mt12"><div class="b">🏪 Store</div><div class="grid2" style="gap:0 14px">${f('shopName', 'Store name')}${f('shopAddress', 'Address')}${f('gstin', 'GSTIN')}${f('fssai', 'FSSAI licence no.')}${f('openTime', 'Opening time', 'time')}${f('closeTime', 'Closing time', 'time')}</div></div>
      <div class="card mt12"><div class="b">🚚 Delivery & charges</div><div class="grid2" style="gap:0 14px">${f('radiusKm', 'Delivery radius (km)', 'number', 'step="0.5"')}${f('deliveryMins', 'Promised delivery time (minutes)', 'number')}${f('minOrder', 'Minimum order value (₹)', 'number')}${f('deliveryCharge', 'Delivery charge (₹)', 'number')}${f('freeDeliveryAbove', 'Free delivery above (₹)', 'number')}${f('handlingFee', 'Handling fee (₹)', 'number')}${f('riderPayPerOrder', 'Rider pay per delivery (₹)', 'number')}${f('expiryAlertDays', 'Expiry alert (days before)', 'number')}</div>
        <div class="row mt12" style="gap:20px"><label class="row small b"><input type="checkbox" id="s-codEnabled" ${s.codEnabled ? 'checked' : ''}> Cash on Delivery enabled</label><label class="row small b"><input type="checkbox" id="s-autoAssignRider" ${s.autoAssignRider ? 'checked' : ''}> Auto-assign rider when order is ready</label></div></div>
      <div class="row mt16"><button class="btn" onclick="A.saveSettings()">💾 Save settings</button></div>
      <div class="card mt16"><div class="b">👥 Staff users & roles (demo)</div><table class="t mt8"><tbody><tr><td>Owner / Admin</td><td>Full access</td></tr><tr><td>Store manager</td><td>Orders, inventory, riders</td></tr><tr><td>Picker / packer</td><td>Warehouse app only</td></tr><tr><td>Rider</td><td>Rider app only</td></tr></tbody></table></div>
      <div class="card mt16" style="border:1px solid var(--redl)"><div class="b redt">Reset demo data</div><div class="small mut mb8">Restores the original 1000 products, riders and sample order history. All orders placed in this browser will be removed.</div><button class="btn red" onclick="A.reset()">Reset demo</button></div>`;
  }

  function render() {
    if (!root) return;
    const map = { dash, orders, catalog, inventory, expiry, purchase, riders, wh, finance, marketing, settings };
    const focus = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : null;
    const sc = window.scrollY;
    root.innerHTML = `<div class="app">${side()}<div class="main">${(map[st.sec] || dash)()}</div></div>`;
    window.scrollTo(0, sc);
    if (focus) { const el = document.getElementById(focus); if (el) { el.focus(); if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); } }
  }

  const A = window.A = {
    mount(el) { root = el; render(); },
    render,
    onData() { if (!root || UI.modalOpen() || ['settings', 'marketing'].includes(st.sec)) return; render(); },
    go(sec) { st.sec = sec; window.scrollTo(0, 0); render(); },
    set(p) { Object.assign(st, p); render(); },
    order: orderModal,
    invoice(id) { modal('Invoice', invoiceHTML(QM.order(id)), { wide: true }); },
    cancelOrder(id) { QM.cancelOrder(id, 'admin', 'Cancelled by admin'); closeModal(); toast('Order cancelled & refund processed', 'ok'); render(); },
    refund(id, ok) { QM.processRefundRequest(id, ok); closeModal(); toast(ok ? 'Refund approved' : 'Refund rejected', ok ? 'ok' : ''); render(); },
    settle(rid) { const amt = QM.settleCash(rid); toast(`${inr(amt)} COD cash settled`, 'ok'); render(); },
    writeOff() { const n = QM.writeOffExpired(); toast(n ? n + ' expired units written off' : 'No expired stock', 'ok'); render(); },
    editProduct(id) {
      const p = id ? QM.product(id) : { name: '', brand: '', cat: S().categories[0].id, sub: '', unit: '', mrp: '', price: '', cost: '', gst: 5, rack: '', barcode: '', reorder: 10, active: true, best: false };
      const f = (k, l, t = 'text') => `<div><label class="f">${l}</label><input class="inp" id="p-${k}" type="${t}" value="${esc(p[k])}" ${t === 'number' ? 'step="0.01"' : ''}></div>`;
      modal(id ? 'Edit product ' + id : 'Add product', `<div class="grid2" style="gap:0 12px">${f('name', 'Product name')}${f('brand', 'Brand')}<div><label class="f">Category</label><select class="inp" id="p-cat">${S().categories.map(c => `<option value="${c.id}" ${p.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>${f('sub', 'Sub-category')}${f('unit', 'Unit / pack size')}${f('barcode', 'Barcode (EAN)')}${f('mrp', 'MRP (₹)', 'number')}${f('price', 'Selling price (₹)', 'number')}${f('cost', 'Purchase cost (₹)', 'number')}${f('gst', 'GST %', 'number')}${f('rack', 'Rack location')}${f('reorder', 'Reorder level', 'number')}</div>
        <div class="row mt12" style="gap:20px"><label class="row small b"><input type="checkbox" id="p-active" ${p.active ? 'checked' : ''}> Visible in app</label><label class="row small b"><input type="checkbox" id="p-best" ${p.best ? 'checked' : ''}> Best seller</label></div>
        ${id ? `<div class="small mt12"><b>Batches:</b> ${p.batches.map(b => `${b.batch}: ${b.qty} (${b.exp ? UI.date(b.exp) : 'no expiry'})`).join(' · ') || 'none'} — add stock via Warehouse → Stock-In</div>` : '<div class="small mut mt12">After saving, add stock through Warehouse → Stock-In (GRN).</div>'}
        <button class="btn block mt16" onclick="A.saveProduct('${id || ''}')">Save product</button>`, { wide: true });
    },
    saveProduct(id) {
      const g = (k) => document.getElementById('p-' + k).value;
      const d = { id: id || null, name: g('name'), brand: g('brand'), cat: g('cat'), sub: g('sub'), unit: g('unit'), barcode: g('barcode'), mrp: g('mrp'), price: g('price'), cost: g('cost'), gst: g('gst'), rack: g('rack'), reorder: g('reorder'), active: document.getElementById('p-active').checked, best: document.getElementById('p-best').checked };
      if (!d.name || !d.price || !d.mrp) return toast('Name, MRP and price are required', 'err');
      if (Number(d.price) > Number(d.mrp)) return toast('Selling price cannot be more than MRP', 'err');
      const p = QM.upsertProduct(d); closeModal(); toast('Saved ' + p.name, 'ok'); render();
    },
    exportProducts() { csvDownload('quickmart_products.csv', [['id', 'name', 'brand', 'category', 'subcategory', 'unit', 'mrp', 'price', 'cost', 'gst', 'barcode', 'rack', 'stock', 'reorder', 'active'], ...S().products.map(p => [p.id, p.name, p.brand, p.cat, p.sub, p.unit, p.mrp, p.price, p.cost, p.gst, p.barcode, p.rack, QM.avail(p), p.reorder, p.active ? 1 : 0])]); },
    exportReorder() { csvDownload('purchase_list.csv', [['id', 'name', 'unit', 'barcode', 'stock', 'suggested_qty', 'last_cost'], ...S().products.filter(p => QM.avail(p) <= p.reorder).map(p => [p.id, p.name, p.unit, p.barcode, QM.avail(p), Math.max(12, p.reorder * 3 - QM.avail(p)), p.cost])]); },
    exportOrders() { csvDownload('orders.csv', [['order', 'date', 'customer', 'phone', 'locality', 'items', 'item_total', 'delivery', 'handling', 'coupon', 'discount', 'total', 'gst', 'payment', 'pay_status', 'status', 'rider', 'refunds'], ...S().orders.map(o => [o.id, dt(o.created), o.customer.name, o.customer.phone, o.address.loc, o.items.length, o.itemTotal, o.deliveryCharge, o.handlingFee, o.coupon || '', o.couponDisc, o.total, o.gstAmt, o.payMode, o.payStatus, o.status, o.riderId ? QM.rider(o.riderId).name : '', o.refundTotal])]); },
    exportFinance() { const rows = [['order', 'date', 'payment', 'total', 'gst', 'cogs', 'gross_profit']]; delivered(S().orders.filter(o => inRange(o, st.frange))).forEach(o => rows.push([o.id, dt(o.created), o.payMode, o.total, o.gstAmt, cogs(o).toFixed(2), (o.total - o.gstAmt - claims(o) - cogs(o)).toFixed(2)])); csvDownload('finance.csv', rows); },
    importCSV(inp) {
      const file = inp.files[0]; if (!file) return;
      const rd = new FileReader(); rd.onload = () => {
        const rows = parseCSV(String(rd.result).replace(/^﻿/, '')); const head = rows.shift().map(h => h.trim().toLowerCase());
        let n = 0, u = 0;
        rows.forEach(r => { const o = {}; head.forEach((h, i) => o[h] = (r[i] || '').trim()); if (!o.name) return; if (o.id && QM.product(o.id)) u++; else { n++; o.id = null; }
          const cat = S().categories.find(c => c.id === o.category || c.name.toLowerCase() === String(o.category || '').toLowerCase());
          const p = QM.upsertProduct({ id: o.id, name: o.name, brand: o.brand, cat: cat ? cat.id : undefined, sub: o.subcategory, unit: o.unit, mrp: o.mrp, price: o.price, cost: o.cost, gst: o.gst, barcode: o.barcode, rack: o.rack, reorder: o.reorder, active: o.active === undefined ? undefined : o.active !== '0' });
          if (!p.cat) p.cat = S().categories[0].id; });
        toast(`Bulk upload done: ${n} new, ${u} updated`, 'ok'); render();
      }; rd.readAsText(file); inp.value = '';
    },
    addRider() {
      modal('Add rider', `<label class="f">Name</label><input id="rn" class="inp"><label class="f">Mobile</label><input id="rp" class="inp" maxlength="10"><label class="f">Vehicle</label><input id="rv" class="inp" placeholder="GJ01 XX 0000 · Bike"><button class="btn block mt16" onclick="A.saveRider()">Add rider</button>`);
    },
    saveRider() { const n = document.getElementById('rn').value.trim(), p = document.getElementById('rp').value.trim(); if (!n || p.length !== 10) return toast('Enter name and 10 digit mobile', 'err'); S().riders.push({ id: 'R' + (S().riders.length + 1) + Date.now() % 100, name: n, phone: p, vehicle: document.getElementById('rv').value || 'Bike', online: false, rating: 5, cash: 0, joined: Date.now() }); QM.save(); closeModal(); toast('Rider added', 'ok'); render(); },
    toggleCoupon(i) { S().coupons[i].active = !S().coupons[i].active; QM.save(); render(); },
    toggleBanner(i) { S().banners[i].active = !S().banners[i].active; QM.save(); render(); },
    addCoupon() { modal('New coupon', `<label class="f">Code</label><input id="cc" class="inp" style="text-transform:uppercase" placeholder="DIWALI100"><label class="f">Type</label><select id="ct" class="inp"><option value="flat">Flat ₹ off</option><option value="pct">% off</option><option value="delivery">Free delivery</option></select><label class="f">Value</label><input id="cv" type="number" class="inp" value="100"><label class="f">Minimum order (₹)</label><input id="cm" type="number" class="inp" value="499"><label class="f">Max discount (₹, for %)</label><input id="cx" type="number" class="inp" value="100"><button class="btn block mt16" onclick="A.saveCoupon()">Create coupon</button>`); },
    saveCoupon() { const code = document.getElementById('cc').value.trim().toUpperCase(); if (!code) return toast('Enter code', 'err'); const type = document.getElementById('ct').value, value = Number(document.getElementById('cv').value), minOrder = Number(document.getElementById('cm').value), maxDisc = Number(document.getElementById('cx').value); S().coupons.push({ code, type, value, minOrder, maxDisc, active: true, desc: (type === 'flat' ? `₹${value} off` : type === 'pct' ? `${value}% off up to ₹${maxDisc}` : 'Free delivery') + ` on orders above ₹${minOrder}` }); QM.save(); closeModal(); toast('Coupon created', 'ok'); render(); },
    addBanner() { modal('New banner', `<label class="f">Title</label><input id="bt" class="inp" placeholder="Monsoon sale"><label class="f">Subtitle</label><input id="bs" class="inp" placeholder="Up to 30% off on snacks"><label class="f">Colour</label><input id="bc" type="color" class="inp" value="#7c3aed" style="height:44px"><label class="f">Opens category</label><select id="bk" class="inp">${S().categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><button class="btn block mt16" onclick="A.saveBanner()">Add banner</button>`); },
    saveBanner() { const t = document.getElementById('bt').value.trim(); if (!t) return toast('Enter title', 'err'); S().banners.unshift({ id: 'b' + Date.now(), title: t, sub: document.getElementById('bs').value, color: document.getElementById('bc').value, cat: document.getElementById('bk').value, active: true }); QM.save(); closeModal(); toast('Banner live on customer app', 'ok'); render(); },
    push() { const t = document.getElementById('pn').value.trim(); if (!t) return toast('Type a message', 'err'); S().customers.forEach(c => S().notifications.unshift({ id: Math.random().toString(36).slice(2), to: 'customer:' + c.phone, text: '📣 ' + t, t: Date.now() })); S().notifications.length = Math.min(S().notifications.length, 300); QM.save(); toast(`Sent to ${S().customers.length} customers`, 'ok'); document.getElementById('pn').value = ''; },
    saveSettings() {
      const s = S().settings; const num = ['radiusKm', 'deliveryMins', 'minOrder', 'deliveryCharge', 'freeDeliveryAbove', 'handlingFee', 'riderPayPerOrder', 'expiryAlertDays'];
      ['shopName', 'shopAddress', 'gstin', 'fssai', 'openTime', 'closeTime', ...num].forEach(k => { const v = document.getElementById('s-' + k).value; s[k] = num.includes(k) ? Number(v) : v; });
      s.codEnabled = document.getElementById('s-codEnabled').checked; s.autoAssignRider = document.getElementById('s-autoAssignRider').checked;
      QM.save(); toast('Settings saved', 'ok'); render();
    },
    reset() { modal('Reset demo?', `<p>This restores the original demo data (1000 products, sample orders). Continue?</p><div class="row"><button class="btn ghost grow" onclick="UI.closeModal()">Cancel</button><button class="btn red grow" onclick="QM.reset();try{localStorage.removeItem('qm_customer_phone');localStorage.removeItem('qm_rider_id')}catch(e){};UI.closeModal();location.hash='#/';location.reload()">Reset</button></div>`); },
  };
})();

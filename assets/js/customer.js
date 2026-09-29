/* =====================  CUSTOMER APP  ===================== */
(function () {
  const { esc, inr, time, dt, ago, catColor, pctOff, toast, modal, closeModal, statusPill, payPill, mapSVG, invoiceHTML } = UI;
  const SKEY = 'qm_customer_phone';
  const st = { tab: 'home', view: null, cat: null, sub: null, q: '', limit: 30, orderId: null, loginStep: 'phone', phone: '9876543210', addrId: null, pay: 'UPI', coupon: '' };
  let root = null;
  const ss = { get: () => { try { return localStorage.getItem(SKEY); } catch (e) { return null; } }, set: (v) => { try { v ? localStorage.setItem(SKEY, v) : localStorage.removeItem(SKEY); } catch (e) {} } };
  const me = () => { const p = ss.get(); return p ? QM.getCustomer(p) : null; };
  const S = () => QM.state;

  // ---------- product card ----------
  function qtyCtl(p) {
    const q = me() ? (QM.cart(me().phone)[p.id] || 0) : 0; const a = QM.avail(p);
    if (!a) return `<span class="oos">Out of stock</span>`;
    if (!q) return `<button class="add" onclick="C.add('${p.id}',1,event)">ADD</button>`;
    return `<div class="qty"><button onclick="C.add('${p.id}',-1,event)">−</button><span>${q}</span><button onclick="C.add('${p.id}',1,event)">+</button></div>`;
  }
  function pc(p) {
    const off = pctOff(p);
    return `<div class="pc" id="pc-${p.id}">
      ${off ? `<span class="off">${off}% OFF</span>` : ''}
      <div class="img" style="background:${catColor(p.cat)}" onclick="C.detail('${p.id}')">${p.emoji}</div>
      <span class="eta">⏱ ${S().settings.deliveryMins} MINS</span>
      <div class="nm" onclick="C.detail('${p.id}')">${esc(p.name)}</div>
      <div class="un">${esc(p.unit)}</div>
      <div class="pr"><div><div class="p">${inr(p.price)}</div>${off ? `<div class="m strike">${inr(p.mrp)}</div>` : '<div class="m">&nbsp;</div>'}</div><span id="qc-${p.id}">${qtyCtl(p)}</span></div>
    </div>`;
  }
  const visible = () => S().products.filter(p => p.active);

  // ---------- screens ----------
  function loginScreen() {
    if (st.loginStep === 'phone') return `
      <div style="padding:30px 22px;display:flex;flex-direction:column;gap:12px;flex:1;background:linear-gradient(180deg,#fff6d6,#fff 60%)">
        <div style="font-size:54px;text-align:center">🛒</div>
        <h2 style="text-align:center;margin:0">India's last minute app</h2>
        <p class="mut" style="text-align:center;margin:0">Groceries delivered in ${S().settings.deliveryMins} minutes from <b>${esc(S().settings.shopName)}</b></p>
        <label class="f">Mobile number</label>
        <div class="row"><span class="pill" style="padding:12px">+91</span><input id="ph" class="inp" maxlength="10" inputmode="numeric" value="${esc(st.phone)}" placeholder="10 digit mobile number"></div>
        <button class="btn lg block" onclick="C.sendOtp()">Continue</button>
        <p class="tiny mut" style="text-align:center">By continuing you agree to Terms, Privacy Policy & Refund Policy</p>
      </div>`;
    return `
      <div style="padding:30px 22px;display:flex;flex-direction:column;gap:12px;flex:1">
        <button class="btn ghost sm" style="width:max-content" onclick="C.set({loginStep:'phone'})">← Back</button>
        <h2 style="margin:0">OTP verification</h2>
        <p class="mut" style="margin:0">We've sent a 4-digit code to +91 ${esc(st.phone)}</p>
        <div class="otpbox small">Demo OTP: <b>1234</b> (in live app SMS via MSG91)</div>
        <input id="otp" class="inp" maxlength="4" inputmode="numeric" placeholder="Enter OTP" autofocus style="font-size:22px;letter-spacing:8px;text-align:center" value="1234">
        ${QM.getCustomer(st.phone) ? '' : `<label class="f">Your name</label><input id="nm" class="inp" placeholder="Full name">`}
        <button class="btn lg block" onclick="C.verify()">Verify & Login</button>
      </div>`;
  }

  function header() {
    const c = me(); const a = c.addresses.find(x => x.id === st.addrId) || c.addresses[0];
    const out = a && a.km > S().settings.radiusKm;
    return `<div class="ph-head">
      <div class="row between"><div class="grow"><div class="tiny b mut">${esc(S().settings.shopName)}</div>
      <div class="deliv">${out ? '<span class="redt">Not serviceable</span>' : `Delivery in ${S().settings.deliveryMins} minutes`}</div>
      <div class="addr-line" onclick="C.pickAddress()">${a ? `<b>${esc(a.label)}</b> – ${esc(a.line)} ▾` : '📍 Add delivery address ▾'}</div></div>
      <button class="x" style="width:36px;height:36px" onclick="C.set({tab:'account',view:null})">👤</button></div>
      <div class="search" onclick="C.set({tab:'search',view:null})"><span>🔍</span><input id="q" placeholder='Search "milk", "atta", "chips"...' value="${esc(st.q)}" oninput="C.search(this.value)" ${st.tab === 'search' ? 'autofocus' : ''}></div>
      ${!QM.isOpen() ? '<div class="pill r mt8">Store closed right now</div>' : ''}
    </div>`;
  }

  function home() {
    const P = visible(); const cats = S().categories;
    const best = P.filter(p => p.best && QM.avail(p)).slice(0, 14);
    const deals = P.filter(p => pctOff(p) >= 18 && QM.avail(p)).slice(0, 14);
    const lastOrder = S().orders.filter(o => o.customer.phone === me().phone && !['DELIVERED', 'CANCELLED'].includes(o.status)).pop();
    return `
      ${lastOrder ? `<div class="card mb12" style="background:#1f2937;color:#fff;cursor:pointer" onclick="C.track('${lastOrder.id}')"><div class="row between"><div><div class="tiny" style="opacity:.8">Live order ${lastOrder.id}</div><div class="b">${UI.STATUS[lastOrder.status][0]}</div></div><span class="pill" style="background:var(--y)">Track →</span></div></div>` : ''}
      <div class="banners">${S().banners.filter(b => b.active).map(b => `<div class="banner" style="background:${b.color}" onclick="C.openCat('${b.cat}')"><h3>${esc(b.title)}</h3><p>${esc(b.sub)}</p></div>`).join('')}</div>
      <div class="sec-t"><h3>Shop by category</h3><span class="tiny mut">${P.length} products</span></div>
      <div class="cats">${cats.map(c => `<div class="cat" onclick="C.openCat('${c.id}')"><div class="ce" style="background:${c.color}">${c.emoji}</div>${esc(c.name)}</div>`).join('')}</div>
      <div class="sec-t"><h3>🔥 Best sellers</h3></div><div class="hscroll">${best.map(pc).join('')}</div>
      <div class="sec-t"><h3>💰 Top deals</h3></div><div class="hscroll">${deals.map(pc).join('')}</div>
      <div class="sec-t"><h3>🎟️ Offers for you</h3></div>
      ${S().coupons.filter(c => c.active).map(c => `<div class="card mb8 row between" style="padding:12px"><div><div class="b">${c.code}</div><div class="small mut">${esc(c.desc)}</div></div><button class="btn sm sec" onclick="C.copyCoupon('${c.code}')">Apply</button></div>`).join('')}
    `;
  }

  function catPage() {
    const cats = S().categories; const cat = cats.find(c => c.id === st.cat) || cats[0];
    const inCat = visible().filter(p => p.cat === cat.id);
    const subs = [...new Set(inCat.map(p => p.sub))];
    const list = st.sub ? inCat.filter(p => p.sub === st.sub) : inCat;
    const sorted = list.slice().sort((a, b) => (QM.avail(b) > 0) - (QM.avail(a) > 0));
    return `
      <div class="row mb8"><button class="btn ghost sm" onclick="C.set({view:null,tab:'${st.tab === 'cats' ? 'cats' : 'home'}',cat:null})">←</button><h3 style="margin:0" class="grow">${cat.emoji} ${esc(cat.name)}</h3><span class="tiny mut">${list.length} items</span></div>
      <div class="list-layout">
        <div class="subnav"><button class="${!st.sub ? 'on' : ''}" onclick="C.set({sub:null,limit:30})">All</button>${subs.map(s => `<button class="${st.sub === s ? 'on' : ''}" onclick="C.set({sub:'${esc(s)}',limit:30})">${esc(s)}</button>`).join('')}</div>
        <div><div class="pgrid">${sorted.slice(0, st.limit).map(pc).join('')}</div>
        ${sorted.length > st.limit ? `<button class="btn ghost block mt12" onclick="C.set({limit:${st.limit + 30}})">Load more (${sorted.length - st.limit} more)</button>` : ''}</div>
      </div>`;
  }

  function catsTab() {
    if (st.cat) return catPage();
    return `<h3 style="margin:4px 0 12px">All categories</h3>` + S().categories.map(c => {
      const n = visible().filter(p => p.cat === c.id).length;
      return `<div class="card row mb8" style="cursor:pointer;padding:12px" onclick="C.set({cat:'${c.id}',sub:null,limit:30})"><div style="font-size:30px;background:${c.color};border-radius:10px;width:52px;height:52px;display:grid;place-items:center">${c.emoji}</div><div class="grow"><div class="b">${esc(c.name)}</div><div class="small mut">${n} products</div></div><span>›</span></div>`;
    }).join('');
  }

  function searchResults() {
    const q = st.q.trim().toLowerCase();
    if (!q) {
      const trend = ['milk', 'bread', 'atta', 'chips', 'eggs', 'paneer', 'oil', 'cola', 'shampoo', 'diapers'];
      return `<div class="b mb8">Trending searches</div><div class="row wrap">${trend.map(t => `<span class="pill" style="padding:8px 12px;cursor:pointer" onclick="C.search('${t}',true)">🔍 ${t}</span>`).join('')}</div>`;
    }
    const words = q.split(/\s+/);
    const res = visible().filter(p => { const h = (p.name + ' ' + p.sub + ' ' + p.brand + ' ' + (S().categories.find(c => c.id === p.cat) || {}).name).toLowerCase(); return words.every(w => h.includes(w)); });
    if (!res.length) return `<div class="empty"><div class="e">🔎</div>No results for "${esc(st.q)}"</div>`;
    return `<div class="small mut mb8">${res.length} results for "<b>${esc(st.q)}</b>"</div><div class="pgrid">${res.slice(0, st.limit).map(pc).join('')}</div>${res.length > st.limit ? `<button class="btn ghost block mt12" onclick="C.set({limit:${st.limit + 30}})">Load more</button>` : ''}`;
  }

  function cartTab() {
    const c = me(); const items = QM.cartItems(c.phone);
    if (!items.length) return `<div class="empty"><div class="e">🛒</div><div class="b">Your cart is empty</div><p>Add items to place an order</p><button class="btn" onclick="C.set({tab:'home'})">Start shopping</button></div>`;
    let coupon = null, cmsg = '';
    if (st.coupon) { const v = QM.validateCoupon(st.coupon, items.reduce((s, i) => s + i.price * i.qty, 0)); if (v.ok) coupon = v.coupon; else cmsg = v.msg; }
    const b = QM.computeBill(items, coupon); const set = S().settings;
    const addr = c.addresses.find(a => a.id === st.addrId) || c.addresses[0];
    const serviceable = addr && addr.km <= set.radiusKm;
    const minOk = b.itemTotal >= set.minOrder;
    return `
      <h3 style="margin:4px 0 10px">Checkout</h3>
      <div class="card mb12"><div class="row between"><div class="b">⏱ Delivery in ${set.deliveryMins} minutes</div><span class="small mut">${items.length} items</span></div>
        ${items.map(i => { const p = QM.product(i.pid); return `<div class="ci"><div class="img" style="background:${catColor(p.cat)}">${p.emoji}</div><div class="grow"><div class="small b">${esc(p.name)}</div><div class="tiny mut">${esc(p.unit)}</div><div class="small"><b>${inr(p.price)}</b> ${p.mrp > p.price ? `<span class="strike tiny">${inr(p.mrp)}</span>` : ''}</div></div><span id="qc-${p.id}">${qtyCtl(p)}</span></div>`; }).join('')}
      </div>
      ${b.itemTotal < set.freeDeliveryAbove ? `<div class="card mb12 small" style="background:var(--y2)">🚚 Add items worth <b>${inr(set.freeDeliveryAbove - b.itemTotal)}</b> more for FREE delivery</div>` : ''}
      <div class="card mb12"><div class="b mb8">🎟️ Apply coupon</div>
        <div class="row"><input id="cp" class="inp" placeholder="Enter coupon code" value="${esc(st.coupon)}" style="text-transform:uppercase"><button class="btn sm" onclick="C.applyCoupon()">Apply</button></div>
        ${coupon ? `<div class="small green b mt8">✔ ${coupon.code} applied — you save ${inr(b.couponDisc)} <a href="javascript:C.set({coupon:''})">Remove</a></div>` : cmsg ? `<div class="small redt mt8">${esc(cmsg)}</div>` : `<div class="tiny mut mt8">Try: ${S().coupons.filter(x => x.active).map(x => x.code).join(', ')}</div>`}
      </div>
      <div class="card mb12"><div class="b mb8">Bill details</div>
        <div class="bill-row"><span>Items total</span><span>${b.savings ? `<span class="strike tiny">${inr(b.mrpTotal)}</span> ` : ''}${inr(b.itemTotal)}</span></div>
        <div class="bill-row"><span>Delivery charge</span><span>${b.deliveryCharge ? inr(b.deliveryCharge) : '<span class="green b">FREE</span>'}</span></div>
        <div class="bill-row"><span>Handling charge</span><span>${inr(b.handlingFee)}</span></div>
        ${b.couponDisc ? `<div class="bill-row green"><span>Coupon discount</span><span>-${inr(b.couponDisc)}</span></div>` : ''}
        <div class="hr"></div><div class="bill-row b" style="font-size:15px"><span>Grand total</span><span>${inr(b.total)}</span></div>
        ${b.savings + b.couponDisc > 0 ? `<div class="small green b mt8" style="background:var(--gl);padding:8px;border-radius:8px">🎉 You are saving ${inr(b.savings + b.couponDisc)} on this order</div>` : ''}
      </div>
      <div class="card mb12"><div class="row between mb8"><div class="b">📍 Delivering to</div><a href="javascript:C.pickAddress()" class="small b">Change</a></div>
        ${addr ? `<div class="small"><b>${esc(addr.label)}</b> · ${esc(addr.line)} <span class="mut">(${addr.km} km)</span></div>${!serviceable ? `<div class="small redt b mt8">⚠ Sorry, this address is outside our ${set.radiusKm} km delivery area.</div>` : ''}` : `<button class="btn sec sm" onclick="C.addAddress()">+ Add address</button>`}
      </div>
      <div class="card mb12"><div class="b mb8">💳 Payment method</div><div class="col">
        ${[['UPI', '📱', 'UPI (GPay, PhonePe, Paytm)'], ['CARD', '💳', 'Credit / Debit card'], ['NB', '🏦', 'Net banking'], ...(set.codEnabled ? [['COD', '💵', 'Cash on Delivery']] : [])].map(([k, e, l]) => `<div class="opt ${st.pay === k ? 'on' : ''}" onclick="C.set({pay:'${k}'})"><span style="font-size:20px">${e}</span><span class="grow b small">${l}</span><span>${st.pay === k ? '🟢' : '⚪'}</span></div>`).join('')}
      </div></div>
      <div class="tiny mut mb12">Cancellation allowed until the order is packed. Refunds go back to the original payment method in 3–5 working days.</div>
      <button class="btn lg block" ${!serviceable || !minOk || !QM.isOpen() ? 'disabled' : ''} onclick="C.checkout()">${!minOk ? `Minimum order ${inr(set.minOrder)}` : st.pay === 'COD' ? `Place order · ${inr(b.total)}` : `Pay ${inr(b.total)}`}</button>
    `;
  }

  function ordersTab() {
    const list = S().orders.filter(o => o.customer.phone === me().phone).slice().reverse();
    if (!list.length) return `<div class="empty"><div class="e">📦</div><div class="b">No orders yet</div><button class="btn mt12" onclick="C.set({tab:'home'})">Start shopping</button></div>`;
    return `<h3 style="margin:4px 0 10px">My orders</h3>` + list.map(o => `
      <div class="card mb8" style="cursor:pointer;padding:12px" onclick="C.track('${o.id}')">
        <div class="row between"><div class="b">${o.id}</div>${statusPill(o.status)}</div>
        <div class="small mut">${dt(o.created)} · ${o.items.length} items</div>
        <div class="row mt8" style="font-size:22px;gap:4px">${o.items.slice(0, 6).map(i => i.emoji).join('')}</div>
        <div class="row between mt8"><span class="b">${inr(o.total)}</span>${o.status === 'DELIVERED' ? `<button class="btn sm sec" onclick="event.stopPropagation();C.reorder('${o.id}')">↻ Reorder</button>` : '<span class="small green b">Track →</span>'}</div>
      </div>`).join('');
  }

  function trackView() {
    const o = QM.order(st.orderId); if (!o) return 'Order not found';
    const steps = [['PLACED', 'Order placed', '🧾'], ['PICKING', 'Packing your items', '🛍️'], ['PACKED', 'Packed & ready', '📦'], ['PICKED_UP', 'Out for delivery', '🛵'], ['DELIVERED', 'Delivered', '🏠']];
    const order = ['PLACED', 'PICKING', 'PACKED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED'];
    const idx = order.indexOf(o.status);
    const tOf = (s) => { const x = o.timeline.filter(t => t.s === s).pop(); return x ? time(x.t) : ''; };
    const r = o.riderId ? QM.rider(o.riderId) : null;
    const pos = QM.riderPosition(o);
    const etaMin = o.status === 'PICKED_UP' ? Math.max(1, Math.ceil((1 - pos.progress) * o.address.km * 25 / 60 * 2)) : null;
    const canCancel = ['PLACED', 'PICKING'].includes(o.status);
    return `
      <div class="row mb8"><button class="btn ghost sm" onclick="C.set({view:null,tab:'orders'})">←</button><div class="grow"><div class="b">Order ${o.id}</div><div class="tiny mut">${dt(o.created)}</div></div>${statusPill(o.status)}</div>
      ${o.status === 'CANCELLED' ? `<div class="card mb12" style="background:var(--redl)"><b class="redt">Order cancelled</b><div class="small">${esc(o.cancelReason || '')}</div>${o.refundTotal ? `<div class="small b mt8">Refund of ${inr(o.refundTotal)} initiated to your ${UI.PAY[o.payMode]}</div>` : ''}</div>` : `
      <div class="card mb12" style="padding:10px">
        <div class="b" style="font-size:17px;margin:2px 4px 8px">${o.status === 'DELIVERED' ? '✅ Delivered at ' + time(o.deliveredAt) : o.status === 'PICKED_UP' ? `🛵 Arriving in ~${etaMin} min` : o.status === 'PLACED' ? '🧾 Order received by store' : '📦 Preparing your order'}</div>
        ${UI.mapSVG(o, ['PICKED_UP', 'DELIVERED'].includes(o.status) ? pos : null)}
      </div>`}
      ${['PACKED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP'].includes(o.status) ? `<div class="otpbox mb12"><div class="small b">Share this Delivery OTP with the rider</div><div class="o">${o.deliveryOtp}</div><div class="tiny mut">Only share when you receive your order</div></div>` : ''}
      ${r && o.status !== 'CANCELLED' ? `<div class="card mb12 row"><div style="font-size:30px">🧑🏽‍🦱</div><div class="grow"><div class="b">${esc(r.name)}</div><div class="small mut">${esc(r.vehicle)} · ⭐ ${r.rating}</div></div><a class="btn sm sec" href="tel:${r.phone}">📞 Call</a></div>` : ''}
      ${o.status !== 'CANCELLED' ? `<div class="card mb12"><div class="track">${steps.map(([s, l, e], k) => { const si = order.indexOf(s); const done = idx >= si; const next = steps[k + 1]; const cur = done && (!next || idx < order.indexOf(next[0])); return `<div class="st ${done ? 'done' : ''} ${cur && o.status !== 'DELIVERED' ? 'cur' : ''}"><div class="row between"><span class="b small">${e} ${l}</span><span class="tiny mut">${tOf(s)}</span></div></div>`; }).join('')}</div></div>` : ''}
      <div class="card mb12"><div class="b mb8">Items (${o.items.length})</div>
        ${o.items.map(i => `<div class="ci"><div class="img" style="background:${catColor(QM.product(i.pid)?.cat)}">${i.emoji}</div><div class="grow"><div class="small b">${esc(i.name)}</div><div class="tiny mut">${esc(i.unit)} × ${i.qty}${i.shortQty ? ` <span class="redt b">(${i.shortQty} out of stock – refunded)</span>` : ''}</div></div><div class="small b">${inr(i.price * i.qty)}</div></div>`).join('')}
        <div class="bill-row mt8"><span>Item total</span><span>${inr(o.itemTotal)}</span></div>
        <div class="bill-row"><span>Delivery + handling</span><span>${inr(o.deliveryCharge + o.handlingFee)}</span></div>
        ${o.couponDisc ? `<div class="bill-row green"><span>Coupon ${o.coupon}</span><span>-${inr(o.couponDisc)}</span></div>` : ''}
        <div class="bill-row b"><span>Total</span><span>${inr(o.total)}</span></div>
        ${o.refunds.map(rf => `<div class="bill-row redt small"><span>Refund · ${esc(rf.reason)}</span><span>${inr(rf.amt)}</span></div>`).join('')}
        <div class="mt8">${payPill(o)}</div>
      </div>
      <div class="card mb12 small"><b>Delivery address</b><br>${esc(o.address.label)} · ${esc(o.address.line)}</div>
      ${o.status === 'DELIVERED' ? rateBox(o) : ''}
      <div class="col">
        ${canCancel ? `<button class="btn red block" onclick="C.cancel('${o.id}')">Cancel order</button>` : ''}
        <button class="btn ghost block" onclick="C.invoice('${o.id}')">🧾 Download invoice</button>
        ${o.status === 'DELIVERED' ? `<button class="btn sec block" onclick="C.reorder('${o.id}')">↻ Reorder all items</button>` : ''}
        <button class="btn ghost block" onclick="C.help('${o.id}')">💬 Need help with this order?</button>
      </div>`;
  }
  function rateBox(o) {
    if (o.rating) return `<div class="card mb12 small">Your rating: <b style="color:#f59e0b">${'★'.repeat(o.rating)}${'☆'.repeat(5 - o.rating)}</b>${o.review ? ' · ' + esc(o.review) : ''}</div>`;
    return `<div class="card mb12"><div class="b">How was your order?</div><div class="stars mt8" id="stars">${[1, 2, 3, 4, 5].map(n => `<button onclick="C.rate('${o.id}',${n})">★</button>`).join('')}</div></div>`;
  }

  function accountTab() {
    const c = me(); const notes = S().notifications.filter(n => n.to === 'customer:' + c.phone).slice(0, 8);
    return `
      <div class="card mb12 row"><div style="font-size:36px">😊</div><div class="grow"><div class="b" style="font-size:16px">${esc(c.name)}</div><div class="small mut">+91 ${c.phone}</div></div><button class="btn sm ghost" onclick="C.editName()">Edit</button></div>
      <div class="card mb12"><div class="row between mb8"><div class="b">📍 Saved addresses</div><button class="btn sm sec" onclick="C.addAddress()">+ Add</button></div>
        ${c.addresses.map(a => `<div class="small" style="padding:6px 0;border-bottom:1px solid var(--line)"><b>${esc(a.label)}</b> · ${esc(a.line)} <span class="pill ${a.km <= S().settings.radiusKm ? 'g' : 'r'}">${a.km <= S().settings.radiusKm ? a.km + ' km · serviceable' : 'Not serviceable'}</span></div>`).join('') || '<div class="small mut">No address saved</div>'}
      </div>
      <div class="card mb12"><div class="b mb8">🔔 Notifications</div>${notes.map(n => `<div class="small" style="padding:6px 0;border-bottom:1px solid var(--line)">${esc(n.text)} <span class="tiny mut">· ${ago(n.t)}</span></div>`).join('') || '<div class="small mut">No notifications yet</div>'}</div>
      <div class="card mb12 col small">
        <a href="javascript:C.set({tab:'orders'})">📦 Your orders</a>
        <a href="javascript:C.policy()">📄 Refund policy, Terms & Privacy</a>
        <a href="javascript:C.help()">💬 Help & support</a>
      </div>
      <button class="btn ghost block" onclick="C.logout()">Log out</button>
      <p class="tiny mut" style="text-align:center">${esc(S().settings.shopName)} · GSTIN ${S().settings.gstin} · FSSAI ${S().settings.fssai}</p>`;
  }

  function nav() {
    const n = Object.values(QM.cart(me().phone)).reduce((s, x) => s + x, 0);
    const b = [['home', '🏠', 'Home'], ['cats', '🗂️', 'Categories'], ['cart', '🛒', 'Cart'], ['orders', '📦', 'Orders'], ['account', '👤', 'Account']];
    return `<div class="ph-nav">${b.map(([k, i, l]) => `<button class="${st.tab === k && !st.view ? 'on' : ''}" onclick="C.set({tab:'${k}',view:null,cat:null})"><span class="i">${i}</span>${l}${k === 'cart' && n ? `<span class="badge">${n}</span>` : ''}</button>`).join('')}</div>`;
  }
  function cartBar() {
    if (st.tab === 'cart' || st.view === 'track') return '';
    const items = QM.cartItems(me().phone); if (!items.length) return '';
    const tot = items.reduce((s, i) => s + i.price * i.qty, 0); const n = items.reduce((s, i) => s + i.qty, 0);
    return `<div class="cartbar" onclick="C.set({tab:'cart',view:null})"><div><div class="b">${n} item${n > 1 ? 's' : ''} · ${inr(tot)}</div><div class="tiny" style="opacity:.85">Extra charges may apply</div></div><div class="b">View cart ›</div></div>`;
  }

  function render() {
    if (!root) return;
    const c = me();
    let html;
    if (!c) html = loginScreen();
    else {
      let body;
      if (st.view === 'track') body = trackView();
      else if (st.view === 'cat') body = catPage();
      else if (st.tab === 'home') body = home();
      else if (st.tab === 'cats') body = catsTab();
      else if (st.tab === 'search') body = `<div id="sres">${searchResults()}</div>`;
      else if (st.tab === 'cart') body = cartTab();
      else if (st.tab === 'orders') body = ordersTab();
      else body = accountTab();
      html = (st.view === 'track' ? '' : header()) + `<div class="ph-body" id="cbody">${body}</div>` + cartBar() + nav();
    }
    const scroll = document.getElementById('cbody')?.scrollTop || 0; const wy = window.scrollY;
    root.innerHTML = `<div class="phone-wrap"><div class="phone">${html}</div></div>`;
    const b = document.getElementById('cbody'); if (st.keepScroll) { if (b) b.scrollTop = scroll; window.scrollTo(0, wy); } else window.scrollTo(0, 0); st.keepScroll = false;
    if (st.tab === 'search' && !st.view) { const q = document.getElementById('q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  }

  // ---------- actions ----------
  const C = window.C = {
    mount(el) { root = el; if (me() && !st.addrId) st.addrId = me().addresses[0]?.id; render(); },
    render,
    set(p) { Object.assign(st, p); if ('tab' in p || 'view' in p || 'cat' in p || 'sub' in p) { const b = document.getElementById('cbody'); if (b) b.scrollTop = 0; } else st.keepScroll = true; render(); },
    onData() {
      if (!root || !me()) return;
      if (UI.modalOpen()) return;
      if (st.view === 'track' || st.tab === 'orders' || st.tab === 'account' || st.tab === 'cart') { st.keepScroll = true; render(); }
    },
    tick() { if (root && st.view === 'track') { const o = QM.order(st.orderId); if (o && o.status === 'PICKED_UP' && !UI.modalOpen()) { st.keepScroll = true; render(); } } },
    sendOtp() { const v = document.getElementById('ph').value.replace(/\D/g, ''); if (v.length !== 10) return toast('Enter a valid 10-digit mobile number', 'err'); st.phone = v; st.loginStep = 'otp'; render(); },
    verify() {
      if (document.getElementById('otp').value !== '1234') return toast('Wrong OTP. Demo OTP is 1234', 'err');
      const nm = document.getElementById('nm'); if (nm && !nm.value.trim()) return toast('Please enter your name', 'err');
      const c = QM.loginCustomer(st.phone, nm ? nm.value.trim() : null); ss.set(c.phone); st.addrId = c.addresses[0]?.id; st.tab = 'home'; st.loginStep = 'phone';
      render(); if (!c.addresses.length) C.addAddress();
      toast('Welcome ' + c.name + '!', 'ok');
    },
    logout() { ss.set(null); st.tab = 'home'; st.view = null; render(); },
    add(pid, d, ev) {
      if (ev) ev.stopPropagation();
      const c = me(); const cur = QM.cart(c.phone)[pid] || 0; const p = QM.product(pid);
      if (d > 0 && cur + d > QM.avail(p)) { toast(`Only ${QM.avail(p)} left in stock`, 'err'); return; }
      QM.setCartQty(c.phone, pid, cur + d);
      if (st.tab === 'cart' && !st.view) { st.keepScroll = true; render(); return; }
      document.querySelectorAll('#qc-' + pid).forEach(el => el.innerHTML = qtyCtl(p));
      const phone = root.querySelector('.phone'); const old = phone.querySelector('.cartbar'); const nb = phone.querySelector('.ph-nav');
      if (old) old.remove(); nb.insertAdjacentHTML('beforebegin', cartBar()); nb.outerHTML = nav();
      const dm = document.getElementById('dm-qty'); if (dm) dm.innerHTML = qtyCtl(p);
    },
    detail(pid) {
      const p = QM.product(pid); const off = pctOff(p); const cat = S().categories.find(c => c.id === p.cat);
      const b = QM.fefo(p)[0];
      modal(esc(p.name), `
        <div style="background:${catColor(p.cat)};border-radius:14px;height:180px;display:grid;place-items:center;font-size:90px">${p.emoji}</div>
        <div class="mt12"><span class="pill">${cat.emoji} ${esc(cat.name)} › ${esc(p.sub)}</span></div>
        <h3 style="margin:8px 0 2px">${esc(p.name)}</h3><div class="mut">${esc(p.unit)}</div>
        <div class="row between mt12"><div><span class="xb" style="font-size:20px">${inr(p.price)}</span> ${off ? `<span class="strike">MRP ${inr(p.mrp)}</span> <span class="pill b">${off}% OFF</span>` : `<span class="mut small">MRP ${inr(p.mrp)}</span>`}<div class="tiny mut">(Inclusive of all taxes)</div></div><span id="dm-qty">${qtyCtl(p)}</span></div>
        <div class="hr"></div>
        <div class="small col" style="gap:4px"><div><b>Brand:</b> ${esc(p.brand)}</div><div><b>Stock:</b> ${QM.avail(p) ? QM.avail(p) + ' available' : '<span class="redt">Out of stock</span>'}</div>${b && b.exp ? `<div><b>Best before:</b> ${UI.date(b.exp)}</div>` : ''}<div><b>Country of origin:</b> India</div><div><b>Seller:</b> ${esc(S().settings.shopName)}</div><div><b>Barcode:</b> ${p.barcode}</div></div>
        <div class="tiny mut mt12">Return policy: perishable items can be reported within 48 hours of delivery for a refund.</div>`);
    },
    openCat(cid) { st.view = 'cat'; st.cat = cid; st.sub = null; st.limit = 30; const b = document.getElementById('cbody'); if (b) b.scrollTop = 0; render(); },
    search(v, full) { st.q = v; st.limit = 30; if (full || st.tab !== 'search') { st.tab = 'search'; st.view = null; render(); return; } const r = document.getElementById('sres'); if (r) r.innerHTML = searchResults(); },
    copyCoupon(code) { st.coupon = code; toast(code + ' will be applied at checkout', 'ok'); },
    applyCoupon() { st.coupon = document.getElementById('cp').value.trim().toUpperCase(); st.keepScroll = true; render(); },
    pickAddress() {
      const c = me(); if (!c) return;
      modal('Select delivery address', c.addresses.map(a => `<div class="opt mb8 ${a.id === st.addrId ? 'on' : ''}" onclick="C.set({addrId:'${a.id}'});UI.closeModal()"><span>📍</span><div class="grow"><div class="b small">${esc(a.label)}</div><div class="small">${esc(a.line)}</div><div class="tiny ${a.km <= S().settings.radiusKm ? 'green' : 'redt'} b">${a.km <= S().settings.radiusKm ? a.km + ' km away · Deliverable' : 'Outside delivery area (' + a.km + ' km)'}</div></div></div>`).join('') + `<button class="btn sec block" onclick="C.addAddress()">+ Add new address</button>`);
    },
    addAddress() {
      modal('Add address', `
        <div class="otpbox small mb12" style="text-align:left">📍 In the live app the location is auto-detected (GPS) and checked against the ${S().settings.radiusKm} km delivery radius. For the demo pick an area below.</div>
        <label class="f">Area / locality</label><select id="al" class="inp">${QM.LOCALITIES.map(l => `<option value="${l.name}">${l.name} — ${l.km} km ${l.km > S().settings.radiusKm ? '(not serviceable)' : ''}</option>`).join('')}</select>
        <label class="f">Flat / house no., building, street</label><input id="aline" class="inp" placeholder="e.g. A-101, Sunrise Apartments">
        <label class="f">Save as</label><select id="alab" class="inp"><option>Home</option><option>Work</option><option>Other</option></select>
        <button class="btn block mt16" onclick="C.saveAddress()">Save address</button>`, { sticky: true });
    },
    saveAddress() {
      const loc = document.getElementById('al').value, line = document.getElementById('aline').value.trim(), lab = document.getElementById('alab').value;
      if (!line) return toast('Enter house / building details', 'err');
      const a = QM.addAddress(me().phone, lab, line + ', ' + loc, loc); st.addrId = a.id; closeModal();
      a.km > S().settings.radiusKm ? toast('Address saved, but it is outside our delivery area', 'err') : toast('Address saved ✓', 'ok'); render();
    },
    checkout() {
      const c = me(); const items = QM.cartItems(c.phone);
      let coupon = null; if (st.coupon) { const v = QM.validateCoupon(st.coupon, items.reduce((s, i) => s + i.price * i.qty, 0)); if (v.ok) coupon = v.coupon; }
      const b = QM.computeBill(items, coupon);
      const addr = c.addresses.find(a => a.id === st.addrId) || c.addresses[0];
      if (st.pay === 'COD') return C.place(addr.id);
      modal('Secure payment', `
        <div class="row between"><div><div class="tiny mut">Paying to</div><div class="b">${esc(S().settings.shopName)}</div></div><div class="xb" style="font-size:22px">${inr(b.total)}</div></div>
        <div class="otpbox small mt12" style="text-align:left">🔒 Razorpay checkout (<b>test mode</b>). In the live app the real Razorpay screen opens and the order is confirmed by webhook.</div>
        <div class="mt12 small"><b>Method:</b> ${UI.PAY[st.pay]}</div>
        ${st.pay === 'UPI' ? `<label class="f">UPI ID</label><input class="inp" value="demo@okaxis">` : st.pay === 'CARD' ? `<label class="f">Card number</label><input class="inp" value="4111 1111 1111 1111"><div class="row"><input class="inp" value="12/30"><input class="inp" value="123"></div>` : `<label class="f">Bank</label><select class="inp"><option>HDFC Bank</option><option>SBI</option><option>ICICI Bank</option></select>`}
        <button class="btn lg block mt16" onclick="C.paySim(true,'${addr.id}')">✔ Simulate payment success</button>
        <button class="btn ghost block mt8" onclick="C.paySim(false)">✖ Simulate payment failure</button>`, { sticky: true });
    },
    paySim(ok, addrId) {
      if (!ok) { closeModal(); modal('Payment failed', `<div class="empty"><div class="e">❌</div><div class="b">Payment could not be completed</div><p class="small">No money was deducted. Your cart is safe — please try again or choose another method.</p><button class="btn" onclick="UI.closeModal()">Try again</button></div>`); return; }
      const m = document.querySelector('#modal .modal-b'); m.innerHTML = `<div class="empty"><div class="e">⏳</div><div class="b">Confirming payment…</div></div>`;
      setTimeout(() => { closeModal(); C.place(addrId); }, 900);
    },
    place(addrId) {
      try {
        const o = QM.placeOrder({ phone: me().phone, addressId: addrId, payMode: st.pay, couponCode: st.coupon });
        st.coupon = ''; st.orderId = o.id; st.view = 'track'; render();
        modal('Order placed! 🎉', `<div class="empty" style="padding:10px"><div class="e">✅</div><div class="b" style="font-size:17px">Order ${o.id} confirmed</div><p class="small">Arriving in ~${S().settings.deliveryMins} minutes. ${o.payMode === 'COD' ? `Keep ${inr(o.total)} cash ready.` : 'Payment received: ' + inr(o.total)}</p><button class="btn" onclick="UI.closeModal()">Track order</button></div>`);
      } catch (e) { toast(e.message, 'err'); render(); }
    },
    track(id) { st.orderId = id; st.view = 'track'; const b = document.getElementById('cbody'); if (b) b.scrollTop = 0; render(); },
    cancel(id) {
      modal('Cancel order?', `<p>Are you sure you want to cancel <b>${id}</b>?</p><label class="f">Reason</label><select id="cr" class="inp"><option>Ordered by mistake</option><option>Want to change items</option><option>Delivery taking too long</option><option>Other</option></select><div class="row mt16"><button class="btn ghost grow" onclick="UI.closeModal()">No, keep it</button><button class="btn red grow" onclick="C.doCancel('${id}')">Yes, cancel</button></div>`);
    },
    doCancel(id) { try { QM.cancelOrder(id, 'customer', 'Customer: ' + document.getElementById('cr').value); closeModal(); toast('Order cancelled' + (QM.order(id).payMode !== 'COD' ? ' · refund initiated' : ''), 'ok'); render(); } catch (e) { closeModal(); toast(e.message, 'err'); } },
    rate(id, n) { QM.rateOrder(id, n); toast('Thanks for rating! ⭐', 'ok'); st.keepScroll = true; render(); },
    invoice(id) { modal('Invoice', invoiceHTML(QM.order(id)), { wide: true }); },
    reorder(id) {
      const o = QM.order(id); let added = 0;
      o.items.forEach(i => { const p = QM.product(i.pid); if (p && QM.avail(p)) { QM.setCartQty(me().phone, i.pid, (QM.cart(me().phone)[i.pid] || 0) + (i.qty || 1)); added++; } });
      toast(added + ' items added to cart', 'ok'); st.tab = 'cart'; st.view = null; render();
    },
    help(id) {
      const o = id ? QM.order(id) : null;
      modal('Help & support', `
        ${o ? `<div class="small mb12">Order <b>${o.id}</b> · ${UI.STATUS[o.status][0]}</div>` : ''}
        <div class="col">
          ${o && o.status === 'DELIVERED' && !o.refundRequest ? `<label class="f">Report an issue & request refund</label><select id="rr" class="inp"><option>Item damaged</option><option>Wrong item received</option><option>Item missing</option><option>Quality issue / expired</option></select><button class="btn" onclick="C.refund('${o.id}')">Submit refund request</button>` : ''}
          ${o && o.refundRequest ? `<div class="pill ${o.refundRequest.status === 'APPROVED' ? 'g' : o.refundRequest.status === 'REJECTED' ? 'r' : 'o'}">Refund request: ${o.refundRequest.status}</div>` : ''}
          <a class="btn ghost" href="tel:18001234567">📞 Call support 1800-123-4567</a>
          <a class="btn ghost" href="mailto:support@quickmart.demo">✉️ Email support</a>
          <div class="tiny mut">Grievance officer: Mr. A. Shah · grievance@quickmart.demo · (as per Consumer Protection (E-Commerce) Rules, 2020)</div>
        </div>`);
    },
    refund(id) { QM.requestRefund(id, document.getElementById('rr').value); closeModal(); toast('Refund request submitted. We will update you shortly.', 'ok'); render(); },
    editName() { modal('Edit profile', `<label class="f">Name</label><input id="en" class="inp" value="${esc(me().name)}"><button class="btn block mt16" onclick="QM.updateCustomer('${me().phone}',{name:document.getElementById('en').value});UI.closeModal();C.render()">Save</button>`); },
    policy() { modal('Policies', `<div class="small"><b>Refund policy</b><p>Cancel any time before your order is packed for a full refund. Missing, damaged or wrong items can be reported within 48 hours of delivery. Refunds are credited to the original payment method in 3–5 working days.</p><b>Privacy (DPDP Act 2023)</b><p>We only collect your phone number, name and delivery address to fulfil orders. You can request deletion of your data at any time from Help & support.</p><b>Terms</b><p>Prices are inclusive of GST. MRP, quantity and expiry are shown as per Legal Metrology rules.</p></div>`); },
  };
})();

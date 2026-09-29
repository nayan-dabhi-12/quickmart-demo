/* =========================================================================
   QuickMart Demo — data store + business logic ("backend" of the demo)
   All four apps (Customer, Warehouse, Rider, Admin) share this one store.
   Data lives in the browser's localStorage, so every tab / iframe of the
   demo sees the same orders in real time (storage events).
   In production this layer is replaced by Oracle DB + PL/SQL + ORDS APIs.
   ========================================================================= */
(function () {
  const KEY = 'qm_demo_state_v2';
  const DAY = 86400000;
  const listeners = [];
  let S = null;

  // ---------- small utils ----------
  const now = () => Date.now();
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const otp4 = () => String(rnd(1000, 9999));
  const round2 = (x) => Math.round(x * 100) / 100;
  function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  // ---------- master data ----------
  const LOCALITIES = [
    { name: 'Navrangpura',  km: 0.8, x: 52, y: 44 },
    { name: 'C.G. Road',    km: 1.2, x: 58, y: 52 },
    { name: 'Ellisbridge',  km: 1.9, x: 62, y: 62 },
    { name: 'Gulbai Tekra', km: 1.5, x: 40, y: 50 },
    { name: 'Vastrapur',    km: 3.1, x: 24, y: 58 },
    { name: 'Paldi',        km: 2.8, x: 72, y: 70 },
    { name: 'Naranpura',    km: 2.4, x: 50, y: 24 },
    { name: 'Satellite',    km: 4.3, x: 16, y: 74 },
    { name: 'Bodakdev',     km: 4.8, x: 14, y: 36 },
    { name: 'Chandkheda',   km: 11.5, x: 50, y: 2 },
    { name: 'Maninagar',    km: 8.2, x: 94, y: 92 },
  ];
  const STORE_POS = { x: 48, y: 48 };

  const FIRST = ['Aarav','Vivaan','Diya','Ananya','Rohan','Priya','Kavya','Arjun','Isha','Meera','Nisha','Rahul','Sneha','Karan','Pooja','Harsh','Jinal','Dhruv','Riya','Yash','Krupa','Parth','Hetal','Kunal','Mitali','Nirav','Payal','Tanvi','Jay','Foram'];
  const LAST = ['Patel','Shah','Mehta','Desai','Joshi','Trivedi','Pandya','Parmar','Dabhi','Solanki','Chauhan','Rana','Vyas','Bhatt','Modi'];

  const DEFAULT_SETTINGS = {
    shopName: 'QuickMart Dark Store #1',
    shopAddress: 'Plot 12, Near Commerce Six Roads, Navrangpura, Ahmedabad 380009',
    gstin: '24ABCDE1234F1Z5',
    fssai: '10726012000123',
    radiusKm: 5,
    minOrder: 99,
    deliveryCharge: 25,
    freeDeliveryAbove: 199,
    handlingFee: 4,
    openTime: '00:00',
    closeTime: '23:59',
    expiryAlertDays: 3,
    riderPayPerOrder: 35,
    autoAssignRider: true,
    codEnabled: true,
    deliveryMins: 12,
  };

  // ---------- build fresh demo state ----------
  function buildSeed() {
    const t0 = now();
    const cats = window.QM_SEED_CATEGORIES;
    const products = window.QM_SEED_PRODUCTS.map(p => ({
      id: p.id, name: p.name, brand: p.brand, cat: p.cat, sub: p.sub, unit: p.unit,
      mrp: p.mrp, price: p.price, cost: p.cost, gst: p.gst, barcode: p.barcode, rack: p.rack,
      emoji: p.emoji, best: p.best, reorder: p.reorder, active: true,
      batches: p.batches.map(b => ({
        batch: b.b, qty: b.q,
        exp: b.e === null ? null : t0 + b.e * DAY,
        cost: p.cost, received: t0 - rnd(2, 20) * DAY,
      })),
    }));

    const riders = [
      { id: 'R1', name: 'Ramesh Thakor', phone: '9824011111', vehicle: 'GJ01 AB 1234 · Bike', online: true,  rating: 4.8, cash: 0, joined: t0 - 120 * DAY },
      { id: 'R2', name: 'Suresh Rathod', phone: '9824022222', vehicle: 'GJ01 CD 5678 · Scooter', online: true,  rating: 4.6, cash: 0, joined: t0 - 90 * DAY },
      { id: 'R3', name: 'Imran Shaikh',  phone: '9824033333', vehicle: 'GJ01 EF 9012 · EV Scooter', online: true,  rating: 4.9, cash: 0, joined: t0 - 60 * DAY },
      { id: 'R4', name: 'Mahesh Vaghela',phone: '9824044444', vehicle: 'GJ01 GH 3456 · Bike', online: false, rating: 4.4, cash: 0, joined: t0 - 45 * DAY },
      { id: 'R5', name: 'Vikram Solanki',phone: '9824055555', vehicle: 'GJ01 JK 7890 · Bike', online: false, rating: 4.7, cash: 0, joined: t0 - 30 * DAY },
    ];

    const R = seeded(424242);
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const customers = [];
    for (let i = 0; i < 40; i++) {
      const loc = LOCALITIES[Math.floor(R() * 9)];
      customers.push({
        phone: '98' + String(25000000 + Math.floor(R() * 74999999)).padStart(8, '0'),
        name: pick(FIRST) + ' ' + pick(LAST),
        addresses: [{ id: 'A1', label: 'Home', line: `${10 + Math.floor(R() * 300)}, ${pick(['Shivam','Sahjanand','Suryodaya','Aakash','Krishna','Shanti'])} Apartments, ${loc.name}`, loc: loc.name, km: loc.km, x: loc.x, y: loc.y }],
        created: t0 - Math.floor(R() * 60) * DAY,
      });
    }
    // demo customer (pre-filled on login screen)
    customers.unshift({ phone: '9876543210', name: 'Demo Customer', created: t0 - 5 * DAY,
      addresses: [{ id: 'A1', label: 'Home', line: 'B-402, Shivalik Heights, Navrangpura', loc: 'Navrangpura', km: 0.8, x: 52, y: 44 },
                  { id: 'A2', label: 'Office', line: '3rd Floor, Time Square, C.G. Road', loc: 'C.G. Road', km: 1.2, x: 58, y: 52 }] });

    const coupons = [
      { code: 'WELCOME50', type: 'flat', value: 50, minOrder: 199, maxDisc: 50, active: true, desc: '₹50 off on orders above ₹199' },
      { code: 'SAVE10', type: 'pct', value: 10, minOrder: 299, maxDisc: 75, active: true, desc: '10% off up to ₹75 on orders above ₹299' },
      { code: 'FREEDEL', type: 'delivery', value: 0, minOrder: 99, maxDisc: 0, active: true, desc: 'Free delivery on any order' },
    ];
    const banners = [
      { id: 'b1', title: 'Delivery in 12 minutes', sub: 'Groceries, fruits & daily needs', color: '#0c831f', cat: 'fv', active: true },
      { id: 'b2', title: 'Flat ₹50 OFF', sub: 'Use code WELCOME50 on your first order', color: '#f8a100', cat: 'snack', active: true },
      { id: 'b3', title: 'Fresh Dairy, every morning', sub: 'Milk, curd, paneer & more', color: '#2563eb', cat: 'dairy', active: true },
    ];

    const st = {
      version: 1, createdAt: t0,
      settings: { ...DEFAULT_SETTINGS },
      categories: cats, products, riders, customers, coupons, banners,
      carts: {}, orders: [], stockLog: [], grns: [], notifications: [],
      seq: { order: 10001, grn: 1 },
    };
    seedHistory(st, R);
    return st;
  }

  // Historical orders so the Admin dashboard has real numbers from day 1.
  function seedHistory(st, R) {
    const t0 = st.createdAt;
    const active = st.products.filter(p => p.price > 0);
    const best = active.filter(p => p.best);
    const modes = ['UPI', 'UPI', 'UPI', 'CARD', 'COD', 'COD', 'NB'];
    for (let d = 13; d >= 0; d--) {
      const dayStart = new Date(t0 - d * DAY); dayStart.setHours(7, 0, 0, 0);
      const maxH = d === 0 ? Math.max(0, (new Date(t0).getHours() - 7)) : 15;
      const count = d === 0 ? Math.min(14, Math.floor(maxH * 1.6)) : 22 + Math.floor(R() * 20);
      for (let i = 0; i < count; i++) {
        const created = dayStart.getTime() + Math.floor(R() * Math.max(1, maxH) * 3600000);
        if (created > t0 - 20 * 60000) continue;
        const cust = st.customers[1 + Math.floor(R() * (st.customers.length - 1))];
        const n = 1 + Math.floor(R() * 6);
        const items = [];
        for (let k = 0; k < n; k++) {
          const p = (R() < 0.45 && best.length) ? best[Math.floor(R() * best.length)] : active[Math.floor(R() * active.length)];
          if (items.find(x => x.pid === p.id)) continue;
          items.push(lineFrom(p, 1 + Math.floor(R() * 3)));
        }
        items.forEach(it => { it.picked = it.qty; });
        const payMode = modes[Math.floor(R() * modes.length)];
        const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
        const cpn = R() < 0.25 ? st.coupons.find(c => c.minOrder <= sub && (c.code !== 'FREEDEL' || sub < st.settings.freeDeliveryAbove)) : null;
        const o = makeOrder(st, cust, cust.addresses[0], items, payMode, cpn || null, created);
        const cancelled = R() < 0.04;
        const rider = st.riders[Math.floor(R() * st.riders.length)];
        const pickMin = 1.5 + R() * 3, packMin = 0.8 + R() * 1.5, waitMin = 0.5 + R() * 2, rideMin = 4 + R() * 9;
        if (cancelled) {
          o.status = 'CANCELLED'; o.cancelReason = 'Customer cancelled';
          o.timeline.push({ s: 'CANCELLED', t: created + 2 * 60000 });
          if (o.payMode !== 'COD') { o.payStatus = 'REFUNDED'; o.refunds.push({ amt: o.total, reason: 'Order cancelled', kind: 'cancel', t: created + 3 * 60000 }); }
        } else {
          let t = created;
          o.pickStart = t += 0.6 * 60000; o.timeline.push({ s: 'PICKING', t });
          o.pickEnd = t += pickMin * 60000;
          o.packEnd = t += packMin * 60000; o.timeline.push({ s: 'PACKED', t });
          o.riderId = rider.id; o.timeline.push({ s: 'ASSIGNED', t: t += 0.3 * 60000 });
          o.timeline.push({ s: 'ACCEPTED', t: t += 0.3 * 60000 });
          o.pickedUpAt = t += waitMin * 60000; o.timeline.push({ s: 'PICKED_UP', t });
          o.deliveredAt = t += rideMin * 60000; o.timeline.push({ s: 'DELIVERED', t });
          o.status = 'DELIVERED';
          o.scanErrors = R() < 0.07 ? 1 : 0;
          if (o.payMode === 'COD') { o.payStatus = 'COD_COLLECTED'; o.codSettled = d > 0; if (d === 0) rider.cash += o.total; }
          if (R() < 0.55) o.rating = R() < 0.8 ? 5 : 4;
          if (R() < 0.03) { const a = round2(o.items[0].price * o.items[0].qty); o.refunds.push({ amt: a, reason: 'Damaged item reported', kind: 'claim', t: t + 3600000 }); o.refundTotal = a; }
        }
        st.orders.push(o);
      }
    }
  }

  function lineFrom(p, qty) {
    return { pid: p.id, name: p.name, unit: p.unit, emoji: p.emoji, rack: p.rack, barcode: p.barcode,
      qty, price: p.price, mrp: p.mrp, cost: p.cost, gst: p.gst, picked: 0, oos: false, alloc: [] };
  }

  function makeOrder(st, cust, addr, items, payMode, coupon, created) {
    const bill = computeBill(st, items, coupon);
    const o = {
      id: 'QM' + (st.seq.order++), created: created || now(),
      customer: { phone: cust.phone, name: cust.name },
      address: { ...addr },
      items, ...bill, coupon: coupon ? coupon.code : null,
      payMode, payStatus: payMode === 'COD' ? 'COD_DUE' : 'PAID',
      payRef: payMode === 'COD' ? null : 'pay_' + Math.random().toString(36).slice(2, 12).toUpperCase(),
      status: 'PLACED', riderId: null,
      pickupOtp: otp4(), deliveryOtp: otp4(),
      timeline: [{ s: 'PLACED', t: created || now() }],
      refunds: [], refundTotal: 0, scanErrors: 0, rating: null,
    };
    return o;
  }

  // ---------- persistence ----------
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { S = JSON.parse(raw); return; } } catch (e) {}
    S = buildSeed(); save(true);
  }
  function save(silent) {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); }
    if (!silent) emit();
  }
  function emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
  window.addEventListener('storage', (e) => { if (e.key === KEY && e.newValue) { S = JSON.parse(e.newValue); emit(); } });

  // ---------- stock helpers (batch-wise, FEFO) ----------
  const isExpired = (b) => b.exp !== null && b.exp < now();
  function avail(p) { return p.batches.reduce((s, b) => s + (isExpired(b) ? 0 : b.qty), 0); }
  function totalQty(p) { return p.batches.reduce((s, b) => s + b.qty, 0); }
  function fefo(p) { return p.batches.filter(b => !isExpired(b) && b.qty > 0).sort((a, b) => (a.exp ?? 9e15) - (b.exp ?? 9e15)); }
  function reserve(p, qty) {
    const alloc = []; let need = qty;
    for (const b of fefo(p)) { if (!need) break; const take = Math.min(b.qty, need); b.qty -= take; need -= take; alloc.push({ batch: b.batch, qty: take }); }
    return { alloc, short: need };
  }
  function release(p, alloc) {
    alloc.forEach(a => { const b = p.batches.find(x => x.batch === a.batch); if (b) b.qty += a.qty; else p.batches.push({ batch: a.batch, qty: a.qty, exp: null, cost: p.cost, received: now() }); });
  }
  function log(type, p, qty, note, batch) { S.stockLog.unshift({ t: now(), type, pid: p.id, name: p.name, qty, note: note || '', batch: batch || '' }); if (S.stockLog.length > 800) S.stockLog.length = 800; }
  function notify(to, text, orderId) { S.notifications.unshift({ id: Math.random().toString(36).slice(2), to, text, orderId, t: now() }); if (S.notifications.length > 100) S.notifications.length = 100; }

  // ---------- pricing ----------
  function computeBill(st, items, coupon) {
    const set = st.settings;
    const itemTotal = round2(items.reduce((s, i) => s + i.price * i.qty, 0));
    const mrpTotal = round2(items.reduce((s, i) => s + i.mrp * i.qty, 0));
    let deliveryCharge = itemTotal >= set.freeDeliveryAbove ? 0 : set.deliveryCharge;
    let couponDisc = 0;
    if (coupon) {
      if (coupon.type === 'flat') couponDisc = Math.min(coupon.value, itemTotal);
      else if (coupon.type === 'pct') couponDisc = Math.min(round2(itemTotal * coupon.value / 100), coupon.maxDisc || 1e9);
      else if (coupon.type === 'delivery') { couponDisc = deliveryCharge; }
    }
    const handlingFee = items.length ? set.handlingFee : 0;
    const total = Math.max(0, round2(itemTotal + deliveryCharge + handlingFee - couponDisc));
    const gstAmt = round2(items.reduce((s, i) => s + (i.price * i.qty) * i.gst / (100 + i.gst), 0));
    return { itemTotal, mrpTotal, savings: round2(mrpTotal - itemTotal), deliveryCharge, handlingFee, couponDisc, total, gstAmt };
  }
  function validateCoupon(code, itemTotal) {
    const c = S.coupons.find(x => x.code.toUpperCase() === String(code || '').trim().toUpperCase() && x.active);
    if (!c) return { ok: false, msg: 'Invalid coupon code' };
    if (itemTotal < c.minOrder) return { ok: false, msg: `Add items worth ₹${c.minOrder - itemTotal} more to use ${c.code}` };
    return { ok: true, coupon: c };
  }

  // ---------- customer APIs ----------
  function getCustomer(phone) { return S.customers.find(c => c.phone === phone); }
  function loginCustomer(phone, name) {
    let c = getCustomer(phone);
    if (!c) { c = { phone, name: name || 'Customer', addresses: [], created: now() }; S.customers.push(c); save(); }
    return c;
  }
  function updateCustomer(phone, patch) { Object.assign(getCustomer(phone), patch); save(); }
  function addAddress(phone, label, line, locName) {
    const c = getCustomer(phone); const loc = LOCALITIES.find(l => l.name === locName);
    const a = { id: 'A' + (c.addresses.length + 1) + Date.now() % 1000, label, line, loc: loc.name, km: loc.km, x: loc.x, y: loc.y };
    c.addresses.push(a); save(); return a;
  }
  function cart(phone) { return S.carts[phone] || (S.carts[phone] = {}); }
  function setCartQty(phone, pid, qty) {
    const c = cart(phone); const p = product(pid);
    qty = Math.max(0, Math.min(qty, avail(p)));
    if (qty === 0) delete c[pid]; else c[pid] = qty; save(); return qty;
  }
  function clearCart(phone) { S.carts[phone] = {}; save(); }
  function cartItems(phone) {
    const c = cart(phone);
    return Object.keys(c).map(pid => { const p = product(pid); return p ? lineFrom(p, Math.min(c[pid], avail(p))) : null; }).filter(i => i && i.qty > 0);
  }

  function placeOrder({ phone, addressId, payMode, couponCode }) {
    const cust = getCustomer(phone); const addr = cust.addresses.find(a => a.id === addressId);
    if (!addr) throw new Error('Please select a delivery address');
    if (addr.km > S.settings.radiusKm) throw new Error('Sorry, we do not deliver to this address yet (outside ' + S.settings.radiusKm + ' km)');
    if (!isOpen()) throw new Error('Store is closed right now. Operating hours ' + S.settings.openTime + '–' + S.settings.closeTime);
    const items = cartItems(phone);
    if (!items.length) throw new Error('Cart is empty');
    let coupon = null;
    if (couponCode) { const v = validateCoupon(couponCode, items.reduce((s, i) => s + i.price * i.qty, 0)); if (v.ok) coupon = v.coupon; }
    const bill = computeBill(S, items, coupon);
    if (bill.itemTotal < S.settings.minOrder) throw new Error('Minimum order value is ₹' + S.settings.minOrder);
    if (payMode === 'COD' && !S.settings.codEnabled) throw new Error('Cash on Delivery is disabled');
    // reserve stock FEFO
    for (const it of items) {
      const p = product(it.pid); const r = reserve(p, it.qty);
      it.alloc = r.alloc;
      if (r.short) { // roll back
        items.forEach(x => { if (x.alloc.length) release(product(x.pid), x.alloc); });
        save(); throw new Error(p.name + ' just went out of stock. Please update your cart.');
      }
    }
    const o = makeOrder(S, cust, addr, items, payMode, coupon);
    items.forEach(it => log('SALE', product(it.pid), -it.qty, 'Order ' + o.id, it.alloc.map(a => a.batch).join(',')));
    S.orders.push(o); S.carts[phone] = {};
    notify('warehouse', 'New order ' + o.id + ' · ' + items.length + ' items · ₹' + o.total, o.id);
    save(); return o;
  }

  function isOpen() {
    const d = new Date(); const hm = d.getHours() * 60 + d.getMinutes();
    const [oh, om] = S.settings.openTime.split(':').map(Number); const [ch, cm] = S.settings.closeTime.split(':').map(Number);
    return hm >= oh * 60 + om && hm <= ch * 60 + cm;
  }

  function cancelOrder(id, by, reason) {
    const o = order(id);
    if (!['PLACED', 'PICKING'].includes(o.status) && by === 'customer') throw new Error('Order is already packed and cannot be cancelled');
    if (['DELIVERED', 'CANCELLED'].includes(o.status)) throw new Error('Order already ' + o.status.toLowerCase());
    o.items.forEach(it => { if (!it.oos && it.alloc.length) { release(product(it.pid), it.alloc); log('RETURN', product(it.pid), it.qty, 'Cancelled ' + o.id); } });
    if (o.riderId) { o.riderId = null; }
    o.status = 'CANCELLED'; o.cancelReason = reason || ('Cancelled by ' + by);
    o.timeline.push({ s: 'CANCELLED', t: now() });
    if (o.payMode !== 'COD') { const a = round2(o.total - o.refundTotal); if (a > 0) { o.refunds.push({ amt: a, reason: 'Order cancelled – full refund', kind: 'cancel', t: now() }); o.refundTotal = round2(o.refundTotal + a); } o.payStatus = 'REFUNDED'; }
    notify('customer:' + o.customer.phone, 'Order ' + o.id + ' cancelled' + (o.payMode !== 'COD' ? '. Refund initiated to source.' : ''), o.id);
    save();
  }
  function rateOrder(id, stars, text) { const o = order(id); o.rating = stars; o.review = text || ''; save(); }
  function requestRefund(id, reason) { const o = order(id); o.refundRequest = { reason, t: now(), status: 'PENDING' }; notify('admin', 'Refund request for ' + id, id); save(); }

  // ---------- warehouse APIs ----------
  function startPicking(id) { const o = order(id); if (o.status !== 'PLACED') return; o.status = 'PICKING'; o.pickStart = now(); o.timeline.push({ s: 'PICKING', t: now() }); save(); }
  function scan(id, code) {
    const o = order(id); code = String(code).trim();
    const it = o.items.find(i => i.barcode === code && !i.oos);
    if (!it) { o.scanErrors++; save(); const p = S.products.find(x => x.barcode === code); return { ok: false, msg: p ? `Wrong item! "${p.name}" is not in this order.` : 'Barcode not found: ' + code }; }
    if (it.picked >= it.qty) { o.scanErrors++; save(); return { ok: false, msg: `Extra quantity! ${it.name} already picked ${it.picked}/${it.qty}.` }; }
    it.picked++; save(); return { ok: true, msg: `✔ ${it.name} (${it.picked}/${it.qty})`, item: it };
  }
  function markOOS(id, pid) {
    const o = order(id); const it = o.items.find(i => i.pid === pid); const p = product(pid);
    const missing = it.qty - it.picked; if (missing <= 0) return;
    // physical stock not found: remove reservation & write stock adjustment
    const amt = round2(missing * it.price);
    it.oos = it.picked === 0; it.shortQty = missing; it.qty = it.picked;
    // the reserved units were not physically available -> adjust (they stay deducted), and zero the remaining system stock
    const leftover = totalQty(p); p.batches.forEach(b => b.qty = 0);
    log('ADJ', p, -leftover, 'Not found on shelf during picking ' + o.id);
    if (!o.items.some(i => i.qty > 0)) { save(true); cancelOrder(id, 'warehouse', 'All items out of stock'); return; }
    const bill = computeBill(S, o.items.filter(i => i.qty > 0), o.coupon ? S.coupons.find(c => c.code === o.coupon) : null);
    const oldTotal = o.total; Object.assign(o, bill);
    const diff = round2(oldTotal - o.total);
    if (o.payMode !== 'COD') { o.refunds.push({ amt: diff, reason: `${it.name} out of stock (${missing})`, kind: 'oos', t: now() }); o.refundTotal = round2(o.refundTotal + diff); }
    notify('customer:' + o.customer.phone, `${it.name} was out of stock. ` + (o.payMode !== 'COD' ? `₹${diff} refund initiated.` : `Bill reduced by ₹${diff}.`), o.id);
    save();
  }
  function markPacked(id) {
    const o = order(id);
    if (o.items.some(i => i.picked < i.qty)) throw new Error('Scan all items before packing');
    o.pickEnd = o.pickEnd || now(); o.packEnd = now(); o.status = 'PACKED'; o.timeline.push({ s: 'PACKED', t: now() });
    notify('customer:' + o.customer.phone, 'Order ' + id + ' packed & ready', id);
    if (S.settings.autoAssignRider) autoAssign(o);
    save();
  }
  function finishPicking(id) { const o = order(id); o.pickEnd = now(); save(); }
  function riderLoad(rid) { return S.orders.filter(o => o.riderId === rid && ['ASSIGNED', 'ACCEPTED', 'PICKED_UP'].includes(o.status)).length; }
  function autoAssign(o, exclude) {
    const free = S.riders.filter(r => r.online && r.id !== exclude).sort((a, b) => riderLoad(a.id) - riderLoad(b.id) || b.rating - a.rating);
    if (free.length) assignRider(o.id, free[0].id, true);
  }
  function assignRider(id, rid, silent) {
    const o = order(id); o.riderId = rid; o.status = 'ASSIGNED'; o.assignedAt = now(); o.timeline.push({ s: 'ASSIGNED', t: now() });
    notify('rider:' + rid, 'New order assigned: ' + id, id); if (!silent) save();
  }
  function verifyPickupOtp(id, otp) {
    const o = order(id);
    if (o.status !== 'ACCEPTED') throw new Error('Rider has not accepted this order yet');
    if (String(otp).trim() !== o.pickupOtp) throw new Error('Wrong Pickup OTP');
    o.status = 'PICKED_UP'; o.pickedUpAt = now(); o.timeline.push({ s: 'PICKED_UP', t: now() });
    notify('customer:' + o.customer.phone, 'Order ' + id + ' is out for delivery 🛵', id);
    save();
  }
  function grn({ pid, qty, cost, batch, exp, supplier, invoice }) {
    const p = product(pid); qty = Number(qty);
    if (!p || !(qty > 0)) throw new Error('Select product and quantity');
    const b = { batch: batch || ('GRN' + S.seq.grn + '-' + pid), qty, exp: exp ? new Date(exp).getTime() : null, cost: Number(cost) || p.cost, received: now() };
    p.batches.push(b); if (cost) p.cost = Number(cost);
    const g = { id: 'GRN' + String(S.seq.grn++).padStart(4, '0'), t: now(), pid, name: p.name, qty, cost: b.cost, batch: b.batch, exp: b.exp, supplier: supplier || '-', invoice: invoice || '-' };
    S.grns.unshift(g); log('GRN', p, qty, 'Stock-in ' + g.id + ' from ' + g.supplier, b.batch); save(); return g;
  }
  function adjust({ pid, batch, qty, reason }) {
    const p = product(pid); const b = p.batches.find(x => x.batch === batch); qty = Number(qty);
    if (!b || !(qty > 0) || qty > b.qty) throw new Error('Invalid quantity for this batch');
    b.qty -= qty; log('ADJ', p, -qty, reason, batch); save();
  }
  function writeOffExpired() {
    let n = 0; S.products.forEach(p => p.batches.forEach(b => { if (isExpired(b) && b.qty > 0) { log('ADJ', p, -b.qty, 'Expired stock write-off', b.batch); n += b.qty; b.qty = 0; } }));
    save(); return n;
  }

  // ---------- rider APIs ----------
  function setOnline(rid, on) {
    const r = rider(rid); r.online = on;
    if (on) S.orders.filter(o => o.status === 'PACKED' && !o.riderId).forEach(o => autoAssign(o));
    save();
  }
  function acceptOrder(id) { const o = order(id); o.status = 'ACCEPTED'; o.acceptedAt = now(); o.timeline.push({ s: 'ACCEPTED', t: now() }); notify('warehouse', 'Rider accepted ' + id + ' — coming for pickup', id); save(); }
  function rejectOrder(id) {
    const o = order(id); const rid = o.riderId; o.riderId = null; o.status = 'PACKED'; o.timeline.push({ s: 'REJECTED', t: now(), by: rid });
    if (S.settings.autoAssignRider) autoAssign(o, rid); save();
  }
  function deliver(id, otp, cashCollected) {
    const o = order(id);
    if (o.status !== 'PICKED_UP') throw new Error('Order not out for delivery');
    if (String(otp).trim() !== o.deliveryOtp) throw new Error('Wrong Delivery OTP — ask customer to check the app');
    if (o.payMode === 'COD') { if (!cashCollected) throw new Error('Confirm COD cash collected'); o.payStatus = 'COD_COLLECTED'; rider(o.riderId).cash = round2(rider(o.riderId).cash + o.total); }
    o.status = 'DELIVERED'; o.deliveredAt = now(); o.timeline.push({ s: 'DELIVERED', t: now() });
    notify('customer:' + o.customer.phone, 'Order ' + id + ' delivered. Enjoy! Rate your experience ⭐', id);
    save();
  }
  function settleCash(rid) { const r = rider(rid); const amt = r.cash; S.orders.filter(o => o.riderId === rid && o.payMode === 'COD' && o.payStatus === 'COD_COLLECTED').forEach(o => o.codSettled = true); r.cash = 0; save(); return amt; }
  function riderPosition(o) {
    const a = STORE_POS, b = { x: o.address.x, y: o.address.y };
    if (o.status === 'DELIVERED') return { ...b, progress: 1 };
    if (o.status !== 'PICKED_UP') return { ...a, progress: 0 };
    const dur = Math.max(45000, o.address.km * 25000); // demo: ~25 sec per km
    const p = Math.min(0.97, (now() - o.pickedUpAt) / dur);
    return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, progress: p };
  }

  // ---------- admin APIs ----------
  function upsertProduct(data) {
    let p = data.id ? product(data.id) : null;
    if (!p) {
      const n = S.products.length + 1; let id; do { id = 'P' + String(n + Math.floor(Math.random() * 90)).padStart(4, '0'); } while (product(id));
      p = { id, batches: [], active: true, best: false, reorder: 10, emoji: (S.categories.find(c => c.id === data.cat) || {}).emoji || '📦', sub: data.sub || 'General' };
      S.products.push(p);
    }
    ['name', 'brand', 'cat', 'sub', 'unit', 'rack', 'barcode', 'emoji'].forEach(k => { if (data[k] !== undefined && data[k] !== '') p[k] = String(data[k]); });
    ['mrp', 'price', 'cost', 'gst', 'reorder'].forEach(k => { if (data[k] !== undefined && data[k] !== '') p[k] = Number(data[k]); });
    if (data.active !== undefined) p.active = !!data.active;
    if (data.best !== undefined) p.best = !!data.best;
    if (!p.barcode) p.barcode = '890' + String(Date.now()).slice(-10);
    save(); return p;
  }
  function processRefundRequest(id, approve) {
    const o = order(id); if (!o.refundRequest) return;
    o.refundRequest.status = approve ? 'APPROVED' : 'REJECTED';
    if (approve) { const a = round2(Math.min(o.total - o.refundTotal, o.items[0].price * o.items[0].qty)); o.refunds.push({ amt: a, reason: o.refundRequest.reason, kind: 'claim', t: now() }); o.refundTotal = round2(o.refundTotal + a); }
    save();
  }
  function reset() { localStorage.removeItem(KEY); S = buildSeed(); save(); }

  // ---------- getters ----------
  const product = (id) => S.products.find(p => p.id === id);
  const order = (id) => S.orders.find(o => o.id === id);
  const rider = (id) => S.riders.find(r => r.id === id);

  load();

  window.QM = {
    get state() { return S; }, on: (fn) => listeners.push(fn), save, emit, reset,
    LOCALITIES, STORE_POS, DAY,
    avail, totalQty, isExpired, fefo, computeBill: (items, c) => computeBill(S, items, c), validateCoupon, isOpen,
    product, order, rider, riderLoad,
    getCustomer, loginCustomer, updateCustomer, addAddress, cart, cartItems, setCartQty, clearCart,
    placeOrder, cancelOrder, rateOrder, requestRefund,
    startPicking, scan, markOOS, markPacked, finishPicking, assignRider, autoAssign, verifyPickupOtp, grn, adjust, writeOffExpired,
    setOnline, acceptOrder, rejectOrder, deliver, settleCash, riderPosition,
    upsertProduct, processRefundRequest,
  };
})();

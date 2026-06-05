/**
 * Queens Custom Creations — Checkout Module
 * Handles real order submission + PayPal payment flow.
 * Replaces the old localStorage-only cart checkout.
 */

(function () {
  'use strict';

  // ── Cart drawer "Checkout" button ─────────────────────────────────────────

  const checkoutBtn = document.getElementById('checkout-btn');
  if (!checkoutBtn) return;

  checkoutBtn.addEventListener('click', openCheckoutModal);

  // ── Build checkout modal ──────────────────────────────────────────────────

  const modalHTML = `
<div class="checkout-overlay" id="checkout-overlay" style="
  position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:2000;
  display:flex;align-items:center;justify-content:center;padding:20px;
">
  <div style="
    background:#141418;border:1px solid rgba(255,255,255,0.07);
    border-radius:20px;width:100%;max-width:480px;max-height:90vh;
    overflow-y:auto;
  ">
    <div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between">
      <h3 style="font-family:'Clash Display',sans-serif;font-size:1.1rem;color:#fff">Complete Your Order</h3>
      <button id="co-close" style="background:none;border:1px solid rgba(255,255,255,0.1);border-radius:50%;width:32px;height:32px;color:rgba(255,255,255,0.6);cursor:pointer;font-size:18px">×</button>
    </div>
    <div style="padding:24px">

      <!-- Order summary -->
      <div style="margin-bottom:20px">
        <p style="font-size:0.7rem;color:rgba(255,255,255,0.35);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px">Order Summary</p>
        <div id="co-items" style="font-size:0.85rem;color:rgba(255,255,255,0.8)"></div>
        <div id="co-total" style="font-size:1.15rem;font-weight:700;color:#FF1A8C;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.07)"></div>
      </div>

      <!-- Contact info -->
      <div style="margin-bottom:16px">
        <p style="font-size:0.7rem;color:rgba(255,255,255,0.35);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px">Your Info</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div>
            <label style="display:block;font-size:0.72rem;color:rgba(255,255,255,0.45);margin-bottom:5px">First Name *</label>
            <input id="co-fname" type="text" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:0.88rem;font-family:inherit;outline:none" placeholder="Queens"/>
          </div>
          <div>
            <label style="display:block;font-size:0.72rem;color:rgba(255,255,255,0.45);margin-bottom:5px">Last Name *</label>
            <input id="co-lname" type="text" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:0.88rem;font-family:inherit;outline:none" placeholder="Royale"/>
          </div>
        </div>
        <div style="margin-bottom:10px">
          <label style="display:block;font-size:0.72rem;color:rgba(255,255,255,0.45);margin-bottom:5px">Email *</label>
          <input id="co-email" type="email" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:0.88rem;font-family:inherit;outline:none" placeholder="you@example.com"/>
        </div>
        <div style="margin-bottom:10px">
          <label style="display:block;font-size:0.72rem;color:rgba(255,255,255,0.45);margin-bottom:5px">Phone (for order updates)</label>
          <input id="co-phone" type="tel" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:0.88rem;font-family:inherit;outline:none" placeholder="(713) 555-0100"/>
        </div>
        <div>
          <label style="display:block;font-size:0.72rem;color:rgba(255,255,255,0.45);margin-bottom:5px">Special Notes / Custom Details</label>
          <textarea id="co-notes" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:0.88rem;font-family:inherit;outline:none;resize:vertical" placeholder="Colors, theme, occasion, personalization…"></textarea>
        </div>
      </div>

      <div id="co-error" style="color:#ef4444;font-size:0.82rem;margin-bottom:12px;min-height:18px"></div>

      <!-- Pay buttons -->
      <button id="co-submit-pay" style="
        width:100%;padding:14px;border-radius:999px;background:#FF1A8C;
        color:#fff;font-family:'Clash Display',sans-serif;font-size:1rem;
        font-weight:600;border:none;cursor:pointer;margin-bottom:10px;
        transition:opacity 0.2s;
      ">Pay with PayPal 💳</button>

      <button id="co-submit-free" style="
        width:100%;padding:13px;border-radius:999px;background:none;
        border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.65);
        font-family:inherit;font-size:0.85rem;cursor:pointer;
        transition:all 0.2s;
      ">Place Order — Pay via DM/Cash App</button>

      <p style="font-size:0.72rem;color:rgba(255,255,255,0.3);text-align:center;margin-top:12px">
        🔒 Secure checkout. The Vibe Queen reviews every order personally.
      </p>
    </div>
  </div>
</div>`;

  function openCheckoutModal() {
    // Remove if already exists
    const existing = document.getElementById('checkout-overlay');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Populate order summary
    const cart = window.getCart ? window.getCart() : JSON.parse(localStorage.getItem('qcc_cart') || '[]');
    const coupon = window.getAppliedCoupon ? window.getAppliedCoupon() : null;

    let subtotal = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
    let discount = coupon ? Math.round(subtotal * (coupon.pct || 0) / 100 * 100) / 100 : 0;
    let total = Math.max(0, subtotal - discount);

    document.getElementById('co-items').innerHTML = cart.map(i =>
      `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span>${i.name} × ${i.qty || 1}</span>
        <span>$${(i.price * (i.qty || 1)).toFixed(2)}</span>
      </div>`).join('') +
      (coupon ? `<div style="display:flex;justify-content:space-between;padding:5px 0;color:rgba(34,197,94,0.85);font-size:0.82rem">
        <span>Coupon: ${coupon.code}</span><span>−$${discount.toFixed(2)}</span></div>` : '');

    document.getElementById('co-total').textContent = `Total: $${total.toFixed(2)}`;

    // Pre-fill if logged in
    const user = window.getAuthUser ? window.getAuthUser() : null;
    if (user) {
      const [fname, ...rest] = (user.name || '').split(' ');
      document.getElementById('co-fname').value = fname || '';
      document.getElementById('co-lname').value = rest.join(' ') || '';
      document.getElementById('co-email').value = user.email || '';
    }

    // Close
    document.getElementById('co-close').addEventListener('click', () => {
      document.getElementById('checkout-overlay').remove();
    });
    document.getElementById('checkout-overlay').addEventListener('click', e => {
      if (e.target.id === 'checkout-overlay') e.target.remove();
    });

    // Pay with PayPal
    document.getElementById('co-submit-pay').addEventListener('click', () => submitOrder('paypal', cart, subtotal, discount, total, coupon));

    // Pay via DM
    document.getElementById('co-submit-free').addEventListener('click', () => submitOrder('dm', cart, subtotal, discount, total, coupon));
  }

  async function submitOrder(method, cart, subtotal, discount, total, coupon) {
    const fname  = document.getElementById('co-fname').value.trim();
    const lname  = document.getElementById('co-lname').value.trim();
    const email  = document.getElementById('co-email').value.trim();
    const phone  = document.getElementById('co-phone').value.trim();
    const notes  = document.getElementById('co-notes').value.trim();
    const errEl  = document.getElementById('co-error');

    if (!fname || !email) { errEl.textContent = 'Name and email are required.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errEl.textContent = 'Please enter a valid email.'; return; }
    if (!cart.length) { errEl.textContent = 'Your cart is empty.'; return; }
    errEl.textContent = '';

    const payBtn  = document.getElementById('co-submit-pay');
    const freeBtn = document.getElementById('co-submit-free');
    payBtn.disabled = true; payBtn.textContent = 'Processing…';
    freeBtn.disabled = true;

    const orderPayload = {
      customer_name:  `${fname} ${lname}`.trim(),
      customer_email: email,
      customer_phone: phone || null,
      items: cart.map(i => ({ name: i.name, qty: i.qty || 1, price: i.price })),
      subtotal, discount, total,
      coupon: coupon?.code || null,
      notes: notes || null,
    };

    try {
      // Create order record first
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      }).then(r => r.json());

      if (!orderRes.order_num) throw new Error('Order creation failed');

      localStorage.setItem('qcc_last_order_num', orderRes.order_num);

      if (method === 'dm') {
        // No payment — just show success
        clearCart();
        document.getElementById('checkout-overlay').remove();
        location.href = `/order-success?order=${orderRes.order_num}`;
        return;
      }

      // PayPal flow: create PayPal order
      const ppRes = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total: total.toFixed(2), order_id: orderRes.order_id }),
      }).then(r => r.json());

      if (ppRes.error) throw new Error(ppRes.error);

      // Find approval URL and redirect
      const approvalUrl = ppRes.links?.find(l => l.rel === 'approve')?.href;
      if (!approvalUrl) throw new Error('No PayPal approval URL');

      // Store our order ID for capture callback
      localStorage.setItem('qcc_paypal_order_id', ppRes.id);
      localStorage.setItem('qcc_our_order_id', orderRes.order_id);

      clearCart();
      location.href = approvalUrl;

    } catch (err) {
      errEl.textContent = err.message || 'Something went wrong. Try again.';
      payBtn.disabled = false; payBtn.textContent = 'Pay with PayPal 💳';
      freeBtn.disabled = false;
    }
  }

  function clearCart() {
    localStorage.removeItem('qcc_cart');
    localStorage.removeItem('qcc_coupon');
    if (window.renderCart) window.renderCart();
    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.textContent = '0';
  }

  // ── Handle PayPal return (after approval on PayPal.com) ───────────────────

  const urlParams = new URLSearchParams(location.search);
  const paypalToken = urlParams.get('token');     // PayPal's order ID on return
  const ourOrderId  = localStorage.getItem('qcc_our_order_id');

  if (paypalToken && ourOrderId && location.pathname === '/') {
    // Capture the payment
    fetch('/api/paypal/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypal_order_id: paypalToken, our_order_id: ourOrderId }),
    }).then(r => r.json()).then(data => {
      localStorage.removeItem('qcc_paypal_order_id');
      localStorage.removeItem('qcc_our_order_id');
      const num = localStorage.getItem('qcc_last_order_num') || '';
      location.href = `/order-success?order=${num}`;
    }).catch(() => {
      location.href = '/order-success';
    });
  }

})();

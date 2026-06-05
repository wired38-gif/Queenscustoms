/**
 * Queens Custom Creations — Notifications
 * Sends email (nodemailer/Gmail SMTP) + SMS (Twilio) on new orders.
 * Credentials loaded from .env (never committed to GitHub).
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// ── Email ─────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'wired4365@aol.com',
    pass: process.env.SMTP_PASS || '',   // Set in .env: Gmail App Password
  },
});

// Fallback: use AOL SMTP if Gmail not configured
const aolTransporter = nodemailer.createTransport({
  host: 'smtp.aol.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'wired4365@aol.com',
    pass: process.env.SMTP_PASS || '',
  },
});

async function sendOrderEmail(order) {
  if (!process.env.SMTP_PASS) {
    console.log('[notify] No SMTP_PASS set — skipping email');
    return;
  }

  const itemsList = JSON.parse(order.items)
    .map(i => `  • ${i.name} x${i.qty} — $${(i.price * i.qty).toFixed(2)}`)
    .join('\n');

  const adminMsg = {
    from: `"Queens Custom Creations" <${process.env.SMTP_USER}>`,
    to: 'wired4365@aol.com',
    subject: `👑 New Order ${order.order_num} — $${order.total.toFixed(2)}`,
    text: `New order received!\n\nOrder: ${order.order_num}\nCustomer: ${order.customer_name} (${order.customer_email})\nPhone: ${order.customer_phone || 'N/A'}\n\nItems:\n${itemsList}\n\nSubtotal: $${order.subtotal.toFixed(2)}\nCoupon: ${order.coupon || 'None'} (-$${order.discount.toFixed(2)})\nTotal: $${order.total.toFixed(2)}\nPayment: ${order.payment_status}\n\nNotes: ${order.notes || 'None'}\n\nView in admin: https://queenscustoms.shop/admin`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#FF1A8C;padding:24px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:24px">👑 New Order!</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">${order.order_num}</p>
        </div>
        <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #eee">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#666;font-size:14px">Customer</td><td style="padding:8px 0;font-weight:600">${order.customer_name}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:14px">Email</td><td style="padding:8px 0">${order.customer_email}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:14px">Phone</td><td style="padding:8px 0">${order.customer_phone || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:14px">Total</td><td style="padding:8px 0;font-size:20px;font-weight:700;color:#FF1A8C">$${order.total.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:14px">Payment</td><td style="padding:8px 0">${order.payment_status === 'paid' ? '✅ Paid' : '⏳ ' + order.payment_status}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
          <h3 style="margin:0 0 12px;font-size:16px">Items Ordered</h3>
          ${JSON.parse(order.items).map(i => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f5f5f5">
              <span>${i.name} × ${i.qty}</span>
              <span style="font-weight:600">$${(i.price * i.qty).toFixed(2)}</span>
            </div>`).join('')}
          ${order.notes ? `<p style="margin-top:16px;padding:12px;background:#fff8f0;border-radius:8px;font-size:14px"><strong>Notes:</strong> ${order.notes}</p>` : ''}
          <div style="text-align:center;margin-top:24px">
            <a href="https://queenscustoms.shop/admin" style="background:#FF1A8C;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">View in Admin Portal →</a>
          </div>
        </div>
      </div>`,
  };

  // Customer confirmation
  const customerMsg = {
    from: `"Queens Custom Creations 👑" <${process.env.SMTP_USER}>`,
    to: order.customer_email,
    subject: `Your order is confirmed! ${order.order_num}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#FF1A8C,#c0006a);padding:32px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:28px">👑 Order Confirmed!</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:16px">Thank you, ${order.customer_name}!</p>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #eee">
          <p style="color:#444;font-size:15px">Your order <strong>${order.order_num}</strong> has been received. The Vibe Queen will personally review your order and reach out within 24 hours to confirm details.</p>
          <div style="background:#fff0f7;border-radius:12px;padding:20px;margin:20px 0">
            <p style="margin:0 0 8px;font-weight:700;color:#FF1A8C">Order Total: $${order.total.toFixed(2)}</p>
            ${JSON.parse(order.items).map(i => `<p style="margin:4px 0;color:#555;font-size:14px">• ${i.name} × ${i.qty}</p>`).join('')}
          </div>
          <p style="color:#666;font-size:14px">Questions? DM us on TikTok <a href="https://www.tiktok.com/@the_vibe_queen_hbic" style="color:#FF1A8C">@the_vibe_queen_hbic</a></p>
          <div style="text-align:center;margin-top:24px">
            <a href="https://queenscustoms.shop" style="background:#FF1A8C;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">Shop More 👑</a>
          </div>
        </div>
      </div>`,
  };

  try {
    await aolTransporter.sendMail(adminMsg);
    await aolTransporter.sendMail(customerMsg);
    console.log('[notify] Order emails sent');
  } catch (err) {
    console.error('[notify] Email error:', err.message);
  }
}

// ── SMS via Twilio ─────────────────────────────────────────────────────────────

async function sendOrderSMS(order) {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN) {
    console.log('[notify] No Twilio credentials — skipping SMS');
    return;
  }

  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

  const itemNames = JSON.parse(order.items).map(i => i.name).join(', ');
  const msg = `👑 NEW ORDER! ${order.order_num}\nCustomer: ${order.customer_name}\nItems: ${itemNames}\nTotal: $${order.total.toFixed(2)} (${order.payment_status})\nAdmin: https://queenscustoms.shop/admin`;

  try {
    await client.messages.create({
      body: msg,
      from: process.env.TWILIO_FROM,
      to: '+17132405477',   // Your number
    });
    console.log('[notify] SMS sent');
  } catch (err) {
    console.error('[notify] SMS error:', err.message);
  }
}

// ── Combined notifier ─────────────────────────────────────────────────────────

async function notifyNewOrder(order) {
  await Promise.allSettled([
    sendOrderEmail(order),
    sendOrderSMS(order),
  ]);
}

module.exports = { notifyNewOrder };

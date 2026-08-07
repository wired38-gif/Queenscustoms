/**
 * Setup Coach — rule-based helpers + optional OpenAI-compatible LLM.
 * Env (never commit real values):
 *   SETUP_COACH_API_KEY  preferred
 *   OPENAI_API_KEY       fallback
 *   SETUP_COACH_MODEL    default gpt-4o-mini
 *   SETUP_COACH_BASE_URL default https://api.openai.com/v1
 */

const STEP_NAMES = [
  'Welcome',
  'E-Commerce',
  'Payments',
  'Logins',
  'Email',
  'Products',
  'Admins',
  'Complete',
];

function coachKeyConfigured() {
  const key = (process.env.SETUP_COACH_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  return Boolean(key);
}

function coachStatus() {
  return {
    configured: coachKeyConfigured(),
    model: (process.env.SETUP_COACH_MODEL || 'gpt-4o-mini').trim(),
    baseUrlSet: Boolean((process.env.SETUP_COACH_BASE_URL || '').trim()),
  };
}

function ruleBasedSetupCoach(message, ctx = {}) {
  const t = String(message || '').toLowerCase();
  const step = typeof ctx.step === 'number' ? ctx.step : null;
  const stepName = step != null ? STEP_NAMES[step] || `step ${step}` : null;

  if (/shop\s*id/.test(t) || /etsy\s*shop/.test(t)) {
    return (
      "Shop ID is the short name or number that identifies your store on a platform like Etsy — not your password. " +
      "Think of it like a house number for your shop so Etsy (or Amazon/TikTok later) knows which storefront you’re connecting. " +
      "Find it in that platform’s seller dashboard (often under Shop Manager → Settings → Info, or in the shop URL). " +
      "Paste only that ID into Setup — we never need your Etsy password."
    );
  }

  if (/\bskip\b/.test(t) || /can i skip|do i need|optional/.test(t)) {
    return (
      "Yes — most marketplace rows (Etsy, Amazon, TikTok) and email tools are optional. " +
      "You can tap Continue / skip and open Setup again later from the top toggle. " +
      "Payments (Stripe or PayPal) matter if you want checkout to take real money today; everything else can wait."
    );
  }

  if (/api\s*key|secret\s*key|client\s*secret|where do i (find|get|paste)|what (is|are) (these|my) keys/.test(t)) {
    return (
      "API keys are passwords for software (not for you logging into the website). " +
      "You create them in Stripe / PayPal / Google Cloud / etc., copy once, and paste into the matching field here. " +
      "Hit Save and we activate on the live shop automatically — no terminal. " +
      "Never share secret keys in chat or screenshots."
    );
  }

  if (/stripe|connect client|payment/.test(t)) {
    return (
      "For Stripe: create (or open) your Stripe account, copy Publishable + Secret keys from Developers → API keys, " +
      "and optional Connect Client ID from Settings → Connect. Paste them on the Payments step and tap Save. " +
      "If Connect is ready we’ll open Stripe so you can approve linking. PayPal is paste-and-Save only."
    );
  }

  if (/paypal/.test(t)) {
    return (
      "PayPal: open developer.paypal.com → Apps & Credentials → Live (or Sandbox to test). " +
      "Create a REST app, copy Client ID + Secret into Setup → Payments, then Save."
    );
  }

  if (/google|apple|facebook|social|sign-?in|login/.test(t)) {
    return (
      "Social login uses your apps in Google Cloud / Apple Developer / Meta. " +
      "Create OAuth credentials, set the redirect URL to your shop (https://queenscustoms.shop + the path we show), " +
      "paste Client ID/Secret (or Apple team/key), toggle Enable ON, then Save. Buttons show up on shop login once live."
    );
  }

  if (/email|mailchimp|klaviyo|sendgrid|smtp/.test(t)) {
    return (
      "Email marketing is optional. If you use Mailchimp/Klaviyo/SendGrid, paste the API key on the Email step and Save. " +
      "You can skip and add it later from Setup."
    );
  }

  if (/explain|eli5|like i('|'|)m five|simple|what does|what is/.test(t)) {
    return (
      "Setup is a checklist that stores keys for the shop so customers can pay and sign in. " +
      "You copy codes from other company dashboards and paste them here; Save turns them on. " +
      "If something is confusing, ask about that field by name (for example Shop ID or Stripe secret)."
    );
  }

  if (stepName) {
    return (
      `You’re on the ${stepName} step. Follow the numbered “How every step works” list on the left: open the link, copy the keys, paste, Save. ` +
      `Ask me about any single field (Shop ID, secret key, Skip, etc.) if you want a plain-language answer.`
    );
  }

  return (
    "I’m your Setup Coach. Ask about Shop ID, API keys, Stripe/PayPal, Google login, or skipping steps. " +
    "When LLM keys are configured on the server I can answer freer-form; otherwise I use short guided scripts."
  );
}

async function tryOpenAICoach(message, ctx = {}) {
  const apiKey = (process.env.SETUP_COACH_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return null;

  const model = (process.env.SETUP_COACH_MODEL || 'gpt-4o-mini').trim();
  const baseUrl = (process.env.SETUP_COACH_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const step = typeof ctx.step === 'number' ? ctx.step : null;
  const stepName = step != null ? STEP_NAMES[step] || String(step) : 'unknown';

  const system = [
    'You are Setup Coach for Queens Custom Creations admin (queenscustoms.shop).',
    'Help a non-technical shop owner connect Stripe, PayPal, social logins, and marketplace keys.',
    'Use plain language (including “explain like I’m five” when asked). Be concise (under ~180 words).',
    'Never invent fake API keys or ask them to put secrets into chat — only paste into the Setup form fields.',
    'Never reveal raw secret values. If they skip a step, confirm skips are OK when optional.',
    `Current wizard step: ${stepName} (index ${step}).`,
  ].join(' ');

  const url = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: String(message || '').slice(0, 2000) },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Empty LLM reply');
    return { reply, model, source: 'llm' };
  } finally {
    clearTimeout(timer);
  }
}

async function answerSetupCoach(message, ctx = {}) {
  const text = String(message || '').trim();
  if (!text) {
    return { error: 'Message required', status: 400 };
  }

  if (coachKeyConfigured()) {
    try {
      const llm = await tryOpenAICoach(text, ctx);
      if (llm?.reply) {
        return { reply: llm.reply, source: 'llm', model: llm.model };
      }
    } catch (err) {
      console.error('[setup-coach] LLM failed:', err.message || err);
      // fall through to rules
    }
  }

  return {
    reply: ruleBasedSetupCoach(text, ctx),
    source: 'rules',
    model: null,
  };
}

module.exports = {
  answerSetupCoach,
  coachStatus,
  ruleBasedSetupCoach,
  coachKeyConfigured,
};

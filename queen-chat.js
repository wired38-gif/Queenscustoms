/* Queens Custom Creations — Queen Chat (The Vibe Queen) */
(function () {
  const AVATAR = 'assets/artist.jpg';
  const QUICK = [
    'How much for a custom tumbler?',
    'How long does shipping take?',
    'Can I send my own design?',
    'Do you do bulk / party orders?',
  ];

  const REPLIES = {
    price: "Customs start at $40. Price depends on size, glitter, and how detailed your design is — drop what you're dreaming up and I'll quote you 👑",
    ship: 'Most customs ship in about 2–3 weeks (bulk can take longer). Rush options are available when I have studio space — ask and I\'ll check!',
    design: 'Yes queen! Upload inspo, a screenshot, or describe the vibe in Queens Studio / this chat. I\'ll make it one-of-a-kind.',
    bulk: 'Absolutely — birthday squads, bridal parties, team cups, all of it. Tell me quantity + theme and I\'ll send bulk pricing.',
    default: "Got it — leave your name, email, and message below and I'll reply personally (usually within 24 hours). 💕",
  };

  function guessReply(text) {
    const t = text.toLowerCase();
    if (/price|cost|how much|\$/.test(t)) return REPLIES.price;
    if (/ship|deliver|turnaround|how long|week/.test(t)) return REPLIES.ship;
    if (/design|upload|photo|logo|custom idea|inspo/.test(t)) return REPLIES.design;
    if (/bulk|party|squad|bridal|team|dozen/.test(t)) return REPLIES.bulk;
    return REPLIES.default;
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  const root = el(`
<div class="queen-chat" id="queen-chat" aria-live="polite">
  <div class="queen-chat-panel" id="qc-panel" role="dialog" aria-label="Chat with The Vibe Queen" hidden>
    <div class="qc-header">
      <img src="${AVATAR}" alt="The Vibe Queen" width="44" height="44"/>
      <div class="qc-header-text">
        <strong>The Vibe Queen</strong>
        <span>● Usually replies within 24 hrs</span>
      </div>
      <button type="button" class="qc-close" id="qc-close" aria-label="Close chat">×</button>
    </div>
    <div class="qc-messages" id="qc-messages"></div>
    <div class="qc-chips" id="qc-chips"></div>
    <form class="qc-form" id="qc-form">
      <input type="text" id="qc-name" name="name" placeholder="Your name" required autocomplete="name"/>
      <input type="email" id="qc-email" name="email" placeholder="Your email" required autocomplete="email"/>
      <textarea id="qc-message" name="message" placeholder="Tell the Queen what you need…" required></textarea>
      <button type="submit" class="qc-send" id="qc-send">Send to Queen 👑</button>
      <div class="qc-status" id="qc-status"></div>
    </form>
  </div>
  <button type="button" class="queen-chat-fab" id="qc-fab" aria-label="Chat with The Vibe Queen" aria-expanded="false">
    <span class="qc-pulse" aria-hidden="true"></span>
    <img src="${AVATAR}" alt="The Vibe Queen"/>
    <span class="qc-dot" aria-hidden="true"></span>
  </button>
  <div class="queen-chat-tip" id="qc-tip">Chat with The Vibe Queen 👑</div>
</div>`);

  document.body.appendChild(root);

  const chat = document.getElementById('queen-chat');
  const panel = document.getElementById('qc-panel');
  const fab = document.getElementById('qc-fab');
  const closeBtn = document.getElementById('qc-close');
  const messages = document.getElementById('qc-messages');
  const chips = document.getElementById('qc-chips');
  const form = document.getElementById('qc-form');
  const status = document.getElementById('qc-status');
  const tip = document.getElementById('qc-tip');
  const msgInput = document.getElementById('qc-message');

  function addBubble(text, who) {
    const b = document.createElement('div');
    b.className = 'qc-bubble ' + who;
    b.textContent = text;
    messages.appendChild(b);
    messages.scrollTop = messages.scrollHeight;
  }

  function openChat() {
    chat.classList.add('open');
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    tip.classList.remove('show');
    if (!messages.dataset.greeted) {
      addBubble("Hey queen 👑 I'm The Vibe Queen — ask about customs, shipping, bulk, or drop your vision below.", 'queen');
      messages.dataset.greeted = '1';
    }
  }

  function closeChat() {
    chat.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
      if (!chat.classList.contains('open')) panel.hidden = true;
    }, 220);
  }

  QUICK.forEach((label) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qc-chip';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      msgInput.value = label;
      addBubble(label, 'user');
      addBubble(guessReply(label), 'queen');
      msgInput.focus();
    });
    chips.appendChild(btn);
  });

  fab.addEventListener('click', () => {
    if (chat.classList.contains('open')) closeChat();
    else openChat();
  });
  closeBtn.addEventListener('click', closeChat);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chat.classList.contains('open')) closeChat();
  });

  setTimeout(() => tip.classList.add('show'), 1800);
  setTimeout(() => tip.classList.remove('show'), 7000);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('qc-name').value.trim();
    const email = document.getElementById('qc-email').value.trim();
    const message = msgInput.value.trim();
    if (!name || !email || !message) return;

    const sendBtn = document.getElementById('qc-send');
    sendBtn.disabled = true;
    status.textContent = 'Sending…';
    status.style.color = 'rgba(255,255,255,0.7)';

    addBubble(message, 'user');

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject: 'Queen Chat',
          message,
          source: 'queen-chat',
        }),
      });
      if (!res.ok) throw new Error('bad status');
      addBubble(guessReply(message), 'queen');
      addBubble("Message locked in — I'll hit your inbox soon. Meanwhile peek at Queens Studio for a full custom build ✨", 'queen');
      status.textContent = 'Sent! Check your email for my reply 👑';
      status.style.color = '#22c55e';
      msgInput.value = '';
      chips.style.display = 'none';
    } catch (err) {
      addBubble(
        "My chat inbox is warming up — email me at wired4365@aol.com or use the contact form and I'll get back to you!",
        'queen'
      );
      status.textContent = 'Couldn’t reach the server — try Contact below.';
      status.style.color = '#f59e0b';
    } finally {
      sendBtn.disabled = false;
    }
  });
})();

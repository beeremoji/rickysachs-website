// Ricky Sachs - Booking Form → Resend Email
// Env var: RESEND_API_KEY in Vercel Project Settings

import { isRateLimited, sanitize, setCorsHeaders, getClientIp, verifyTurnstile } from './_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  if (isRateLimited(ip, { maxHits: 5, windowMs: 3_600_000 })) {
    return res.status(429).json({ ok: false, error: 'Too many requests. Bitte warte eine Stunde.' });
  }

  const raw = req.body || {};

  const tsOk = await verifyTurnstile(raw.turnstileToken, ip);
  if (!tsOk) {
    return res.status(403).json({ ok: false, error: 'Captcha-Verifizierung fehlgeschlagen.' });
  }

  const email = sanitize(raw.email, 254);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Missing or invalid email' });
  }

  const eventType    = sanitize(raw.eventType, 100);
  const datum        = sanitize(raw.datum, 100);
  const ort          = sanitize(raw.ort, 200);
  const guests       = sanitize(raw.guests, 50);
  const pa           = sanitize(raw.pa, 50);
  const location_type = sanitize(raw.location_type, 50);
  const name         = sanitize(raw.name, 150);
  const tel          = sanitize(raw.tel, 30);
  const msg          = sanitize(raw.msg, 1000);

  const html = `
    <h2 style="font-family:sans-serif;color:#3A2416;">Neue Booking-Anfrage</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%;max-width:520px;">
      <tr><td style="padding:6px 12px 6px 0;color:#888;white-space:nowrap;">Art</td><td style="padding:6px 0;">${eventType || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Datum</td><td style="padding:6px 0;">${datum || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Ort</td><td style="padding:6px 0;">${ort || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Gäste</td><td style="padding:6px 0;">${guests || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">PA</td><td style="padding:6px 0;">${pa || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Location</td><td style="padding:6px 0;">${location_type || '-'}</td></tr>
      <tr><td colspan="2" style="padding-top:16px;"></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Name</td><td style="padding:6px 0;">${name || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">E-Mail</td><td style="padding:6px 0;"><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Telefon</td><td style="padding:6px 0;">${tel || '-'}</td></tr>
      ${msg ? `<tr><td style="padding:6px 12px 6px 0;color:#888;vertical-align:top;">Nachricht</td><td style="padding:6px 0;">${msg.replace(/\n/g, '<br>')}</td></tr>` : ''}
    </table>
    <p style="font-family:sans-serif;font-size:12px;color:#aaa;margin-top:24px;">Gesendet von rickysachs.com/booking</p>
  `;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Booking <booking@rickysachs.com>',
        to: ['booking@rickysachs.com'],
        reply_to: email,
        subject: `Booking-Anfrage: ${eventType || 'Neue Anfrage'} - ${name || email}`,
        html,
      }),
    });

    const json = await r.json();
    if (!r.ok) throw new Error(json.message || JSON.stringify(json));

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[booking]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// Ricky Sachs - Newsletter Signup → MailerLite
// Env var: MAILERLITE_TOKEN in Vercel Project Settings

import { isRateLimited, sanitize, setCorsHeaders, getClientIp, isBodyTooLarge, logSecurityEvent, verifyTurnstile } from './_utils.js';

const GROUP_ID = '184913941764245406';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);

  if (isBodyTooLarge(req)) {
    logSecurityEvent('body_too_large', ip, 'newsletter');
    return res.status(413).json({ ok: false, error: 'Payload too large' });
  }

  if (isRateLimited(ip, { maxHits: 3, windowMs: 3_600_000 })) {
    logSecurityEvent('rate_limit', ip, 'newsletter');
    return res.status(429).json({ ok: false, error: 'Too many requests.' });
  }

  const body = req.body || {};

  const turnstileOk = await verifyTurnstile(body['cf-turnstile-response'], ip);
  if (!turnstileOk) {
    logSecurityEvent('captcha_fail', ip, 'newsletter');
    return res.status(403).json({ ok: false, error: 'CAPTCHA verification failed.' });
  }

  const email = sanitize(body.email, 254);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }

  const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MAILERLITE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, groups: [GROUP_ID] }),
  });

  const json = await response.json();

  if (!response.ok) {
    console.error('[newsletter]', json);
    return res.status(500).json({ ok: false, error: json.message || 'MailerLite error' });
  }

  return res.status(200).json({ ok: true });
}

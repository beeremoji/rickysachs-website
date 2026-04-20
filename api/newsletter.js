// Ricky Sachs - Newsletter Signup → MailerLite
// Env var: MAILERLITE_TOKEN in Vercel Project Settings

const GROUP_ID = '184913941764245406';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
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

// Ricky Sachs - Booking Form → Resend Email
// Env var: RESEND_API_KEY in Vercel Project Settings

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const d = req.body || {};
  if (!d.email) return res.status(400).json({ ok: false, error: 'Missing email' });

  const html = `
    <h2 style="font-family:sans-serif;color:#3A2416;">Neue Booking-Anfrage</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%;max-width:520px;">
      <tr><td style="padding:6px 12px 6px 0;color:#888;white-space:nowrap;">Art</td><td style="padding:6px 0;">${d.eventType || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Datum</td><td style="padding:6px 0;">${d.datum || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Ort</td><td style="padding:6px 0;">${d.ort || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Gäste</td><td style="padding:6px 0;">${d.guests || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">PA</td><td style="padding:6px 0;">${d.pa || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Location</td><td style="padding:6px 0;">${d.location_type || '-'}</td></tr>
      <tr><td colspan="2" style="padding-top:16px;"></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Name</td><td style="padding:6px 0;">${d.name || '-'}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">E-Mail</td><td style="padding:6px 0;"><a href="mailto:${d.email}">${d.email}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#888;">Telefon</td><td style="padding:6px 0;">${d.tel || '-'}</td></tr>
      ${d.msg ? `<tr><td style="padding:6px 12px 6px 0;color:#888;vertical-align:top;">Nachricht</td><td style="padding:6px 0;">${d.msg.replace(/\n/g, '<br>')}</td></tr>` : ''}
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
        from: 'Booking Form <onboarding@resend.dev>',
        // TODO: zurück auf booking@rickysachs.com, sobald die Domain in Resend verifiziert ist
        // (resend.com/domains) - bis dahin erlaubt der Resend-Sandbox-Modus nur die
        // Account-E-Mail als Empfänger.
        to: ['erik.sachs@hotmail.com'],
        reply_to: d.email,
        subject: `Booking-Anfrage: ${d.eventType || 'Neue Anfrage'} - ${d.name || d.email}`,
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

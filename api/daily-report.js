// Ricky Sachs - Daily Security Report
// Runs daily at 07:00 UTC via Vercel Cron (= 09:00 Uhr DE)
// Env vars: CRON_SECRET, RESEND_API_KEY, VERCEL_TOKEN, VERCEL_PROJECT_ID, UPTIMEROBOT_API_KEY

export default async function handler(req, res) {
  // Only allow GET (Vercel Cron) with correct secret
  if (req.method !== 'GET') return res.status(405).end();
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });
  const since = Date.now() - 86_400_000; // last 24h

  // --- Fetch Vercel logs ---
  let bookings = 0, newsletters = 0;
  const securityEvents = [];

  try {
    const projectId = process.env.VERCEL_PROJECT_ID;
    const token = process.env.VERCEL_TOKEN;
    if (projectId && token) {
      const logsRes = await fetch(
        `https://api.vercel.com/v2/projects/${projectId}/deployments?limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const logsJson = await logsRes.json();
      const deployId = logsJson.deployments?.[0]?.uid;

      if (deployId) {
        const logRes = await fetch(
          `https://api.vercel.com/v2/deployments/${deployId}/events?limit=1000&since=${since}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const events = await logRes.json();
        for (const ev of (events || [])) {
          const text = ev.text || '';
          if (text.includes('"security":true')) {
            try {
              const parsed = JSON.parse(text);
              securityEvents.push(parsed);
            } catch {}
          }
          if (text.includes('[booking]') && text.includes('ok: true')) bookings++;
          if (text.includes('[newsletter]') && !text.includes('error')) newsletters++;
        }
      }
    }
  } catch (e) {
    console.error('[daily-report] log fetch error', e.message);
  }

  // --- UptimeRobot status ---
  let uptimeStatus = 'Unbekannt';
  try {
    const utKey = process.env.UPTIMEROBOT_API_KEY;
    if (utKey) {
      const utRes = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `api_key=${utKey}&format=json`,
      });
      const utJson = await utRes.json();
      const monitors = utJson.monitors || [];
      const allUp = monitors.every(m => m.status === 2);
      uptimeStatus = allUp ? '✅ Alle Seiten online' : '⚠️ Ausfall erkannt';
    }
  } catch (e) {
    uptimeStatus = 'Nicht abgerufen';
  }

  // --- Build event summary ---
  const rateLimits = securityEvents.filter(e => e.type === 'rate_limit').length;
  const captchaFails = securityEvents.filter(e => e.type === 'captcha_fail').length;
  const bodyLarge = securityEvents.filter(e => e.type === 'body_too_large').length;
  const totalSecurity = securityEvents.length;

  const statusLine = totalSecurity === 0
    ? '✅ Keine Auffälligkeiten'
    : `⚠️ ${totalSecurity} Ereignis${totalSecurity !== 1 ? 'se' : ''} erkannt`;

  const eventLines = [
    rateLimits  > 0 ? `<li>${rateLimits}x Rate-Limit erreicht</li>` : '',
    captchaFails > 0 ? `<li>${captchaFails}x CAPTCHA-Fehler</li>` : '',
    bodyLarge   > 0 ? `<li>${bodyLarge}x zu großer Request</li>` : '',
  ].join('');

  const html = `
    <div style="font-family:sans-serif;max-width:540px;color:#2C1A0E;">
      <h2 style="color:#3A2416;margin-bottom:4px;">rickysachs.com</h2>
      <p style="color:#888;font-size:13px;margin-top:0;">Tagesbericht - ${today}</p>
      <hr style="border:none;border-top:1px solid #E0D8CE;margin:16px 0;">

      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#666;">Website-Status</td><td style="padding:6px 0;font-weight:bold;">${uptimeStatus}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Booking-Anfragen</td><td style="padding:6px 0;">${bookings}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Newsletter-Signups</td><td style="padding:6px 0;">${newsletters}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Sicherheits-Events</td><td style="padding:6px 0;">${statusLine}</td></tr>
      </table>

      ${eventLines ? `<ul style="margin-top:12px;font-size:13px;color:#555;">${eventLines}</ul>` : ''}

      <hr style="border:none;border-top:1px solid #E0D8CE;margin:16px 0;">
      <p style="font-size:11px;color:#aaa;">Automatischer Bericht - rickysachs.com</p>
    </div>
  `;

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Monitoring <onboarding@resend.dev>',
        to: ['erik.sachs@hotmail.com'],
        subject: `rickysachs.com - Tagesbericht ${today}`,
        html,
      }),
    });
    const emailJson = await emailRes.json();
    if (!emailRes.ok) throw new Error(emailJson.message || JSON.stringify(emailJson));
    return res.status(200).json({ ok: true, security: totalSecurity, bookings, newsletters });
  } catch (err) {
    console.error('[daily-report]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

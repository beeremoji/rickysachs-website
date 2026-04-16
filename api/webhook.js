// Ricky Sachs - Booking Form → HubSpot
// Vercel Serverless Function
//
// Deploy: vercel.com → Import Git Repository → fertig
// Env var: HUBSPOT_TOKEN in Vercel Project Settings → Environment Variables
// Webhook: Function-URL in Formspree eintragen (Formspree → Integrations → Webhook)
// URL wird: https://rickysachs-website.vercel.app/api/webhook

const HUBSPOT_API   = 'https://api.hubapi.com';
const DEAL_STAGE    = 'presentationscheduled'; // Reply
const DEAL_PIPELINE = 'default';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = req.body || {};
  const d   = raw.data || raw;

  const name          = d.name          || '';
  const email         = d.email         || '';
  const event_type    = d.event_type    || '';
  const event_date    = d.event_date    || '';
  const venue         = d.venue         || '';
  const guest_count   = d.guest_count   || '';
  const pa_system     = d.pa_system     || '';
  const location_type = d.location_type || '';
  const phone         = d.phone         || '';
  const message       = d.message       || '';

  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }

  const headers = {
    'Authorization': `Bearer ${process.env.HUBSPOT_TOKEN}`,
    'Content-Type':  'application/json',
  };

  try {
    const contactId = await findOrCreateContact({ name, email, phone }, headers);
    const dealId    = await createDeal({
      venue, event_date, event_type,
      guest_count, pa_system, location_type, phone, message,
    }, headers);

    await associateDealToContact(dealId, contactId, headers);

    return res.status(200).json({ ok: true, dealId, contactId });

  } catch (err) {
    console.error('[booking-webhook]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// --- HubSpot helpers ---

async function findOrCreateContact({ name, email, phone }, headers) {
  const search = await hubspot('/crm/v3/objects/contacts/search', headers, {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
    properties: ['email'],
    limit: 1,
  });

  if (search.results?.length > 0) return search.results[0].id;

  const parts     = name.trim().split(' ');
  const firstname = parts[0] || name;
  const lastname  = parts.slice(1).join(' ');

  const contact = await hubspot('/crm/v3/objects/contacts', headers, {
    properties: { email, firstname, lastname, phone },
  });

  return contact.id;
}

async function createDeal(d, headers) {
  const dealname = [d.venue, d.event_date].filter(Boolean).join(' - ')
    || 'Website Booking Anfrage';

  const lines = [
    d.event_type    && `Art: ${d.event_type}`,
    d.guest_count   && `Gäste: ${d.guest_count}`,
    d.pa_system     && `PA: ${d.pa_system}`,
    d.location_type && `Ort-Typ: ${d.location_type}`,
    d.phone         && `Telefon: ${d.phone}`,
    d.message       && `Nachricht: ${d.message}`,
  ].filter(Boolean);

  const deal = await hubspot('/crm/v3/objects/deals', headers, {
    properties: {
      dealname,
      dealstage:   DEAL_STAGE,
      pipeline:    DEAL_PIPELINE,
      description: lines.join('\n'),
    },
  });

  return deal.id;
}

async function associateDealToContact(dealId, contactId, headers) {
  // Association type 3 = deal → contact (HubSpot standard)
  const url = `${HUBSPOT_API}/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/3`;
  const response = await fetch(url, { method: 'PUT', headers });
  if (!response.ok) {
    console.error('[association]', await response.text());
    // Non-fatal: deal exists, association failure doesn't block the response
  }
}

async function hubspot(path, headers, body) {
  const res  = await fetch(`${HUBSPOT_API}${path}`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`HubSpot ${path}: ${JSON.stringify(json)}`);
  return json;
}

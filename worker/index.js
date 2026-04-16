// Ricky Sachs - Booking Form → HubSpot Worker
// Receives Formspree webhook, creates Contact + Deal in HubSpot
//
// Deploy: wrangler deploy
// Secret: wrangler secret put HUBSPOT_TOKEN
// Webhook: paste worker URL into Formspree dashboard → Integrations → Webhook

const HUBSPOT_API   = 'https://api.hubapi.com';
const DEAL_STAGE    = 'presentationscheduled'; // Reply
const DEAL_PIPELINE = 'default';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let raw;
    try {
      raw = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    // Formspree webhooks wrap data under 'data', direct POSTs don't
    const d = raw.data || raw;

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
      return new Response('Missing email', { status: 400 });
    }

    const headers = {
      'Authorization': `Bearer ${env.HUBSPOT_TOKEN}`,
      'Content-Type':  'application/json',
    };

    try {
      const contactId = await findOrCreateContact({ name, email, phone }, headers);
      const dealId    = await createDeal({
        name, venue, event_date, event_type,
        guest_count, pa_system, location_type, phone, message
      }, headers);

      await associateDealToContact(dealId, contactId, headers);

      return new Response(JSON.stringify({ ok: true, dealId, contactId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (err) {
      console.error('[booking-worker]', err.message);
      return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

// --- HubSpot helpers ---

async function findOrCreateContact({ name, email, phone }, headers) {
  // Search by email first
  const search = await hubspot('/crm/v3/objects/contacts/search', headers, {
    filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
    properties: ['email'],
    limit: 1,
  });

  if (search.results?.length > 0) return search.results[0].id;

  // Create new contact
  const parts     = name.trim().split(' ');
  const firstname = parts[0] || name;
  const lastname  = parts.slice(1).join(' ');

  const contact = await hubspot('/crm/v3/objects/contacts', headers, {
    properties: { email, firstname, lastname, phone },
  }, 'POST_DIRECT');

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
  }, 'POST_DIRECT');

  return deal.id;
}

async function associateDealToContact(dealId, contactId, headers) {
  // Association type 3 = deal → contact (HubSpot standard)
  const url = `${HUBSPOT_API}/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/3`;
  const res = await fetch(url, { method: 'PUT', headers });
  if (!res.ok) {
    const err = await res.text();
    console.error('[association]', err);
    // Non-fatal: deal is created, association failure shouldn't block response
  }
}

// Generic HubSpot POST (search uses POST with body, create uses POST_DIRECT to distinguish)
async function hubspot(path, headers, body, mode = 'POST') {
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`HubSpot ${path}: ${JSON.stringify(json)}`);
  return json;
}

// Ricky Sachs - Booking Form → HubSpot
// Vercel Serverless Function
// URL: https://rickysachs-website.vercel.app/api/webhook

import { isRateLimited, sanitize, setCorsHeaders, getClientIp } from './_utils.js';

const HUBSPOT_API   = 'https://api.hubapi.com';
const DEAL_STAGE    = 'presentationscheduled'; // Reply
const DEAL_PIPELINE = 'default';
const OWNER_ID      = '88607418'; // Erik Sachs

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  if (isRateLimited(ip, { maxHits: 5, windowMs: 3_600_000 })) {
    return res.status(429).json({ ok: false, error: 'Too many requests.' });
  }

  const raw = req.body || {};
  const d   = raw.data || raw;

  const name          = sanitize(d.name, 150);
  const email         = sanitize(d.email, 254);
  const event_type    = sanitize(d.event_type, 100);
  const event_date    = sanitize(d.event_date, 100);
  const venue         = sanitize(d.venue, 200);
  const guest_count   = sanitize(d.guest_count, 50);
  const pa_system     = sanitize(d.pa_system, 50);
  const location_type = sanitize(d.location_type, 50);
  const phone         = sanitize(d.phone, 30);
  const message       = sanitize(d.message, 1000);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Missing or invalid email' });
  }

  const headers = {
    'Authorization': `Bearer ${process.env.HUBSPOT_TOKEN}`,
    'Content-Type':  'application/json',
  };

  try {
    const contactId = await findOrCreateContact({ name, email, phone }, headers);
    const dealId    = await createDeal({
      name, venue, event_date, event_type,
      guest_count, pa_system, location_type, phone, message,
    }, headers);

    await associateDealToContact(dealId, contactId, headers);

    // Note with all booking data - visible in HubSpot Activity Timeline
    const noteLines = [
      `BOOKING ANFRAGE - rickysachs.com`,
      ``,
      name          && `Name: ${name}`,
      email         && `E-Mail: ${email}`,
      phone         && `Telefon: ${phone}`,
      ``,
      event_type    && `Art: ${event_type}`,
      event_date    && `Datum: ${event_date}`,
      venue         && `Ort / Venue: ${venue}`,
      guest_count   && `Gäste: ${guest_count}`,
      pa_system     && `PA vorhanden: ${pa_system}`,
      location_type && `Indoor / Outdoor: ${location_type}`,
      message       && `\nNachricht: ${message}`,
    ].filter(v => v !== false && v !== '');

    await createNote(noteLines.join('\n'), contactId, dealId, headers);

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

  const parts     = name.trim().split(' ');
  const firstname = parts[0] || name;
  const lastname  = parts.slice(1).join(' ');
  const props     = { firstname, lastname, ...(phone && { phone }) };

  if (search.results?.length > 0) {
    const id = search.results[0].id;
    // Always update name/phone, even if contact already exists
    await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/${id}`, {
      method:  'PATCH',
      headers,
      body:    JSON.stringify({ properties: props }),
    });
    return id;
  }

  const contact = await hubspot('/crm/v3/objects/contacts', headers, {
    properties: { email, ...props },
  });
  return contact.id;
}

async function createDeal(d, headers) {
  const dealname = [d.event_type, d.venue, d.event_date]
    .filter(v => v && v !== 'offen' && v !== 'nicht angegeben')
    .join(' - ') || 'Website Booking Anfrage';

  const lines = [
    d.event_type    && `Art: ${d.event_type}`,
    d.event_date    && `Datum: ${d.event_date}`,
    d.venue         && `Ort: ${d.venue}`,
    d.guest_count   && `Gäste: ${d.guest_count}`,
    d.pa_system     && `PA: ${d.pa_system}`,
    d.location_type && `Location: ${d.location_type}`,
    d.phone         && `Telefon: ${d.phone}`,
    d.message       && `Nachricht: ${d.message}`,
  ].filter(Boolean);

  const deal = await hubspot('/crm/v3/objects/deals', headers, {
    properties: {
      dealname,
      dealstage:        DEAL_STAGE,
      pipeline:         DEAL_PIPELINE,
      description:      lines.join('\n'),
      hubspot_owner_id: OWNER_ID,
    },
  });
  return deal.id;
}

async function createNote(body, contactId, dealId, headers) {
  const note = await hubspot('/crm/v3/objects/notes', headers, {
    properties: {
      hs_note_body: body,
      hs_timestamp: new Date().toISOString(),
    },
  });
  const noteId = note.id;

  // Associate note → contact (type 202) and note → deal (type 214)
  const assocUrl = (type, toId, typeId) =>
    `${HUBSPOT_API}/crm/v3/objects/notes/${noteId}/associations/${type}/${toId}/${typeId}`;

  await Promise.all([
    fetch(assocUrl('contacts', contactId, 202), { method: 'PUT', headers }),
    fetch(assocUrl('deals',    dealId,    214), { method: 'PUT', headers }),
  ]);
}

async function associateDealToContact(dealId, contactId, headers) {
  const url = `${HUBSPOT_API}/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/3`;
  const response = await fetch(url, { method: 'PUT', headers });
  if (!response.ok) {
    console.error('[association]', await response.text());
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

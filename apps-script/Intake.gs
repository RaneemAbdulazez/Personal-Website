/**
 * Safe AI Workflow — Intake (Offers page) backend.
 * Google Apps Script Web App.
 *
 * What it does on form submit (doPost):
 *   1. Appends a row to the linked Google Sheet.
 *   2. Emails OWNER_EMAIL with a "New intake — Offers page" notification.
 *   3. Emails the user a brief confirmation ("I'll be in touch within 1–2 business days").
 *
 * --- SETUP ---
 * 1. Create a Google Sheet (e.g. "Offers Intake"). Copy its ID from the URL:
 *      docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
 * 2. https://script.google.com/  →  New project  →  paste this file into Code.gs
 *    (the file name inside Apps Script is always Code.gs; the .gs extension here is for source control).
 * 3. Project Settings (gear icon) → Script Properties → Add property:
 *      key:   SHEET_ID
 *      value: <the sheet ID from step 1>
 *    (Optional) Add OWNER_EMAIL if you want notifications to go somewhere
 *    other than the address below.
 * 4. Deploy → New deployment →
 *      Type: Web app
 *      Execute as: Me (your-account)
 *      Who has access: Anyone
 *    Click Deploy, authorize, copy the Web app URL.
 * 5. Paste that URL into offers.html as APPS_SCRIPT_URL
 *    (replace the "PASTE_INTAKE_APPS_SCRIPT_URL_HERE" placeholder near the bottom of the file).
 *
 * Quotas: consumer Gmail accounts can send 100 emails/day via MailApp.
 * Workspace accounts: 1500/day. More than enough for an intake form.
 */

const OWNER_EMAIL_DEFAULT = 'ranem.a.ghalion@gmail.com';
const SHEET_NAME = 'Intake';
const SENDER_NAME = 'Raneem Ghalion';
const CALENDAR_URL = 'https://calendar.app.google/z7YbuQHZ5aht2SSD8';

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const name = (p.name || '').toString().trim();
    const email = (p.email || '').toString().trim().toLowerCase();
    const phone = (p.phone || '').toString().trim();
    const business = (p.business || '').toString().trim();
    const industry = (p.industry || '').toString().trim();
    const teamSize = (p.team_size || '').toString().trim();
    const tierInterest = (p.tier_interest || '').toString().trim();
    const heardAbout = (p.heard_about || '').toString().trim();
    const needs = (p.needs || '').toString().trim();
    const userAgent = (p.user_agent || '').toString();

    if (!name || !email || !validEmail(email)) {
      return jsonOut({ ok: false, error: 'Name and a valid email are required.' });
    }
    if (!business) {
      return jsonOut({ ok: false, error: 'Please include your business name.' });
    }
    if (!tierInterest) {
      return jsonOut({ ok: false, error: 'Please pick a tier (or "Not sure yet").' });
    }
    if (!needs) {
      return jsonOut({ ok: false, error: 'A short note about what you want help with is required.' });
    }

    const timestamp = new Date();
    const sheet = getSheet();
    sheet.appendRow([
      timestamp, name, email, phone, business, industry,
      teamSize, tierInterest, heardAbout, needs,
      'new', userAgent
    ]);

    sendOwnerEmail({
      name, email, phone, business, industry, teamSize,
      tierInterest, heardAbout, needs, timestamp
    });
    sendUserEmail({ name, email, tierInterest });

    return jsonOut({ ok: true });
  } catch (err) {
    Logger.log('doPost error: ' + (err && err.stack ? err.stack : err));
    return jsonOut({ ok: false, error: 'Something went wrong on our end. Please try again.' });
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutput(
    '<p>Intake endpoint. Use the form on <a href="https://www.raneemghalion.com/offers.html">offers.html</a>.</p>'
  );
}

function getSheet() {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty('SHEET_ID');
  if (!sheetId) {
    throw new Error('Missing SHEET_ID in Script Properties. See the setup notes at the top of this file.');
  }
  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'Name', 'Email', 'Phone', 'Business', 'Industry',
      'Team Size', 'Tier Interest', 'Heard About', 'Needs',
      'Status', 'User Agent'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:L1').setFontWeight('bold');
  }
  return sheet;
}

function ownerEmail() {
  return PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL') || OWNER_EMAIL_DEFAULT;
}

function sendOwnerEmail(d) {
  const html =
    '<h2 style="font-family:Georgia,\'Libre Caslon Text\',serif;color:#004532;margin:0 0 16px;font-weight:400">New intake — Offers page</h2>' +
    '<table style="font-family:Arial,sans-serif;color:#181c1a;border-collapse:collapse;font-size:14px">' +
      kv('Name', d.name) +
      kv('Email', d.email) +
      kv('Phone', d.phone || '—') +
      kv('Business', d.business) +
      kv('Industry', d.industry || '—') +
      kv('Team size', d.teamSize || '—') +
      kv('Tier interest', d.tierInterest) +
      kv('Heard about', d.heardAbout || '—') +
      kv('When', d.timestamp.toString()) +
    '</table>' +
    '<h3 style="font-family:Georgia,serif;color:#004532;margin:24px 0 8px;font-weight:400;font-size:18px">What they want help with</h3>' +
    '<p style="font-family:Arial,sans-serif;color:#181c1a;line-height:1.6;font-size:14px;white-space:pre-wrap;background:#f7faf6;border:1px solid #bec9c2;border-radius:8px;padding:14px 18px;margin:0">' +
      escapeHtml(d.needs) +
    '</p>';
  MailApp.sendEmail({
    to: ownerEmail(),
    subject: 'New intake — ' + d.name + ' (' + d.business + ') — ' + d.tierInterest,
    htmlBody: html,
    replyTo: d.email
  });
}

function sendUserEmail(d) {
  const firstName = (d.name.split(' ')[0]) || d.name;
  const html =
    '<div style="background:#f7faf6;padding:32px 0;font-family:Arial,sans-serif;color:#181c1a">' +
      '<div style="background:#ffffff;border:1px solid #bec9c2;border-radius:24px;padding:40px;max-width:560px;margin:0 auto;box-shadow:0 10px 30px rgba(26,26,26,0.04)">' +
        '<h2 style="font-family:Georgia,\'Libre Caslon Text\',serif;color:#004532;margin:0 0 16px;font-weight:400;font-size:28px">Thanks, ' + escapeHtml(firstName) + '.</h2>' +
        '<p style="line-height:1.6;margin:0 0 16px">I\'ve received your intake for the <strong>' + escapeHtml(d.tierInterest) + '</strong> and I\'ll be in touch within 1–2 business days to set up a free 30-minute discovery call.</p>' +
        '<p style="line-height:1.6;margin:0 0 16px">No automatic charges. If we agree the tier is the right fit on the call, I\'ll send a Square payment link right after. If it isn\'t, I\'ll tell you what I think makes more sense — including "nothing right now."</p>' +
        '<p style="line-height:1.6;margin:0 0 24px">Want to lock in a time now? Here\'s my calendar:</p>' +
        '<p style="margin:0 0 24px">' +
          '<a href="' + escapeHtml(CALENDAR_URL) + '" style="display:inline-block;background:#004532;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:12px">Book a free 30-min call</a>' +
        '</p>' +
        '<p style="line-height:1.6;margin:32px 0 0">— Raneem</p>' +
      '</div>' +
    '</div>';
  MailApp.sendEmail({
    to: d.email,
    subject: 'Got your intake — talk soon',
    htmlBody: html,
    name: SENDER_NAME,
    replyTo: ownerEmail()
  });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function kv(label, value) {
  return '<tr><td style="padding:6px 14px 6px 0;color:#3f4944;vertical-align:top">' + escapeHtml(label) +
    '</td><td style="padding:6px 0"><strong>' + escapeHtml(String(value)) + '</strong></td></tr>';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

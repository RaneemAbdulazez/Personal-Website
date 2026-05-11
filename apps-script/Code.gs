/**
 * DocBee registration backend — Google Apps Script Web App.
 *
 * What it does on form submit (doPost):
 *   1. Appends a row to the linked Google Sheet.
 *   2. Emails OWNER_EMAIL with a "New DocBee registration" notification.
 *   3. Emails the user a welcome message with an unsubscribe link.
 *
 * Unsubscribe (doGet with ?action=unsubscribe&email=...&token=...):
 *   Marks the row as unsubscribed and shows a branded confirmation page.
 *
 * --- SETUP ---
 * 1. Create a Google Sheet (the title can be anything, e.g. "DocBee Registrations").
 *    Copy its ID from the URL: docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
 * 2. https://script.google.com/  →  New project  →  paste this file into Code.gs.
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
 * 5. Paste that URL into docbee.html as APPS_SCRIPT_URL.
 *
 * Quotas: consumer Gmail accounts can send 100 emails/day via MailApp.
 * Workspace accounts: 1500/day. More than enough for a signup form.
 */

const OWNER_EMAIL_DEFAULT = 'ranem.a.ghalion@gmail.com';
const SHEET_NAME = 'Registrations';
const SENDER_NAME = 'Raneem Ghalion';

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const name = (p.name || '').toString().trim();
    const email = (p.email || '').toString().trim().toLowerCase();
    const company = (p.company || '').toString().trim();
    const country = (p.country || '').toString().trim();
    const updatesTool = p.updates_tool === 'yes';
    const updatesOther = p.updates_other === 'yes';
    const userAgent = (p.user_agent || '').toString();

    if (!name || !email || !validEmail(email)) {
      return jsonOut({ ok: false, error: 'Name and a valid email are required.' });
    }

    const token = Utilities.getUuid();
    const timestamp = new Date();

    const sheet = getSheet();
    sheet.appendRow([
      timestamp, name, email, company, country,
      updatesTool ? 'yes' : 'no',
      updatesOther ? 'yes' : 'no',
      'active', token, '', userAgent
    ]);

    const unsubscribeUrl =
      ScriptApp.getService().getUrl() +
      '?action=unsubscribe' +
      '&email=' + encodeURIComponent(email) +
      '&token=' + encodeURIComponent(token);

    sendOwnerEmail({ name, email, company, country, updatesTool, updatesOther, timestamp });
    sendUserEmail({ name, email, unsubscribeUrl });

    return jsonOut({ ok: true });
  } catch (err) {
    Logger.log('doPost error: ' + (err && err.stack ? err.stack : err));
    return jsonOut({ ok: false, error: 'Something went wrong on our end. Please try again.' });
  }
}

function doGet(e) {
  const action = (((e && e.parameter) || {}).action || '').toString();
  if (action === 'unsubscribe') {
    return handleUnsubscribe(
      ((e.parameter.email) || '').toString(),
      ((e.parameter.token) || '').toString()
    );
  }
  return HtmlService.createHtmlOutput('<p>DocBee endpoint. Use the signup form on docbee.html.</p>');
}

function handleUnsubscribe(email, token) {
  email = (email || '').toLowerCase();
  if (!email || !token) {
    return brandedPage('Link not recognized',
      'We couldn’t find a matching subscription. The link may have expired or already been used.');
  }
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  // Columns: 1=Timestamp 2=Name 3=Email 4=Company 5=Country
  //          6=ToolUpdates 7=OtherUpdates 8=Status 9=Token 10=UnsubscribedAt 11=UserAgent
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowEmail = (row[2] || '').toString().toLowerCase();
    const rowToken = (row[8] || '').toString();
    if (rowEmail === email && rowToken === token) {
      sheet.getRange(i + 1, 8).setValue('unsubscribed');
      sheet.getRange(i + 1, 10).setValue(new Date());
      return brandedPage('You’ve been unsubscribed',
        'You won’t receive further updates from DocBee at <strong>' + escapeHtml(email) + '</strong>. If this was a mistake, you can sign up again at any time.');
    }
  }
  return brandedPage('Link not recognized',
    'We couldn’t find a matching subscription. The link may have expired or already been used.');
}

function getSheet() {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty('SHEET_ID');
  if (!sheetId) {
    throw new Error('Missing SHEET_ID in Script Properties. See the setup notes at the top of Code.gs.');
  }
  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'Name', 'Email', 'Company', 'Country',
      'Tool Updates', 'Other Updates', 'Status',
      'Token', 'Unsubscribed At', 'User Agent'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:K1').setFontWeight('bold');
  }
  return sheet;
}

function ownerEmail() {
  return PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL') || OWNER_EMAIL_DEFAULT;
}

function sendOwnerEmail(d) {
  const html =
    '<h2 style="font-family:Georgia,\'Libre Caslon Text\',serif;color:#004532;margin:0 0 16px;font-weight:400">New DocBee registration</h2>' +
    '<table style="font-family:Arial,sans-serif;color:#181c1a;border-collapse:collapse;font-size:14px">' +
      kv('Name', d.name) +
      kv('Email', d.email) +
      kv('Company', d.company || '—') +
      kv('Country', d.country || '—') +
      kv('Tool updates opt-in', d.updatesTool ? 'yes' : 'no') +
      kv('Other updates opt-in', d.updatesOther ? 'yes' : 'no') +
      kv('When', d.timestamp.toString()) +
    '</table>';
  MailApp.sendEmail({
    to: ownerEmail(),
    subject: 'New DocBee registration — ' + d.name,
    htmlBody: html,
    replyTo: d.email
  });
}

function sendUserEmail(d) {
  const firstName = (d.name.split(' ')[0]) || d.name;
  const html =
    '<div style="background:#f7faf6;padding:32px 0;font-family:Arial,sans-serif;color:#181c1a">' +
      '<div style="background:#ffffff;border:1px solid #bec9c2;border-radius:24px;padding:40px;max-width:560px;margin:0 auto;box-shadow:0 10px 30px rgba(26,26,26,0.04)">' +
        '<h2 style="font-family:Georgia,\'Libre Caslon Text\',serif;color:#004532;margin:0 0 16px;font-weight:400;font-size:28px">Welcome to DocBee, ' + escapeHtml(firstName) + '.</h2>' +
        '<p style="line-height:1.6;margin:0 0 16px">Thanks for signing up. I’ll follow up with your installation link and setup notes within the next business day.</p>' +
        '<p style="line-height:1.6;margin:0 0 16px">DocBee runs entirely on your hardware — your documents never leave your machine, and nothing is sent to a cloud service.</p>' +
        '<p style="line-height:1.6;margin:32px 0 0">— Raneem</p>' +
        '<hr style="border:none;border-top:1px solid #bec9c2;margin:32px 0 16px"/>' +
        '<p style="color:#6f7973;font-size:12px;line-height:1.5;margin:0">You’re receiving this because you signed up for DocBee at <strong>' + escapeHtml(d.email) + '</strong>. ' +
        '<a href="' + escapeHtml(d.unsubscribeUrl) + '" style="color:#004532">Unsubscribe</a>.</p>' +
      '</div>' +
    '</div>';
  MailApp.sendEmail({
    to: d.email,
    subject: 'Welcome to DocBee',
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

function brandedPage(title, bodyHtml) {
  const html =
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>' +
    '<title>' + escapeHtml(title) + ' — DocBee</title>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>' +
    '<style>' +
      'body{margin:0;background:#f7faf6;font-family:Arial,sans-serif;color:#181c1a;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}' +
      '.card{background:#fff;border:1px solid #bec9c2;border-radius:24px;padding:48px;max-width:520px;text-align:center;box-shadow:0 10px 30px rgba(26,26,26,0.04)}' +
      'h1{font-family:Georgia,serif;color:#004532;font-weight:400;margin:0 0 16px;font-size:28px}' +
      'p{color:#3f4944;line-height:1.6;margin:0}' +
    '</style></head>' +
    '<body><div class="card"><h1>' + escapeHtml(title) + '</h1><p>' + bodyHtml + '</p></div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title + ' — DocBee');
}

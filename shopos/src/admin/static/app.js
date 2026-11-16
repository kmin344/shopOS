'use strict';

// ShopOS admin page. Talks to /graphql. Renders data with textContent only.
const KEY_STORE = 'shopos.adminKey';
const LABELS = {
  PRODUCT: 'Products', CATEGORY: 'Categories', ORDER: 'Orders',
  STRING: 'Text', NUMBER: 'Number', BOOLEAN: 'Yes / no', DATE: 'Date', ENUM: 'List of options',
};

let adminKey = '';
let fields = [];

const $ = (id) => document.getElementById(id);

function readStoredKey() {
  try { return sessionStorage.getItem(KEY_STORE) || ''; } catch { return ''; }
}
function storeKey(value) {
  try {
    if (value) sessionStorage.setItem(KEY_STORE, value);
    else sessionStorage.removeItem(KEY_STORE);
  } catch { /* storage blocked: the key lasts until reload */ }
}

async function gql(query, variables = {}) {
  const headers = { 'content-type': 'application/json' };
  if (adminKey) headers.authorization = `Bearer ${adminKey}`;
  let res;
  try {
    res = await fetch('/graphql', { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  } catch {
    throw new Error('Cannot reach the server.');
  }
  const body = await res.json().catch(() => null);
  if (!body) throw new Error(`Server error (${res.status}).`);
  if (body.errors && body.errors.length) {
    const e = body.errors[0];
    const details = e.extensions && e.extensions.originalError && e.extensions.originalError.message;
    throw new Error(Array.isArray(details) ? details.join('; ') : e.message);
  }
  return body.data;
}

function setStatus(el, text, kind) {
  el.textContent = text;
  el.dataset.kind = kind || '';
}

// ---- Admin key ----------------------------------------------------------

async function connect(key) {
  const status = $('key-status');
  adminKey = key;
  setStatus(status, 'Checking…');
  try {
    await gql('{ adminKeyValid }');
    storeKey(key);
    setStatus(status, 'Connected', 'ok');
    showKeyEntry(false);
    $('key-input').value = '';
    $('create-btn').disabled = false;
  } catch (err) {
    adminKey = '';
    storeKey('');
    setStatus(status, err.message, 'error');
    $('create-btn').disabled = true;
  }
  renderRows();
}

// While connected, show only the status and Disconnect.
function showKeyEntry(show) {
  $('key-input').hidden = !show;
  $('key-connect').hidden = !show;
  $('key-clear').hidden = show;
}

function disconnect() {
  adminKey = '';
  storeKey('');
  showKeyEntry(true);
  $('create-btn').disabled = true;
  setStatus($('key-status'), 'Disconnected');
  renderRows();
}

// ---- Field list ---------------------------------------------------------

async function loadFields() {
  const status = $('list-status');
  setStatus(status, 'Loading…');
  try {
    const data = await gql(
      '{ customFields { id name description fieldType entityType enumValues defaultValue isRequired } }',
    );
    fields = data.customFields;
    setStatus(status, '');
  } catch (err) {
    setStatus(status, err.message, 'error');
  }
  renderRows();
}

function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function renderRows() {
  const tbody = $('field-rows');
  const filter = $('filter').value;
  const shown = fields
    .filter((f) => !filter || f.entityType === filter)
    .sort((a, b) => a.entityType.localeCompare(b.entityType) || a.name.localeCompare(b.name));

  tbody.replaceChildren();
  if (shown.length === 0) {
    const tr = document.createElement('tr');
    const td = cell(fields.length ? 'No fields for this filter.' : 'No custom fields yet.', 'empty');
    td.colSpan = 6;
    tr.append(td);
    tbody.append(tr);
    return;
  }

  for (const f of shown) {
    const tr = document.createElement('tr');
    const name = cell(f.name, 'name');
    if (f.description) {
      const small = document.createElement('small');
      small.textContent = f.description;
      name.append(document.createElement('br'), small);
    }
    const options = [
      f.enumValues && f.enumValues.length ? f.enumValues.join(', ') : '',
      f.defaultValue ? `default: ${f.defaultValue}` : '',
    ].filter(Boolean).join(' · ');

    const actions = document.createElement('td');
    actions.className = 'actions-cell';
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'danger';
    del.textContent = 'Delete';
    del.disabled = !adminKey;
    del.title = adminKey ? `Delete "${f.name}" and all its values` : 'Connect with an admin key first';
    del.addEventListener('click', () => deleteField(f, del));
    actions.append(del);

    tr.append(name, cell(LABELS[f.entityType]), cell(LABELS[f.fieldType]), cell(options || '—'), cell(f.isRequired ? 'Yes' : 'No'), actions);
    tbody.append(tr);
  }
}

// Two clicks to delete: the first click asks, the second confirms. No browser dialog.
async function deleteField(field, button) {
  if (button.dataset.armed !== 'true') {
    button.dataset.armed = 'true';
    button.textContent = 'Confirm delete';
    setTimeout(() => {
      if (button.isConnected) { button.dataset.armed = ''; button.textContent = 'Delete'; }
    }, 4000);
    return;
  }
  button.disabled = true;
  try {
    await gql('mutation ($id: ID!) { removeCustomField(id: $id) }', { id: field.id });
    fields = fields.filter((f) => f.id !== field.id);
    setStatus($('list-status'), `Deleted "${field.name}".`, 'ok');
    renderRows();
  } catch (err) {
    button.disabled = false;
    setStatus($('list-status'), err.message, 'error');
  }
}

// ---- New field form -----------------------------------------------------

function toggleEnumRow() {
  const isEnum = $('field-type').value === 'ENUM';
  $('enum-row').hidden = !isEnum;
}

async function createField(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $('form-status');
  const data = new FormData(form);
  const fieldType = data.get('fieldType');
  const input = {
    name: String(data.get('name')).trim(),
    entityType: data.get('entityType'),
    fieldType,
    isRequired: data.get('isRequired') === 'on',
  };
  const description = String(data.get('description')).trim();
  if (description) input.description = description;
  const defaultValue = String(data.get('defaultValue')).trim();
  if (defaultValue) input.defaultValue = defaultValue;
  if (fieldType === 'ENUM') {
    input.enumValues = String(data.get('enumValues'))
      .split('\n').map((v) => v.trim()).filter(Boolean);
  }

  const button = $('create-btn');
  button.disabled = true;
  setStatus(status, 'Saving…');
  try {
    const result = await gql(
      `mutation ($input: CreateCustomFieldInput!) {
        createCustomField(input: $input) { id name description fieldType entityType enumValues defaultValue isRequired }
      }`,
      { input },
    );
    fields.push(result.createCustomField);
    form.reset();
    toggleEnumRow();
    setStatus(status, `Created "${result.createCustomField.name}".`, 'ok');
    renderRows();
  } catch (err) {
    setStatus(status, err.message, 'error');
  } finally {
    button.disabled = !adminKey;
  }
}

// ---- Start --------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  $('key-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const key = $('key-input').value.trim();
    if (key) connect(key);
  });
  $('key-clear').addEventListener('click', disconnect);
  $('field-form').addEventListener('submit', createField);
  $('field-type').addEventListener('change', toggleEnumRow);
  $('filter').addEventListener('change', renderRows);

  loadFields();
  const stored = readStoredKey();
  if (stored) connect(stored);
});

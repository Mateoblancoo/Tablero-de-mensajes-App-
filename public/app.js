const API_BASE = '/api';

const LIMITS = {
  usernameMin: 2,
  usernameMax: 24,
  titleMax: 60,
  bodyMax: 280,
};

// Elements
const $username = document.getElementById('username');
const $usernameHelp = document.getElementById('usernameHelp');
const $title = document.getElementById('title');
const $body = document.getElementById('body');
const $titleCounter = document.getElementById('titleCounter');
const $bodyCounter = document.getElementById('bodyCounter');
const $createForm = document.getElementById('createForm');
const $createError = document.getElementById('createError');
const $list = document.getElementById('messagesList');
const $template = document.getElementById('messageItemTemplate');
const $refreshBtn = document.getElementById('refreshBtn');
const $emptyState = document.getElementById('emptyState');

// Local storage keys
const LS_USERNAME = 'mb_username';
const LS_TOKENS = 'mb_tokens'; // { [id]: editToken }

// Helpers
function getTokens() {
  try { return JSON.parse(localStorage.getItem(LS_TOKENS) || '{}'); } catch { return {}; }
}
function setTokens(map) {
  localStorage.setItem(LS_TOKENS, JSON.stringify(map));
}
function getUsername() {
  return (localStorage.getItem(LS_USERNAME) || '').trim();
}
function setUsername(name) {
  localStorage.setItem(LS_USERNAME, (name || '').trim());
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch { return iso; }
}

function updateCounters() {
  $titleCounter.textContent = `${$title.value.length} / ${LIMITS.titleMax}`;
  $bodyCounter.textContent = `${$body.value.length} / ${LIMITS.bodyMax}`;
}

function ensureUsernameUI() {
  const saved = getUsername();
  if (saved) $username.value = saved;
  $username.addEventListener('input', () => {
    setUsername($username.value);
    const len = $username.value.trim().length;
    if (len < LIMITS.usernameMin || len > LIMITS.usernameMax) {
      $usernameHelp.textContent = `2–24 caracteres (actual: ${len})`;
      $usernameHelp.style.color = '#fca5a5';
    } else {
      $usernameHelp.textContent = '2–24 caracteres';
      $usernameHelp.style.color = '';
    }
  });
}

// Rendering
function renderMessages(messages) {
  $list.innerHTML = '';
  const tokens = getTokens();
  if (!messages.length) {
    $emptyState.style.display = 'block';
    return;
  } else {
    $emptyState.style.display = 'none';
  }

  for (const msg of messages) {
    const node = $template.content.firstElementChild.cloneNode(true);
    node.dataset.id = msg.id;
    node.querySelector('.msg-title').textContent = msg.title;
    node.querySelector('.msg-body').textContent = msg.body;
    node.querySelector('.meta').textContent = `por ${msg.username} · creado ${formatDate(msg.createdAt)} · actualizado ${formatDate(msg.updatedAt)}`;

    const canEdit = tokens[msg.id] != null;
    const $actions = node.querySelector('.actions');
    if (!canEdit) {
      $actions.style.display = 'none';
    } else {
      // hook events
      $actions.querySelector('[data-action="edit"]').addEventListener('click', () => enterEdit(node, msg));
      $actions.querySelector('[data-action="delete"]').addEventListener('click', () => deleteMessage(msg.id));
    }

    $list.appendChild(node);
  }
}

async function fetchMessages() {
  const res = await fetch(`${API_BASE}/messages`);
  if (!res.ok) {
    console.error('Error loading messages');
    return [];
  }
  return res.json();
}

// Create
$createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  $createError.textContent = '';

  const username = getUsername().trim();
  const title = $title.value.trim();
  const body = $body.value.trim();

  if (!username) {
    $createError.textContent = 'Primero ingresa tu nombre arriba.';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, title, body }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data?.errors) {
        $createError.textContent = Object.values(data.errors).join(' ');
      } else {
        $createError.textContent = data?.error || 'Error al crear el mensaje.';
      }
      return;
    }
    // store token
    const tokens = getTokens();
    tokens[data.id] = data.editToken;
    setTokens(tokens);

    // reset
    $title.value = '';
    $body.value = '';
    updateCounters();
    await reload();
  } catch (err) {
    console.error(err);
    $createError.textContent = 'Error de red.';
  }
});

// Edit flow
function enterEdit(node, msg) {
  const $main = node.querySelector('.message-main');
  const $form = node.querySelector('.edit-form');
  const $err = $form.querySelector('.error');
  $err.textContent = '';
  $main.style.display = 'none';
  $form.style.display = 'block';

  const $t = $form.querySelector('input[name="title"]');
  const $b = $form.querySelector('textarea[name="body"]');
  const $tc = $form.querySelectorAll('.counter')[0];
  const $bc = $form.querySelectorAll('.counter')[1];

  $t.value = msg.title;
  $b.value = msg.body;
  $tc.textContent = `${$t.value.length} / ${LIMITS.titleMax}`;
  $bc.textContent = `${$b.value.length} / ${LIMITS.bodyMax}`;

  $t.addEventListener('input', () => $tc.textContent = `${$t.value.length} / ${LIMITS.titleMax}`);
  $b.addEventListener('input', () => $bc.textContent = `${$b.value.length} / ${LIMITS.bodyMax}`);

  $form.querySelector('[data-action="cancel"]').onclick = (e) => {
    e.preventDefault();
    $form.style.display = 'none';
    $main.style.display = 'block';
  };

  $form.querySelector('[data-action="save"]').onclick = async (e) => {
    e.preventDefault();
    $err.textContent = '';
    await saveEdit(msg.id, $t.value.trim(), $b.value.trim(), $err);
  };
}

async function saveEdit(id, title, body, $err) {
  const tokens = getTokens();
  const editToken = tokens[id];
  try {
    const res = await fetch(`${API_BASE}/messages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, editToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data?.errors) {
        $err.textContent = Object.values(data.errors).join(' ');
      } else {
        $err.textContent = data?.error || 'Error al editar.';
      }
      return;
    }
    await reload();
  } catch (err) {
    console.error(err);
    $err.textContent = 'Error de red.';
  }
}

// Delete
async function deleteMessage(id) {
  if (!confirm('¿Borrar este mensaje?')) return;
  const tokens = getTokens();
  const editToken = tokens[id];
  try {
    const res = await fetch(`${API_BASE}/messages/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editToken }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || 'No se pudo borrar.');
      return;
    }
    // clean token
    delete tokens[id];
    setTokens(tokens);
    await reload();
  } catch (err) {
    console.error(err);
    alert('Error de red.');
  }
}

async function reload() {
  const msgs = await fetchMessages();
  renderMessages(msgs);
}

// Init
ensureUsernameUI();
updateCounters();
$title.addEventListener('input', updateCounters);
$body.addEventListener('input', updateCounters);
$refreshBtn.addEventListener('click', reload);

reload();

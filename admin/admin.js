/* ==============================
   CUENTIFY – admin.js
   Mobile-first: cards en móvil, tabla en desktop
   ============================== */

document.addEventListener('DOMContentLoaded', () => {

const SUPABASE_URL  = 'https://cfmmmrytieudxjfcfrag.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbW1tcnl0aWV1ZHhqZmNmcmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzUwMzcsImV4cCI6MjA5MDQ1MTAzN30.xMUI43qDEwgpkYotKSPY6KfAJM4Sf1ZjX4WHcgg4cS4';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── ¿Estamos en móvil? ──
const isMobile = () => window.innerWidth < 769;

// ── NAVIGATION ──
const navItems    = document.querySelectorAll('.nav-item');
const sections    = document.querySelectorAll('.section');
const topbarTitle = document.getElementById('topbarTitle');
const sidebar     = document.getElementById('sidebar');
const overlay     = document.getElementById('sidebarOverlay');

const titles = { productos:'Productos', cuentas:'Cuentas', pedidos:'Pedidos', banco:'Datos bancarios' };

navItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const sec = item.dataset.section;
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + sec).classList.add('active');
    topbarTitle.textContent = titles[sec] || sec;
    closeSidebar();
    if (sec === 'productos') loadProducts();
    if (sec === 'cuentas')   loadAccounts();
    if (sec === 'pedidos')   loadOrders('pendiente');
    if (sec === 'banco')     loadBankInfo();
  });
});

document.getElementById('sidebarToggle').addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
overlay.addEventListener('click', closeSidebar);

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  document.body.style.overflow = '';
}

// ── TOAST ──
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── HELPERS ──
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
}

function thumbHtml(url, cssClass) {
  return url
    ? `<img class="${cssClass}" src="${url}" alt="" />`
    : `<div class="${cssClass.replace('thumb','placeholder')}">📦</div>`;
}

function actionBtns(editAction, deleteAction, id, extra = '') {
  return `
    <div style="display:flex;gap:2px;">
      ${extra}
      <button class="btn-icon" data-action="${editAction}" data-id="${id}" title="Editar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn-icon danger" data-action="${deleteAction}" data-id="${id}" title="Eliminar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>`;
}

function showSection(loadingId, tableWrapId, cardsId, emptyId, hasData) {
  document.getElementById(loadingId).style.display = 'none';
  if (!hasData) {
    document.getElementById(emptyId).style.display = 'flex';
    return;
  }
  if (isMobile()) {
    document.getElementById(cardsId).style.display  = 'flex';
    document.getElementById(tableWrapId).style.display = 'none';
  } else {
    document.getElementById(tableWrapId).style.display = 'block';
    document.getElementById(cardsId).style.display  = 'none';
  }
}

/* ══════════════════════════════════
   PRODUCTOS
══════════════════════════════════ */
let allProducts = [];

async function loadProducts() {
  const loadingEl = document.getElementById('productsLoading');
  const tableWrap = document.getElementById('productsTableWrap');
  const cardsEl   = document.getElementById('productsCards');
  const emptyEl   = document.getElementById('productsEmpty');

  loadingEl.style.display = 'flex';
  tableWrap.style.display = 'none';
  cardsEl.style.display   = 'none';
  emptyEl.style.display   = 'none';

  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
  if (error || !data || !data.length) {
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'flex';
    return;
  }

  allProducts = data;
  refreshProductSelects();

  const ids = data.map(p => p.id);
  const { data: counts } = await sb.from('accounts').select('product_id').in('product_id', ids).eq('is_available', true);
  const countMap = {};
  (counts || []).forEach(r => { countMap[r.product_id] = (countMap[r.product_id] || 0) + 1; });

  // ── Tabla (desktop) ──
  const tbody = document.getElementById('productsBody');
  tbody.innerHTML = '';
  data.forEach(p => {
    const c = countMap[p.id] || 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div style="display:flex;align-items:center;gap:10px;">
        ${thumbHtml(p.image_url, 'product-thumb-sm')}
        <strong>${p.name}</strong>
      </div></td>
      <td>${p.category || '—'}</td>
      <td>${c} disponible${c !== 1 ? 's' : ''}</td>
      <td>${actionBtns('edit-product','delete-product', p.id)}</td>`;
    tbody.appendChild(tr);
  });

  // ── Cards (móvil) ──
  const cardsContainer = document.getElementById('productsCards');
  cardsContainer.innerHTML = '';
  data.forEach(p => {
    const c = countMap[p.id] || 0;
    const div = document.createElement('div');
    div.className = 'data-card';
    div.innerHTML = `
      <div class="data-card-header">
        <div class="data-card-title">
          ${thumbHtml(p.image_url, 'product-thumb-sm')}
          <span>${p.name}</span>
        </div>
        <div class="data-card-actions">${actionBtns('edit-product','delete-product', p.id)}</div>
      </div>
      <div class="data-card-fields">
        <div class="data-card-field">
          <span class="data-card-field-label">Categoría</span>
          <span class="data-card-field-value">${p.category || '—'}</span>
        </div>
        <div class="data-card-field">
          <span class="data-card-field-label">Cuentas</span>
          <span class="data-card-field-value">${c} disponible${c !== 1 ? 's' : ''}</span>
        </div>
      </div>`;
    cardsContainer.appendChild(div);
  });

  showSection('productsLoading','productsTableWrap','productsCards','productsEmpty', true);
}

document.getElementById('productsBody').addEventListener('click', handleProductAction);
document.getElementById('productsCards').addEventListener('click', handleProductAction);

async function handleProductAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'edit-product') {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('productId').value       = p.id;
    document.getElementById('productName').value     = p.name;
    document.getElementById('productCategory').value = p.category || '';
    document.getElementById('productImage').value    = p.image_url || '';
    document.getElementById('productModalTitle').textContent = 'Editar producto';
    openModal('productModalOverlay');
  }
  if (action === 'delete-product') {
    if (!confirm('¿Eliminar este producto?')) return;
    await sb.from('products').delete().eq('id', id);
    toast('Producto eliminado', 'success');
    loadProducts();
  }
}

document.getElementById('btnNewProduct').addEventListener('click', () => { clearProductForm(); openModal('productModalOverlay'); });
document.getElementById('btnNewProductEmpty')?.addEventListener('click', () => { clearProductForm(); openModal('productModalOverlay'); });
document.getElementById('productModalClose').addEventListener('click', () => closeModal('productModalOverlay'));
document.getElementById('productModalCancel').addEventListener('click', () => closeModal('productModalOverlay'));

function clearProductForm() {
  ['productId','productName','productCategory','productImage'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('productModalTitle').textContent = 'Nuevo producto';
}

document.getElementById('productForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id  = document.getElementById('productId').value;
  const payload = {
    name:      document.getElementById('productName').value.trim(),
    category:  document.getElementById('productCategory').value,
    image_url: document.getElementById('productImage').value.trim() || null,
  };
  const { error } = id
    ? await sb.from('products').update(payload).eq('id', id)
    : await sb.from('products').insert(payload);
  if (error) { toast('Error al guardar', 'error'); return; }
  toast(id ? 'Producto actualizado' : 'Producto creado', 'success');
  closeModal('productModalOverlay');
  loadProducts();
});

/* ══════════════════════════════════
   CUENTAS
══════════════════════════════════ */

async function loadAccounts() {
  const loadingEl = document.getElementById('accountsLoading');
  const tableWrap = document.getElementById('accountsTableWrap');
  const cardsEl   = document.getElementById('accountsCards');
  const emptyEl   = document.getElementById('accountsEmpty');

  loadingEl.style.display = 'flex';
  tableWrap.style.display = 'none';
  cardsEl.style.display   = 'none';
  emptyEl.style.display   = 'none';

  const productId = document.getElementById('filterProduct').value;
  const status    = document.getElementById('filterStatus').value;

  let q = sb.from('accounts').select('*, products(name)').order('created_at', { ascending: false });
  if (productId) q = q.eq('product_id', productId);
  if (status !== '') q = q.eq('is_available', status === 'true');

  const { data, error } = await q;
  if (error || !data || !data.length) {
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'flex';
    return;
  }

  // Tabla
  const tbody = document.getElementById('accountsBody');
  tbody.innerHTML = '';
  data.forEach(a => {
    const avail = a.is_available;
    const badge = `<span class="badge badge--${avail?'green':'red'}"><span class="badge-dot"></span>${avail?'Disponible':'Vendida'}</span>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.products?.name || '—'}</td>
      <td>${a.description || '—'}</td>
      <td>$${parseFloat(a.price||0).toFixed(2)}</td>
      <td>${fmtDate(a.expires_at)}</td>
      <td>${badge}</td>
      <td>${actionBtns('edit-account','delete-account', a.id)}</td>`;
    tbody.appendChild(tr);
  });

  // Cards
  const cardsContainer = document.getElementById('accountsCards');
  cardsContainer.innerHTML = '';
  data.forEach(a => {
    const avail = a.is_available;
    const badge = `<span class="badge badge--${avail?'green':'red'}"><span class="badge-dot"></span>${avail?'Disponible':'Vendida'}</span>`;
    const div = document.createElement('div');
    div.className = 'data-card';
    div.innerHTML = `
      <div class="data-card-header">
        <div class="data-card-title"><span>${a.products?.name || '—'}</span></div>
        <div class="data-card-actions">${actionBtns('edit-account','delete-account', a.id)}</div>
      </div>
      <div class="data-card-fields">
        <div class="data-card-field">
          <span class="data-card-field-label">Descripción</span>
          <span class="data-card-field-value">${a.description || '—'}</span>
        </div>
        <div class="data-card-field">
          <span class="data-card-field-label">Precio</span>
          <span class="data-card-field-value">$${parseFloat(a.price||0).toFixed(2)} MXN</span>
        </div>
        <div class="data-card-field">
          <span class="data-card-field-label">Vence</span>
          <span class="data-card-field-value">${fmtDate(a.expires_at)}</span>
        </div>
        <div class="data-card-field">
          <span class="data-card-field-label">Estado</span>
          <span class="data-card-field-value">${badge}</span>
        </div>
      </div>`;
    cardsContainer.appendChild(div);
  });

  showSection('accountsLoading','accountsTableWrap','accountsCards','accountsEmpty', true);
}

document.getElementById('filterProduct').addEventListener('change', loadAccounts);
document.getElementById('filterStatus').addEventListener('change', loadAccounts);
document.getElementById('accountsBody').addEventListener('click', handleAccountAction);
document.getElementById('accountsCards').addEventListener('click', handleAccountAction);

async function handleAccountAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'edit-account') {
    const { data: a } = await sb.from('accounts').select('*').eq('id', id).single();
    if (!a) return;
    document.getElementById('accountId').value          = a.id;
    document.getElementById('accountProduct').value     = a.product_id || '';
    document.getElementById('accountDescription').value = a.description || '';
    document.getElementById('accountCredentials').value = a.credentials || '';
    document.getElementById('accountPrice').value       = a.price || '';
    document.getElementById('accountExpires').value     = a.expires_at ? a.expires_at.split('T')[0] : '';
    document.getElementById('accountDelivery').value    = a.delivery_hours || 12;
    document.getElementById('accountModalTitle').textContent = 'Editar cuenta';
    openModal('accountModalOverlay');
  }
  if (action === 'delete-account') {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    await sb.from('accounts').delete().eq('id', id);
    toast('Cuenta eliminada', 'success');
    loadAccounts();
  }
}

document.getElementById('btnNewAccount').addEventListener('click', () => { clearAccountForm(); openModal('accountModalOverlay'); });
document.getElementById('accountModalClose').addEventListener('click', () => closeModal('accountModalOverlay'));
document.getElementById('accountModalCancel').addEventListener('click', () => closeModal('accountModalOverlay'));

function clearAccountForm() {
  ['accountId','accountProduct','accountDescription','accountCredentials','accountPrice','accountExpires'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('accountDelivery').value = 12;
  document.getElementById('accountModalTitle').textContent = 'Nueva cuenta';
}

function refreshProductSelects() {
  ['accountProduct','filterProduct'].forEach(selId => {
    const sel = document.getElementById(selId);
    const cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    allProducts.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = p.name;
      sel.appendChild(opt);
    });
    sel.value = cur;
  });
}

document.getElementById('accountForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('accountId').value;
  const payload = {
    product_id:     document.getElementById('accountProduct').value,
    description:    document.getElementById('accountDescription').value.trim() || null,
    credentials:    document.getElementById('accountCredentials').value.trim(),
    price:          parseFloat(document.getElementById('accountPrice').value),
    expires_at:     document.getElementById('accountExpires').value ? new Date(document.getElementById('accountExpires').value).toISOString() : null,
    delivery_hours: parseInt(document.getElementById('accountDelivery').value) || 12,
    is_available:   true,
  };
  const { error } = id
    ? await sb.from('accounts').update(payload).eq('id', id)
    : await sb.from('accounts').insert(payload);
  if (error) { toast('Error al guardar', 'error'); return; }
  toast(id ? 'Cuenta actualizada' : 'Cuenta creada', 'success');
  closeModal('accountModalOverlay');
  loadAccounts();
});

/* ══════════════════════════════════
   PEDIDOS
══════════════════════════════════ */
let currentOrderStatus = 'pendiente';

document.querySelectorAll('.tab-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentOrderStatus = btn.dataset.status;
    loadOrders(currentOrderStatus);
  });
});

async function loadOrders(status) {
  const loadingEl = document.getElementById('ordersLoading');
  const tableWrap = document.getElementById('ordersTableWrap');
  const cardsEl   = document.getElementById('ordersCards');
  const emptyEl   = document.getElementById('ordersEmpty');

  loadingEl.style.display = 'flex';
  tableWrap.style.display = 'none';
  cardsEl.style.display   = 'none';
  emptyEl.style.display   = 'none';

  const { data, error } = await sb.from('orders')
    .select('*, accounts(description, products(name))')
    .eq('status', status)
    .order('created_at', { ascending: false });

  updatePendingBadge();

  if (error || !data || !data.length) {
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'flex';
    return;
  }

  const statusBadge = s => ({
    pendiente: `<span class="badge badge--orange"><span class="badge-dot"></span>Pendiente</span>`,
    aprobado:  `<span class="badge badge--green"><span class="badge-dot"></span>Aprobado</span>`,
    rechazado: `<span class="badge badge--red"><span class="badge-dot"></span>Rechazado</span>`,
  }[s] || s);

  const orderActions = o => o.status !== 'pendiente' ? '' : `
    <button class="btn-icon" style="color:var(--green)" data-action="approve-order" data-id="${o.id}" data-account="${o.account_id}" title="Aprobar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
    <button class="btn-icon danger" data-action="reject-order" data-id="${o.id}" title="Rechazar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;

  const voucherBtn = o => o.voucher_url
    ? `<button class="btn-icon" data-action="view-voucher" data-id="${o.id}" data-url="${o.voucher_url}" title="Ver">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
       </button>`
    : '<span style="font-size:0.78rem;color:var(--muted)">Sin archivo</span>';

  // Tabla
  const tbody = document.getElementById('ordersBody');
  tbody.innerHTML = '';
  data.forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(o.created_at)}</td>
      <td>${o.customer_email || '—'}</td>
      <td>${o.accounts?.products?.name || '—'}</td>
      <td>$${parseFloat(o.amount||0).toFixed(2)}</td>
      <td>${voucherBtn(o)}</td>
      <td>${statusBadge(o.status)}</td>
      <td><div style="display:flex;gap:2px;">${orderActions(o)}</div></td>`;
    tbody.appendChild(tr);
  });

  // Cards
  const cardsContainer = document.getElementById('ordersCards');
  cardsContainer.innerHTML = '';
  data.forEach(o => {
    const div = document.createElement('div');
    div.className = 'data-card';
    div.innerHTML = `
      <div class="data-card-header">
        <div class="data-card-title"><span>${o.customer_email || '—'}</span></div>
        <div class="data-card-actions"><div style="display:flex;gap:2px;">${orderActions(o)}</div></div>
      </div>
      <div class="data-card-fields">
        <div class="data-card-field">
          <span class="data-card-field-label">Producto</span>
          <span class="data-card-field-value">${o.accounts?.products?.name || '—'}</span>
        </div>
        <div class="data-card-field">
          <span class="data-card-field-label">Monto</span>
          <span class="data-card-field-value">$${parseFloat(o.amount||0).toFixed(2)} MXN</span>
        </div>
        <div class="data-card-field">
          <span class="data-card-field-label">Fecha</span>
          <span class="data-card-field-value">${fmtDate(o.created_at)}</span>
        </div>
        <div class="data-card-field">
          <span class="data-card-field-label">Estado</span>
          <span class="data-card-field-value">${statusBadge(o.status)}</span>
        </div>
        <div class="data-card-field" style="grid-column:1/-1">
          <span class="data-card-field-label">Comprobante</span>
          <span class="data-card-field-value">${voucherBtn(o)}</span>
        </div>
      </div>`;
    cardsContainer.appendChild(div);
  });

  showSection('ordersLoading','ordersTableWrap','ordersCards','ordersEmpty', true);
}

document.getElementById('ordersBody').addEventListener('click', handleOrderAction);
document.getElementById('ordersCards').addEventListener('click', handleOrderAction);

async function handleOrderAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'approve-order') {
    const accountId = btn.dataset.account;
    if (!confirm('¿Aprobar este pedido?')) return;
    await sb.from('orders').update({ status: 'aprobado' }).eq('id', id);
    await sb.from('accounts').update({ is_available: false }).eq('id', accountId);
    toast('Pedido aprobado ✓', 'success');
    loadOrders(currentOrderStatus);
  }
  if (action === 'reject-order') {
    if (!confirm('¿Rechazar este pedido?')) return;
    await sb.from('orders').update({ status: 'rechazado' }).eq('id', id);
    toast('Pedido rechazado');
    loadOrders(currentOrderStatus);
  }
  if (action === 'view-voucher') {
    document.getElementById('voucherImg').src = btn.dataset.url;
    document.getElementById('voucherActions').innerHTML = `<a href="${btn.dataset.url}" target="_blank" class="btn-secondary">Abrir en nueva pestaña</a>`;
    openModal('voucherModalOverlay');
  }
}

document.getElementById('voucherModalClose').addEventListener('click', () => closeModal('voucherModalOverlay'));

async function updatePendingBadge() {
  const { count } = await sb.from('orders').select('*', { count:'exact', head:true }).eq('status','pendiente');
  const badge = document.getElementById('pendingBadge');
  badge.style.display = count > 0 ? 'flex' : 'none';
  badge.textContent = count;
}

/* ══════════════════════════════════
   BANCO
══════════════════════════════════ */
async function loadBankInfo() {
  const { data } = await sb.from('bank_info').select('*').limit(1).single();
  if (!data) return;
  document.getElementById('inputBanco').value   = data.banco || '';
  document.getElementById('inputClabe').value   = data.clabe || '';
  document.getElementById('inputTitular').value = data.titular || '';
  document.getElementById('inputAlias').value   = data.alias || '';
  updateBankPreview();
}

function updateBankPreview() {
  const banco   = document.getElementById('inputBanco').value;
  const clabe   = document.getElementById('inputClabe').value;
  const titular = document.getElementById('inputTitular').value;
  const alias   = document.getElementById('inputAlias').value;
  document.getElementById('previewBanco').textContent   = banco   || '—';
  document.getElementById('previewClabe').textContent   = clabe   || '—';
  document.getElementById('previewTitular').textContent = titular || '—';
  const row = document.getElementById('previewAliasRow');
  if (alias) { document.getElementById('previewAlias').textContent = alias; row.style.display = 'flex'; }
  else row.style.display = 'none';
}

['inputBanco','inputClabe','inputTitular','inputAlias'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateBankPreview);
});

document.getElementById('bankForm').addEventListener('submit', async e => {
  e.preventDefault();
  const clabe = document.getElementById('inputClabe').value.trim();
  if (clabe.length !== 18) { toast('La CLABE debe tener 18 dígitos', 'error'); return; }
  const { error } = await sb.from('bank_info').upsert({
    id: 1,
    banco:   document.getElementById('inputBanco').value.trim(),
    clabe,
    titular: document.getElementById('inputTitular').value.trim(),
    alias:   document.getElementById('inputAlias').value.trim() || null,
  });
  if (error) { toast('Error al guardar', 'error'); return; }
  document.getElementById('saveStatus').textContent = '✓ Guardado';
  setTimeout(() => document.getElementById('saveStatus').textContent = '', 3000);
  toast('Datos bancarios guardados', 'success');
});

/* ══════════════════════════════════
   MODALES
══════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }

document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) { ov.classList.remove('open'); document.body.style.overflow = ''; } });
});

/* ══════════════════════════════════
   INIT
══════════════════════════════════ */
loadProducts();
updatePendingBadge();

}); // DOMContentLoaded

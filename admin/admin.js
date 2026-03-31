/* ==============================
   CUENTIFY – admin.js (nuevo)
   4 secciones: Productos, Cuentas, Pedidos, Banco
   ============================== */

document.addEventListener('DOMContentLoaded', () => {

// ── SUPABASE ──
const SUPABASE_URL  = 'https://cfmmmrytieudxjfcfrag.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbW1tcnl0aWV1ZHhqZmNmcmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzUwMzcsImV4cCI6MjA5MDQ1MTAzN30.xMUI43qDEwgpkYotKSPY6KfAJM4Sf1ZjX4WHcgg4cS4';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── NAVIGATION ──
const navItems    = document.querySelectorAll('.nav-item');
const sections    = document.querySelectorAll('.section');
const topbarTitle = document.getElementById('topbarTitle');
const sidebar     = document.getElementById('sidebar');

const sectionTitles = {
  productos: 'Productos',
  cuentas:   'Cuentas',
  pedidos:   'Pedidos',
  banco:     'Datos bancarios',
};

navItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const sec = item.dataset.section;
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + sec).classList.add('active');
    topbarTitle.textContent = sectionTitles[sec] || sec;
    sidebar.classList.remove('open');
    if (sec === 'productos') loadProducts();
    if (sec === 'cuentas')   loadAccounts();
    if (sec === 'pedidos')   loadOrders('pendiente');
    if (sec === 'banco')     loadBankInfo();
  });
});

document.getElementById('sidebarToggle').addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// ── TOAST ──
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── FORMAT DATE ──
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ══════════════════════════════════
   PRODUCTOS
══════════════════════════════════ */

let allProducts = [];

async function loadProducts() {
  document.getElementById('productsLoading').style.display = 'flex';
  document.getElementById('productsTable').style.display = 'none';
  document.getElementById('productsEmpty').style.display = 'none';

  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });

  document.getElementById('productsLoading').style.display = 'none';

  if (error || !data || data.length === 0) {
    document.getElementById('productsEmpty').style.display = 'flex';
    return;
  }

  allProducts = data;
  refreshProductSelect();

  const tbody = document.getElementById('productsBody');
  tbody.innerHTML = '';

  // Contar cuentas disponibles por producto
  const ids = data.map(p => p.id);
  const { data: counts } = await sb.from('accounts').select('product_id').in('product_id', ids).eq('is_available', true);
  const countMap = {};
  (counts || []).forEach(r => { countMap[r.product_id] = (countMap[r.product_id] || 0) + 1; });

  data.forEach(p => {
    const tr = document.createElement('tr');
    const thumb = p.image_url
      ? `<img class="product-row-thumb" src="${p.image_url}" alt="" />`
      : `<div class="product-row-placeholder">📦</div>`;
    const count = countMap[p.id] || 0;
    tr.innerHTML = `
      <td>
        <div class="product-row-name">
          ${thumb}
          <strong>${p.name}</strong>
        </div>
      </td>
      <td>${p.category || '—'}</td>
      <td>${count} disponible${count !== 1 ? 's' : ''}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn-icon" data-action="edit-product" data-id="${p.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" data-action="delete-product" data-id="${p.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('productsTable').style.display = 'table';
}

// Acciones tabla productos
document.getElementById('productsBody').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'edit-product') {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productCategory').value = p.category || '';
    document.getElementById('productImage').value = p.image_url || '';
    document.getElementById('productModalTitle').textContent = 'Editar producto';
    openModal('productModalOverlay');
  }

  if (action === 'delete-product') {
    if (!confirm('¿Eliminar este producto? También se eliminarán sus cuentas.')) return;
    const { error } = await sb.from('products').delete().eq('id', id);
    if (error) { toast('Error al eliminar', 'error'); return; }
    toast('Producto eliminado', 'success');
    loadProducts();
  }
});

// Modal producto
document.getElementById('btnNewProduct').addEventListener('click', () => {
  clearProductForm();
  document.getElementById('productModalTitle').textContent = 'Nuevo producto';
  openModal('productModalOverlay');
});
document.getElementById('btnNewProductEmpty')?.addEventListener('click', () => {
  clearProductForm();
  document.getElementById('productModalTitle').textContent = 'Nuevo producto';
  openModal('productModalOverlay');
});
document.getElementById('productModalClose').addEventListener('click', () => closeModal('productModalOverlay'));
document.getElementById('productModalCancel').addEventListener('click', () => closeModal('productModalOverlay'));

function clearProductForm() {
  document.getElementById('productId').value = '';
  document.getElementById('productName').value = '';
  document.getElementById('productCategory').value = '';
  document.getElementById('productImage').value = '';
}

document.getElementById('productForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id   = document.getElementById('productId').value;
  const name = document.getElementById('productName').value.trim();
  const cat  = document.getElementById('productCategory').value;
  const img  = document.getElementById('productImage').value.trim();

  const payload = { name, category: cat, image_url: img || null };

  let error;
  if (id) {
    ({ error } = await sb.from('products').update(payload).eq('id', id));
  } else {
    ({ error } = await sb.from('products').insert(payload));
  }

  if (error) { toast('Error al guardar', 'error'); return; }
  toast(id ? 'Producto actualizado' : 'Producto creado', 'success');
  closeModal('productModalOverlay');
  loadProducts();
});


/* ══════════════════════════════════
   CUENTAS
══════════════════════════════════ */

async function loadAccounts() {
  document.getElementById('accountsLoading').style.display = 'flex';
  document.getElementById('accountsTable').style.display = 'none';
  document.getElementById('accountsEmpty').style.display = 'none';

  const productId = document.getElementById('filterProduct').value;
  const status    = document.getElementById('filterStatus').value;

  let query = sb.from('accounts').select('*, products(name)').order('created_at', { ascending: false });
  if (productId) query = query.eq('product_id', productId);
  if (status !== '')  query = query.eq('is_available', status === 'true');

  const { data, error } = await query;

  document.getElementById('accountsLoading').style.display = 'none';

  if (error || !data || data.length === 0) {
    document.getElementById('accountsEmpty').style.display = 'flex';
    return;
  }

  const tbody = document.getElementById('accountsBody');
  tbody.innerHTML = '';

  data.forEach(a => {
    const tr = document.createElement('tr');
    const avail = a.is_available;
    tr.innerHTML = `
      <td>${a.products?.name || '—'}</td>
      <td>${a.description || '—'}</td>
      <td>$${parseFloat(a.price || 0).toFixed(2)}</td>
      <td>${fmtDate(a.expires_at)}</td>
      <td>
        <span class="badge badge--${avail ? 'green' : 'red'}">
          <span class="badge-dot"></span>
          ${avail ? 'Disponible' : 'Vendida'}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn-icon" data-action="edit-account" data-id="${a.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" data-action="delete-account" data-id="${a.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('accountsTable').style.display = 'table';
}

// Filtros cuentas
document.getElementById('filterProduct').addEventListener('change', loadAccounts);
document.getElementById('filterStatus').addEventListener('change', loadAccounts);

// Acciones tabla cuentas
document.getElementById('accountsBody').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'edit-account') {
    const { data: a } = await sb.from('accounts').select('*').eq('id', id).single();
    if (!a) return;
    document.getElementById('accountId').value = a.id;
    document.getElementById('accountProduct').value = a.product_id || '';
    document.getElementById('accountDescription').value = a.description || '';
    document.getElementById('accountCredentials').value = a.credentials || '';
    document.getElementById('accountPrice').value = a.price || '';
    document.getElementById('accountExpires').value = a.expires_at ? a.expires_at.split('T')[0] : '';
    document.getElementById('accountDelivery').value = a.delivery_hours || 12;
    document.getElementById('accountModalTitle').textContent = 'Editar cuenta';
    openModal('accountModalOverlay');
  }

  if (action === 'delete-account') {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    const { error } = await sb.from('accounts').delete().eq('id', id);
    if (error) { toast('Error al eliminar', 'error'); return; }
    toast('Cuenta eliminada', 'success');
    loadAccounts();
  }
});

// Modal cuenta
document.getElementById('btnNewAccount').addEventListener('click', () => {
  clearAccountForm();
  document.getElementById('accountModalTitle').textContent = 'Nueva cuenta';
  openModal('accountModalOverlay');
});
document.getElementById('accountModalClose').addEventListener('click', () => closeModal('accountModalOverlay'));
document.getElementById('accountModalCancel').addEventListener('click', () => closeModal('accountModalOverlay'));

function clearAccountForm() {
  ['accountId','accountProduct','accountDescription','accountCredentials',
   'accountPrice','accountExpires'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('accountDelivery').value = 12;
}

function refreshProductSelect() {
  const selects = ['accountProduct', 'filterProduct'];
  selects.forEach(selId => {
    const sel = document.getElementById(selId);
    const current = sel.value;
    // Keep first option
    while (sel.options.length > 1) sel.remove(1);
    allProducts.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
    sel.value = current;
  });
}

document.getElementById('accountForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id          = document.getElementById('accountId').value;
  const product_id  = document.getElementById('accountProduct').value;
  const description = document.getElementById('accountDescription').value.trim();
  const credentials = document.getElementById('accountCredentials').value.trim();
  const price       = parseFloat(document.getElementById('accountPrice').value);
  const expires_raw = document.getElementById('accountExpires').value;
  const delivery    = parseInt(document.getElementById('accountDelivery').value) || 12;

  const payload = {
    product_id,
    description: description || null,
    credentials,
    price,
    expires_at: expires_raw ? new Date(expires_raw).toISOString() : null,
    delivery_hours: delivery,
    is_available: true,
  };

  let error;
  if (id) {
    ({ error } = await sb.from('accounts').update(payload).eq('id', id));
  } else {
    ({ error } = await sb.from('accounts').insert(payload));
  }

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
  document.getElementById('ordersLoading').style.display = 'flex';
  document.getElementById('ordersTable').style.display = 'none';
  document.getElementById('ordersEmpty').style.display = 'none';

  const { data, error } = await sb
    .from('orders')
    .select('*, accounts(description, products(name))')
    .eq('status', status)
    .order('created_at', { ascending: false });

  document.getElementById('ordersLoading').style.display = 'none';

  if (error || !data || data.length === 0) {
    document.getElementById('ordersEmpty').style.display = 'flex';
    updatePendingBadge();
    return;
  }

  const tbody = document.getElementById('ordersBody');
  tbody.innerHTML = '';

  data.forEach(o => {
    const tr = document.createElement('tr');
    const statusBadge = {
      pendiente: '<span class="badge badge--orange"><span class="badge-dot"></span>Pendiente</span>',
      aprobado:  '<span class="badge badge--green"><span class="badge-dot"></span>Aprobado</span>',
      rechazado: '<span class="badge badge--red"><span class="badge-dot"></span>Rechazado</span>',
    }[o.status] || o.status;

    const productName = o.accounts?.products?.name || '—';
    const accountDesc = o.accounts?.description || '—';

    let actions = '';
    if (o.status === 'pendiente') {
      actions = `
        <button class="btn-icon" style="color:var(--green)" data-action="approve-order" data-id="${o.id}" data-account="${o.account_id}" title="Aprobar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="btn-icon danger" data-action="reject-order" data-id="${o.id}" title="Rechazar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
    }

    tr.innerHTML = `
      <td>${fmtDate(o.created_at)}</td>
      <td>${o.customer_email || '—'}</td>
      <td>${productName}<br><small style="color:var(--text-muted)">${accountDesc}</small></td>
      <td>$${parseFloat(o.amount || 0).toFixed(2)}</td>
      <td>
        ${o.voucher_url
          ? `<button class="btn-icon" data-action="view-voucher" data-id="${o.id}" data-url="${o.voucher_url}" title="Ver comprobante">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
             </button>`
          : '<span style="color:var(--text-muted);font-size:0.8rem">Sin archivo</span>'
        }
      </td>
      <td>${statusBadge}</td>
      <td><div style="display:flex;gap:4px;">${actions}</div></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('ordersTable').style.display = 'table';
  updatePendingBadge();
}

document.getElementById('ordersBody').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'approve-order') {
    const accountId = btn.dataset.account;
    if (!confirm('¿Aprobar este pedido? La cuenta se marcará como vendida.')) return;
    const { error: e1 } = await sb.from('orders').update({ status: 'aprobado' }).eq('id', id);
    const { error: e2 } = await sb.from('accounts').update({ is_available: false }).eq('id', accountId);
    if (e1 || e2) { toast('Error al aprobar', 'error'); return; }
    toast('Pedido aprobado ✓', 'success');
    loadOrders(currentOrderStatus);
  }

  if (action === 'reject-order') {
    if (!confirm('¿Rechazar este pedido?')) return;
    const { error } = await sb.from('orders').update({ status: 'rechazado' }).eq('id', id);
    if (error) { toast('Error al rechazar', 'error'); return; }
    toast('Pedido rechazado', '');
    loadOrders(currentOrderStatus);
  }

  if (action === 'view-voucher') {
    const url = btn.dataset.url;
    document.getElementById('voucherImg').src = url;
    document.getElementById('voucherInfo').innerHTML = '';
    document.getElementById('voucherActions').innerHTML = `
      <a href="${url}" target="_blank" class="btn-secondary">Abrir en nueva pestaña</a>
    `;
    openModal('voucherModalOverlay');
  }
});

async function updatePendingBadge() {
  const { count } = await sb.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pendiente');
  const badge = document.getElementById('pendingBadge');
  if (count && count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

document.getElementById('voucherModalClose').addEventListener('click', () => closeModal('voucherModalOverlay'));


/* ══════════════════════════════════
   DATOS BANCARIOS
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

  document.getElementById('previewBanco').textContent   = banco || '—';
  document.getElementById('previewClabe').textContent   = clabe || '—';
  document.getElementById('previewTitular').textContent = titular || '—';

  const aliasRow = document.getElementById('previewAliasRow');
  if (alias) {
    document.getElementById('previewAlias').textContent = alias;
    aliasRow.style.display = 'flex';
  } else {
    aliasRow.style.display = 'none';
  }
}

['inputBanco','inputClabe','inputTitular','inputAlias'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateBankPreview);
});

document.getElementById('bankForm').addEventListener('submit', async e => {
  e.preventDefault();
  const banco   = document.getElementById('inputBanco').value.trim();
  const clabe   = document.getElementById('inputClabe').value.trim();
  const titular = document.getElementById('inputTitular').value.trim();
  const alias   = document.getElementById('inputAlias').value.trim();

  if (clabe.length !== 18) {
    toast('La CLABE debe tener 18 dígitos', 'error');
    return;
  }

  // Upsert — siempre hay un solo registro
  const { error } = await sb.from('bank_info').upsert({ id: 1, banco, clabe, titular, alias: alias || null });

  if (error) { toast('Error al guardar', 'error'); return; }

  document.getElementById('saveStatus').textContent = '✓ Guardado';
  setTimeout(() => { document.getElementById('saveStatus').textContent = ''; }, 3000);
  toast('Datos bancarios guardados', 'success');
});


/* ══════════════════════════════════
   MODAL HELPERS
══════════════════════════════════ */

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});


/* ══════════════════════════════════
   INIT
══════════════════════════════════ */
loadProducts();
updatePendingBadge();

}); // fin DOMContentLoaded

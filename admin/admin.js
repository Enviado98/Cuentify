/* ==============================
   CUENTIFY – admin.js
   Conectado a Supabase.
   ============================== */

/* ════════════════════════════════════
   SUPABASE CLIENT
════════════════════════════════════ */

const SUPABASE_URL  = 'https://cfmmmrytieudxjfcfrag.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbW1tcnl0aWV1ZHhqZmNmcmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzUwMzcsImV4cCI6MjA5MDQ1MTAzN30.xMUI43qDEwgpkYotKSPY6KfAJM4Sf1ZjX4WHcgg4cS4';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

document.addEventListener('DOMContentLoaded', () => {


/* ════════════════════════════════════
   NAVEGACIÓN DE SECCIONES
════════════════════════════════════ */

const navItems    = document.querySelectorAll('.nav-item');
const sections    = document.querySelectorAll('.section');
const topbarTitle = document.getElementById('topbarTitle');

const sectionTitles = {
  dashboard:      'Dashboard',
  productos:      'Productos',
  cuentas:        'Cuentas',
  pedidos:        'Pedidos',
  clientes:       'Clientes',
  configuracion:  'Configuración',
};

function goToSection(name) {
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.section === name);
  });
  sections.forEach(s => {
    s.classList.toggle('active', s.id === `section-${name}`);
  });
  topbarTitle.textContent = sectionTitles[name] || name;
  closeSidebar();
}

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(item.dataset.section);
  });
});

document.querySelectorAll('[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => goToSection(btn.dataset.goto));
});


/* ════════════════════════════════════
   SIDEBAR MOBILE
════════════════════════════════════ */

const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarToggle  = document.getElementById('sidebarToggle');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('visible');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
}

sidebarToggle.addEventListener('click', openSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);


/* ════════════════════════════════════
   FILTROS DE TABS
════════════════════════════════════ */

document.querySelectorAll('.filter-tabs').forEach(group => {
  group.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      group.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
});


/* ════════════════════════════════════
   TOAST
════════════════════════════════════ */

let toastTimeout;

function showToast(msg, type = 'default') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast--${type} show`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}


/* ════════════════════════════════════
   DASHBOARD – STATS
════════════════════════════════════ */

async function loadDashboardStats() {
  const statCards = document.querySelectorAll('#section-dashboard .stat-value');

  try {
    const today = new Date().toISOString().split('T')[0];

    const { count: pedidosHoy } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    const { data: ingresosData } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', today)
      .eq('status', 'completado');

    const ingresosHoy = (ingresosData || []).reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    const { count: productosActivos } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { count: cuentasDisponibles } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'disponible');

    if (statCards[0]) statCards[0].textContent = pedidosHoy ?? '0';
    if (statCards[1]) statCards[1].textContent = `$${ingresosHoy.toFixed(2)}`;
    if (statCards[2]) statCards[2].textContent = productosActivos ?? '0';
    if (statCards[3]) statCards[3].textContent = cuentasDisponibles ?? '0';

  } catch (err) {
    console.error('Error cargando stats del dashboard:', err);
  }
}


/* ════════════════════════════════════
   MODAL: PRODUCTO
════════════════════════════════════ */

const modalProductoOverlay   = document.getElementById('modalProductoOverlay');
const modalProducto          = document.getElementById('modalProducto');
const modalProductoTitle     = document.getElementById('modalProductoTitle');
const modalProductoClose     = document.getElementById('modalProductoClose');
const modalProductoCancelBtn = document.getElementById('modalProductoCancelBtn');
const modalProductoSaveBtn   = document.getElementById('modalProductoSaveBtn');
const btnNuevoProducto       = document.getElementById('btnNuevoProducto');

const imgUploadAreaProducto = document.getElementById('imgUploadAreaProducto');
const imgInputProducto      = document.getElementById('imgInputProducto');
const imgPreviewProducto    = document.getElementById('imgPreviewProducto');

let editingProductoId = null;

function openModalProducto(editData = null) {
  editingProductoId = editData ? editData.id : null;
  modalProductoTitle.textContent   = editData ? 'Editar producto' : 'Nuevo producto';
  modalProductoSaveBtn.textContent = editData ? 'Guardar cambios' : 'Guardar producto';

  if (editData) {
    document.getElementById('inputProductoNombre').value = editData.name || '';
    document.getElementById('inputProductoCat').value    = editData.category || 'streaming';
    if (editData.image_url) {
      imgPreviewProducto.src = editData.image_url;
      imgPreviewProducto.classList.add('visible');
    }
  } else {
    document.getElementById('inputProductoNombre').value = '';
    document.getElementById('inputProductoCat').value    = 'streaming';
    imgPreviewProducto.classList.remove('visible');
    imgPreviewProducto.src = '';
    imgInputProducto.value = '';
  }

  modalProductoOverlay.classList.add('visible');
  modalProducto.classList.add('visible');
}

function closeModalProducto() {
  modalProductoOverlay.classList.remove('visible');
  modalProducto.classList.remove('visible');
  editingProductoId = null;
}

btnNuevoProducto.addEventListener('click', () => openModalProducto());
modalProductoClose.addEventListener('click', closeModalProducto);
modalProductoCancelBtn.addEventListener('click', closeModalProducto);
modalProductoOverlay.addEventListener('click', closeModalProducto);

imgUploadAreaProducto.addEventListener('click', () => imgInputProducto.click());
imgInputProducto.addEventListener('change', () => {
  const file = imgInputProducto.files[0];
  if (!file) return;
  imgPreviewProducto.src = URL.createObjectURL(file);
  imgPreviewProducto.classList.add('visible');
});

modalProductoSaveBtn.addEventListener('click', async () => {
  const nombre    = document.getElementById('inputProductoNombre').value.trim();
  const categoria = document.getElementById('inputProductoCat').value;

  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

  const btnLabel = modalProductoSaveBtn.textContent;
  modalProductoSaveBtn.disabled = true;
  modalProductoSaveBtn.textContent = 'Guardando…';

  try {
    let image_url = editingProductoId ? (imgPreviewProducto.getAttribute('src') || null) : null;

    const file = imgInputProducto.files[0];
    if (file) {
      const ext      = file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      image_url = urlData.publicUrl;
    }

    const payload = { name: nombre, category: categoria, ...(image_url ? { image_url } : {}) };

    if (editingProductoId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingProductoId);
      if (error) throw error;
      showToast('Producto actualizado ✓', 'success');
    } else {
      const { error } = await supabase.from('products').insert([payload]);
      if (error) throw error;
      showToast('Producto guardado ✓', 'success');
    }

    closeModalProducto();
    await loadProductos();
    await loadDashboardStats();
  } catch (err) {
    console.error(err);
    showToast('Error: ' + (err.message || err), 'error');
  } finally {
    modalProductoSaveBtn.disabled = false;
    modalProductoSaveBtn.textContent = btnLabel;
  }
});


/* ════════════════════════════════════
   MODAL: CUENTA
════════════════════════════════════ */

const modalCuentaOverlay   = document.getElementById('modalCuentaOverlay');
const modalCuenta          = document.getElementById('modalCuenta');
const modalCuentaTitle     = document.getElementById('modalCuentaTitle');
const modalCuentaClose     = document.getElementById('modalCuentaClose');
const modalCuentaCancelBtn = document.getElementById('modalCuentaCancelBtn');
const modalCuentaSaveBtn   = document.getElementById('modalCuentaSaveBtn');
const btnNuevaCuenta       = document.getElementById('btnNuevaCuenta');

let editingCuentaId = null;

async function openModalCuenta(editData = null) {
  editingCuentaId = editData ? editData.id : null;
  modalCuentaTitle.textContent   = editData ? 'Editar cuenta' : 'Publicar cuenta';
  modalCuentaSaveBtn.textContent = editData ? 'Guardar cambios' : 'Publicar cuenta';

  // Poblar select de productos dinámicamente
  const selectProducto = document.getElementById('inputCuentaProducto');
  selectProducto.innerHTML = '<option value="">Cargando…</option>';

  const { data: productos } = await supabase
    .from('products')
    .select('id, name')
    .order('name');

  selectProducto.innerHTML = '<option value="">Selecciona un producto</option>';
  (productos || []).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    selectProducto.appendChild(opt);
  });

  if (editData) {
    selectProducto.value = editData.product_id || '';
    document.getElementById('inputCuentaDesc').value   = editData.description || '';
    document.getElementById('inputCuentaPrecio').value = editData.price || '';
    document.getElementById('inputCuentaDias').value   = editData.dias || '';
    const emailEl = document.getElementById('inputCuentaEmail');
    const passEl  = document.getElementById('inputCuentaPass');
    if (emailEl) emailEl.value = editData.email || '';
    if (passEl)  passEl.value  = editData.password || '';
  } else {
    selectProducto.value = '';
    document.getElementById('inputCuentaDesc').value   = '';
    document.getElementById('inputCuentaPrecio').value = '';
    document.getElementById('inputCuentaDias').value   = '';
    const emailEl = document.getElementById('inputCuentaEmail');
    const passEl  = document.getElementById('inputCuentaPass');
    if (emailEl) emailEl.value = '';
    if (passEl)  passEl.value  = '';
    document.getElementById('inputCuentaEntrega').value = '12';
  }

  modalCuentaOverlay.classList.add('visible');
  modalCuenta.classList.add('visible');
}

function closeModalCuenta() {
  modalCuentaOverlay.classList.remove('visible');
  modalCuenta.classList.remove('visible');
  editingCuentaId = null;
}

btnNuevaCuenta.addEventListener('click', () => openModalCuenta());
modalCuentaClose.addEventListener('click', closeModalCuenta);
modalCuentaCancelBtn.addEventListener('click', closeModalCuenta);
modalCuentaOverlay.addEventListener('click', closeModalCuenta);

modalCuentaSaveBtn.addEventListener('click', async () => {
  const product_id = document.getElementById('inputCuentaProducto').value;
  const desc       = document.getElementById('inputCuentaDesc').value.trim();
  const precio     = document.getElementById('inputCuentaPrecio').value;
  const dias       = document.getElementById('inputCuentaDias').value;
  const emailEl    = document.getElementById('inputCuentaEmail');
  const passEl     = document.getElementById('inputCuentaPass');
  const email      = emailEl ? emailEl.value.trim() : null;
  const password   = passEl  ? passEl.value.trim()  : null;

  if (!product_id) { showToast('Selecciona un producto', 'error'); return; }
  if (!desc)       { showToast('La descripción es obligatoria', 'error'); return; }
  if (!precio)     { showToast('El precio es obligatorio', 'error'); return; }
  if (!dias)       { showToast('La duración es obligatoria', 'error'); return; }

  const btnLabel = modalCuentaSaveBtn.textContent;
  modalCuentaSaveBtn.disabled = true;
  modalCuentaSaveBtn.textContent = 'Guardando…';

  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(dias));

    const payload = {
      product_id,
      description: desc,
      price: parseFloat(precio),
      expires_at: expiresAt.toISOString(),
      status: 'disponible',
      ...(email    ? { email }    : {}),
      ...(password ? { password } : {}),
    };

    if (editingCuentaId) {
      const { error } = await supabase.from('accounts').update(payload).eq('id', editingCuentaId);
      if (error) throw error;
      showToast('Cuenta actualizada ✓', 'success');
    } else {
      const { error } = await supabase.from('accounts').insert([payload]);
      if (error) throw error;
      showToast('Cuenta publicada ✓', 'success');
    }

    closeModalCuenta();
    await loadCuentas();
    await loadProductos();   // actualiza el stock
    await loadDashboardStats();
  } catch (err) {
    console.error(err);
    showToast('Error: ' + (err.message || err), 'error');
  } finally {
    modalCuentaSaveBtn.disabled = false;
    modalCuentaSaveBtn.textContent = btnLabel;
  }
});


/* ════════════════════════════════════
   MODAL: PEDIDO DETALLE
════════════════════════════════════ */

const modalPedidoOverlay = document.getElementById('modalPedidoOverlay');
const modalPedido        = document.getElementById('modalPedido');
const modalPedidoClose   = document.getElementById('modalPedidoClose');
const modalPedidoClose2  = document.getElementById('modalPedidoClose2');

let currentPedido = null;

function openModalPedido(pedidoData = null) {
  currentPedido = pedidoData;

  if (pedidoData) {
    const setField = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? '—';
    };

    setField('modalPedidoId',       `#${pedidoData.id?.slice(0,8) ?? '—'}`);
    setField('modalPedidoCliente',  pedidoData.customer_name);
    setField('modalPedidoEmail',    pedidoData.customer_email);
    setField('modalPedidoProducto', pedidoData.product_name || '—');
    setField('modalPedidoMetodo',   pedidoData.payment_method === 'transferencia' ? 'Transferencia' : 'Tarjeta');
    setField('modalPedidoEntrega',  pedidoData.delivery_type === 'perfil' ? 'Perfil' : 'Cuenta completa');
    setField('modalPedidoTvCode',   pedidoData.tv_code || (pedidoData.delivery_type === 'perfil' ? '—' : 'N/A'));
    const total = pedidoData.total;
    setField('modalPedidoTotal', total ? `$${parseFloat(total).toFixed(2)} MXN` : null);
    const fecha = pedidoData.created_at;
    setField('modalPedidoFecha', fecha ? new Date(fecha).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : null);

    // Estado badge
    const estadoEl = document.getElementById('modalPedidoEstado');
    if (estadoEl) {
      const map = {
        pendiente:  { label: 'Pendiente',   cls: 'status-badge--pending' },
        aprobado:   { label: 'Aprobado',    cls: 'status-badge--ok' },
        completado: { label: 'Completado',  cls: 'status-badge--ok' },
        cancelado:  { label: 'Cancelado',   cls: 'status-badge--canceled' },
      };
      const s = map[pedidoData.status] || { label: pedidoData.status, cls: '' };
      estadoEl.textContent = s.label;
      estadoEl.className   = `status-badge ${s.cls}`;
    }

    // Comprobante
    const compRow = document.getElementById('modalPedidoComprobanteRow');
    const compLink = document.getElementById('modalPedidoComprobanteLink');
    if (compRow && compLink) {
      if (pedidoData.comprobante_url) {
        compLink.href = pedidoData.comprobante_url;
        compRow.style.display = '';
      } else {
        compRow.style.display = 'none';
      }
    }

    // Botón Aprobar — solo visible si está pendiente
    const btnAprobar = document.getElementById('btnAprobarPedido');
    if (btnAprobar) {
      btnAprobar.style.display = pedidoData.status === 'pendiente' ? 'flex' : 'none';
    }
  }

  modalPedidoOverlay.classList.add('visible');
  modalPedido.classList.add('visible');
}

// Botón Aprobar
document.getElementById('btnAprobarPedido')?.addEventListener('click', async () => {
  if (!currentPedido) return;
  const btn = document.getElementById('btnAprobarPedido');
  btn.disabled = true;
  btn.textContent = 'Aprobando…';

  try {
    // 1. Actualizar pedido a 'aprobado'
    const { error: orderErr } = await supabase
      .from('orders')
      .update({ status: 'aprobado' })
      .eq('id', currentPedido.id);
    if (orderErr) throw orderErr;

    // 2. Marcar la cuenta como vendida
    if (currentPedido.account_id) {
      const { error: accountErr } = await supabase
        .from('accounts')
        .update({ status: 'vendida' })
        .eq('id', currentPedido.account_id);
      if (accountErr) throw accountErr;
    }

    showToast('Pedido aprobado ✓', 'success');
    closeModalPedido();
    await loadPedidos();
    await loadCuentas();
    await loadDashboardStats();

  } catch (err) {
    console.error(err);
    showToast('Error al aprobar: ' + (err.message || err), 'error');
    btn.disabled = false;
    btn.textContent = 'Aprobar pedido';
  }
});

function closeModalPedido() {
  modalPedidoOverlay.classList.remove('visible');
  modalPedido.classList.remove('visible');
}

modalPedidoClose.addEventListener('click', closeModalPedido);
modalPedidoClose2.addEventListener('click', closeModalPedido);
modalPedidoOverlay.addEventListener('click', closeModalPedido);


/* ════════════════════════════════════
   TABLA: PRODUCTOS
════════════════════════════════════ */

function renderProductosTable(data) {
  const body  = document.getElementById('productosTableBody');
  const empty = document.getElementById('productosEmpty');

  body.innerHTML = '';

  if (!data || data.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
      <div class="col-thumb">
        <div class="cell-thumb">
          ${item.image_url ? `<img src="${item.image_url}" alt="" />` : '📦'}
        </div>
      </div>
      <div class="col-name">
        <div class="cell-name">${item.name}</div>
      </div>
      <div class="col-cat">
        <span class="cat-badge">${item.category}</span>
      </div>
      <div class="col-stock">
        <span class="stock-badge ${item.stock > 2 ? 'stock-ok' : item.stock > 0 ? 'stock-low' : 'stock-none'}">
          <span class="stock-dot"></span>
          ${item.stock ?? '—'}
        </span>
      </div>
      <div class="col-date">
        <span class="cell-muted">${item.created_at ? new Date(item.created_at).toLocaleDateString('es-MX') : '—'}</span>
      </div>
      <div class="col-actions">
        <button class="action-btn action-btn--edit" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn action-btn--delete" title="Borrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    `;

    row.querySelector('.action-btn--edit').addEventListener('click', () => openModalProducto(item));
    row.querySelector('.action-btn--delete').addEventListener('click', async () => {
      if (!confirm(`¿Borrar "${item.name}"?`)) return;
      const { error } = await supabase.from('products').delete().eq('id', item.id);
      if (error) { showToast('Error al borrar', 'error'); return; }
      showToast('Producto eliminado', 'success');
      await loadProductos();
      await loadDashboardStats();
    });

    body.appendChild(row);
  });
}

async function loadProductos() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { showToast('Error cargando productos', 'error'); return; }

  // Calcular stock por producto (cuentas disponibles)
  const { data: stockData } = await supabase
    .from('accounts')
    .select('product_id')
    .eq('status', 'disponible');

  const stockMap = {};
  (stockData || []).forEach(a => {
    stockMap[a.product_id] = (stockMap[a.product_id] || 0) + 1;
  });

  const enriched = (data || []).map(p => ({ ...p, stock: stockMap[p.id] ?? 0 }));
  renderProductosTable(enriched);
}


/* ════════════════════════════════════
   TABLA: CUENTAS
════════════════════════════════════ */

function renderCuentasTable(data) {
  const body  = document.getElementById('cuentasTableBody');
  const empty = document.getElementById('cuentasEmpty');

  body.innerHTML = '';

  if (!data || data.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'table-row';

    const vence = item.expires_at
      ? new Date(item.expires_at).toLocaleDateString('es-MX')
      : '—';

    const estadoMap = {
      disponible: { label: 'Disponible', cls: 'status-badge--ok' },
      vendida:    { label: 'Vendida',    cls: 'status-badge--sold' },
      expirada:   { label: 'Expirada',   cls: 'status-badge--expired' },
    };
    const estado = estadoMap[item.status] || { label: item.status || '—', cls: '' };

    row.innerHTML = `
      <div class="col-name">
        <div class="cell-name">${item.description || '—'}</div>
      </div>
      <div class="col-cat">
        <span class="cat-badge">${item.product_name || '—'}</span>
      </div>
      <div class="col-price">
        <span class="cell-price">$${item.price ? parseFloat(item.price).toFixed(2) : '—'}</span>
      </div>
      <div class="col-date">
        <span class="cell-muted">${vence}</span>
      </div>
      <div class="col-status">
        <span class="status-badge ${estado.cls}">${estado.label}</span>
      </div>
      <div class="col-actions">
        <button class="action-btn action-btn--edit" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn action-btn--delete" title="Borrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    `;

    row.querySelector('.action-btn--edit').addEventListener('click', () => openModalCuenta(item));
    row.querySelector('.action-btn--delete').addEventListener('click', async () => {
      if (!confirm('¿Borrar esta cuenta?')) return;
      const { error } = await supabase.from('accounts').delete().eq('id', item.id);
      if (error) { showToast('Error al borrar', 'error'); return; }
      showToast('Cuenta eliminada', 'success');
      await loadCuentas();
      await loadProductos();
      await loadDashboardStats();
    });

    body.appendChild(row);
  });
}

async function loadCuentas() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*, products(name)')
    .order('created_at', { ascending: false });

  if (error) { showToast('Error cargando cuentas', 'error'); return; }

  const enriched = (data || []).map(a => ({
    ...a,
    product_name: a.products?.name || '—',
  }));

  renderCuentasTable(enriched);
}


/* ════════════════════════════════════
   TABLA: PEDIDOS
════════════════════════════════════ */

function renderPedidosTable(data) {
  const body = document.getElementById('pedidosTableBody');
  body.innerHTML = '';

  if (!data || data.length === 0) return;

  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'table-row';

    const estadoMap = {
      completado: { label: 'Completado', cls: 'status-badge--ok' },
      pendiente:  { label: 'Pendiente',  cls: 'status-badge--pending' },
      cancelado:  { label: 'Cancelado',  cls: 'status-badge--canceled' },
    };
    const estado = estadoMap[item.status] || { label: item.status || '—', cls: '' };

    const cliente  = item.cliente  || item.customer_name  || '—';
    const producto = item.producto || item.product_name   || '—';
    const total    = item.total    || item.amount         || null;
    const fecha    = item.fecha    || item.created_at     || null;

    row.innerHTML = `
      <div class="col-id">#${item.id || '—'}</div>
      <div class="col-name"><div class="cell-name">${cliente}</div></div>
      <div class="col-cat"><span class="cat-badge">${producto}</span></div>
      <div class="col-price"><span class="cell-price">$${total ? parseFloat(total).toFixed(2) : '—'}</span></div>
      <div class="col-date"><span class="cell-muted">${fecha ? new Date(fecha).toLocaleDateString('es-MX') : '—'}</span></div>
      <div class="col-status"><span class="status-badge ${estado.cls}">${estado.label}</span></div>
      <div class="col-actions">
        <button class="action-btn action-btn--view" title="Ver detalle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
    `;

    row.querySelector('.action-btn--view').addEventListener('click', () => openModalPedido(item));
    body.appendChild(row);
  });
}

async function loadPedidos() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { showToast('Error cargando pedidos', 'error'); return; }
  renderPedidosTable(data || []);
}


/* ════════════════════════════════════
   TOGGLES DE CONFIGURACIÓN
════════════════════════════════════ */

document.querySelectorAll('.toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const isOn = toggle.dataset.toggled === 'true';
    toggle.dataset.toggled = (!isOn).toString();
    toggle.classList.toggle('active', !isOn);
  });
});

document.querySelectorAll('.btn-save-config').forEach(btn => {
  btn.addEventListener('click', () => {
    showToast('Configuración guardada ✓', 'success');
  });
});


/* ════════════════════════════════════
   INIT
════════════════════════════════════ */

async function init() {
  await Promise.all([
    loadDashboardStats(),
    loadProductos(),
    loadCuentas(),
    loadPedidos(),
  ]);
}

init();


}); // fin DOMContentLoaded

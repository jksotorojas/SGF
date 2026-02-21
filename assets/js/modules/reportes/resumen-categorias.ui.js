window.SGF = window.SGF || {};
window.SGF.modules = window.SGF.modules || {};

(function () {
  const E = window.SGF?.reports?.engine;
  const MONTHS = [
    { value: 'all', label: '(Todos)' },
    { value: '01', label: 'enero' },
    { value: '02', label: 'febrero' },
    { value: '03', label: 'marzo' },
    { value: '04', label: 'abril' },
    { value: '05', label: 'mayo' },
    { value: '06', label: 'junio' },
    { value: '07', label: 'julio' },
    { value: '08', label: 'agosto' },
    { value: '09', label: 'septiembre' },
    { value: '10', label: 'octubre' },
    { value: '11', label: 'noviembre' },
    { value: '12', label: 'diciembre' },
  ];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
  function fmt(n, currency){
    const E = window.SGF?.reports?.engine;
    return E?.fmtMoney ? E.fmtMoney(n, currency) : String(n);
  }

  function moneyClass(v){
    const n = Number(v||0);
    if (n > 0) return 'text-emerald-700';
    if (n < 0) return 'text-rose-700';
    return 'text-slate-900';
  }

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function dbAll(sql, params) { return window.SGF?.db?.select?.(sql, params) || []; }
  function dbScalar(sql, params) {
    const r = dbAll(sql, params);
    if (!r || !r.length) return 0;
    const k = Object.keys(r[0] || {})[0];
    return r[0]?.[k] ?? 0;
  }

  function loadYears(currency, accountId) {
    const where = ['currency=:cur'];
    const p = { ':cur': currency };
    if (Number(accountId)) { where.push('(account_id=:aid OR account_to_id=:aid)'); p[':aid'] = Number(accountId); }
    const w = `WHERE ${where.join(' AND ')}`;
    const rows = dbAll(`SELECT DISTINCT SUBSTR(period,1,4) AS y FROM movements ${w} ORDER BY y DESC`, p);
    const years = rows.map(r => String(r.y)).filter(Boolean);
    return ['all', ...years];
  }

  function loadAccounts(currency) {
    const rows = dbAll(
      `SELECT a.id, a.name AS account_name, a.currency, t.name AS type_name
       FROM accounts a
       LEFT JOIN account_types t ON t.id = a.type_id
       WHERE a.active = 1 AND a.currency = :cur
       ORDER BY COALESCE(t.name,''), a.name`,
      { ':cur': currency }
    );
    return [{ id: 'all', label: '(Todas)' }].concat(
      rows.map(r => ({ id: String(r.id), label: `${(r.type_name || 'Cuenta')} > ${r.account_name} (${r.currency || currency})` }))
    );
  }

  function fillSelect(el, items, currentValue) {
    if (!el) return;
    el.innerHTML = '';
    for (const it of items) {
      const opt = document.createElement('option');
      if (typeof it === 'object') { opt.value = it.value ?? it.id ?? ''; opt.textContent = it.label ?? it.text ?? String(it.value ?? it.id ?? ''); }
      else { opt.value = String(it); opt.textContent = String(it); }
      el.appendChild(opt);
    }
    if (currentValue != null) el.value = String(currentValue);
  }

  function getRangeFilter({ year, month }) {
    if (year === 'all' && month === 'all') return { whereSql: '', params: {}, label: 'Todos los períodos' };
    if (year !== 'all' && month === 'all') {
      const s = `${year}-01`, e = `${year}-12`;
      return { whereSql: 'period BETWEEN :p1 AND :p2', params: { ':p1': s, ':p2': e }, label: `Año ${year}` };
    }
    if (year !== 'all' && month !== 'all') {
      const p = `${year}-${month}`;
      return { whereSql: 'period = :p', params: { ':p': p }, label: `Período ${month}/${year}` };
    }
    // year=all, month != all => incoherente, se normaliza (caller)
    return { whereSql: '', params: {}, label: '—' };
  }

  function normalizeYearMonth({ year, month, currency, accountId }) {
    // Si mes != all y año=all => escoger el último año con data para ese mes (según filtros)
    if (month !== 'all' && year === 'all') {
      const where = ['currency=:cur', 'SUBSTR(period,6,2)=:m'];
      const p = { ':cur': currency, ':m': month };
      if (Number(accountId)) { where.push('(account_id=:aid OR account_to_id=:aid)'); p[':aid'] = Number(accountId); }
      const maxp = dbScalar(`SELECT MAX(period) AS p FROM movements WHERE ${where.join(' AND ')}`, p);
      const s = String(maxp || '');
      if (s && s.length >= 7) return { year: s.slice(0, 4), month };
      // si no hay data para ese mes, volver a "todos"
      return { year: 'all', month: 'all' };
    }
    return { year, month };
  }

  function loadCategories() {
    const rows = dbAll(
      `SELECT id, name, parent_id
       FROM categories
       WHERE active = 1
       ORDER BY COALESCE(parent_id,0), name`
    );
    const map = new Map();
    for (const r of rows) {
      map.set(Number(r.id), { id: Number(r.id), name: String(r.name || ''), parentId: r.parent_id == null ? null : Number(r.parent_id), children: [], total: 0 });
    }
    // attach children
    for (const node of map.values()) {
      if (node.parentId != null && map.has(node.parentId)) {
        map.get(node.parentId).children.push(node);
      }
    }
    const roots = Array.from(map.values()).filter(n => n.parentId == null || !map.has(n.parentId));
    return { map, roots };
  }

  function getDb() {
    return window.SGF?.db || window.SGF?.state?.db || window.db || null;
  }

  function computeAmountsByCategory({ year, month, currency, accountId, type, db }) {
    const dbx = db || getDb();
    if (!dbx) return new Map();
    const q = window.SGF?.reports?.data?.queryCategoryTotals;
    if (typeof q !== 'function') return new Map();
    return q({ db: dbx, year, month, currency, accountId, type });
  }

  function rollupTotals(node) {
    let sum = Number(node.total || 0);
    for (const ch of node.children || []) sum += rollupTotals(ch);
    node.total = sum;
    return sum;
  }

  function sortTree(node, dir) {
    const mult = (dir === 'asc') ? 1 : -1;
    node.children.sort((a, b) => (Math.abs(a.total) - Math.abs(b.total)) * mult || a.name.localeCompare(b.name));
    for (const ch of node.children) sortTree(ch, dir);
  }

  function flattenTree(roots, expanded, level = 0, out = []) {
    for (const n of roots) {
      out.push({ node: n, level });
      const isExp = expanded.has(n.id);
      if (n.children.length && isExp) flattenTree(n.children, expanded, level + 1, out);
    }
    return out;
  }

  function render({ treeRoots, expanded, totalsAbsSum, currency }) {
    const tbody = $('rcat-tbody');
    if (!tbody) return;
    const rows = flattenTree(treeRoots, expanded);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td class="py-3 text-slate-500" colspan="3">Sin datos.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(({ node, level }) => {
      const hasChildren = node.children && node.children.length;
      const isExp = expanded.has(node.id);
      const caret = hasChildren
        ? `<button type="button" class="rcat-toggle inline-flex items-center justify-center w-7 h-7 rounded-lg border hover:bg-slate-50 mr-2" data-id="${node.id}" title="${isExp ? 'Contraer' : 'Expandir'}">
             <i data-lucide="${isExp ? 'chevron-down' : 'chevron-right'}" class="w-4 h-4"></i>
           </button>`
        : `<span class="inline-block w-7 h-7 mr-2"></span>`;

      const pad = Math.min(6, level) * 16;
      const pct = totalsAbsSum > 0 ? (Math.abs(node.total) / totalsAbsSum) * 100 : 0;
      return `
        <tr class="border-b last:border-b-0 hover:bg-slate-50 cursor-pointer rcat-row" data-id="${node.id}">
          <td class="py-2 pr-2">
            <div class="flex items-center" style="padding-left:${pad}px">
              ${caret}
              <div class="font-medium text-slate-900">${esc(node.name || '(Sin nombre)')}</div>
            </div>
          </td>
          <td class="py-2 px-2 text-right tabular-nums"><span class="${moneyClass(node.total)}">${esc(fmt(node.total, currency))}</span></td>
          <td class="py-2 pl-2 text-right tabular-nums text-slate-600">${pct.toFixed(2)}%</td>
        </tr>
      `;
    }).join('');

    try { window.lucide?.createIcons?.(); } catch (_) {}
  }

    function openDrill({ title, rangeLabel, currency, categoryId, range, accountId, type }) {
    window.SGF?.reports?.drill?.openFromQuery?.({
      subtitle: title,
      rangeLabel,
      currency,
      scope: { kind: 'category', id: Number(categoryId) },
      type,
      range,
    });
  }

function openModal({ title, subtitle, rangeLabel, currency, rows }) {
    const modal = $('rcat-modal');
    if (!modal) return;
    $('rcat-modal-title').textContent = title || 'Movimientos';
    $('rcat-modal-subtitle').textContent = subtitle || 'Movimientos';
    $('rcat-modal-range').textContent = rangeLabel || '—';

    const tbody = $('rcat-modal-tbody');
    tbody.innerHTML = (rows || []).map(r => `
      <tr class="border-b last:border-b-0">
        <td class="py-2 pr-2 whitespace-nowrap">${esc(r.date || '')}</td>
        <td class="py-2 px-2">${esc(r.description || '')}</td>
        <td class="py-2 px-2">${esc(r.account_name || '')}</td>
        <td class="py-2 pl-2 text-right tabular-nums">${esc(fmt(r.amount, currency))}</td>
      </tr>
    `).join('') || `<tr><td class="py-3 text-slate-500" colspan="4">Sin movimientos.</td></tr>`;

    modal.classList.remove('hidden');
  }

  function closeModal() {
    const modal = $('rcat-modal');
    if (!modal) return;
    modal.classList.add('hidden');
  }

  function listMovementsForCategory({ categoryId, range, currency, accountId, type }) {
    const where = [];
    const p = {};
    if (range.whereSql) { where.push(range.whereSql.replaceAll('period', 'm.period')); Object.assign(p, range.params); }
    where.push(`m.currency = :cur`); p[':cur'] = currency;
    p[':both'] = (type === 'both') ? 1 : 0;
    if (type === 'both') { where.push(`m.type IN ('income','expense')`); }
    else { if (type === 'both') { where.push(`m.type IN ('income','expense')`); }
    else { where.push(`m.type = :typ`); p[':typ'] = type; }
    p[':both'] = (type === 'both') ? 1 : 0; }
    where.push(`COALESCE(m.is_opening,0)=0`);
    if (Number(accountId)) { where.push(`m.account_id = :aid`); p[':aid'] = Number(accountId); }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const cid = Number(categoryId || 0);
    p[':cid'] = cid;

    // Non-split movements
    const q1 = `
      SELECT m.date, m.description,
             (SELECT a.name FROM accounts a WHERE a.id = m.account_id) AS account_name,
             CASE WHEN :both=1 AND m.type='expense' THEN -m.amount ELSE m.amount END AS amount
      FROM movements m
      ${w} AND COALESCE(m.is_split,0)=0 AND COALESCE(m.category_id,0)=:cid
    `;

    // Split movements: show split amount
    const q2 = `
      SELECT m.date, m.description,
             (SELECT a.name FROM accounts a WHERE a.id = m.account_id) AS account_name,
             CASE WHEN :both=1 AND m.type='expense' THEN -s.amount ELSE s.amount END AS amount
      FROM movements m
      JOIN movement_splits s ON s.movement_id = m.id
      ${w} AND COALESCE(m.is_split,0)=1 AND COALESCE(s.category_id,0)=:cid
    `;

    const rows = dbAll(`${q1} UNION ALL ${q2} ORDER BY date ASC`, p) || [];
    return rows.map(r => ({ ...r, amount: Number(r.amount || 0) }));
  }

  function onMount() {
    // guards
    if (!window.SGF?.db) return;

    const yearEl = $('rcat-year');
    const monthEl = $('rcat-month');
    const curEl = $('rcat-currency');
    const accEl = $('rcat-account');
    const ordEl = $('rcat-order');
    const expandBtn = document.getElementById('rcat-expand-btn');
      const collapseBtn = document.getElementById('rcat-collapse-btn');
    const typEl = $('rcat-type');
    const labelEl = $('rcat-range-label');

    const state = {
      currency: curEl?.value || 'CRC',
      accountId: 'all',
      year: 'all',
      month: 'all',
      order: ordEl?.value || 'desc',
      expanded: new Set(),
      type: typEl?.value || 'expense',
    };

    function reloadCombos(preserve) {
      // accounts
      const accounts = loadAccounts(state.currency);
      fillSelect(accEl, accounts, preserve ? state.accountId : 'all');
      state.accountId = accEl.value;

      // years depends on currency+account
      const years = loadYears(state.currency, state.accountId === 'all' ? null : state.accountId);
      fillSelect(yearEl, years.map(y => ({ value: y, label: y === 'all' ? '(Todos)' : y })), preserve ? state.year : 'all');
      state.year = yearEl.value;

      fillSelect(monthEl, MONTHS, preserve ? state.month : 'all');
      state.month = monthEl.value;
    }

    function computeAndRender() {
      // normalize year/month
      const norm = normalizeYearMonth({ year: state.year, month: state.month, currency: state.currency, accountId: state.accountId === 'all' ? null : state.accountId });
      if (norm.year !== state.year) { state.year = norm.year; yearEl.value = state.year; }
      if (norm.month !== state.month) { state.month = norm.month; monthEl.value = state.month; }

      const range = getRangeFilter({ year: state.year, month: state.month });
      labelEl.textContent = range.label;

      const { map, roots } = loadCategories();
      const byId = computeAmountsByCategory({
        year: state.year,
        month: state.month,
        range,
        currency: state.currency,
        accountId: state.accountId === 'all' ? null : state.accountId,
        type: state.type,
      });

      // Assign totals to nodes
      for (const node of map.values()) node.total = 0;
      for (const [cid, amt] of byId.entries()) {
        if (cid === 0) continue;
        if (map.has(cid)) map.get(cid).total += Number(amt || 0);
      }

      // roll-up
      for (const r of roots) rollupTotals(r);

      // pseudo category for "Sin categoría"
      const uncategorized = { id: 0, name: 'Sin categoría', parentId: null, children: [], total: Number(byId.get(0) || 0) };
      const treeRoots = [uncategorized, ...roots].filter(n => Math.abs(Number(n.total || 0)) > 0 || (n.children && n.children.length));
      state.treeRoots = treeRoots;

      // sort tree
      for (const r of treeRoots) sortTree(r, state.order);

      // expanded set (mantener estado; limpiar ids inválidos)
      const valid = new Set();
      const stackValid = [...treeRoots];
      while (stackValid.length) {
        const n = stackValid.pop();
        valid.add(n.id);
        for (const ch of (n.children || [])) stackValid.push(ch);
      }
      for (const id of Array.from(state.expanded)) if (!valid.has(id)) state.expanded.delete(id);

      // total abs sum over roots (includes roll-up, so use leaf-level? We'll use visible roots totals; better: sum of abs totals of roots excluding roll-up duplication.
      // We compute denominator as abs sum of uncategorized + abs sum of leaf amounts from byId (cid!=0) (non-rollup).
      let denom = Math.abs(Number(byId.get(0) || 0));
      for (const [cid, amt] of byId.entries()) if (cid !== 0) denom += Math.abs(Number(amt || 0));

      render({ treeRoots, expanded: state.expanded, totalsAbsSum: denom, currency: state.currency });

      const tbody = $('rcat-tbody');
      if (tbody && !tbody.__rcatDelegatedClick) {
        tbody.__rcatDelegatedClick = true;
        tbody.addEventListener('click', (ev) => {
          const btn = ev.target.closest('.rcat-toggle');
          if (btn) {
            ev.preventDefault(); ev.stopPropagation();
            const id = Number(btn.getAttribute('data-id'));
            if (!id && id !== 0) return;
            if (state.expanded.has(id)) state.expanded.delete(id);
            else state.expanded.add(id);
            // Persistencia de filtros
    const saved = E?.loadFilters ? E.loadFilters('rep_categories') : null;
    if (saved){
      E.setSelectValueIfExists && E.setSelectValueIfExists(yearEl, saved.year);
      E.setSelectValueIfExists && E.setSelectValueIfExists(monthEl, saved.month);
      E.setSelectValueIfExists && E.setSelectValueIfExists(curEl, saved.currency);
      E.setSelectValueIfExists && E.setSelectValueIfExists(accEl, saved.accountId);
      E.setSelectValueIfExists && E.setSelectValueIfExists(typeEl, saved.type);
      E.setSelectValueIfExists && E.setSelectValueIfExists(orderEl, saved.order);
    }

    computeAndRender();

    // Motor común: expandir/contraer + toggles + drilldown (delegación)
    const tbody = document.getElementById('rcat-tbody');
    const expandBtn = document.getElementById('rcat-expand-btn');
    const collapseBtn = document.getElementById('rcat-collapse-btn');

    E && E.wireExpandControls({
      expandBtnId: 'rcat-expand-btn',
      collapseBtnId: 'rcat-collapse-btn',
      onExpand: () => {
        // expand all nodes with children
        const all = new Set();
        const st = [...(state.treeRoots || [])];
        while (st.length) {
          const n = st.pop();
          if (n.children && n.children.length) all.add(n.id);
          for (const ch of (n.children || [])) st.push(ch);
        }
        state.expanded = all;
        // Persistencia de filtros
    const saved = E?.loadFilters ? E.loadFilters('rep_categories') : null;
    if (saved){
      E.setSelectValueIfExists && E.setSelectValueIfExists(yearEl, saved.year);
      E.setSelectValueIfExists && E.setSelectValueIfExists(monthEl, saved.month);
      E.setSelectValueIfExists && E.setSelectValueIfExists(curEl, saved.currency);
      E.setSelectValueIfExists && E.setSelectValueIfExists(accEl, saved.accountId);
      E.setSelectValueIfExists && E.setSelectValueIfExists(typeEl, saved.type);
      E.setSelectValueIfExists && E.setSelectValueIfExists(orderEl, saved.order);
    }

    computeAndRender();
        try { window.lucide?.createIcons?.(); } catch(_){}
      },
      onCollapse: () => {
        state.expanded.clear();
        // Persistencia de filtros
    const saved = E?.loadFilters ? E.loadFilters('rep_categories') : null;
    if (saved){
      E.setSelectValueIfExists && E.setSelectValueIfExists(yearEl, saved.year);
      E.setSelectValueIfExists && E.setSelectValueIfExists(monthEl, saved.month);
      E.setSelectValueIfExists && E.setSelectValueIfExists(curEl, saved.currency);
      E.setSelectValueIfExists && E.setSelectValueIfExists(accEl, saved.accountId);
      E.setSelectValueIfExists && E.setSelectValueIfExists(typeEl, saved.type);
      E.setSelectValueIfExists && E.setSelectValueIfExists(orderEl, saved.order);
    }

    computeAndRender();
        try { window.lucide?.createIcons?.(); } catch(_){}
      },
    });

    E && E.wireDelegatedToggles({
      tbody,
      toggleSelector: '.rcat-toggle',
      getKey: (btn) => Number(btn.getAttribute('data-id')),
      onToggle: (id) => {
        if (state.expanded.has(id)) state.expanded.delete(id);
        else state.expanded.add(id);
        // Persistencia de filtros
    const saved = E?.loadFilters ? E.loadFilters('rep_categories') : null;
    if (saved){
      E.setSelectValueIfExists && E.setSelectValueIfExists(yearEl, saved.year);
      E.setSelectValueIfExists && E.setSelectValueIfExists(monthEl, saved.month);
      E.setSelectValueIfExists && E.setSelectValueIfExists(curEl, saved.currency);
      E.setSelectValueIfExists && E.setSelectValueIfExists(accEl, saved.accountId);
      E.setSelectValueIfExists && E.setSelectValueIfExists(typeEl, saved.type);
      E.setSelectValueIfExists && E.setSelectValueIfExists(orderEl, saved.order);
    }

    computeAndRender();
        try { window.lucide?.createIcons?.(); } catch(_){}
      },
    });

    E && E.wireDelegatedRows({
      tbody,
      rowSelector: 'tr.rcat-row[data-id]',
      onRowClick: (row) => {
        const cid = Number(row.getAttribute('data-id') || 0);
        const name = cid === 0 ? 'Sin categoría' : (map.get(cid)?.name || 'Categoría');
        window.SGF?.reports?.drill?.openFromQuery?.({
          subtitle: name,
          rangeLabel,
          currency: state.currency,
          scope: { kind: 'category', id: cid },
          type: state.type,
          range,
        });
      }
    });

            try { window.lucide?.createIcons?.(); } catch(_){}
            return;
          }
          const row = ev.target.closest('tr.rcat-row[data-id]');
          if (row) {
            const cid = Number(row.getAttribute('data-id') || 0);
            const name = cid === 0 ? 'Sin categoría' : (map.get(cid)?.name || 'Categoría');
            window.SGF?.reports?.drill?.openFromQuery?.({
              subtitle: name,
              rangeLabel,
              currency: state.currency,
              scope: { kind: 'category', id: cid },
              type: state.type,
              range,
            });
          }
        });
      }

      function applyCatExpand(mode){
        const all = new Set();
        const st = [...(state.treeRoots || [])];
        while (st.length) {
          const n = st.pop();
          if (n.children && n.children.length) all.add(n.id);
          for (const ch of (n.children || [])) st.push(ch);
        }
        if (mode === 'expand') state.expanded = all;
        else state.expanded.clear();
        // Persistencia de filtros
    const saved = E?.loadFilters ? E.loadFilters('rep_categories') : null;
    if (saved){
      E.setSelectValueIfExists && E.setSelectValueIfExists(yearEl, saved.year);
      E.setSelectValueIfExists && E.setSelectValueIfExists(monthEl, saved.month);
      E.setSelectValueIfExists && E.setSelectValueIfExists(curEl, saved.currency);
      E.setSelectValueIfExists && E.setSelectValueIfExists(accEl, saved.accountId);
      E.setSelectValueIfExists && E.setSelectValueIfExists(typeEl, saved.type);
      E.setSelectValueIfExists && E.setSelectValueIfExists(orderEl, saved.order);
    }

    computeAndRender();
        try { window.lucide?.createIcons?.(); } catch(_){}
      }
      expandBtn && (expandBtn.onclick = () => applyCatExpand('expand'));
      collapseBtn && (collapseBtn.onclick = () => applyCatExpand('collapse'));


      // wire toggles + row clicks
      $('rcat-tbody')?.querySelectorAll('.rcat-toggle')?.forEach(btn => {
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const id = Number(btn.getAttribute('data-id'));
          if (!id && id !== 0) return;
          if (state.expanded.has(id)) state.expanded.delete(id);
          else state.expanded.add(id);
          
          // Persistencia de filtros
    const saved = E?.loadFilters ? E.loadFilters('rep_categories') : null;
    if (saved){
      E.setSelectValueIfExists && E.setSelectValueIfExists(yearEl, saved.year);
      E.setSelectValueIfExists && E.setSelectValueIfExists(monthEl, saved.month);
      E.setSelectValueIfExists && E.setSelectValueIfExists(curEl, saved.currency);
      E.setSelectValueIfExists && E.setSelectValueIfExists(accEl, saved.accountId);
      E.setSelectValueIfExists && E.setSelectValueIfExists(typeEl, saved.type);
      E.setSelectValueIfExists && E.setSelectValueIfExists(orderEl, saved.order);
    }

    computeAndRender();
        });
      });

      $('rcat-tbody')?.querySelectorAll('.rcat-row')?.forEach(tr => {
        tr.addEventListener('click', () => {
          const cid = Number(tr.getAttribute('data-id') || 0);
          const name = cid === 0 ? 'Sin categoría' : (map.get(cid)?.name || 'Categoría');
          window.SGF?.reports?.drill?.openFromQuery?.({
            subtitle: name,
            rangeLabel,
            currency: state.currency,
            scope: { kind: 'category', id: cid },
            type: state.type,
            range,
          });
});
      });

      $('rcat-modal-close')?.addEventListener('click', closeModal);
      $('rcat-modal')?.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'rcat-modal' || e.target.classList?.contains('bg-black/40'))) closeModal();
      });
    }

    // initial
    reloadCombos(false);

    // defaults
    try {
      // default year = current year if exists
      const yrs = Array.from(yearEl.options).map(o => o.value);
      const nowY = String(new Date().getFullYear());
      if (yrs.includes(nowY)) { yearEl.value = nowY; state.year = nowY; }
    } catch (_) {}

    // auto-apply
    const apply = (E?.debounce || debounce)(() => {
      state.currency = curEl.value;
      state.accountId = accEl.value;
      state.year = yearEl.value;
      state.month = monthEl.value;
      state.order = ordEl.value;
      state.type = typEl.value;

      // reload dependent combos when currency/account changes
      // currency impacts accounts + years
      reloadCombos(true);

      // Persistencia de filtros
    const saved = E?.loadFilters ? E.loadFilters('rep_categories') : null;
    if (saved){
      E.setSelectValueIfExists && E.setSelectValueIfExists(yearEl, saved.year);
      E.setSelectValueIfExists && E.setSelectValueIfExists(monthEl, saved.month);
      E.setSelectValueIfExists && E.setSelectValueIfExists(curEl, saved.currency);
      E.setSelectValueIfExists && E.setSelectValueIfExists(accEl, saved.accountId);
      E.setSelectValueIfExists && E.setSelectValueIfExists(typeEl, saved.type);
      E.setSelectValueIfExists && E.setSelectValueIfExists(orderEl, saved.order);
    }

    computeAndRender();
    }, 100);

    curEl?.addEventListener('change', apply);
    accEl?.addEventListener('change', apply);
    yearEl?.addEventListener('change', apply);
    monthEl?.addEventListener('change', apply);
    ordEl?.addEventListener('change', apply);
    typEl?.addEventListener('change', apply);

    // Persistencia de filtros
    const saved = E?.loadFilters ? E.loadFilters('rep_categories') : null;
    if (saved){
      E.setSelectValueIfExists && E.setSelectValueIfExists(yearEl, saved.year);
      E.setSelectValueIfExists && E.setSelectValueIfExists(monthEl, saved.month);
      E.setSelectValueIfExists && E.setSelectValueIfExists(curEl, saved.currency);
      E.setSelectValueIfExists && E.setSelectValueIfExists(accEl, saved.accountId);
      E.setSelectValueIfExists && E.setSelectValueIfExists(typeEl, saved.type);
      E.setSelectValueIfExists && E.setSelectValueIfExists(orderEl, saved.order);
    }

    computeAndRender();
  }

  window.SGF.modules.reportes_resumen_categorias = { onMount };
})();
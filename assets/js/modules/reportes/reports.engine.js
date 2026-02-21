// v1.20.9 - Motor común de Reportes (fmt + persistencia + utilidades)
window.SGF = window.SGF || {};
window.SGF.reports = window.SGF.reports || {};
window.SGF.reports.engine = window.SGF.reports.engine || {};

(function(ns){
  function $(id){ return document.getElementById(id); }

  function debounce(fn, wait=120){
    let t=null;
    return function(...args){
      clearTimeout(t);
      t=setTimeout(()=>fn.apply(this,args), wait);
    };
  }

  function createReportState({ key, defaults }){
    const base = Object.assign({}, defaults || {});
    const st = { key: key || 'report', ...base };
    return st;
  }

  function readCommonFilters({ prefix }){
    const p = prefix || '';
    const get = (s)=> $(p ? `${p}-${s}` : s);
    const year = get('year')?.value || 'all';
    const month = get('month')?.value || 'all';
    const currency = get('currency')?.value || 'CRC';
    const accountId = Number(get('account')?.value || 0);
    const type = get('type')?.value || 'expense';
    const order = get('order')?.value || 'desc';
    return { year, month, currency, accountId, type, order };
  }

  function normalizeRange({ year, month }){
    // Si hay mes, forzar año coherente (en SGF el mes viene "YYYY-MM")
    if (month && month !== 'all' && String(month).includes('-')) {
      const y = String(month).slice(0,4);
      return { year: y, month };
    }
    return { year, month };
  }

  function applyOrdering(rows, order){
    const dir = (order || 'desc') === 'asc' ? 1 : -1;
    return (rows || []).slice().sort((a,b)=> (Number(a.total||0)-Number(b.total||0))*dir);
  }

  function wireExpandControls({ expandBtnId, collapseBtnId, onExpand, onCollapse }){
    const exp = $(expandBtnId);
    const col = $(collapseBtnId);
    if (exp) exp.addEventListener('click', (e)=>{ e.preventDefault(); onExpand && onExpand(); });
    if (col) col.addEventListener('click', (e)=>{ e.preventDefault(); onCollapse && onCollapse(); });
  }

  function wireDelegatedToggles({ tbody, toggleSelector, getKey, onToggle }){
    if (!tbody || !toggleSelector) return;
    if (tbody.__repDelegatedToggles) return;
    tbody.__repDelegatedToggles = true;
    tbody.addEventListener('click', (e)=>{
      const btn = e.target.closest(toggleSelector);
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const key = getKey ? getKey(btn) : null;
      if (key === null || key === undefined) return;
      onToggle && onToggle(key, btn);
    });
  }

  function wireDelegatedRows({ tbody, rowSelector, onRowClick }){
    if (!tbody || !rowSelector) return;
    if (tbody.__repDelegatedRows) return;
    tbody.__repDelegatedRows = true;
    tbody.addEventListener('click', (e)=>{
      const row = e.target.closest(rowSelector);
      if (!row) return;
      // ignore if click came from a toggle inside the row
      if (e.target.closest('.rcat-toggle') || e.target.closest('.racc-toggle')) return;
      onRowClick && onRowClick(row, e);
    });
  }

  
  function moneyClass(v){
    const n = Number(v||0);
    if (n > 0) return 'text-emerald-700';
    if (n < 0) return 'text-rose-700';
    return 'text-slate-900';
  }

  function fmtMoney(n, currency){
    const code = (currency || 'CRC').toUpperCase();
    const num = Number(n || 0);
    const localeMap = { CRC: 'es-CR', USD: 'en-US', EUR: 'es-ES', GBP: 'en-GB' };
    const locale = localeMap[code] || 'es-CR';
    try {
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: code,
          currencyDisplay: 'narrowSymbol',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);
      } catch (_) {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: code,
          currencyDisplay: 'symbol',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);
      }
    } catch (_) {
      const sign = num < 0 ? '-' : '';
      const abs = Math.abs(num);
      const formatted = abs.toFixed(2).replace('.', ',');
      const sym = (code === 'CRC') ? '₡' : (code === 'USD') ? '$' : (code + ' ');
      return sign + sym + formatted;
    }
  }

  function storageKey(key){ return `SGF_REPORT_${key}`; }

  function saveFilters(key, obj){
    try { localStorage.setItem(storageKey(key), JSON.stringify(obj || {})); } catch(_){}
  }

  function loadFilters(key){
    try {
      const raw = localStorage.getItem(storageKey(key));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch(_){ return null; }
  }

  function setSelectValueIfExists(el, value){
    if (!el) return;
    const v = value == null ? '' : String(value);
    const opt = Array.from(el.options || []).some(o => String(o.value) === v);
    if (opt) el.value = v;
  }

ns.$ = $;
  ns.debounce = debounce;
  ns.createReportState = createReportState;
  ns.readCommonFilters = readCommonFilters;
  ns.normalizeRange = normalizeRange;
  ns.applyOrdering = applyOrdering;
  ns.wireExpandControls = wireExpandControls;
  ns.wireDelegatedToggles = wireDelegatedToggles;
  ns.wireDelegatedRows = wireDelegatedRows;
  ns.moneyClass = moneyClass;
  ns.fmtMoney = fmtMoney;
  ns.saveFilters = saveFilters;
  ns.loadFilters = loadFilters;
  ns.setSelectValueIfExists = setSelectValueIfExists;
})(window.SGF.reports.engine);
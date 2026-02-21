// v1.19.29 - Reportes: Drill-down común (fase 3)
window.SGF = window.SGF || {};
window.SGF.reports = window.SGF.reports || {};
window.SGF.reports.drill = window.SGF.reports.drill || {};

(function(ns){
  const R = window.SGF.reports;
  const D = window.SGF.reports.data;

  function esc(s){ return R.escapeHtml ? R.escapeHtml(String(s ?? '')) : String(s ?? ''); }

  function fill({ subtitle, rangeLabel, currency, rows }) {
    const sub = document.getElementById('repdr-subtitle');
    const rng = document.getElementById('repdr-range');
    const tb = document.getElementById('repdr-tbody');
    const foot = document.getElementById('repdr-foot');
    if (sub) sub.textContent = subtitle || 'Movimientos';
    if (rng) rng.textContent = rangeLabel || '—';

    const fmt = (v)=> (R.fmtMoney ? R.fmtMoney(Number(v||0), currency) : String(v||0));
    const cls = (v)=> (R.moneyClass ? R.moneyClass(Number(v||0), 'saldo') : '');

    const list = rows || [];
    if (!tb) return;

    tb.innerHTML = list.map(r => `
      <tr class="border-b last:border-b-0">
        <td class="py-2 px-3 whitespace-nowrap">${esc(r.date || '')}</td>
        <td class="py-2 px-3">${esc(r.description || '')}</td>
        <td class="py-2 px-3">${esc(r.detail || '')}</td>
        <td class="py-2 px-3 text-right tabular-nums ${cls(r.amount)}">${esc(fmt(r.amount))}</td>
      </tr>
    `).join('') || `<tr><td class="py-3 px-3 text-slate-500" colspan="4">Sin movimientos.</td></tr>`;

    if (foot) foot.textContent = `${list.length} movimiento(s)`;
  }

  function openFromQuery({ subtitle, rangeLabel, currency, scope, type, range }) {
    const rows = (D && D.listMovements) ? D.listMovements({ scope, range, currency, type }) : [];
    window.openModal?.('rep_drill', {});
    // openModal injects html; now fill
    fill({ subtitle, rangeLabel, currency, rows });
    try { window.lucide?.createIcons?.(); } catch(_){}
  }

  ns.fill = fill;
  ns.openFromQuery = openFromQuery;
})(window.SGF.reports.drill);

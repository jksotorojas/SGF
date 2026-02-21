// v1.20.16 - Base común de Reportes (fix dbRows para wrapper select)
window.SGF = window.SGF || {};
window.SGF.reports = window.SGF.reports || window.SGF.reports || {};
window.SGF.reports.data = window.SGF.reports.data || {};

(function(ns){
  function qAll(db, sql, params){
    const p = params || {};
    if (!db) throw new Error('DB_UNAVAILABLE');
    // SGF.db (wrapper)
    if (typeof db.select === 'function') return db.select(sql, p) || [];
    // sql.js Database
    if (typeof db.exec === 'function') return toRows(db.exec(sql, p));
    throw new Error('DB_UNSUPPORTED');
  }
  function qFirstValue(db, sql, params){
    const p = params || {};
    if (!db) throw new Error('DB_UNAVAILABLE');
    if (typeof db.scalar === 'function') return db.scalar(sql, p);
    if (typeof db.select === 'function'){
      const rows = db.select(sql, p) || [];
      if (!rows.length) return null;
      const first = rows[0];
      const k = Object.keys(first)[0];
      return first[k];
    }
    if (typeof db.exec === 'function'){
      const r = db.exec(sql, p);
      if (!r || !r.length || !r[0].values || !r[0].values.length) return null;
      return r[0].values[0][0];
    }
    throw new Error('DB_UNSUPPORTED');
  }
  function toRows(result){
    if (!result || !result.length || !result[0]) return [];
    const columns = Array.isArray(result[0].columns) ? result[0].columns : [];
    const values = Array.isArray(result[0].values) ? result[0].values : [];
    if (!columns.length || !values.length) return [];
    return values.map(v => {
      const row = {};
      for (let i=0;i<columns.length;i++) row[columns[i]] = v[i];
      return row;
    });
  }

  // Schema helper: detect if a table has a column (works for SGF.db wrapper or sql.js db)
  const __colCache = {};
  function hasColumn(db, table, col){
    const key = `${table}.${col}`;
    if (key in __colCache) return __colCache[key];
    try{
      let rows = [];
      const sql = `PRAGMA table_info(${table})`;
      if (db && typeof db.select === 'function') rows = db.select(sql, {}) || [];
      else if (db && typeof db.exec === 'function') rows = toRows(db.exec(sql, {})) || [];
      const ok = rows.some(r => String(r.name || r.column || '').toLowerCase() === String(col).toLowerCase());
      __colCache[key] = ok;
      return ok;
    }catch(_){
      __colCache[key] = false;
      return false;
    }
  }

  function pushSoftDeleteWhere(whereArr, db, table, alias, col){
    if (hasColumn(db, table, col)) whereArr.push(`COALESCE(${alias}.${col},0)=0`);
  }

  function periodBetweenSql(col){ return `${col} >= :p1 AND ${col} <= :p2`; }

  function computeRange(year, month){
    if (year === 'all' && month === 'all') return { p1: null, p2: null, endPeriod: null };
    if (year !== 'all' && month === 'all'){
      const p1 = `${year}-01`, p2 = `${year}-12`;
      return { p1, p2, endPeriod: p2 };
    }
    const mm = String(month).padStart(2,'0');
    const p = `${year}-${mm}`;
    return { p1: p, p2: p, endPeriod: p };
  }

  async function normalizeYearMonth({ db, year, month, currency, accountId }){
    if (month === 'all') return { year, month };
    if (year !== 'all') return { year, month };
    const mm = String(month).padStart(2,'0');
    let where = "substr(m.period,6,2)=:mm";
    const params = { ':mm': mm };
    if (currency && currency !== 'all'){ where += " AND m.currency=:cur"; params[':cur']=currency; }
    if (accountId && accountId !== 'all'){ where += " AND m.account_id=:aid"; params[':aid']=Number(accountId); }
    if (hasColumn(db, "movements", "is_deleted")) where += " AND COALESCE(m.is_deleted,0)=0";
    const y = qFirstValue(db, `SELECT MAX(substr(m.period,1,4)) FROM movements m WHERE ${where}`, params);
    if (y) return { year: String(y), month };
    return { year: 'all', month: 'all' };
  }

  function getPeriods(db){
    const years = toRows(qAll(db, "SELECT DISTINCT substr(period,1,4) AS y FROM movements ORDER BY y DESC")).map(r=>String(r.y));
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    return { years, months };
  }

  function getAccounts(db, currency){
    let sql = `SELECT a.id, a.name, a.currency, COALESCE(t.name,'') AS type_name
               FROM accounts a
               LEFT JOIN account_types t ON t.id=a.type_id
               WHERE 1=1`;
    const params = {};
    if (currency && currency !== 'all'){ sql += " AND a.currency=:cur"; params[':cur']=currency; }
    sql += " ORDER BY type_name ASC, a.name ASC";
    return toRows(qAll(db, sql, params));
  }

  function getCategories(db){
    return toRows(qAll(db, `SELECT id, name, parent_id, COALESCE(active,1) AS active
                            FROM categories
                            ORDER BY name COLLATE NOCASE ASC`));
  }

  // (Los agregadores sumByAccount/sumByCategory se integran en fase siguiente para evitar riesgos)
  ns.normalizeYearMonth = normalizeYearMonth;
  ns.getPeriods = getPeriods;
  ns.getAccounts = getAccounts;
  ns.getCategories = getCategories;

  function dbAll(sql, params = {}) {
    return window.SGF?.db?.select?.(sql, params) || [];
  }

  // Lista movimientos para drill-down (fase 3)
  // scope:
  //  - { kind:'category', id:number } => incluye splits
  //  - { kind:'account', id:number }  => incluye income/expense/transfer que afectan a la cuenta
  // opts: { range:{whereSql, params}, currency, type:'expense'|'income'|'both' }
  function listMovements({ scope, range, currency, type }) {
    const where = [];
    const p = {};
    if (range?.whereSql) { where.push(range.whereSql.replaceAll('period', 'm.period')); Object.assign(p, range.params || {}); }
    if (currency && currency !== 'all') { where.push(`m.currency = :cur`); p[':cur'] = currency; }
    where.push(`COALESCE(m.is_opening,0)=0`);
    where.push(`COALESCE(m.is_deleted,0)=0`);

    const w = where.length ? `WHERE ${where.join(' AND ')}` : 'WHERE 1=1';

    const typ = (type || 'expense');
    const both = (typ === 'both') ? 1 : 0;
    p[':both'] = both;

    if (!scope || !scope.kind) return [];

    if (scope.kind === 'category') {
      const cid = Number(scope.id || 0);
      if (!cid) return [];
      p[':cid'] = cid;

      // Type filter
      let typeSql = "";
      if (typ === 'both') typeSql = " AND m.type IN ('income','expense')";
      else typeSql = " AND m.type = :typ";
      if (typ !== 'both') p[':typ'] = typ;

      const q1 = `
        SELECT m.date, m.description,
               (SELECT a.name FROM accounts a WHERE a.id = m.account_id) AS detail,
               CASE WHEN :both=1 AND m.type='expense' THEN -m.amount ELSE m.amount END AS amount
        FROM movements m
        ${w}${typeSql} AND COALESCE(m.is_split,0)=0 AND COALESCE(m.category_id,0)=:cid
      `;

      const q2 = `
        SELECT m.date, m.description,
               (SELECT a.name FROM accounts a WHERE a.id = m.account_id) AS detail,
               CASE WHEN :both=1 AND m.type='expense' THEN -s.amount ELSE s.amount END AS amount
        FROM movements m
        JOIN movement_splits s ON s.movement_id = m.id
        ${w}${typeSql} AND COALESCE(m.is_split,0)=1 AND COALESCE(s.category_id,0)=:cid
      `;

      return dbAll(`${q1} UNION ALL ${q2} ORDER BY date ASC`, p) || [];
    }

    if (scope.kind === 'account') {
      const aid = Number(scope.id || 0);
      if (!aid) return [];
      p[':aid'] = aid;

      // For accounts, include transfers that affect the account.
      // Map type filter:
      //  expense => expense + transfer OUT
      //  income  => income  + transfer IN
      //  both    => income + expense + transfer (in/out)
      let cond = "";
      if (typ === 'both') {
        cond = " AND ( (m.type IN ('income','expense')) OR (m.type='transfer') )";
      } else if (typ === 'expense') {
        cond = " AND (m.type='expense' OR (m.type='transfer'))";
      } else {
        cond = " AND (m.type='income' OR (m.type='transfer'))";
      }

      const q = `
        SELECT m.date,
               m.description,
               CASE
                 WHEN m.type='transfer' AND m.account_id=:aid THEN (SELECT a.name FROM accounts a WHERE a.id = m.account_to_id)
                 WHEN m.type='transfer' AND m.account_to_id=:aid THEN (SELECT a.name FROM accounts a WHERE a.id = m.account_id)
                 ELSE (SELECT c.name FROM categories c WHERE c.id = m.category_id)
               END AS detail,
               CASE
                 WHEN m.type='expense' AND m.account_id=:aid THEN -m.amount
                 WHEN m.type='income'  AND m.account_id=:aid THEN  m.amount
                 WHEN m.type='transfer' AND m.account_id=:aid THEN -m.amount
                 WHEN m.type='transfer' AND m.account_to_id=:aid THEN COALESCE(m.amount_to,m.amount)
                 ELSE 0
               END AS amount
        FROM movements m
        ${w}${cond} AND (m.account_id=:aid OR m.account_to_id=:aid)
        ORDER BY m.date ASC
      `;
      return dbAll(q, p) || [];
    }

    return [];
  }

  ns.listMovements = listMovements;


  function dbRows(db, sql, params){
    const r = qAll(db, sql, params || {});
    // SGF.db wrapper ya devuelve array de objetos -> devolver tal cual
    if (Array.isArray(r) && (r.length === 0 || (r[0] && typeof r[0] === 'object' && !('columns' in r[0]) && !('values' in r[0])))) return r;
    return toRows(r);
  }

  // Totales por categoría (incluye splits) respetando filtros
  function queryCategoryTotals({ db, year, month, currency, accountId, type }){
    const y = year || 'all';
    const m = month || 'all';
    const cur = currency || 'all';
    const aid = Number(accountId || 0);
    const t = type || 'expense';

    const range = computeRange(y, m === 'all' ? 'all' : String(m).includes('-') ? String(m).slice(5,7) : m);
    const where = [];
    const p = {};

    // period filter
    if (range.p1 && range.p2){
      where.push(periodBetweenSql('m.period'));
      p[':p1'] = range.p1;
      p[':p2'] = range.p2;
    }

    if (cur && cur !== 'all'){ where.push("m.currency = :cur"); p[':cur']=cur; }

    // tipo filter
    // both => incluir income+expense, en both se invierte expense para mostrar neto
    p[':both'] = (t === 'both') ? 1 : 0;
    if (t !== 'both'){ where.push("m.type = :t"); p[':t']=t; }

    pushSoftDeleteWhere(where, db, "movements", "m", "is_deleted");
    where.push("COALESCE(m.is_opening,0)=0");
    if (aid){ where.push("m.account_id = :aid"); p[':aid']=aid; }

    const w = where.length ? `WHERE ${where.join(' AND ')}` : 'WHERE 1=1';

    const nonSplit = dbRows(db,
      `SELECT COALESCE(m.category_id,0) AS category_id,
              COALESCE(SUM(CASE WHEN :both=1 AND m.type='expense' THEN -m.amount ELSE m.amount END),0) AS total
       FROM movements m
       ${w} AND COALESCE(m.is_split,0)=0
       GROUP BY COALESCE(m.category_id,0)`,
      p
    );

    const split = dbRows(db,
      `SELECT COALESCE(s.category_id,0) AS category_id,
              COALESCE(SUM(CASE WHEN :both=1 AND m.type='expense' THEN -s.amount ELSE s.amount END),0) AS total
       FROM movements m
       JOIN movement_splits s ON s.movement_id = m.id
       ${w} AND COALESCE(m.is_split,0)=1
       GROUP BY COALESCE(s.category_id,0)`,
      p
    );

    const byId = new Map();
    for (const r of nonSplit) byId.set(Number(r.category_id), (byId.get(Number(r.category_id)) || 0) + Number(r.total||0));
    for (const r of split) byId.set(Number(r.category_id), (byId.get(Number(r.category_id)) || 0) + Number(r.total||0));
    return byId;
  }

  ns.queryCategoryTotals = queryCategoryTotals;

})(window.SGF.reports.data);

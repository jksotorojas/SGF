# SGF – Sistema de Gestión Financiera Personal

Sistema financiero personal offline desarrollado en JavaScript + SQLite (sql.js), orientado a control completo de:

- Ingresos  
- Gastos  
- Transferencias  
- Ahorros  
- Metas  
- Presupuestos  
- Conciliaciones  
- Reportes avanzados  
- Exportación a PDF  
- Demo con 12+ meses de datos  

---

## 🚀 Características principales

### 📊 Reportes
- Resumen por cuentas (con totales y jerarquía expandible)
- Resumen por categorías
- Estado de resultados
- Flujo de caja
- Presupuesto vs Real
- Tendencias 12 meses
- Insights automáticos
- Comparativo mes a mes
- Balance por cuenta / saldo por mes

Todos incluyen:
- Filtros dinámicos
- Totales en pie de tabla
- Botón PDF
- Botón de ayuda
- Drill-down a movimientos

---

### 💾 Base de datos
- SQLite embebido (sql.js)
- 100% local
- Sin backend
- Multi-usuario local
- Exportar / Importar base
- Auto-backup
- Restaurar backup

---

### 🧪 Demo avanzada
La demo incluye:

- 12+ meses de datos
- Múltiples cuentas (bancos, efectivo, tarjetas)
- Ingresos recurrentes
- Gastos distribuidos por categorías
- Transferencias
- Ahorros activos
- Presupuestos configurados
- Flujos de caja coherentes
- Reportes totalmente poblados

---

## 🏗️ Arquitectura

```
/assets
  /js
    /modules
      /movimientos
      /reportes
      /presupuesto
      /flujo
      /insights
    /app
      boot.js
      router.js
      db.js
/views
index.html
```

### Patrón utilizado
- Módulos desacoplados
- Motor común de reportes
- Render jerárquico reusable
- Estado centralizado en `window.SGF`
- Navegación SPA interna

---

## 📦 Versionado

Ejemplo actual:

v1.32.4

Las versiones siguen estructura:

```
vMAJOR.MINOR.PATCH
```

- MAJOR → cambios estructurales  
- MINOR → nuevas funcionalidades  
- PATCH → correcciones  

---

## 📄 Exportación PDF

Todos los reportes incluyen exportación a PDF:

- Botón único estándar
- Exporta solo el card del reporte
- Respeta filtros activos
- Formato listo para impresión

---

## 🔧 Cómo ejecutar

### Opción 1 – Live Server
Abrir `index.html` con Live Server.

### Opción 2 – Servidor simple
```bash
npx serve .
```

---

## 🔐 Seguridad

- No envía datos a servidores externos  
- Base 100% local  
- Control manual de backups  
- No requiere conexión a internet  

---

## 📜 Licencia

Proyecto privado / uso personal.  
Licencia configurable según necesidad.

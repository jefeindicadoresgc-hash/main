// #region 1. VARIABLES, FORMATOS Y REFERENCIAS DE FIREBASE
let refRefaccionesActual = null;
let listenerRefacciones = null;

let refAccesoriosActual = null;
let listenerAccesorios = null;

const formatoSimple = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mesesNombres = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

window.datosTallerRaw = {};
window.datosRefaccionesGrafica = { labels: [], objetivos: [], compras: [] };
window.datosTallerGrafica = { mant: 0, rep: 0, diag: 0 };
// #endregion

// #region 2. MÓDULO REFACCIONES (EN VIVO)

// #region 2.1 COMPRAS, VENTAS Y OBSOLETOS
window.actualizarRelojRefacciones = function () {
    const el = document.getElementById('refacciones-fecha-act');
    if (el) {
        el.innerText = `● ÚLT. ACT: EN VIVO (${new Date().toLocaleTimeString('es-MX')})`;
    }
};

window.escucharRefaccionesEnVivo = function () {
    const mes = document.getElementById('select-mes')?.value || '01';
    const anio = document.getElementById('select-anio')?.value || '2026';
    const llaveMes = `${anio}-${mes}`;

    if (refRefaccionesActual && listenerRefacciones) {
        refRefaccionesActual.off('value', listenerRefacciones);
    }
    if (!window.appPython) return;

    refRefaccionesActual = window.appPython.database().ref(`respaldos/${llaveMes}`);
    listenerRefacciones = refRefaccionesActual.on('value', (snapshot) => {
        window.actualizarRelojRefacciones();
        const data = snapshot.val() || {};
        const compras = data.compras || {};
        const ventas = data.ventas || { mostrador: { obj: 0, venta: 0, costo: 0 }, taller: { obj: 0, venta: 0, costo: 0 } };
        const obsoletosRaw = data.obsoletos || [];
        const obsoletos = Array.isArray(obsoletosRaw) ? obsoletosRaw : Object.values(obsoletosRaw);

        const lineas = [
            { id: 'mobis', dbKey: 'MOBIS' },
            { id: 'semi', dbKey: 'SEMI-SINTETICO' },
            { id: 'sint', dbKey: 'SINTETICO' },
            { id: 'wurth', dbKey: 'WURTH' },
            { id: 'llantas', dbKey: 'LLANTAS' },
            { id: 'acc', dbKey: 'ACCESORIOS' }
        ];

        let totObjComp = 0, totComp = 0;
        const gLabels = [], gObjs = [], gComps = [];

        lineas.forEach(linea => {
            const obj = window.parseNumero(compras[linea.dbKey]?.obj);
            const real = window.parseNumero(compras[linea.dbKey]?.real);

            gLabels.push(linea.dbKey);
            gObjs.push(obj);
            gComps.push(real);

            totObjComp += obj;
            totComp += real;
            const alc = obj > 0 ? (real / obj) * 100 : 0;
            const dif = real - obj;

            if (document.getElementById(`obj-${linea.id}`)) document.getElementById(`obj-${linea.id}`).innerText = formatoSimple.format(obj);
            if (document.getElementById(`comp-${linea.id}`)) document.getElementById(`comp-${linea.id}`).innerText = formatoSimple.format(real);

            const elAlc = document.getElementById(`alc-${linea.id}`);
            const elDif = document.getElementById(`dif-${linea.id}`);
            if (elAlc) {
                elAlc.innerText = alc.toFixed(0) + '%';
                elAlc.style.color = alc >= 100 ? 'var(--color-ok)' : 'var(--color-error)';
                elAlc.style.fontWeight = '700';
            }
            if (elDif) {
                elDif.innerText = window.mxnFormat.format(dif);
                elDif.style.color = dif < 0 ? 'var(--color-error)' : 'var(--color-ok)';
            }
        });

        window.datosRefaccionesGrafica = { labels: gLabels, objetivos: gObjs, compras: gComps };

        const totAlcComp = totObjComp > 0 ? (totComp / totObjComp) * 100 : 0;
        const totDifComp = totComp - totObjComp;

        if (document.getElementById('tot-obj-comp')) document.getElementById('tot-obj-comp').innerText = window.mxnFormat.format(totObjComp);
        if (document.getElementById('tot-comp')) document.getElementById('tot-comp').innerText = window.mxnFormat.format(totComp);
        const elTotAlc = document.getElementById('tot-alc-comp');
        if (elTotAlc) { elTotAlc.innerText = totAlcComp.toFixed(0) + '%'; elTotAlc.style.color = totAlcComp >= 100 ? 'var(--color-ok)' : 'var(--color-error)'; }
        const elTotDif = document.getElementById('tot-dif-comp');
        if (elTotDif) { elTotDif.innerText = window.mxnFormat.format(totDifComp); elTotDif.style.color = totDifComp < 0 ? 'var(--color-error)' : 'var(--color-ok)'; }

        // Ventas Mostrador y Taller
        const objMost = window.parseNumero(ventas.mostrador?.obj);
        const venMost = window.parseNumero(ventas.mostrador?.venta);
        const cosMost = window.parseNumero(ventas.mostrador?.costo);
        const objTall = window.parseNumero(ventas.taller?.obj);
        const venTall = window.parseNumero(ventas.taller?.venta);
        const cosTall = window.parseNumero(ventas.taller?.costo);

        if (document.getElementById('obj-mostrador')) document.getElementById('obj-mostrador').innerText = formatoSimple.format(objMost);
        if (document.getElementById('cos-mostrador')) document.getElementById('cos-mostrador').innerText = formatoSimple.format(cosMost);
        if (document.getElementById('obj-taller')) document.getElementById('obj-taller').innerText = formatoSimple.format(objTall);
        if (document.getElementById('cos-taller')) document.getElementById('cos-taller').innerText = formatoSimple.format(cosTall);

        const objTotRef = objMost + objTall;
        const venTotRef = venMost + venTall;
        const cosTotRef = cosMost + cosTall;

        if (document.getElementById('obj-tot-ref')) document.getElementById('obj-tot-ref').innerText = window.mxnFormat.format(objTotRef);
        if (document.getElementById('cos-tot-ref')) document.getElementById('cos-tot-ref').innerText = window.mxnFormat.format(cosTotRef);

        const elVenMost = document.getElementById('ven-mostrador');
        if (elVenMost) { elVenMost.innerText = formatoSimple.format(venMost); elVenMost.style.color = venMost >= objMost ? 'var(--color-ok)' : 'var(--color-error)'; elVenMost.style.fontWeight = '700'; }
        const elVenTall = document.getElementById('ven-taller');
        if (elVenTall) { elVenTall.innerText = formatoSimple.format(venTall); elVenTall.style.color = venTall >= objTall ? 'var(--color-ok)' : 'var(--color-error)'; elVenTall.style.fontWeight = '700'; }
        const elVenTot = document.getElementById('ven-tot-ref');
        if (elVenTot) { elVenTot.innerText = window.mxnFormat.format(venTotRef); elVenTot.style.color = venTotRef >= objTotRef ? 'var(--color-ok)' : 'var(--color-error)'; elVenTot.style.fontWeight = '700'; }

        const utMost = venMost - cosMost;
        const utTall = venTall - cosTall;
        const utTotRef = utMost + utTall;

        if (document.getElementById('ut-mostrador')) document.getElementById('ut-mostrador').innerText = window.mxnFormat.format(utMost);
        if (document.getElementById('ut-taller')) document.getElementById('ut-taller').innerText = window.mxnFormat.format(utTall);
        if (document.getElementById('ut-tot-ref')) document.getElementById('ut-tot-ref').innerText = window.mxnFormat.format(utTotRef);

        const alcTotRef = objTotRef > 0 ? (venTotRef / objTotRef) * 100 : 0;
        const elAlcTotRef = document.getElementById('alcance-tot-ref');
        if (elAlcTotRef) { elAlcTotRef.innerText = alcTotRef.toFixed(0) + '%'; elAlcTotRef.style.color = alcTotRef >= 100 ? 'var(--color-ok)' : 'var(--color-error)'; }

        // Obsoletos G3 y G4
        let g3_count = 0, g3_imp = 0, g4_count = 0, g4_imp = 0;
        obsoletos.forEach(item => {
            if (!item || !item.clasificacion) return;
            const clas = String(item.clasificacion).toUpperCase();
            if (clas.includes("G3")) { g3_count++; g3_imp += window.parseNumero(item.importe); }
            if (clas.includes("G4")) { g4_count++; g4_imp += window.parseNumero(item.importe); }
        });
        if (document.getElementById('g3-sku-val')) document.getElementById('g3-sku-val').innerText = g3_count;
        if (document.getElementById('g3-monto-val')) document.getElementById('g3-monto-val').innerText = window.mxnFormat.format(g3_imp);
        if (document.getElementById('g4-sku-val')) document.getElementById('g4-sku-val').innerText = g4_count;
        if (document.getElementById('g4-monto-val')) document.getElementById('g4-monto-val').innerText = window.mxnFormat.format(g4_imp);

        // Sincronización con KPI Ejecutivo (Dashboard) y Rentabilidad
        if (document.getElementById('dash-ref-alc')) {
            document.getElementById('dash-ref-alc').innerText = alcTotRef.toFixed(0) + '%';
            document.getElementById('dash-ref-alc').style.color = alcTotRef >= 100 ? 'var(--color-ok)' : 'var(--texto-principal)';
        }
        if (document.getElementById('dash-ref-util')) document.getElementById('dash-ref-util').innerText = 'Utilidad: ' + window.mxnFormat.format(utTotRef);

        window.utilidadMostrador = utMost;
        if (typeof window.calcularRentabilidad === 'function') window.calcularRentabilidad();
        if (typeof window.actualizarGraficas === 'function') window.actualizarGraficas();
    }, (err) => console.error("Error leyendo respaldos de refacciones:", err));
};
// #endregion

// #region 2.2 VENTA DE ACCESORIOS EN VIVO
window.cargarAccesoriosEnVivo = function () {
    const mesIdx = parseInt(document.getElementById('select-mes')?.value || '01', 10) - 1;
    const anio = document.getElementById('select-anio')?.value || '2026';
    const mesNombre = mesesNombres[mesIdx] || "ENERO";

    if (refAccesoriosActual && listenerAccesorios) {
        refAccesoriosActual.off('value', listenerAccesorios);
    }
    if (!window.appPython) return;

    refAccesoriosActual = window.appPython.database().ref(`accesorios/ventas_${anio}/${mesNombre}`);
    listenerAccesorios = refAccesoriosActual.on('value', (snapshot) => {
        window.actualizarRelojRefacciones();
        const data = snapshot.val();
        const agregados = {};

        if (data) {
            const registros = Array.isArray(data) ? data : Object.values(data);
            registros.forEach(tx => {
                if (!tx) return;
                const vendedor = String(tx.ASESOR || tx.asesor || tx.VENDEDOR || tx.vendedor || tx.Nombre || "SIN ASIGNAR").trim();
                const costoRaw = tx['COSTO ACUM.'] ?? tx.costo_acum ?? tx.costo ?? tx.COSTO ?? tx.Costo ?? 0;
                const costo = window.parseNumero(costoRaw);
                agregados[vendedor] = (agregados[vendedor] || 0) + costo;
            });
        }

        let html = `<table><thead><tr><th style="text-align:left;">Vendedor</th><th>Costo Acumulado</th></tr></thead><tbody>`;
        let totCosto = 0;

        Object.entries(agregados)
            .sort((a, b) => b[1] - a[1])
            .forEach(([vendedor, costo]) => {
                if (costo > 0) {
                    totCosto += costo;
                    html += `<tr><td style="text-align:left; font-weight:700;">${window.escapeHTML(vendedor)}</td><td style="font-weight:700;">${window.mxnFormat.format(costo)}</td></tr>`;
                }
            });

        if (totCosto === 0) {
            html += `<tr><td colspan="2" style="padding:16px; color:var(--texto-secundario);">No hay datos en la nube para ${mesNombre} ${anio}.</td></tr>`;
        } else {
            html += `<tr class="row-total"><td style="text-align:left;">TOTAL ACUMULADO</td><td>${window.mxnFormat.format(totCosto)}</td></tr>`;
        }
        html += `</tbody></table>`;

        const cont = document.getElementById('tabla-accesorios-container');
        if (cont) cont.innerHTML = html;
    }, (err) => console.error("Error leyendo accesorios:", err));
};
// #endregion

// #endregion

// #region 3. MÓDULO TALLER (MEZCLA Y RENDIMIENTO TÉCNICO)

// #region 3.1 RANGO DE FECHAS AUTOMÁTICO
window.establecerFechasDefaultTaller = function () {
    const mes = document.getElementById('select-mes')?.value || '01';
    const anio = document.getElementById('select-anio')?.value || '2026';
    const inputDesde = document.getElementById('taller-fecha-desde');
    const inputHasta = document.getElementById('taller-fecha-hasta');

    const hoy = new Date();
    const mesActualStr = String(hoy.getMonth() + 1).padStart(2, '0');
    const anioActualStr = String(hoy.getFullYear());

    if (inputDesde) inputDesde.value = `${anio}-${mes}-01`;

    if (inputHasta) {
        if (mes === mesActualStr && anio === anioActualStr) {
            inputHasta.value = `${anio}-${mes}-${String(hoy.getDate()).padStart(2, '0')}`;
        } else {
            const ultimoDia = new Date(parseInt(anio, 10), parseInt(mes, 10), 0).getDate();
            inputHasta.value = `${anio}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
        }
    }
    window.procesarDatosTaller();
};
// #endregion

// #region 3.2 PROCESAMIENTO DE MEZCLA Y MATRIZ DE TÉCNICOS
window.procesarDatosTaller = function () {
    const valDesde = document.getElementById('taller-fecha-desde')?.value;
    const valHasta = document.getElementById('taller-fecha-hasta')?.value;

    const timeDesde = valDesde ? new Date(valDesde + 'T00:00:00').getTime() : null;
    const timeHasta = valHasta ? new Date(valHasta + 'T23:59:59').getTime() : null;

    const mix = { mant: 0, rep: 0, diag: 0 };
    const tecnicos = {};

    for (const [llave, trabajo] of Object.entries(window.datosTallerRaw || {})) {
        if (!trabajo) continue;
        const parts = String(llave).split('_');
        if (parts.length < 2) continue;

        const timestamp = parseInt(parts[1], 10);
        if (isNaN(timestamp)) continue;

        if (timeDesde && timeHasta && timestamp >= timeDesde && timestamp <= timeHasta) {
            const cat = String(trabajo.categoria || '').toLowerCase().trim();
            const esMantDiag = cat.includes('mantenimiento') && (cat.includes('diagnostico') || cat.includes('diagnóstico'));
            const esMant = cat === 'mantenimiento';
            const esDiag = cat === 'diagnostico' || cat === 'diagnóstico';
            const esRep = cat.includes('reparacion') || cat.includes('reparación');

            if (esMantDiag || esMant) mix.mant++;
            if (esRep) mix.rep++;
            if (esMantDiag || esDiag) mix.diag++;

            const tec = String(trabajo.tecnico || 'Sin Asignar').trim().toUpperCase();
            if (!tecnicos[tec]) tecnicos[tec] = { m: 0, md: 0, r: 0, d: 0, tot: 0 };

            if (esMantDiag) tecnicos[tec].md++;
            else if (esMant) tecnicos[tec].m++;
            else if (esRep) tecnicos[tec].r++;
            else if (esDiag) tecnicos[tec].d++;
            tecnicos[tec].tot++;
        }
    }

    window.datosTallerGrafica = mix;

    if (document.getElementById('mix-mant')) document.getElementById('mix-mant').innerText = mix.mant;
    if (document.getElementById('mix-rep')) document.getElementById('mix-rep').innerText = mix.rep;
    if (document.getElementById('mix-diag')) document.getElementById('mix-diag').innerText = mix.diag;

    let htmlTec = `<table>
        <thead>
            <tr>
                <th style="text-align:left;">Técnico</th>
                <th>Mant</th>
                <th>Mant+Diag</th>
                <th>Rep</th>
                <th>Diag</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>`;

    const tKeys = Object.keys(tecnicos);
    if (tKeys.length === 0) {
        htmlTec += `<tr><td colspan="6" style="padding:18px; color:var(--texto-secundario);">Sin trabajos en este periodo.</td></tr>`;
    } else {
        Object.entries(tecnicos)
            .sort((a, b) => b[1].tot - a[1].tot)
            .forEach(([t, data]) => {
                htmlTec += `<tr>
                    <td style="text-align:left; font-weight:700;">${window.escapeHTML(t)}</td>
                    <td style="font-weight:600;">${data.m}</td>
                    <td style="color:var(--color-alerta); font-weight:600;">${data.md}</td>
                    <td style="color:var(--color-error); font-weight:600;">${data.r}</td>
                    <td style="color:var(--color-ok); font-weight:600;">${data.d}</td>
                    <td style="font-weight:700; background:var(--fondo-pagina);">${data.tot}</td>
                </tr>`;
            });
    }
    htmlTec += `</tbody></table>`;

    const contTec = document.getElementById('taller-tecnicos-container');
    if (contTec) contTec.innerHTML = htmlTec;

    if (typeof window.actualizarGraficas === 'function') window.actualizarGraficas();
};
// #endregion

// #endregion

// #region 4. INICIALIZACIÓN Y EVENTOS GLOBALES
document.addEventListener("DOMContentLoaded", () => {
    const elMes = document.getElementById('select-mes');
    const elAnio = document.getElementById('select-anio');
    const inputDesde = document.getElementById('taller-fecha-desde');
    const inputHasta = document.getElementById('taller-fecha-hasta');

    const refrescarPeriodo = () => {
        window.escucharRefaccionesEnVivo();
        window.cargarAccesoriosEnVivo();
        window.establecerFechasDefaultTaller();
    };

    if (elMes) elMes.addEventListener('change', refrescarPeriodo);
    if (elAnio) elAnio.addEventListener('change', refrescarPeriodo);
    if (inputDesde) inputDesde.addEventListener('change', window.procesarDatosTaller);
    if (inputHasta) inputHasta.addEventListener('change', window.procesarDatosTaller);

    if (window.appPython) {
        window.appPython.database().ref('kpi_taller').on('value', snap => {
            window.datosTallerRaw = snap.val() || {};
            window.procesarDatosTaller();
        }, (err) => console.error("Error leyendo kpi_taller:", err));
    }

    setTimeout(refrescarPeriodo, 400);
});
// #endregion
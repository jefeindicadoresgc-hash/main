// #region 1. VARIABLES GLOBALES DE ASESORES Y CITAS
window.datosCitasRaw = {};
window.citasReagendadasArray = [];
window.citasPerdidasArray = [];
window.datosAsesoresLive = null;
window.datosAsesoresGrafica = { labels: [], objetivos: [], ventas: [] };

function esMesActualSeleccionado() {
    const hoy = new Date();
    const mesHoy = String(hoy.getMonth() + 1).padStart(2, '0');
    const anioHoy = String(hoy.getFullYear());
    const mesSel = document.getElementById('select-mes')?.value;
    const anioSel = document.getElementById('select-anio')?.value;
    return mesSel === mesHoy && anioSel === anioHoy;
}
// #endregion

// #region 2. MÓDULO ASESORES Y COMISIONES (FIRESTORE)

// #region 2.1 CONSTRUCCIÓN DE LAS 4 TABLAS DE ASESORES
window.construirTablasAsesores = function () {
    const kpiData = window.datosAsesores?.kpi_data || {};
    const caratula = window.datosAsesores?.caratula || {};
    const kpiConfig = window.datosAsesores?.kpi_config || {};
    const servicios = window.datosAsesores?.servicios || {};
    const historial = window.datosAsesores?.historial || {};

    const listaAsesores = Object.keys(kpiData);

    let ultimaFecha = "ESPERANDO DATOS...";
    const fechas = [];
    Object.values(historial).forEach(h => { if (h && h.fecha) fechas.push(String(h.fecha)); });
    if (fechas.length > 0) ultimaFecha = fechas.sort().reverse()[0];

    const labelFecha = document.getElementById('asesores-fecha-act');
    if (labelFecha) labelFecha.innerText = "ÚLTIMA SINCRONIZACIÓN: " + ultimaFecha;

    if (listaAsesores.length === 0) {
        window.datosAsesoresGrafica = { labels: [], objetivos: [], ventas: [] };
        if (typeof window.actualizarGraficas === 'function') window.actualizarGraficas();
        return;
    }

    // Tabla 1: Objetivo de Ventas
    const gLabels = [], gObjs = [], gVentas = [];
    let htmlVentas = `<table><thead><tr><th style="text-align:left;">Asesor</th><th>Objetivo</th><th>Venta</th><th>Alcance</th></tr></thead><tbody>`;

    listaAsesores.forEach(asesor => {
        const datosC = caratula[asesor] || {};
        const obj = window.parseNumero(datosC.objetivo);
        const ven = window.parseNumero(datosC.venta);
        const alc = obj > 0 ? (ven / obj) * 100 : 0;
        const colorAlc = alc >= 100 ? 'var(--color-ok)' : 'var(--color-error)';

        gLabels.push(asesor);
        gObjs.push(obj);
        gVentas.push(ven);

        htmlVentas += `<tr>
            <td style="text-align:left; font-weight:700;">${window.escapeHTML(asesor)}</td>
            <td>${window.mxnFormat.format(obj)}</td>
            <td style="font-weight:600;">${window.mxnFormat.format(ven)}</td>
            <td style="color:${colorAlc}; font-weight:700;">${alc.toFixed(1)}%</td>
        </tr>`;
    });
    htmlVentas += `</tbody></table>`;
    window.datosAsesoresGrafica = { labels: gLabels, objetivos: gObjs, ventas: gVentas };

    const divVentas = document.getElementById('asesores-ventas-objetivos');
    if (divVentas) divVentas.innerHTML = htmlVentas;

    // Tabla 2: Objetivos y KPIs (Refacciones)
    let htmlKPI = `<table><thead><tr><th style="text-align:left;">Concepto</th><th>Total</th>`;
    listaAsesores.forEach(a => htmlKPI += `<th>${window.escapeHTML(a)}</th>`);
    htmlKPI += `<th>Objetivo</th><th>Dif.</th></tr></thead><tbody>`;

    let sumaGranTotal = 0, sumaGranObjetivo = 0, sumaGranDiferencia = 0;
    const sumasAsesoresKPI = {};
    listaAsesores.forEach(a => sumasAsesoresKPI[a] = 0);

    for (const [concepto, metaRaw] of Object.entries(kpiConfig)) {
        const meta = window.parseNumero(metaRaw);
        let totalFila = 0;
        let celdasAsesores = "";

        listaAsesores.forEach(asesor => {
            const valor = window.parseNumero(kpiData[asesor]?.[concepto]);
            totalFila += valor;
            sumasAsesoresKPI[asesor] += valor;
            celdasAsesores += `<td>${valor}</td>`;
        });

        const diferencia = totalFila - meta;
        const colorDif = diferencia < 0 ? 'var(--color-error)' : 'var(--color-ok)';
        sumaGranTotal += totalFila;
        sumaGranObjetivo += meta;
        sumaGranDiferencia += diferencia;

        htmlKPI += `<tr>
            <td style="text-align:left; font-weight:600;">${window.escapeHTML(concepto)}</td>
            <td style="font-weight:700;">${totalFila}</td>
            ${celdasAsesores}
            <td style="background:var(--fondo-pagina); font-weight:600;">${meta}</td>
            <td style="color:${colorDif}; font-weight:700;">${diferencia > 0 ? '+' + diferencia : diferencia}</td>
        </tr>`;
    }

    const colorTotalDif = sumaGranDiferencia < 0 ? 'var(--color-error)' : 'var(--color-ok)';
    const celdasTotalesAsesores = listaAsesores.map(a => `<td>${sumasAsesoresKPI[a]}</td>`).join('');

    htmlKPI += `<tr class="row-total">
        <td style="text-align:left;">TOTALES</td>
        <td>${sumaGranTotal}</td>
        ${celdasTotalesAsesores}
        <td>${sumaGranObjetivo}</td>
        <td style="color:${colorTotalDif};">${sumaGranDiferencia > 0 ? '+' + sumaGranDiferencia : sumaGranDiferencia}</td>
    </tr></tbody></table>`;

    const divKpi = document.getElementById('asesores-kpi-refacciones');
    if (divKpi) divKpi.innerHTML = htmlKPI;

    // Tabla 3: Desglose de Comisiones
    let htmlPagos = `<table><thead><tr><th style="text-align:left;">Asesor</th><th>Wurth</th><th>Sábana</th><th>Total</th></tr></thead><tbody>`;

    listaAsesores.forEach(asesor => {
        let pagoWurth = 0;
        const conceptosAsesor = kpiData[asesor] || {};
        for (const [concepto, cantidadRaw] of Object.entries(conceptosAsesor)) {
            const cantidad = window.parseNumero(cantidadRaw);
            const nombreLimpio = String(concepto).trim().toUpperCase();
            if (nombreLimpio.includes("ESTETICA EXTERIOR")) pagoWurth += (cantidad * 25);
            else if (nombreLimpio.includes("KIT")) pagoWurth += (cantidad * 50);
        }
        const pagoSabana = window.parseNumero(caratula[asesor]?.comision);
        const pagoTotal = pagoWurth + pagoSabana;

        htmlPagos += `<tr>
            <td style="text-align:left; font-weight:700;">${window.escapeHTML(asesor)}</td>
            <td>${window.mxnFormat.format(pagoWurth)}</td>
            <td style="color:var(--texto-secundario);">${window.mxnFormat.format(pagoSabana)}</td>
            <td style="color:var(--color-ok); font-weight:700; background:var(--fondo-pagina);">${window.mxnFormat.format(pagoTotal)}</td>
        </tr>`;
    });
    htmlPagos += `</tbody></table>`;

    const divPagos = document.getElementById('asesores-pagos-totales');
    if (divPagos) divPagos.innerHTML = htmlPagos;

    // Tabla 4: Cantidad de Servicios
    let htmlServ = `<table><thead><tr><th style="text-align:left;">Servicios</th>`;
    listaAsesores.forEach(a => htmlServ += `<th>${window.escapeHTML(a)}</th>`);
    htmlServ += `<th>Total</th></tr></thead><tbody>`;

    const categoriasServicios = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100 o más"];
    const sumasColumnas = {};
    listaAsesores.forEach(a => sumasColumnas[a] = 0);
    let sumaGlobalServicios = 0;

    categoriasServicios.forEach(cat => {
        let totalFila = 0;
        let celdas = "";
        listaAsesores.forEach(asesor => {
            const cant = Math.round(window.parseNumero(servicios[asesor]?.[cat]));
            totalFila += cant;
            sumasColumnas[asesor] += cant;
            celdas += `<td>${cant}</td>`;
        });
        sumaGlobalServicios += totalFila;
        htmlServ += `<tr>
            <td style="text-align:left; font-weight:600;">${cat}</td>
            ${celdas}
            <td style="font-weight:700; background:var(--fondo-pagina);">${totalFila}</td>
        </tr>`;
    });

    const celdasTotalesServ = listaAsesores.map(a => `<td>${sumasColumnas[a]}</td>`).join('');
    htmlServ += `<tr class="row-total">
        <td style="text-align:left;">TOTALES</td>
        ${celdasTotalesServ}
        <td>${sumaGlobalServicios}</td>
    </tr></tbody></table>`;

    const divServ = document.getElementById('asesores-cantidad-servicios');
    if (divServ) divServ.innerHTML = htmlServ;

    window.totalServiciosAsesores = sumaGlobalServicios;
    if (typeof window.calcularRetencion === 'function') window.calcularRetencion();
    if (typeof window.actualizarGraficas === 'function') window.actualizarGraficas();
};
// #endregion

// #endregion

// #region 3. MÓDULO CITAS, NO SHOW Y RETENCIÓN

// #region 3.1 PROCESAMIENTO DE CITAS Y MOTIVOS NO SHOW
window.procesarDatosCitas = function () {
    const mes = document.getElementById('select-mes')?.value || '01';
    const anio = document.getElementById('select-anio')?.value || '2026';
    const dia = document.getElementById('select-dia-citas')?.value || 'ALL';

    let totCitas = 0, totNoShow = 0;
    window.citasReagendadasArray = [];
    window.citasPerdidasArray = [];
    const motivosCount = {};

    Object.values(window.datosCitasRaw || {}).forEach(cita => {
        if (!cita || !cita.Fecha) return;
        const parts = String(cita.Fecha).split('/');
        if (parts.length < 3) return;

        const cDia = parts[0].trim().padStart(2, '0');
        const cMes = parts[1].trim().padStart(2, '0');
        const cAnio = parts[2].trim();

        if (cMes === mes && cAnio === anio) {
            if (dia === 'ALL' || cDia === dia) {
                totCitas++;
                const asistio = String(cita.asistio || '').toLowerCase().trim();
                if (asistio === 'no') {
                    totNoShow++;
                    const reagendo = String(cita.reagendo || '').toLowerCase().trim();
                    if (reagendo === 'sí' || reagendo === 'si' || reagendo === 'yes') {
                        window.citasReagendadasArray.push(cita);
                    } else {
                        window.citasPerdidasArray.push(cita);
                    }
                    const mot = String(cita.motivo || 'No Especificado').trim();
                    motivosCount[mot] = (motivosCount[mot] || 0) + 1;
                }
            }
        }
    });

    if (document.getElementById('taller-citas-tot')) document.getElementById('taller-citas-tot').innerText = totCitas;
    if (document.getElementById('taller-noshow-tot')) document.getElementById('taller-noshow-tot').innerText = totNoShow;
    if (document.getElementById('taller-reagendadas')) document.getElementById('taller-reagendadas').innerText = window.citasReagendadasArray.length;
    if (document.getElementById('taller-perdidas')) document.getElementById('taller-perdidas').innerText = window.citasPerdidasArray.length;

    // Sincronización con KPI Ejecutivo (Dashboard)
    const pctNoShow = totCitas > 0 ? (totNoShow / totCitas) * 100 : 0;
    const elDashPct = document.getElementById('dash-noshow-pct');
    if (elDashPct) {
        elDashPct.innerText = pctNoShow.toFixed(1) + '%';
        elDashPct.style.color = pctNoShow > 5 ? 'var(--color-error)' : 'var(--color-ok)';
    }
    const elDashTot = document.getElementById('dash-citas-tot');
    if (elDashTot) elDashTot.innerText = `${totCitas} citas (${totNoShow} No Show)`;

    let htmlMotivos = `<table><thead><tr><th style="text-align:left;">Motivo de No Show</th><th style="width:90px;">Cantidad</th></tr></thead><tbody>`;
    const mKeys = Object.keys(motivosCount);
    if (mKeys.length === 0) {
        htmlMotivos += `<tr><td colspan="2" style="padding:18px; color:var(--texto-secundario);">No hay incidencias registradas.</td></tr>`;
    } else {
        Object.entries(motivosCount)
            .sort((a, b) => b[1] - a[1])
            .forEach(([mot, count]) => {
                htmlMotivos += `<tr>
                    <td style="text-align:left; font-weight:600;">${window.escapeHTML(mot)}</td>
                    <td style="color:var(--color-error); font-weight:700;">${count}</td>
                </tr>`;
            });
    }
    htmlMotivos += `</tbody></table>`;

    const contMot = document.getElementById('taller-motivos-container');
    if (contMot) contMot.innerHTML = htmlMotivos;
};
// #endregion

// #region 3.2 MODAL DETALLE DE CITAS (REAGENDADAS / PERDIDAS)
window.mostrarDetalleCitas = function (tipo) {
    const arr = tipo === 'reagendadas' ? window.citasReagendadasArray : window.citasPerdidasArray;
    const titulo = tipo === 'reagendadas' ? 'Citas Reagendadas' : 'Citas Perdidas Definitivas';
    const tituloEl = document.getElementById('modal-titulo');
    if (tituloEl) tituloEl.innerText = titulo;

    let html = "";
    if (!arr || arr.length === 0) {
        html = `<tr><td colspan="5" style="padding:20px; color:var(--texto-secundario);">No hay clientes en esta categoría para la fecha seleccionada.</td></tr>`;
    } else {
        arr.forEach(c => {
            const cliente = c.Cliente || c.cliente || c.Nombre || c.nombre || "SIN REGISTRO";
            const telefono = c.Telefono || c.telefono || c.celular || c.Placas || "SIN REGISTRO";
            const vehiculo = c.Vehiculo || c.vehiculo || c.Unidad || c.unidad || c.modelo || "SIN REGISTRO";
            const fechaOrig = c.Fecha || "SIN FECHA";
            const motivo = c.motivo || "No especificado";

            html += `<tr>
                <td style="text-align:left; font-weight:700;">${window.escapeHTML(cliente)}</td>
                <td>${window.escapeHTML(telefono)}</td>
                <td style="color:var(--texto-secundario);">${window.escapeHTML(vehiculo)}</td>
                <td>${window.escapeHTML(fechaOrig)}</td>
                <td style="color:var(--color-error); font-weight:600;">${window.escapeHTML(motivo)}</td>
            </tr>`;
        });
    }

    const tbody = document.getElementById('modal-tbody');
    if (tbody) tbody.innerHTML = html;
    const modal = document.getElementById('citas-modal');
    if (modal) modal.style.display = 'flex';
};
// #endregion

// #region 3.3 CALCULADORA DE RETENCIÓN Y CAPACIDAD
window.calcularRetencion = function () {
    const diasLV = window.parseNumero(document.getElementById('ret-dias-lv')?.value);
    const diasSab = window.parseNumero(document.getElementById('ret-dias-sab')?.value);
    const tecnicos = window.parseNumero(document.getElementById('ret-tecnicos')?.value);
    const objMant = window.parseNumero(document.getElementById('ret-obj-mant')?.value);
    const objOrd = window.parseNumero(document.getElementById('ret-obj-ord')?.value);

    localStorage.setItem('spiderRetencionConfig', JSON.stringify({
        lv: diasLV, sab: diasSab, tec: tecnicos, om: objMant, oo: objOrd
    }));

    const totalDiasTaller = diasLV + diasSab;
    const objDiario = totalDiasTaller > 0 ? (objMant / totalDiasTaller) : 0;
    const horasTotales = ((diasLV * 8.5) + (diasSab * 5.5)) * tecnicos;

    const mantReales = window.parseNumero(window.totalServiciosAsesores);
    const ordReales = window.objOrdenesFacturadas ? window.parseNumero(window.objOrdenesFacturadas['Normal']) : 0;

    const alcMant = objMant > 0 ? (mantReales / objMant) * 100 : 0;
    const alcOrd = objOrd > 0 ? (ordReales / objOrd) * 100 : 0;

    if (document.getElementById('ret-mant-real')) document.getElementById('ret-mant-real').innerText = mantReales;
    if (document.getElementById('ret-alcance-mant')) {
        document.getElementById('ret-alcance-mant').innerText = alcMant.toFixed(1) + "%";
        document.getElementById('ret-alcance-mant').style.color = alcMant >= 100 ? 'var(--color-ok)' : 'var(--color-error)';
    }

    if (document.getElementById('ret-ord-real')) document.getElementById('ret-ord-real').innerText = ordReales;
    if (document.getElementById('ret-alcance-ord')) {
        document.getElementById('ret-alcance-ord').innerText = alcOrd.toFixed(1) + "%";
        document.getElementById('ret-alcance-ord').style.color = alcOrd >= 100 ? 'var(--color-ok)' : 'var(--color-error)';
    }

    if (document.getElementById('ret-obj-diario')) document.getElementById('ret-obj-diario').innerText = objDiario.toFixed(1);
    if (document.getElementById('ret-hrs-disp')) document.getElementById('ret-hrs-disp').innerText = horasTotales.toFixed(1) + " Hrs Disp.";
};
// #endregion

// #endregion

// #region 4. INICIALIZACIÓN Y LISTENERS EN TIEMPO REAL
document.addEventListener("DOMContentLoaded", () => {
    const selectDia = document.getElementById('select-dia-citas');
    const elMes = document.getElementById('select-mes');
    const elAnio = document.getElementById('select-anio');

    if (selectDia) selectDia.addEventListener('change', window.procesarDatosCitas);
    if (elMes) elMes.addEventListener('change', window.procesarDatosCitas);
    if (elAnio) elAnio.addEventListener('change', window.procesarDatosCitas);

    if (window.appPython) {
        window.appPython.database().ref('citas_diarias').on('value', snap => {
            window.datosCitasRaw = snap.val() || {};
            window.procesarDatosCitas();
        }, (err) => console.error("Error leyendo citas_diarias:", err));
    }

    if (window.dbFirestore) {
        window.dbFirestore.collection('comisiones_app').onSnapshot((snapshot) => {
            if (snapshot.empty) return;
            const live = { caratula: {}, kpi_config: {}, kpi_data: {}, servicios: {}, historial: {} };
            snapshot.forEach(doc => {
                if (doc.id === 'datos_caratula') live.caratula = doc.data().datos || {};
                if (doc.id === 'kpi_config') live.kpi_config = doc.data().datos || {};
                if (doc.id === 'kpi_data') live.kpi_data = doc.data().datos || {};
                if (doc.id === 'servicios_data') live.servicios = doc.data().datos || {};
                if (doc.id === 'historial_auditorias') live.historial = doc.data().datos || {};
            });
            window.datosAsesoresLive = live;

            if (esMesActualSeleccionado()) {
                window.datosAsesores = live;
                window.construirTablasAsesores();
            }
        }, (error) => console.error("Error al leer Firestore Asesores:", error));
    }

    const conf = window.safeJSONParse(localStorage.getItem('spiderRetencionConfig'), null);
    if (conf) {
        if (document.getElementById('ret-dias-lv') && conf.lv !== undefined) document.getElementById('ret-dias-lv').value = conf.lv;
        if (document.getElementById('ret-dias-sab') && conf.sab !== undefined) document.getElementById('ret-dias-sab').value = conf.sab;
        if (document.getElementById('ret-tecnicos') && conf.tec !== undefined) document.getElementById('ret-tecnicos').value = conf.tec;
        if (document.getElementById('ret-obj-mant') && conf.om !== undefined) document.getElementById('ret-obj-mant').value = conf.om;
        if (document.getElementById('ret-obj-ord') && conf.oo !== undefined) document.getElementById('ret-obj-ord').value = conf.oo;
    }

    setTimeout(window.calcularRetencion, 800);
});
// #endregion
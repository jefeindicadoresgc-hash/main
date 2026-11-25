// #region 1. VARIABLES GLOBALES DE RENTABILIDAD Y ÓRDENES
window.objAnioPasado = {};
window.objFilaMemoria = {};
window.objOrdenesFacturadas = {};
window.ordenesNormalesCount = 0;
window.ultimoExcelOrdenes = null;
// #endregion

// #region 2. TELEMETRÍA DE ÓRDENES AL DÍA (FIREBASE EN VIVO)

// #region 2.1 LISTENERS DE NOTAS Y EXCEL COMPARTIDO
document.addEventListener("DOMContentLoaded", () => {
    if (!window.database) return;

    window.database.ref('notas').on('value', (snapshot) => {
        window.DB_NOTAS_COMPARTIDAS = snapshot.val() || {};
        if (window.ultimoExcelOrdenes) {
            window.analizarDatos(window.ultimoExcelOrdenes);
        }
    }, (err) => console.error("Error leyendo notas:", err));

    window.database.ref('excel_compartido').on('value', (snapshot) => {
        const datosEnNube = snapshot.val();
        const statusEl = document.getElementById('sync-status');

        if (datosEnNube && datosEnNube.datos_json) {
            const excelData = window.safeJSONParse(datosEnNube.datos_json, null);
            if (Array.isArray(excelData)) {
                window.ultimoExcelOrdenes = excelData;
                if (statusEl) statusEl.innerText = `● En línea (Última carga: ${datosEnNube.fecha_subida || 'Reciente'})`;
                window.analizarDatos(excelData);
            } else if (statusEl) {
                statusEl.innerText = "○ Formato de datos inválido en la nube.";
            }
        } else if (statusEl) {
            statusEl.innerText = "○ Esperando datos del equipo...";
        }
    }, (err) => console.error("Error leyendo excel_compartido:", err));
});
// #endregion

// #region 2.2 ANÁLISIS Y RENDERIZADO DE TABLA ÓRDENES AL DÍA
window.analizarDatos = function (datos) {
    if (!Array.isArray(datos)) return;

    const secciones = {
        'S': { titulo: 'SEMINUEVOS', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 },
        'A': { titulo: 'SINIESTROS', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 },
        'N': { titulo: 'NORMALES', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 },
        'V': { titulo: 'VENTAS', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 },
        'I': { titulo: 'INTERNAS', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 },
        'G': { titulo: 'GARANTÍAS', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 }
    };

    const global = { total: 0, ok: 0, warn: 0, alert: 0, bo: 0, dinero: 0, dineroOk: 0, dineroWarn: 0, dineroAlert: 0, dineroBO: 0 };

    datos.forEach(fila => {
        if (!fila) return;
        const orden = String(fila['Orden'] || "").trim().toUpperCase();
        if (orden.length <= 1) return;
        const sec = secciones[orden.charAt(0)];
        if (!sec) return;

        const nota = (window.DB_NOTAS_COMPARTIDAS && window.DB_NOTAS_COMPARTIDAS[orden]) || {};
        const estatusFiltro = nota.comentario ? String(nota.comentario).trim().toUpperCase() : "";
        const dias = window.parseNumero(fila['Dias']);
        const importe = window.parseNumero(fila['Importe  S/iva '] ?? fila['Importe S/iva'] ?? 0);

        const esBO = (estatusFiltro === "BO");
        const semaforo = esBO ? 'bo' : (dias >= 30 ? 'rojo' : (dias >= 15 ? 'amarillo' : 'verde'));

        sec.ordenes++; sec.total += importe;
        global.total++; global.dinero += importe;

        if (semaforo === 'bo') { sec.countBO++; sec.moneyBO += importe; global.bo++; global.dineroBO += importe; }
        else if (semaforo === 'rojo') { sec.countAlert++; sec.moneyAlert += importe; global.alert++; global.dineroAlert += importe; }
        else if (semaforo === 'amarillo') { sec.countWarn++; sec.moneyWarn += importe; global.warn++; global.dineroWarn += importe; }
        else { sec.countOk++; sec.moneyOk += importe; global.ok++; global.dineroOk += importe; }
    });

    window.ordenesNormalesCount = secciones['N'].ordenes;
    if (typeof window.calcularRetencion === 'function') window.calcularRetencion();

    window.renderizarTablaTelemetria(secciones, global);
};

window.renderizarTablaTelemetria = function (secciones, global) {
    const cont = document.getElementById('tabla-resumen-container');
    if (!cont) return;

    let html = `<table>
        <thead>
            <tr>
                <th style="text-align:left;">Departamento</th>
                <th>&lt; 15 Días</th>
                <th>15-29 Días</th>
                <th>≥ 30 Días</th>
                <th>Back Order</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>`;

    ['A', 'S', 'N', 'V', 'G', 'I'].forEach(k => {
        const sec = secciones[k];
        if (sec.ordenes > 0) {
            html += `<tr>
                <td style="text-align:left; font-weight:700;">${sec.titulo}</td>
                <td style="color:var(--color-ok); font-weight:700;">${sec.countOk}<br><span style="color:var(--texto-secundario); font-size:0.72rem; font-weight:500;">${window.mxnFormat.format(sec.moneyOk)}</span></td>
                <td style="color:var(--color-alerta); font-weight:700;">${sec.countWarn}<br><span style="color:var(--texto-secundario); font-size:0.72rem; font-weight:500;">${window.mxnFormat.format(sec.moneyWarn)}</span></td>
                <td style="color:var(--color-error); font-weight:700;">${sec.countAlert}<br><span style="color:var(--texto-secundario); font-size:0.72rem; font-weight:500;">${window.mxnFormat.format(sec.moneyAlert)}</span></td>
                <td style="color:var(--color-info); font-weight:700;">${sec.countBO}<br><span style="color:var(--texto-secundario); font-size:0.72rem; font-weight:500;">${window.mxnFormat.format(sec.moneyBO)}</span></td>
                <td style="font-weight:700;">${sec.ordenes}<br><span style="color:var(--texto-secundario); font-size:0.75rem; font-weight:500;">${window.mxnFormat.format(sec.total)}</span></td>
            </tr>`;
        }
    });

    html += `<tr class="row-total">
        <td style="text-align:left;">TOTAL AGENCIA</td>
        <td>${global.ok}</td>
        <td>${global.warn}</td>
        <td style="color:var(--color-error);">${global.alert}</td>
        <td style="color:var(--color-info);">${global.bo}</td>
        <td>${global.total}<br><span style="font-size:0.76rem; font-weight:600;">${window.mxnFormat.format(global.dinero)}</span></td>
    </tr></tbody></table>`;

    cont.innerHTML = html;
};
// #endregion

// #endregion

// #region 3. CARGA DE ARCHIVOS EXCEL (VENTAS Y ÓRDENES FACTURADAS)

// #region 3.1 REPORTE DE VENTAS
window.procesarExcelVentas = function (event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: 0 });
            window.extraerDatosDeResumen(jsonRows);
        } catch (err) {
            console.error("Error leyendo Excel de ventas:", err);
            window.mostrarToast("No se pudo leer el archivo de ventas. Verifica el formato.");
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
};

window.extraerDatosDeResumen = function (rows) {
    let rowCabeceras = -1;
    for (let i = rows.length - 1; i >= 0; i--) {
        const filaTexto = (rows[i] || []).join(" ").toUpperCase();
        if (filaTexto.includes("NORMAL") && filaTexto.includes("TOTAL")) {
            rowCabeceras = i;
            break;
        }
    }

    if (rowCabeceras === -1 || !rows[rowCabeceras + 1] || !rows[rowCabeceras + 2]) {
        window.mostrarToast("No se encontró la sección de Totales al final del Excel.");
        return;
    }

    const headers = rows[rowCabeceras];
    const ventasRow = rows[rowCabeceras + 1];
    const costosRow = rows[rowCabeceras + 2];

    const buscarCol = (nombre) => headers.findIndex(c => String(c || "").toUpperCase().includes(nombre));
    const seccionesInfo = [
        { nombre: 'Aseguradoras', idx: buscarCol("ASEGURADORA") },
        { nombre: 'Garantías', idx: buscarCol("GARANTIA") },
        { nombre: 'Normal', idx: buscarCol("NORMAL") },
        { nombre: 'Previas', idx: buscarCol("PREVIA") },
        { nombre: 'Seminuevos', idx: buscarCol("SEMINUEVO") }
    ];

    let totalVentasC_IVA = 0;
    window.datosRentabilidad.items = [];

    seccionesInfo.forEach(sec => {
        if (sec.idx !== -1) {
            const ventaBruta = window.parseNumero(ventasRow[sec.idx]);
            const costo = window.parseNumero(costosRow[sec.idx]);
            totalVentasC_IVA += ventaBruta;
            const ventaSinIva = ventaBruta / 1.16;
            window.datosRentabilidad.items.push({
                nombre: sec.nombre,
                ventaBruta,
                costo,
                utilidad: (ventaSinIva - costo)
            });
        } else {
            window.datosRentabilidad.items.push({ nombre: sec.nombre, ventaBruta: 0, costo: 0, utilidad: 0 });
        }
    });

    window.datosRentabilidad.items.push({ nombre: 'Internas', ventaBruta: 0, costo: 0, utilidad: 0 });
    window.datosRentabilidad.totalGlobal = totalVentasC_IVA;
    window.calcularRentabilidad();
    window.mostrarToast("Reporte de ventas procesado.");
};
// #endregion

// #region 3.2 ÓRDENES FACTURADAS
window.procesarExcelOrdenesFacturadas = function (event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

            const conteo = { 'Aseguradoras': 0, 'Garantías': 0, 'Normal': 0, 'Previas': 0, 'Seminuevos': 0, 'Internas': 0 };
            for (let i = jsonRows.length - 1; i >= 0; i--) {
                const fila = jsonRows[i] || [];
                const col0 = String(fila[0] || "").toUpperCase();
                const val = Math.round(window.parseNumero(fila[1]) || window.parseNumero(fila[2]) || window.parseNumero(fila[3]));
                if (col0.includes("ASEGURADORA")) conteo['Aseguradoras'] = val;
                else if (col0.includes("GARANTIA") || col0.includes("GARANTÍA")) conteo['Garantías'] = val;
                else if (col0.includes("NORMAL")) conteo['Normal'] = val;
                else if (col0.includes("PREVIA")) conteo['Previas'] = val;
                else if (col0.includes("SEMINUEVO")) conteo['Seminuevos'] = val;
                else if (col0.includes("INTERNA")) conteo['Internas'] = val;
            }
            window.objOrdenesFacturadas = conteo;
            window.calcularRentabilidad();

            if (typeof window.calcularRetencion === 'function') window.calcularRetencion();
            window.mostrarToast("Órdenes facturadas cargadas.");
        } catch (err) {
            console.error("Error leyendo órdenes facturadas:", err);
            window.mostrarToast("No se pudo leer el archivo de órdenes facturadas.");
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
};
// #endregion

// #endregion

// #region 4. CÁLCULO DE RENTABILIDAD, RITMO Y ACTUALIZACIÓN DE KPIS
window.actualizarObjFila = function (el) {
    const seccion = el.getAttribute('data-seccion');
    window.objFilaMemoria[seccion] = window.parseNumero(el.value);

    const mes = document.getElementById('select-mes')?.value || '01';
    const anio = document.getElementById('select-anio')?.value || '2026';
    localStorage.setItem(`objFila_${anio}_${mes}`, JSON.stringify(window.objFilaMemoria));
    window.calcularRentabilidad();
};

window.actualizarAnioPasado = function (el) {
    const seccion = el.getAttribute('data-seccion');
    window.objAnioPasado[seccion] = Math.round(window.parseNumero(el.value));

    const mes = document.getElementById('select-mes')?.value || '01';
    const anio = document.getElementById('select-anio')?.value || '2026';
    localStorage.setItem(`anioPasado_${anio}_${mes}`, JSON.stringify(window.objAnioPasado));
    window.calcularRentabilidad();
};

window.calcularRentabilidad = function () {
    const objetivoMensual = window.parseNumero(document.getElementById('input-objetivo')?.value);
    const mes = document.getElementById('select-mes')?.value || '01';
    const anio = document.getElementById('select-anio')?.value || '2026';

    localStorage.setItem(`objetivo_${anio}_${mes}`, objetivoMensual);

    if (Object.keys(window.objFilaMemoria).length === 0) {
        window.objFilaMemoria = window.safeJSONParse(localStorage.getItem(`objFila_${anio}_${mes}`), {});
    }
    if (Object.keys(window.objAnioPasado).length === 0) {
        window.objAnioPasado = window.safeJSONParse(localStorage.getItem(`anioPasado_${anio}_${mes}`), {});
    }

    let html = "";
    let sumVentasS_IVA = 0, sumCostos = 0, sumUtilidad = 0;
    let sumOrdTotal = 0, sumAnioPasTotal = 0, sumObjFilaTotal = 0;

    if (window.datosRentabilidad && Array.isArray(window.datosRentabilidad.items) && window.datosRentabilidad.items.length > 0) {
        window.datosRentabilidad.items.forEach(item => {
            const ventaBruta = window.parseNumero(item.ventaBruta);
            const costo = window.parseNumero(item.costo);
            const utilidad = window.parseNumero(item.utilidad);
            const ventaSinIva = ventaBruta / 1.16;
            const participacion = window.datosRentabilidad.totalGlobal > 0 ? (ventaBruta / window.datosRentabilidad.totalGlobal) : 0;

            const objSeccion = window.parseNumero(window.objFilaMemoria[item.nombre]);
            sumObjFilaTotal += objSeccion;

            const alcance = objSeccion > 0 ? (ventaSinIva / objSeccion) * 100 : 0;
            sumVentasS_IVA += ventaSinIva;
            sumCostos += costo;
            sumUtilidad += utilidad;

            const colorAlcance = alcance >= 100 ? 'var(--color-ok)' : (alcance >= 50 ? 'var(--color-alerta)' : 'var(--color-error)');
            const ordVal = Math.round(window.parseNumero(window.objOrdenesFacturadas[item.nombre]));
            const anioPasVal = Math.round(window.parseNumero(window.objAnioPasado[item.nombre]));
            sumOrdTotal += ordVal;
            sumAnioPasTotal += anioPasVal;

            let colorOrd = 'var(--texto-principal)';
            if (ordVal > 0 || anioPasVal > 0) {
                colorOrd = ordVal >= anioPasVal ? 'var(--color-ok)' : 'var(--color-error)';
            }

            const nombreSeguro = window.escapeHTML(item.nombre);
            html += `<tr>
                <td style="text-align:left; font-weight:700;">${nombreSeguro}</td>
                <td>${window.mxnFormat.format(ventaSinIva)}</td>
                <td>${window.mxnFormat.format(costo)}</td>
                <td style="font-weight:700;">${window.mxnFormat.format(utilidad)}</td>
                <td>${(participacion * 100).toFixed(0)}%</td>
                <td><input type="number" data-seccion="${nombreSeguro}" value="${objSeccion}" onchange="window.actualizarObjFila(this)" style="width:110px;"></td>
                <td style="color:${colorAlcance}; font-weight:700;">${alcance.toFixed(0)}%</td>
                <td style="color:${colorOrd}; font-weight:700;">${ordVal}</td>
                <td><input type="number" class="anio-pas-input" data-seccion="${nombreSeguro}" value="${anioPasVal}" onchange="window.actualizarAnioPasado(this)" style="width:74px;"></td>
            </tr>`;
        });
    } else {
        html += `<tr><td colspan="9" style="padding:20px; color:var(--texto-secundario);">Sin datos de ventas para este mes. Mostrando solo utilidad de Refacciones.</td></tr>`;
    }

    const alcanceFilaGlobal = sumObjFilaTotal > 0 ? (sumVentasS_IVA / sumObjFilaTotal) * 100 : 0;

    html += `<tr class="row-total">
        <td style="text-align:left;">TOTALES</td>
        <td>${window.mxnFormat.format(sumVentasS_IVA)}</td>
        <td>${window.mxnFormat.format(sumCostos)}</td>
        <td>${window.mxnFormat.format(sumUtilidad)}</td>
        <td>100%</td>
        <td>${window.mxnFormat.format(sumObjFilaTotal)}</td>
        <td style="color:${alcanceFilaGlobal >= 100 ? 'var(--color-ok)' : 'var(--color-error)'};">${alcanceFilaGlobal.toFixed(0)}%</td>
        <td>${sumOrdTotal}</td>
        <td>${sumAnioPasTotal}</td>
    </tr>`;

    const tbody = document.getElementById('tbody-rentabilidad');
    if (tbody) tbody.innerHTML = html;

    sumUtilidad += window.parseNumero(window.utilidadMostrador);

    const alcanceRealTop = objetivoMensual > 0 ? (sumUtilidad / objetivoMensual) * 100 : 0;
    const faltanteRealTop = Math.max(0, objetivoMensual - sumUtilidad);

    // Cálculo de Meta Diaria y Utilidad Esperada al día de hoy
    const diasLV = window.parseNumero(document.getElementById('ret-dias-lv')?.value) || 22;
    const diasSab = window.parseNumero(document.getElementById('ret-dias-sab')?.value) || 4;
    const totalDiasMes = diasLV + diasSab;
    const metaDiaria = totalDiasMes > 0 ? (objetivoMensual / totalDiasMes) : 0;

    const mesObj = parseInt(mes, 10) - 1;
    const anioObj = parseInt(anio, 10);
    const hoy = new Date();
    let diasTranscurridos = 0;

    if (hoy.getFullYear() > anioObj || (hoy.getFullYear() === anioObj && hoy.getMonth() > mesObj)) {
        diasTranscurridos = totalDiasMes;
    } else if (hoy.getFullYear() < anioObj || (hoy.getFullYear() === anioObj && hoy.getMonth() < mesObj)) {
        diasTranscurridos = 0;
    } else {
        for (let d = 1; d <= hoy.getDate(); d++) {
            const diaCiclo = new Date(anioObj, mesObj, d);
            if (diaCiclo.getDay() !== 0) diasTranscurridos++;
        }
        if (diasTranscurridos > totalDiasMes) diasTranscurridos = totalDiasMes;
    }

    const ritmoActual = diasTranscurridos > 0 ? (sumUtilidad / diasTranscurridos) : 0;
    const utilidadEsperada = metaDiaria * diasTranscurridos;
    const colorRitmo = ritmoActual >= metaDiaria ? 'var(--color-ok)' : 'var(--color-error)';

    // Inyección en vista Rentabilidad
    if (document.getElementById('kpi-utilidad')) document.getElementById('kpi-utilidad').innerText = window.mxnFormat.format(sumUtilidad);
    if (document.getElementById('kpi-alcance')) document.getElementById('kpi-alcance').innerText = alcanceRealTop.toFixed(1) + "%";
    if (document.getElementById('kpi-faltante')) document.getElementById('kpi-faltante').innerText = window.mxnFormat.format(faltanteRealTop);
    if (document.getElementById('kpi-ritmo')) {
        document.getElementById('kpi-ritmo').innerText = window.mxnFormat.format(ritmoActual) + ' / Día';
        document.getElementById('kpi-ritmo').style.color = colorRitmo;
    }
    if (document.getElementById('kpi-meta-diaria')) document.getElementById('kpi-meta-diaria').innerText = 'META DIARIA: ' + window.mxnFormat.format(metaDiaria);
    if (document.getElementById('kpi-utilidad-esperada')) document.getElementById('kpi-utilidad-esperada').innerText = 'ESPERADO: ' + window.mxnFormat.format(utilidadEsperada);

    // Sincronización con KPI Ejecutivo (Dashboard)
    if (document.getElementById('dash-utilidad')) document.getElementById('dash-utilidad').innerText = window.mxnFormat.format(sumUtilidad);
    if (document.getElementById('dash-utilidad-esp')) document.getElementById('dash-utilidad-esp').innerText = 'Esperado: ' + window.mxnFormat.format(utilidadEsperada);
    if (document.getElementById('dash-alcance')) {
        document.getElementById('dash-alcance').innerText = alcanceRealTop.toFixed(1) + "%";
        document.getElementById('dash-alcance').style.color = alcanceRealTop >= 100 ? 'var(--color-ok)' : 'var(--texto-principal)';
    }
    if (document.getElementById('dash-ritmo')) document.getElementById('dash-ritmo').innerText = 'Ritmo: ' + window.mxnFormat.format(ritmoActual) + ' / día';

    if (typeof window.actualizarGraficas === 'function') window.actualizarGraficas();
};
// #endregion

// #region 5. EXPORTACIÓN COMPLETA A EXCEL (EXCELJS · SOPORTE PESTAÑAS OCULTAS)
function extraerTextoCeldaSeguro(cell) {
    const input = cell.querySelector('input');
    if (input) return input.value;
    const clon = cell.cloneNode(true);
    clon.querySelectorAll('br').forEach(br => br.replaceWith(' | '));
    return (clon.textContent || '').replace(/\s+/g, ' ').trim();
}

window.exportarTodoAExcel = async function () {
    if (typeof ExcelJS === 'undefined') {
        window.mostrarToast("Cargando motor de Excel. Intenta en unos segundos.");
        return;
    }

    const selectMes = document.getElementById('select-mes');
    const mesTxt = selectMes ? selectMes.options[selectMes.selectedIndex].text : "";
    const anioTxt = document.getElementById('select-anio')?.value || "";

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte KPI', { views: [{ showGridLines: false }] });
    sheet.columns = [
        { width: 26 }, { width: 16 }, { width: 16 }, { width: 16 },
        { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 }
    ];

    function addSectionTitle(titleStr) {
        const titleRow = sheet.addRow([titleStr.toUpperCase()]);
        titleRow.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF181818' } };
        titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.mergeCells(`A${titleRow.number}:I${titleRow.number}`);
        sheet.addRow([]);
    }

    function extractTableToSheet(tableElement) {
        const table = typeof tableElement === 'string' ? document.querySelector(tableElement) : tableElement;
        if (!table) { sheet.addRow(["Sin datos"]); sheet.addRow([]); return; }

        table.querySelectorAll('tr').forEach((tr) => {
            const rowData = [];
            tr.querySelectorAll('th, td').forEach(cell => rowData.push(extraerTextoCeldaSeguro(cell)));
            const excelRow = sheet.addRow(rowData);
            const textoFila = rowData.join(' ').toUpperCase();

            if (tr.closest('thead')) {
                excelRow.font = { bold: true, color: { argb: 'FF181818' } };
                excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECE8DC' } };
            } else if (tr.classList.contains('row-total') || textoFila.includes('TOTALES') || textoFila.includes('TOTAL ACUMULADO') || textoFila.includes('TOTAL AGENCIA')) {
                excelRow.font = { bold: true, color: { argb: 'FF181818' } };
                excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFD9C8' } };
            } else {
                excelRow.border = { bottom: { style: 'thin', color: { argb: 'FFE5E1D5' } } };
            }
        });
        sheet.addRow([]);
    }

    addSectionTitle(`REPORTE KPI HYUNDAI COATZACOALCOS - ${mesTxt} ${anioTxt}`);
    addSectionTitle("1. Rentabilidad General");
    extractTableToSheet('#tabla-rentabilidad');

    addSectionTitle("2. Refacciones (Compras y Ventas)");
    const tablasManuales = document.querySelectorAll('.manual-table');
    if (tablasManuales.length > 0) extractTableToSheet(tablasManuales[0]);
    if (tablasManuales.length > 1) extractTableToSheet(tablasManuales[1]);

    addSectionTitle("3. Asesores y Comisiones");
    const divAsesores = document.querySelector('.asesores-content-container');
    if (divAsesores) {
        divAsesores.querySelectorAll('table').forEach(t => extractTableToSheet(t));
    }

    addSectionTitle("4. Órdenes al Día");
    extractTableToSheet('#tabla-resumen-container table');

    addSectionTitle("5. Venta de Accesorios");
    extractTableToSheet('#tabla-accesorios-container table');

    addSectionTitle("6. Citas (Motivos No Show)");
    extractTableToSheet('#taller-motivos-container table');

    addSectionTitle("7. Taller (Rendimiento Técnico)");
    extractTableToSheet('#taller-tecnicos-container table');

    try {
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Reporte_KPI_Hyundai_${mesTxt}_${anioTxt}.xlsx`);
        window.mostrarToast("Excel exportado correctamente.");
    } catch (e) {
        console.error("Error al generar Excel:", e);
        window.mostrarToast("Error al exportar Excel.");
    }
};
// #endregion
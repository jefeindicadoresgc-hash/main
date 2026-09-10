// =========================================================
// ARCHIVO: rentabilidad.js - RENTABILIDAD Y ÓRDENES
// =========================================================

window.objAnioPasado = {}; 
window.objOrdenesFacturadas = {}; 

document.addEventListener("DOMContentLoaded", () => {
    window.database.ref('notas').on('value', (snapshot) => {
        window.DB_NOTAS_COMPARTIDAS = snapshot.val() || {};
    });

    window.database.ref('excel_compartido').on('value', (snapshot) => {
        let datosEnNube = snapshot.val();
        if (datosEnNube && datosEnNube.datos_json) {
            try {
                let excelData = JSON.parse(datosEnNube.datos_json);
                document.getElementById('sync-status').innerText = `● En línea (Última carga: ${datosEnNube.fecha_subida})`;
                window.analizarDatos(excelData); 
            } catch(e) { console.error("Error al procesar JSON", e); }
        } else {
            document.getElementById('sync-status').innerText = "○ Esperando datos del equipo...";
        }
    });
});

window.analizarDatos = function(datos) {
    let secciones = { 
        'S': { titulo: 'SEMINUEVOS', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 }, 
        'A': { titulo: 'SINIESTROS', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 }, 
        'N': { titulo: 'NORMALES', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 }, 
        'V': { titulo: 'VENTAS', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 }, 
        'I': { titulo: 'INTERNAS', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 }, 
        'G': { titulo: 'GARANTÍAS', ordenes: 0, total: 0, countOk: 0, countWarn: 0, countAlert: 0, countBO: 0, moneyOk: 0, moneyWarn: 0, moneyAlert: 0, moneyBO: 0 } 
    };
    
    let global = { total: 0, ok: 0, warn: 0, alert: 0, bo: 0, dinero: 0, dineroOk: 0, dineroWarn: 0, dineroAlert: 0, dineroBO: 0 };

    datos.forEach(fila => {
        let orden = String(fila['Orden'] || "").trim().toUpperCase(); 
        if (orden.length <= 1) return;
        let letra = orden.charAt(0); 
        let sec = secciones[letra]; 
        if (!sec) return;

        let nota = window.DB_NOTAS_COMPARTIDAS[orden] || {};
        let estatusFiltro = nota.comentario ? nota.comentario.trim().toUpperCase() : "";
        let dias = parseFloat(fila['Dias']) || 0; 
        let importe = parseFloat(String(fila['Importe  S/iva '] || "0").replace(/[^0-9.-]+/g,"")) || 0;
        
        let esBO = (estatusFiltro === "BO");
        let semaforo = esBO ? 'bo' : (dias >= 30 ? 'rojo' : (dias >= 15 ? 'amarillo' : 'verde'));

        sec.ordenes++; sec.total += importe; global.total++; global.dinero += importe;
        
        if (semaforo === 'bo') { sec.countBO++; sec.moneyBO += importe; global.bo++; global.dineroBO += importe; }
        else if (semaforo === 'rojo') { sec.countAlert++; sec.moneyAlert += importe; global.alert++; global.dineroAlert += importe; } 
        else if (semaforo === 'amarillo') { sec.countWarn++; sec.moneyWarn += importe; global.warn++; global.dineroWarn += importe; } 
        else { sec.countOk++; sec.moneyOk += importe; global.ok++; global.dineroOk += importe; }
    });

    window.renderizarTablaTelemetria(secciones, global);
}

window.renderizarTablaTelemetria = function(secciones, global) {
    let html = `<table class="telemetry-table">
        <thead><tr><th style="text-align: left;">DEPARTAMENTO</th><th>&lt; 15 DÍAS</th><th>15-29 DÍAS</th><th>≥ 30 DÍAS</th><th>BACK ORDER</th><th>TOTAL</th></tr></thead><tbody>`;
    ['A', 'S', 'N', 'V', 'G', 'I'].forEach(k => { 
        let sec = secciones[k];
        if (sec.ordenes > 0) { 
            html += `<tr>
                <td style="text-align: left; font-weight: bold; color: var(--white);">${sec.titulo}</td>
                <td style="color: var(--green-ok); font-weight: bold;">${sec.countOk} <br><span style="color:var(--grey); font-size:0.75rem; font-weight:normal;">${window.mxnFormat.format(sec.moneyOk)}</span></td>
                <td style="color: yellow; font-weight: bold;">${sec.countWarn} <br><span style="color:var(--grey); font-size:0.75rem; font-weight:normal;">${window.mxnFormat.format(sec.moneyWarn)}</span></td>
                <td style="color: var(--spider-red); font-weight: bold;">${sec.countAlert} <br><span style="color:var(--grey); font-size:0.75rem; font-weight:normal;">${window.mxnFormat.format(sec.moneyAlert)}</span></td>
                <td style="color: var(--spider-cyan); font-weight: bold;">${sec.countBO} <br><span style="color:var(--grey); font-size:0.75rem; font-weight:normal;">${window.mxnFormat.format(sec.moneyBO)}</span></td>
                <td style="font-size:1.2rem; font-weight:bold; color:var(--white);">${sec.ordenes} <br><span style="color:var(--grey); font-size:0.85rem; font-weight:normal;">${window.mxnFormat.format(sec.total)}</span></td>
            </tr>`; 
        } 
    });
    
    html += `<tr style="border-top: 2px solid var(--spider-red); background: rgba(225,0,36,0.1);">
        <td style="text-align: left; font-weight: bold; color: var(--spider-cyan);">TOTAL AGENCIA</td>
        <td style="color: var(--white); font-weight: bold;">${global.ok}</td>
        <td style="color: var(--white); font-weight: bold;">${global.warn}</td>
        <td style="color: var(--white); font-weight: bold;">${global.alert}</td>
        <td style="color: var(--white); font-weight: bold;">${global.bo}</td>
        <td style="font-size:1.4rem; font-weight:bold; color: var(--spider-cyan);">${global.total} <br><span style="font-size:0.85rem; font-weight:normal; color:var(--white);">${window.mxnFormat.format(global.dinero)}</span></td>
    </tr></tbody></table>`;
    document.getElementById('tabla-resumen-container').innerHTML = html;
}

window.procesarExcelVentas = function(event) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, {type: 'array'});
        let jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: 0});
        window.extraerDatosDeResumen(jsonRows);
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
};

window.extraerDatosDeResumen = function(rows) {
    let rowCabeceras = -1;
    for (let i = rows.length - 1; i >= 0; i--) {
        let filaTexto = rows[i].join(" ").toUpperCase();
        if (filaTexto.includes("ASEGURADORAS") && filaTexto.includes("GARANTIAS") && filaTexto.includes("NORMAL")) {
            rowCabeceras = i; break;
        }
    }
    if (rowCabeceras === -1) { alert("No se encontró la sección de Totales al final del Excel."); return; }

    let headers = rows[rowCabeceras]; let ventasRow = rows[rowCabeceras + 1]; let costosRow = rows[rowCabeceras + 2];
    const buscarCol = (nombre) => headers.findIndex(c => String(c).toUpperCase().includes(nombre));
    let seccionesInfo = [
        { id: 'aseg', nombre: 'Aseguradoras', idx: buscarCol("ASEGURADORAS") },
        { id: 'gar', nombre: 'Garantías', idx: buscarCol("GARANTIAS") },
        { id: 'nor', nombre: 'Normal', idx: buscarCol("NORMAL") },
        { id: 'prev', nombre: 'Previas', idx: buscarCol("PREVIAS") },
        { id: 'semi', nombre: 'Seminuevos', idx: buscarCol("SEMINUEVOS") }
    ];

    let totalVentasC_IVA = 0; window.datosRentabilidad.items = [];
    seccionesInfo.forEach(sec => {
        if(sec.idx !== -1) {
            let ventaBruta = parseFloat(ventasRow[sec.idx]) || 0;
            let costo = parseFloat(costosRow[sec.idx]) || 0;
            totalVentasC_IVA += ventaBruta;
            let ventaSinIva = ventaBruta / 1.16;
            window.datosRentabilidad.items.push({ nombre: sec.nombre, ventaBruta: ventaBruta, costo: costo, utilidad: (ventaSinIva - costo) });
        }
    });
    window.datosRentabilidad.items.push({ nombre: 'Internas', ventaBruta: 0, costo: 0, utilidad: 0 });
    window.datosRentabilidad.totalGlobal = totalVentasC_IVA;
    window.calcularRentabilidad();
};

window.procesarExcelOrdenesFacturadas = function(event) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, {type: 'array'});
        let jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
        
        let conteo = { 'Aseguradoras': 0, 'Garantías': 0, 'Normal': 0, 'Previas': 0, 'Seminuevos': 0, 'Internas': 0 };
        for (let i = jsonRows.length - 1; i >= 0; i--) {
            let col0 = String(jsonRows[i][0] || "").toUpperCase();
            let val = parseInt(jsonRows[i][1]) || parseInt(jsonRows[i][2]) || parseInt(jsonRows[i][3]) || 0;
            if (col0.includes("ASEGURADORA")) conteo['Aseguradoras'] = val;
            else if (col0.includes("GARANTIA") || col0.includes("GARANTÍA")) conteo['Garantías'] = val;
            else if (col0.includes("NORMAL")) conteo['Normal'] = val;
            else if (col0.includes("PREVIA")) conteo['Previas'] = val;
            else if (col0.includes("SEMINUEVO")) conteo['Seminuevos'] = val;
            else if (col0.includes("INTERNA")) conteo['Internas'] = val;
        }
        window.objOrdenesFacturadas = conteo;
        window.calcularRentabilidad();
        
        // DISPARADOR: Actualizamos Retención al instante para que lea el nuevo dato
        if(typeof window.calcularRetencion === 'function') window.calcularRetencion();

        alert("✅ Órdenes facturadas cargadas.");
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
};

window.calcularRentabilidad = function() {
    let objetivoMensual = parseFloat(document.getElementById('input-objetivo').value) || 0;
    
    let mes = document.getElementById('select-mes').value;
    let anio = document.getElementById('select-anio').value;
    localStorage.setItem(`objetivo_${anio}_${mes}`, objetivoMensual);

    let html = "";
    let sumVentasS_IVA = 0, sumCostos = 0, sumUtilidad = 0;
    let sumOrdTotal = 0; let sumAnioPasTotal = 0; 

    if (window.datosRentabilidad && window.datosRentabilidad.items && window.datosRentabilidad.items.length > 0) {
        window.datosRentabilidad.items.forEach(item => {
            let ventaSinIva = item.ventaBruta / 1.16;
            let participacion = window.datosRentabilidad.totalGlobal > 0 ? (item.ventaBruta / window.datosRentabilidad.totalGlobal) : 0;
            let objSeccion = objetivoMensual * participacion;
            let alcance = objSeccion > 0 ? (item.utilidad / objSeccion) * 100 : 0;

            sumVentasS_IVA += ventaSinIva; sumCostos += item.costo; sumUtilidad += item.utilidad;
            let colorAlcance = alcance >= 100 ? '#28a745' : (alcance >= 50 ? '#ffc107' : '#e10024');

            let ordVal = window.objOrdenesFacturadas[item.nombre] || 0; sumOrdTotal += ordVal; 
            let anioPasVal = window.objAnioPasado[item.nombre] || 0; sumAnioPasTotal += anioPasVal; 
            let colorOrd = '#fff'; if (ordVal > 0 || anioPasVal > 0) { colorOrd = ordVal >= anioPasVal ? '#28a745' : '#e10024'; }

            html += `<tr><td style="text-align:left; font-weight:900; color:#000;">${item.nombre}</td>
                    <td>${window.mxnFormat.format(ventaSinIva)}</td><td>${window.mxnFormat.format(item.costo)}</td>
                    <td style="color:#000; font-weight:bold; font-size:1.1rem;">${window.mxnFormat.format(item.utilidad)}</td>
                    <td>${(participacion * 100).toFixed(0)}%</td><td>${window.mxnFormat.format(objSeccion)}</td>
                    <td style="color:${colorAlcance}; font-weight:bold; font-size:1.1rem;">${alcance.toFixed(0)}%</td>
                    <td style="color:${colorOrd}; font-weight:bold; font-size:1.4rem; text-shadow:1px 1px 0px #000;">${ordVal}</td>
                    <td><input type="number" class="anio-pas-input" data-seccion="${item.nombre}" value="${anioPasVal}" onchange="window.actualizarAnioPasado(this)" style="width:70px; background:#e0e0e0; border:2px solid #000; font-family:'Teko', sans-serif; font-size:1.3rem; font-weight:bold; text-align:center;"></td>
                </tr>`;
        });
    } else {
        html += `<tr><td colspan="9" class="empty-msg">Sin datos de ventas para este mes... Mostrando solo la suma de Refacciones.</td></tr>`;
    }

    sumUtilidad += (window.utilidadMostrador || 0);
    
    let alcanceTotal = objetivoMensual > 0 ? (sumUtilidad / objetivoMensual) * 100 : 0;
    let faltante = objetivoMensual - sumUtilidad; if (faltante < 0) faltante = 0;

    html += `<tr class="row-total"><td style="text-align:left;">TOTALES</td>
            <td>${window.mxnFormat.format(sumVentasS_IVA)}</td><td>${window.mxnFormat.format(sumCostos)}</td>
            <td style="color:#000;">${window.mxnFormat.format(sumUtilidad)}</td><td>100%</td>
            <td>${window.mxnFormat.format(objetivoMensual)}</td>
            <td style="color: ${alcanceTotal >= 100 ? '#28a745' : '#e10024'}">${alcanceTotal.toFixed(0)}%</td>
            <td style="color:#000; font-weight:bold; font-size:1.4rem;">${sumOrdTotal}</td>
            <td style="color:#000; font-weight:bold; font-size:1.4rem;">${sumAnioPasTotal}</td></tr>`;

    let tbody = document.getElementById('tbody-rentabilidad');
    if(tbody) tbody.innerHTML = html;
    if(document.getElementById('kpi-utilidad')) document.getElementById('kpi-utilidad').innerText = window.mxnFormat.format(sumUtilidad);
    if(document.getElementById('kpi-alcance')) document.getElementById('kpi-alcance').innerText = alcanceTotal.toFixed(1) + "%";
    if(document.getElementById('kpi-faltante')) document.getElementById('kpi-faltante').innerText = window.mxnFormat.format(faltante);
};

window.exportarTodoAExcel = async function() {
    if (typeof ExcelJS === 'undefined') { alert("Cargando motor de Excel. Intenta en unos segundos."); return; }
    
    let selectMes = document.getElementById('select-mes');
    let mesTxt = selectMes ? selectMes.options[selectMes.selectedIndex].text : "";
    let anioTxt = document.getElementById('select-anio')?.value || "";
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte KPI', { views: [{ showGridLines: false }] });
    sheet.columns = [ {width: 25}, {width: 15}, {width: 15}, {width: 15}, {width: 15}, {width: 15}, {width: 15}, {width: 15} ];

    function addSectionTitle(titleStr) {
        let titleRow = sheet.addRow([titleStr.toUpperCase()]);
        titleRow.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE10024' } }; 
        titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`);
        sheet.addRow([]);
    }

    function extractTableToSheet(tableElement) {
        let table = typeof tableElement === 'string' ? document.querySelector(tableElement) : tableElement;
        if(!table) { sheet.addRow(["Sin datos"]); sheet.addRow([]); return; }
        let rows = table.querySelectorAll('tr');
        rows.forEach((tr) => {
            let rowData = [];
            tr.querySelectorAll('th, td').forEach(cell => {
                let input = cell.querySelector('input');
                rowData.push(input ? input.value : cell.innerText.replace(/\n/g, ' ').trim());
            });
            let excelRow = sheet.addRow(rowData);
            if(tr.closest('thead')) {
                excelRow.font = { bold: true, color: { argb: 'FF00F0FF' } };
                excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B0C10' } };
            } else if (tr.classList.contains('row-total') || tr.innerText.includes('TOTALES') || tr.innerText.includes('TOTAL ACUMULADO')) {
                excelRow.font = { bold: true, color: { argb: 'FF000000' } };
                excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } }; 
            } else {
                excelRow.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
            }
        });
        sheet.addRow([]);
    }

    addSectionTitle(`REPORTE KPI HYUNDAI COATZACOALCOS - ${mesTxt} ${anioTxt}`);
    addSectionTitle("1. Rentabilidad General");
    extractTableToSheet('#tabla-rentabilidad');
    
    addSectionTitle("2. Refacciones (Compras y Ventas)");
    extractTableToSheet('.dark-table');
    let tablasManuales = document.querySelectorAll('.manual-table');
    if (tablasManuales.length > 1) extractTableToSheet(tablasManuales[1]);

    addSectionTitle("3. Asesores y Objetivos");
    let divAsesores = document.querySelector('.asesores-content-container');
    if (divAsesores) {
        let tablasAsesores = divAsesores.querySelectorAll('table');
        tablasAsesores.forEach(t => extractTableToSheet(t));
    }

    addSectionTitle("4. Órdenes al Día");
    extractTableToSheet('#tabla-resumen-container table');
    addSectionTitle("5. Venta de Accesorios");
    extractTableToSheet('#tabla-accesorios-container table');

    try {
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Reporte_KPI_Hyundai_${mesTxt}_${anioTxt}.xlsx`);
    } catch (e) { console.error("Error al generar Excel: ", e); }
};
// =========================================================
// SECCIÓN 1: CONFIGURACIÓN MULTI-FIREBASE
// =========================================================
const configOrdenes = {
    apiKey: "AIzaSyCNnyVRFkdclX8SFTbilAmC05cXy63Me64",
    authDomain: "tablero-servicio-hyundai.firebaseapp.com",
    databaseURL: "https://tablero-servicio-hyundai-default-rtdb.firebaseio.com",
    projectId: "tablero-servicio-hyundai",
    storageBucket: "tablero-servicio-hyundai.firebasestorage.app",
    messagingSenderId: "455631253850",
    appId: "1:455631253850:web:f9385b23ebb6c333a14363"
};

const configAsesores = {
    apiKey: "AIzaSyA-x8ZZvJXAOK7Q18PVWPybmfPZ7xDBNHo",
    authDomain: "tablero-pruebas.firebaseapp.com",
    databaseURL: "https://tablero-pruebas-default-rtdb.firebaseio.com",
    projectId: "tablero-pruebas",
    storageBucket: "tablero-pruebas.firebasestorage.app",
    messagingSenderId: "900913447132",
    appId: "1:900913447132:web:fd3b5cc73af4263d69b419"
};

if (!firebase.apps.length) {
    firebase.initializeApp(configOrdenes);
}

let appPython, firestorePython;
try {
    appPython = firebase.initializeApp(configAsesores, "AppPython");
    firestorePython = appPython.firestore();
} catch (error) {
    appPython = firebase.app("AppPython");
    firestorePython = appPython.firestore();
}

const database = firebase.database();       // Órdenes
const dbFirestore = firestorePython;        // Asesores

// =========================================================
// SECCIÓN 2: VARIABLES GLOBALES Y FORMATO
// =========================================================
let DB_NOTAS_COMPARTIDAS = {};
const mxnFormat = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
let datosRentabilidad = { totalGlobal: 0, items: [] };
window.utilidadMostrador = 0;

// =========================================================
// SECCIÓN 3: INTRO SPIDER-VERSE Y CÓDIGO SECRETO "2099"
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    const introScreen = document.getElementById('intro-screen');
    const introLogo = document.getElementById('intro-logo');
    const introVideo = document.getElementById('intro-video');

    let secretBuffer = "";

    if(introLogo) {
        introLogo.addEventListener('click', () => {
            introLogo.style.display = 'none';
            introVideo.style.display = 'block';
            introVideo.play();
        });
    }

    window.addEventListener('keydown', (e) => {
        if(!introScreen || introScreen.style.display === 'none') return;
        
        secretBuffer += e.key;
        if(secretBuffer.length > 4) secretBuffer = secretBuffer.slice(-4);

        if(secretBuffer === "2099") {
            if(introVideo) introVideo.pause(); 
            introScreen.style.opacity = '0'; 
            setTimeout(() => { introScreen.style.display = 'none'; }, 1000);
        }
    });
});

// =========================================================
// SECCIÓN 4: CONEXIÓN A RTDB (ÓRDENES)
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    database.ref('notas').on('value', (snapshot) => {
        DB_NOTAS_COMPARTIDAS = snapshot.val() || {};
    });

    database.ref('excel_compartido').on('value', (snapshot) => {
        let datosEnNube = snapshot.val();
        if (datosEnNube && datosEnNube.datos_json) {
            try {
                let excelData = JSON.parse(datosEnNube.datos_json);
                document.getElementById('sync-status').innerText = `● En línea (Última carga equipo: ${datosEnNube.fecha_subida})`;
                analizarDatos(excelData); 
            } catch(e) { console.error("Error al procesar JSON", e); }
        } else {
            document.getElementById('sync-status').innerText = "○ Esperando datos del equipo...";
        }
    });
});

function toggleDrawer() {
    document.getElementById('side-drawer').classList.toggle('open');
}

// =========================================================
// SECCIÓN 5: LÓGICA DE ÓRDENES Y TELEMETRÍA
// =========================================================
function analizarDatos(datos) {
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

        let nota = DB_NOTAS_COMPARTIDAS[orden] || {};
        let estatusFiltro = nota.comentario ? nota.comentario.trim().toUpperCase() : "";
        let dias = parseFloat(fila['Dias']) || 0; 
        let importe = parseFloat(String(fila['Importe  S/iva '] || "0").replace(/[^0-9.-]+/g,"")) || 0;
        
        let esBO = (estatusFiltro === "BO");
        let semaforo = esBO ? 'bo' : (dias >= 30 ? 'rojo' : (dias >= 15 ? 'amarillo' : 'verde'));

        sec.ordenes++;
        sec.total += importe; global.total++; global.dinero += importe;
        
        if (semaforo === 'bo') { sec.countBO++; sec.moneyBO += importe; global.bo++; global.dineroBO += importe; }
        else if (semaforo === 'rojo') { sec.countAlert++; sec.moneyAlert += importe; global.alert++; global.dineroAlert += importe; } 
        else if (semaforo === 'amarillo') { sec.countWarn++; sec.moneyWarn += importe; global.warn++; global.dineroWarn += importe; } 
        else { sec.countOk++; sec.moneyOk += importe; global.ok++; global.dineroOk += importe; }
    });

    renderizarTablaTelemetria(secciones, global);
}

// =========================================================
// SECCIÓN 6: RENDERIZADO TABLA TELEMETRÍA
// =========================================================
function renderizarTablaTelemetria(secciones, global) {
    let html = `<table class="telemetry-table">
        <thead><tr><th style="text-align: left;">DEPARTAMENTO</th><th>&lt; 15 DÍAS</th><th>15-29 DÍAS</th><th>≥ 30 DÍAS</th><th>BACK ORDER</th><th>TOTAL</th></tr></thead><tbody>`;
    
    ['A', 'S', 'N', 'V', 'G', 'I'].forEach(k => { 
        let sec = secciones[k];
        if (sec.ordenes > 0) { 
            html += `<tr>
                <td style="text-align: left; font-weight: bold; color: var(--white);">${sec.titulo}</td>
                <td style="color: var(--green-ok); font-weight: bold;">${sec.countOk} <br><span style="color:var(--grey); font-size:0.75rem; font-weight:normal;">${mxnFormat.format(sec.moneyOk)}</span></td>
                <td style="color: yellow; font-weight: bold;">${sec.countWarn} <br><span style="color:var(--grey); font-size:0.75rem; font-weight:normal;">${mxnFormat.format(sec.moneyWarn)}</span></td>
                <td style="color: var(--spider-red); font-weight: bold;">${sec.countAlert} <br><span style="color:var(--grey); font-size:0.75rem; font-weight:normal;">${mxnFormat.format(sec.moneyAlert)}</span></td>
                <td style="color: var(--spider-cyan); font-weight: bold;">${sec.countBO} <br><span style="color:var(--grey); font-size:0.75rem; font-weight:normal;">${mxnFormat.format(sec.moneyBO)}</span></td>
                <td style="font-size:1.2rem; font-weight:bold; color:var(--white);">${sec.ordenes} <br><span style="color:var(--grey); font-size:0.85rem; font-weight:normal;">${mxnFormat.format(sec.total)}</span></td>
            </tr>`; 
        } 
    });
    
    html += `<tr style="border-top: 2px solid var(--spider-red); background: rgba(225,0,36,0.1);">
        <td style="text-align: left; font-weight: bold; color: var(--spider-cyan);">TOTAL AGENCIA</td>
        <td style="color: var(--white); font-weight: bold;">${global.ok} <br><span style="font-size:0.75rem; font-weight:normal;">${mxnFormat.format(global.dineroOk)}</span></td>
        <td style="color: var(--white); font-weight: bold;">${global.warn} <br><span style="font-size:0.75rem; font-weight:normal;">${mxnFormat.format(global.dineroWarn)}</span></td>
        <td style="color: var(--white); font-weight: bold;">${global.alert} <br><span style="font-size:0.75rem; font-weight:normal;">${mxnFormat.format(global.dineroAlert)}</span></td>
        <td style="color: var(--white); font-weight: bold;">${global.bo} <br><span style="font-size:0.75rem; font-weight:normal;">${mxnFormat.format(global.dineroBO)}</span></td>
        <td style="font-size:1.4rem; font-weight:bold; color: var(--spider-cyan);">${global.total} <br><span style="font-size:0.85rem; font-weight:normal; color:var(--white);">${mxnFormat.format(global.dinero)}</span></td>
    </tr>`;

    document.getElementById('tabla-resumen-container').innerHTML = html + `</tbody></table>`;
}

// =========================================================
// SECCIÓN 7: LECTOR EXCEL RENTABILIDAD
// =========================================================
function procesarExcelVentas(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(e) {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, {type: 'array'});
        let jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: 0});
        
        extraerDatosDeResumen(jsonRows);
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

// =========================================================
// SECCIÓN 8: EXTRACCIÓN DE DATOS RENTABILIDAD
// =========================================================
function extraerDatosDeResumen(rows) {
    let rowCabeceras = -1;

    for (let i = rows.length - 1; i >= 0; i--) {
        let filaTexto = rows[i].join(" ").toUpperCase();
        if (filaTexto.includes("ASEGURADORAS") && filaTexto.includes("GARANTIAS") && filaTexto.includes("NORMAL")) {
            rowCabeceras = i;
            break;
        }
    }

    if (rowCabeceras === -1) {
        alert("No se encontró la sección de Totales al final del Excel.");
        return;
    }

    let headers = rows[rowCabeceras];
    let ventasRow = rows[rowCabeceras + 1];
    let costosRow = rows[rowCabeceras + 2];

    const buscarCol = (nombre) => headers.findIndex(c => String(c).toUpperCase().includes(nombre));
    
    let seccionesInfo = [
        { id: 'aseg', nombre: 'Aseguradoras', idx: buscarCol("ASEGURADORAS") },
        { id: 'gar', nombre: 'Garantías', idx: buscarCol("GARANTIAS") },
        { id: 'nor', nombre: 'Normal', idx: buscarCol("NORMAL") },
        { id: 'prev', nombre: 'Previas', idx: buscarCol("PREVIAS") },
        { id: 'semi', nombre: 'Seminuevos', idx: buscarCol("SEMINUEVOS") }
    ];

    let totalVentasC_IVA = 0;
    datosRentabilidad.items = [];

    seccionesInfo.forEach(sec => {
        if(sec.idx !== -1) {
            let ventaBruta = parseFloat(ventasRow[sec.idx]) || 0;
            let costo = parseFloat(costosRow[sec.idx]) || 0;
            
            totalVentasC_IVA += ventaBruta;
            let ventaSinIva = ventaBruta / 1.16;
            let utilidadReal = ventaSinIva - costo;

            datosRentabilidad.items.push({
                nombre: sec.nombre,
                ventaBruta: ventaBruta,
                costo: costo,
                utilidad: utilidadReal
            });
        }
    });

    datosRentabilidad.items.push({ nombre: 'Internas', ventaBruta: 0, costo: 0, utilidad: 0 });
    datosRentabilidad.totalGlobal = totalVentasC_IVA;
    calcularRentabilidad();
}

// =========================================================
// SECCIÓN 9: CÁLCULO, FIREBASE Y EXPORTADOR EXCELJS (KPI)
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    let now = new Date();
    let mesActual = String(now.getMonth() + 1).padStart(2, '0');
    let anioActual = String(now.getFullYear());
    
    let elMes = document.getElementById('select-mes');
    let elAnio = document.getElementById('select-anio');
    if (elMes) elMes.value = mesActual;
    if (elAnio) elAnio.value = anioActual;
});

window.calcularRentabilidad = function() {
    if (!datosRentabilidad || !datosRentabilidad.items || datosRentabilidad.items.length === 0) return;
    let objetivoMensual = parseFloat(document.getElementById('input-objetivo').value) || 0;
    let html = "";
    let sumVentas = 0, sumCostos = 0, sumUtilidad = 0;

    datosRentabilidad.items.forEach(item => {
        let participacion = datosRentabilidad.totalGlobal > 0 ? (item.ventaBruta / datosRentabilidad.totalGlobal) : 0;
        let objSeccion = objetivoMensual * participacion;
        let alcance = objSeccion > 0 ? (item.utilidad / objSeccion) * 100 : 0;

        sumVentas += item.ventaBruta; sumCostos += item.costo; sumUtilidad += item.utilidad;
        let colorAlcance = alcance >= 100 ? '#28a745' : (alcance >= 50 ? '#ffc107' : '#e10024');

        html += `<tr><td style="text-align:left; font-weight:900; color:#000;">${item.nombre}</td>
                <td>${mxnFormat.format(item.ventaBruta)}</td><td>${mxnFormat.format(item.costo)}</td>
                <td style="color:#000; font-weight:bold; font-size:1.1rem;">${mxnFormat.format(item.utilidad)}</td>
                <td>${(participacion * 100).toFixed(0)}%</td><td>${mxnFormat.format(objSeccion)}</td>
                <td style="color:${colorAlcance}; font-weight:bold; font-size:1.1rem;">${alcance.toFixed(0)}%</td>
                <td style="color:#aaa;">0</td><td style="color:#aaa;">0</td></tr>`;
    });

    sumUtilidad += (window.utilidadMostrador || 0);
    let alcanceTotal = objetivoMensual > 0 ? (sumUtilidad / objetivoMensual) * 100 : 0;
    let faltante = objetivoMensual - sumUtilidad; if (faltante < 0) faltante = 0;

    html += `<tr class="row-total"><td style="text-align:left;">TOTALES</td>
            <td>${mxnFormat.format(sumVentas)}</td><td>${mxnFormat.format(sumCostos)}</td>
            <td style="color:#000;">${mxnFormat.format(sumUtilidad)}</td><td>100%</td>
            <td>${mxnFormat.format(objetivoMensual)}</td>
            <td style="color: ${alcanceTotal >= 100 ? '#28a745' : '#e10024'}">${alcanceTotal.toFixed(0)}%</td>
            <td style="color:#aaa;">-</td><td style="color:#aaa;">-</td></tr>`;

    document.getElementById('tbody-rentabilidad').innerHTML = html;
    document.getElementById('kpi-utilidad').innerText = mxnFormat.format(sumUtilidad);
    document.getElementById('kpi-alcance').innerText = alcanceTotal.toFixed(1) + "%";
    document.getElementById('kpi-faltante').innerText = mxnFormat.format(faltante);
};

// --- SUBIR INFO (SOBREESCRIBE Y ACTUALIZA EN LA NUBE) ---
window.subirSnapshotMes = function() {
    let mes = document.getElementById('select-mes').value;
    let anio = document.getElementById('select-anio').value;
    let clave = `${anio}_${mes}`;

    let refaccionesInputs = {
        'obj-mobis': document.getElementById('obj-mobis')?.value || 0, 'comp-mobis': document.getElementById('comp-mobis')?.value || 0,
        'obj-semi': document.getElementById('obj-semi')?.value || 0, 'comp-semi': document.getElementById('comp-semi')?.value || 0,
        'obj-sint': document.getElementById('obj-sint')?.value || 0, 'comp-sint': document.getElementById('comp-sint')?.value || 0,
        'obj-wurth': document.getElementById('obj-wurth')?.value || 0, 'comp-wurth': document.getElementById('comp-wurth')?.value || 0,
        'obj-llantas': document.getElementById('obj-llantas')?.value || 0, 'comp-llantas': document.getElementById('comp-llantas')?.value || 0,
        'obj-acc': document.getElementById('obj-acc')?.value || 0, 'comp-acc': document.getElementById('comp-acc')?.value || 0,
        'obj-mostrador': document.getElementById('obj-mostrador')?.value || 0, 'obj-taller': document.getElementById('obj-taller')?.value || 0,
        'ven-mostrador': document.getElementById('ven-mostrador')?.value || 0, 'ven-taller': document.getElementById('ven-taller')?.value || 0,
        'cos-mostrador': document.getElementById('cos-mostrador')?.value || 0, 'cos-taller': document.getElementById('cos-taller')?.value || 0
    };

    let snapshotCompleto = {
        fecha_registro: new Date().toLocaleString(), mes: mes, anio: anio,
        objetivoMensual: document.getElementById('input-objetivo')?.value || 1000000,
        rentabilidad: datosRentabilidad, refacciones: refaccionesInputs,
        asesores: datosAsesores, ordenesNotas: DB_NOTAS_COMPARTIDAS
    };

    dbFirestore.collection('historico_mensual').doc(clave).set(snapshotCompleto) 
        .then(() => { alert(`¡Datos del mes ${mes}/${anio} actualizados correctamente en la nube! ☁`); })
        .catch((error) => { console.error("Error: ", error); alert("Error al subir info: " + error.message); });
};

// --- BUSCAR INFO EN LA NUBE ---
window.cargarSnapshotMes = function() {
    let mes = document.getElementById('select-mes').value;
    let anio = document.getElementById('select-anio').value;
    let clave = `${anio}_${mes}`;

    dbFirestore.collection('historico_mensual').doc(clave).get()
        .then((doc) => {
            if (doc.exists) {
                let data = doc.data();
                if (data.objetivoMensual) document.getElementById('input-objetivo').value = data.objetivoMensual;
                if (data.rentabilidad) { datosRentabilidad = data.rentabilidad; calcularRentabilidad(); }
                if (data.refacciones) {
                    Object.keys(data.refacciones).forEach(id => {
                        let el = document.getElementById(id);
                        if (el) el.value = data.refacciones[id];
                    });
                    if (typeof calcRefacciones === 'function') calcRefacciones();
                }
                if (data.asesores) { datosAsesores = data.asesores; construirTablasAsesores(); }
                alert(`Datos del mes ${mes}/${anio} cargados con éxito. 🔍`);
            } else { alert("No se encontró información respaldada para " + mes + "/" + anio); }
        }).catch((error) => { console.error("Error: ", error); });
};

// --- EXPORTAR EXCELJS (UNA SOLA HOJA ESTILO KPI) ---
window.exportarTodoAExcel = async function() {
    if (typeof ExcelJS === 'undefined') { alert("Cargando motor de Excel, espera 2 segundos y vuelve a intentar."); return; }
    
    let mesTxt = document.getElementById('select-mes').options[document.getElementById('select-mes').selectedIndex].text;
    let anioTxt = document.getElementById('select-anio').value;
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte KPI', { views: [{ showGridLines: false }] });

    sheet.columns = [ {width: 20}, {width: 15}, {width: 15}, {width: 15}, {width: 15}, {width: 15}, {width: 15}, {width: 15} ];

    function addSectionTitle(titleStr) {
        let titleRow = sheet.addRow([titleStr.toUpperCase()]);
        titleRow.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE10024' } }; 
        titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`);
        sheet.addRow([]);
    }

    // NUEVO: Función mejorada que acepta directamente el elemento HTML de la tabla
    function extractTableToSheet(tableElement) {
        let table = typeof tableElement === 'string' ? document.querySelector(tableElement) : tableElement;
        if(!table) return;
        let rows = table.querySelectorAll('tr');
        rows.forEach((tr) => {
            let rowData = [];
            tr.querySelectorAll('th, td').forEach(cell => {
                let input = cell.querySelector('input');
                let val = input ? input.value : cell.innerText.replace(/\n/g, ' ').trim();
                rowData.push(val);
            });
            let excelRow = sheet.addRow(rowData);
            if(tr.closest('thead')) {
                excelRow.font = { bold: true, color: { argb: 'FF00F0FF' } };
                excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B0C10' } };
            } else if (tr.classList.contains('row-total') || tr.innerText.includes('TOTALES')) {
                excelRow.font = { bold: true, color: { argb: 'FF000000' } };
                excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } }; 
            } else {
                excelRow.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
            }
        });
        sheet.addRow([]);
    }

    // 1. TÍTULO GENERAL
    addSectionTitle(`REPORTE KPI HYUNDAI COATZACOALCOS - ${mesTxt} ${anioTxt}`);
    
    // 2. RENTABILIDAD
    addSectionTitle("1. Rentabilidad General");
    extractTableToSheet('#tabla-rentabilidad');

    // 3. REFACCIONES
    addSectionTitle("2. Refacciones (Compras y Ventas)");
    extractTableToSheet('.dark-table');
    let tablasManuales = document.querySelectorAll('.manual-table');
    if (tablasManuales.length > 1) extractTableToSheet(tablasManuales[1]);

    // 4. ASESORES
    addSectionTitle("3. Asesores y Objetivos");
    let divAsesores = document.querySelector('.asesores-content-container');
    if (divAsesores) {
        let tablasAsesores = divAsesores.querySelectorAll('table');
        // Usamos la nueva lógica directa para evitar errores de selectores
        tablasAsesores.forEach(t => extractTableToSheet(t));
    }

    try {
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Reporte_KPI_Hyundai_${mesTxt}_${anioTxt}.xlsx`);
    } catch (e) {
        console.error("Error al generar Excel: ", e);
        alert("Ocurrió un error al generar el archivo Excel. Revisa la consola.");
    }
};

// =========================================================
// SECCIÓN 10: CONEXIÓN A FIRESTORE (ASESORES Y FECHA)
// =========================================================
let datosAsesores = {
    caratula: {}, kpi_config: {}, kpi_data: {}, servicios: {}, historial: {}
};

document.addEventListener("DOMContentLoaded", () => {
    dbFirestore.collection('comisiones_app').onSnapshot((snapshot) => {
        if (snapshot.empty) return;

        snapshot.forEach(doc => {
            if (doc.id === 'datos_caratula') datosAsesores.caratula = doc.data().datos || {};
            if (doc.id === 'kpi_config') datosAsesores.kpi_config = doc.data().datos || {};
            if (doc.id === 'kpi_data') datosAsesores.kpi_data = doc.data().datos || {};
            if (doc.id === 'servicios_data') datosAsesores.servicios = doc.data().datos || {};
            if (doc.id === 'historial_auditorias') datosAsesores.historial = doc.data().datos || {};
        });
        construirTablasAsesores();
    }, (error) => {
        console.error("Error al leer Firestore: ", error);
    });
});

// =========================================================
// SECCIÓN 11: RENDER ASESORES - OBJETIVOS Y KPIS
// =========================================================
function construirTablasAsesores() {
    let listaAsesores = Object.keys(datosAsesores.kpi_data);
    
    let ultimaFecha = "ESPERANDO DATOS...";
    let fechas = [];
    Object.values(datosAsesores.historial).forEach(h => { 
        if(h.fecha) fechas.push(h.fecha); 
    });
    if(fechas.length > 0) {
        ultimaFecha = fechas.sort().reverse()[0];
    }
    
    let labelFecha = document.getElementById('asesores-fecha-act');
    if(labelFecha) labelFecha.innerText = "ÚLTIMA SINCRONIZACIÓN: " + ultimaFecha;

    if (listaAsesores.length === 0) return; 

    // TABLA 0: OBJETIVOS DE VENTA
    let htmlVentas = `<table class="tabla-asesores">
        <thead><tr><th>ASESOR</th><th>OBJETIVO</th><th>VENTA</th><th>ALCANCE</th></tr></thead><tbody>`;
    
    listaAsesores.forEach(asesor => {
        let datosC = datosAsesores.caratula[asesor] || { objetivo: 0, venta: 0 };
        let obj = parseFloat(datosC.objetivo) || 0;
        let ven = parseFloat(datosC.venta) || 0;
        let alc = obj > 0 ? (ven / obj) * 100 : 0;
        let colorAlc = alc >= 100 ? 'color: var(--green-ok);' : 'color: var(--spider-red);';

        htmlVentas += `<tr>
            <td style="font-weight: bold; text-align: left; background-color: rgba(0, 240, 255, 0.1); color: var(--white);">${asesor}</td>
            <td>${mxnFormat.format(obj)}</td>
            <td>${mxnFormat.format(ven)}</td>
            <td style="${colorAlc} font-weight: bold;">${alc.toFixed(1)}%</td>
        </tr>`;
    });
    htmlVentas += `</tbody></table>`;
    if (document.getElementById('asesores-ventas-objetivos')) document.getElementById('asesores-ventas-objetivos').innerHTML = htmlVentas;

    // TABLA 1: OBJETIVOS Y KPIs MENSUALES
    let htmlKPI = `<table class="tabla-asesores">
        <thead><tr><th>Concepto</th><th>Total</th>`;
    listaAsesores.forEach(a => htmlKPI += `<th>${a}</th>`);
    htmlKPI += `<th>Objetivo</th><th>Dif.</th></tr></thead><tbody>`;

    let sumaGranTotal = 0, sumaGranObjetivo = 0, sumaGranDiferencia = 0;
    let sumasAsesoresKPI = {};
    listaAsesores.forEach(a => sumasAsesoresKPI[a] = 0);

    for (const [concepto, meta] of Object.entries(datosAsesores.kpi_config)) {
        let totalFila = 0;
        let celdasAsesores = "";
        
        listaAsesores.forEach(asesor => {
            let valor = datosAsesores.kpi_data[asesor][concepto] || 0;
            totalFila += valor;
            sumasAsesoresKPI[asesor] += valor;
            celdasAsesores += `<td>${valor}</td>`;
        });
        
        let diferencia = totalFila - meta;
        let colorDif = diferencia < 0 ? 'color: red;' : 'color: green;';

        sumaGranTotal += totalFila;
        sumaGranObjetivo += meta;
        sumaGranDiferencia += diferencia;

        htmlKPI += `<tr>
            <td style="font-weight: bold; text-align: left;">${concepto}</td>
            <td style="font-weight: bold;">${totalFila}</td>
            ${celdasAsesores}
            <td style="background-color: rgba(0, 240, 255, 0.15);">${meta}</td>
            <td style="${colorDif} font-weight: bold;">${diferencia > 0 ? '+'+diferencia : diferencia}</td>
        </tr>`;
    }

    let colorTotalDif = sumaGranDiferencia < 0 ? 'color: var(--spider-red);' : 'color: var(--green-ok);';
    let celdasTotalesAsesores = "";
    listaAsesores.forEach(a => celdasTotalesAsesores += `<td>${sumasAsesoresKPI[a]}</td>`);
    
    htmlKPI += `<tr style="border-top: 2px solid var(--spider-cyan); background: rgba(0, 240, 255, 0.1);">
        <td style="font-weight: 900; text-align: left;">TOTALES</td>
        <td style="font-weight: 900;">${sumaGranTotal}</td>
        ${celdasTotalesAsesores}
        <td style="font-weight: 900; background-color: rgba(0, 240, 255, 0.2);">${sumaGranObjetivo}</td>
        <td style="${colorTotalDif} font-weight: 900;">${sumaGranDiferencia > 0 ? '+'+sumaGranDiferencia : sumaGranDiferencia}</td>
    </tr></tbody></table>`;
    
    if (document.getElementById('asesores-kpi-refacciones')) document.getElementById('asesores-kpi-refacciones').innerHTML = htmlKPI;

// =========================================================
// SECCIÓN 12: RENDER ASESORES - COMISIONES Y SERVICIOS
// =========================================================
    // TABLA 2: PAGO A ASESORES (DESGLOSE)
    let htmlPagos = `<table class="tabla-asesores">
        <thead><tr><th>ASESOR</th><th>WURTH</th><th>SÁBANA</th><th>TOTAL</th></tr></thead><tbody>`;

    listaAsesores.forEach(asesor => {
        let pagoWurth = 0;
        let conceptosAsesor = datosAsesores.kpi_data[asesor] || {};
        
        for (const [concepto, cantidad] of Object.entries(conceptosAsesor)) {
            let nombreLimpo = String(concepto).trim().toUpperCase();
            if (nombreLimpo.includes("ESTETICA EXTERIOR")) {
                pagoWurth += (cantidad * 25);
            } else if (nombreLimpo.includes("KIT")) {
                pagoWurth += (cantidad * 50);
            }
        }
        
        let pagoSabana = (datosAsesores.caratula[asesor] && datosAsesores.caratula[asesor].comision) ? datosAsesores.caratula[asesor].comision : 0;
        let pagoTotal = pagoWurth + pagoSabana;

        htmlPagos += `<tr>
            <td style="font-weight: bold; text-align: left; background-color: rgba(0, 240, 255, 0.1); color: var(--white);">${asesor}</td>
            <td style="color: var(--spider-cyan);">${mxnFormat.format(pagoWurth)}</td>
            <td style="color: var(--grey);">${mxnFormat.format(pagoSabana)}</td>
            <td style="color: var(--green-ok); font-weight: 900; background-color: rgba(40, 167, 69, 0.1);">${mxnFormat.format(pagoTotal)}</td>
        </tr>`;
    });
    htmlPagos += `</tbody></table>`;
    if (document.getElementById('asesores-pagos-totales')) document.getElementById('asesores-pagos-totales').innerHTML = htmlPagos;

    // TABLA 3: SERVICIOS POR ASESOR
    let htmlServ = `<table class="tabla-asesores">
        <thead><tr><th>Servicios</th>`;
    listaAsesores.forEach(a => htmlServ += `<th>${a}</th>`);
    htmlServ += `<th>Total</th></tr></thead><tbody>`;

    let categoriasServicios = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100 o más"];
    let sumasColumnas = {};
    listaAsesores.forEach(a => sumasColumnas[a] = 0);
    let sumaGlobalServicios = 0;

    categoriasServicios.forEach(cat => {
        let totalFila = 0;
        let celdas = "";
        
        listaAsesores.forEach(asesor => {
            let cant = 0;
            if (datosAsesores.servicios[asesor] && datosAsesores.servicios[asesor][cat]) {
                cant = datosAsesores.servicios[asesor][cat];
            }
            totalFila += cant;
            sumasColumnas[asesor] += cant;
            celdas += `<td>${cant}</td>`;
        });
        
        sumaGlobalServicios += totalFila;
        
        htmlServ += `<tr>
            <td style="font-weight: bold; text-align: left;">${cat}</td>
            ${celdas}
            <td style="font-weight: bold; background-color: rgba(255, 255, 255, 0.05);">${totalFila}</td>
        </tr>`;
    });

    let celdasTotales = "";
    listaAsesores.forEach(asesor => celdasTotales += `<td style="font-weight: 900;">${sumasColumnas[asesor]}</td>`);
    
    htmlServ += `<tr style="border-top: 3px solid var(--spider-red); background: rgba(225, 0, 36, 0.15);">
        <td style="font-weight: 900; text-align: left;">Totales</td>
        ${celdasTotales}
        <td style="font-weight: 900;">${sumaGlobalServicios}</td>
    </tr></tbody></table>`;

    if (document.getElementById('asesores-cantidad-servicios')) document.getElementById('asesores-cantidad-servicios').innerHTML = htmlServ;
}

// =========================================================
// SECCIÓN 13: MÓDULO INFERIOR REFACCIONES (MANUAL)
// =========================================================
window.calcRefacciones = function() {
    const idsCompras = [
        { obj: 'obj-mobis', comp: 'comp-mobis', alc: 'alc-mobis', dif: 'dif-mobis' },
        { obj: 'obj-semi', comp: 'comp-semi', alc: 'alc-semi', dif: 'dif-semi' },
        { obj: 'obj-sint', comp: 'comp-sint', alc: 'alc-sint', dif: 'dif-sint' },
        { obj: 'obj-wurth', comp: 'comp-wurth', alc: 'alc-wurth', dif: 'dif-wurth' },
        { obj: 'obj-llantas', comp: 'comp-llantas', alc: 'alc-llantas', dif: 'dif-llantas' },
        { obj: 'obj-acc', comp: 'comp-acc', alc: 'alc-acc', dif: 'dif-acc' }
    ];

    let totObjComp = 0, totComp = 0;

    idsCompras.forEach(item => {
        let obj = parseFloat(document.getElementById(item.obj).value) || 0;
        let comp = parseFloat(document.getElementById(item.comp).value) || 0;
        
        totObjComp += obj;
        totComp += comp;

        let alc = obj > 0 ? (comp / obj) * 100 : 0;
        let dif = comp - obj; 

        let elAlc = document.getElementById(item.alc);
        let elDif = document.getElementById(item.dif);
        
        if(elAlc) {
            elAlc.innerText = alc.toFixed(0) + '%';
            elAlc.style.color = alc >= 100 ? '#28a745' : '#e10024'; // Verde si cumple, rojo si falta
        }
        if(elDif) {
            elDif.innerText = mxnFormat.format(dif);
            elDif.style.color = dif < 0 ? '#e10024' : '#28a745';
        }
    });

    let totAlcComp = totObjComp > 0 ? (totComp / totObjComp) * 100 : 0;
    let totDifComp = totComp - totObjComp;
    
    document.getElementById('tot-obj-comp').innerText = mxnFormat.format(totObjComp);
    document.getElementById('tot-comp').innerText = mxnFormat.format(totComp);
    document.getElementById('tot-alc-comp').innerText = totAlcComp.toFixed(0) + '%';
    document.getElementById('tot-alc-comp').style.color = totAlcComp >= 100 ? '#28a745' : '#e10024';
    document.getElementById('tot-dif-comp').innerText = mxnFormat.format(totDifComp);
    document.getElementById('tot-dif-comp').style.color = totDifComp < 0 ? '#e10024' : '#28a745';

    let objMost = parseFloat(document.getElementById('obj-mostrador').value) || 0;
    let objTall = parseFloat(document.getElementById('obj-taller').value) || 0;
    let objTotRef = objMost + objTall;
    document.getElementById('obj-tot-ref').innerText = mxnFormat.format(objTotRef);

    let venMost = parseFloat(document.getElementById('ven-mostrador').value) || 0;
    let venTall = parseFloat(document.getElementById('ven-taller').value) || 0;
    let venTotRef = venMost + venTall;
    document.getElementById('ven-tot-ref').innerText = mxnFormat.format(venTotRef);

    let cosMost = parseFloat(document.getElementById('cos-mostrador').value) || 0;
    let cosTall = parseFloat(document.getElementById('cos-taller').value) || 0;
    let cosTotRef = cosMost + cosTall;
    document.getElementById('cos-tot-ref').innerText = mxnFormat.format(cosTotRef);

    let utMost = venMost - cosMost;
    let utTall = venTall - cosTall;
    let utTotRef = utMost + utTall;

    document.getElementById('ut-mostrador').innerText = mxnFormat.format(utMost);
    document.getElementById('ut-taller').innerText = mxnFormat.format(utTall);
    document.getElementById('ut-tot-ref').innerText = mxnFormat.format(utTotRef);

    let alcTotRef = objTotRef > 0 ? (venTotRef / objTotRef) * 100 : 0;
    let elAlcTotRef = document.getElementById('alcance-tot-ref');
    elAlcTotRef.innerText = alcTotRef.toFixed(0) + '%';
    elAlcTotRef.style.color = alcTotRef >= 100 ? '#28a745' : '#e10024';

    window.utilidadMostrador = utMost;

    if(typeof calcularRentabilidad === 'function') {
        calcularRentabilidad();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(calcRefacciones, 300);
});
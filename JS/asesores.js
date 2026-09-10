// =========================================================
// ARCHIVO: asesores.js - TABLAS DE ASESORES Y COMISIONES
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    if (!window.dbFirestore) return;
    window.dbFirestore.collection('comisiones_app').onSnapshot((snapshot) => {
        if (snapshot.empty) return;
        snapshot.forEach(doc => {
            if (doc.id === 'datos_caratula') window.datosAsesores.caratula = doc.data().datos || {};
            if (doc.id === 'kpi_config') window.datosAsesores.kpi_config = doc.data().datos || {};
            if (doc.id === 'kpi_data') window.datosAsesores.kpi_data = doc.data().datos || {};
            if (doc.id === 'servicios_data') window.datosAsesores.servicios = doc.data().datos || {};
            if (doc.id === 'historial_auditorias') window.datosAsesores.historial = doc.data().datos || {};
        });
        window.construirTablasAsesores();
    }, (error) => { console.error("Error al leer Firestore Asesores: ", error); });
});

window.construirTablasAsesores = function() {
    let listaAsesores = Object.keys(window.datosAsesores.kpi_data);
    let ultimaFecha = "ESPERANDO DATOS...";
    let fechas = [];
    Object.values(window.datosAsesores.historial).forEach(h => { if(h.fecha) fechas.push(h.fecha); });
    if(fechas.length > 0) ultimaFecha = fechas.sort().reverse()[0];
    
    let labelFecha = document.getElementById('asesores-fecha-act');
    if(labelFecha) labelFecha.innerText = "ÚLTIMA SINCRONIZACIÓN: " + ultimaFecha;
    if (listaAsesores.length === 0) return; 

    // TABLA 0: OBJETIVOS DE VENTA
    let htmlVentas = `<table class="tabla-asesores"><thead><tr><th>ASESOR</th><th>OBJETIVO</th><th>VENTA</th><th>ALCANCE</th></tr></thead><tbody>`;
    listaAsesores.forEach(asesor => {
        let datosC = window.datosAsesores.caratula[asesor] || { objetivo: 0, venta: 0 };
        let obj = parseFloat(datosC.objetivo) || 0;
        let ven = parseFloat(datosC.venta) || 0;
        let alc = obj > 0 ? (ven / obj) * 100 : 0;
        let colorAlc = alc >= 100 ? 'color: var(--green-ok);' : 'color: var(--spider-red);';
        htmlVentas += `<tr><td style="font-weight: bold; text-align: left; background-color: rgba(0, 240, 255, 0.1); color: var(--white);">${asesor}</td>
            <td>${window.mxnFormat.format(obj)}</td><td>${window.mxnFormat.format(ven)}</td><td style="${colorAlc} font-weight: bold;">${alc.toFixed(1)}%</td></tr>`;
    });
    htmlVentas += `</tbody></table>`;
    if (document.getElementById('asesores-ventas-objetivos')) document.getElementById('asesores-ventas-objetivos').innerHTML = htmlVentas;

    // TABLA 1: OBJETIVOS Y KPIs
    let htmlKPI = `<table class="tabla-asesores"><thead><tr><th>Concepto</th><th>Total</th>`;
    listaAsesores.forEach(a => htmlKPI += `<th>${a}</th>`);
    htmlKPI += `<th>Objetivo</th><th>Dif.</th></tr></thead><tbody>`;
    let sumaGranTotal = 0, sumaGranObjetivo = 0, sumaGranDiferencia = 0;
    let sumasAsesoresKPI = {};
    listaAsesores.forEach(a => sumasAsesoresKPI[a] = 0);

    for (const [concepto, meta] of Object.entries(window.datosAsesores.kpi_config)) {
        let totalFila = 0; let celdasAsesores = "";
        listaAsesores.forEach(asesor => {
            let valor = window.datosAsesores.kpi_data[asesor][concepto] || 0;
            totalFila += valor; sumasAsesoresKPI[asesor] += valor; celdasAsesores += `<td>${valor}</td>`;
        });
        let diferencia = totalFila - meta;
        let colorDif = diferencia < 0 ? 'color: red;' : 'color: green;';
        sumaGranTotal += totalFila; sumaGranObjetivo += meta; sumaGranDiferencia += diferencia;
        htmlKPI += `<tr><td style="font-weight: bold; text-align: left;">${concepto}</td><td style="font-weight: bold;">${totalFila}</td>${celdasAsesores}<td style="background-color: rgba(0, 240, 255, 0.15);">${meta}</td><td style="${colorDif} font-weight: bold;">${diferencia > 0 ? '+'+diferencia : diferencia}</td></tr>`;
    }
    let colorTotalDif = sumaGranDiferencia < 0 ? 'color: var(--spider-red);' : 'color: var(--green-ok);';
    let celdasTotalesAsesores = "";
    listaAsesores.forEach(a => celdasTotalesAsesores += `<td>${sumasAsesoresKPI[a]}</td>`);
    htmlKPI += `<tr style="border-top: 2px solid var(--spider-cyan); background: rgba(0, 240, 255, 0.1);"><td style="font-weight: 900; text-align: left;">TOTALES</td><td style="font-weight: 900;">${sumaGranTotal}</td>${celdasTotalesAsesores}<td style="font-weight: 900; background-color: rgba(0, 240, 255, 0.2);">${sumaGranObjetivo}</td><td style="${colorTotalDif} font-weight: 900;">${sumaGranDiferencia > 0 ? '+'+sumaGranDiferencia : sumaGranDiferencia}</td></tr></tbody></table>`;
    if (document.getElementById('asesores-kpi-refacciones')) document.getElementById('asesores-kpi-refacciones').innerHTML = htmlKPI;

    // TABLA 2: PAGO A ASESORES
    let htmlPagos = `<table class="tabla-asesores"><thead><tr><th>ASESOR</th><th>WURTH</th><th>SÁBANA</th><th>TOTAL</th></tr></thead><tbody>`;
    listaAsesores.forEach(asesor => {
        let pagoWurth = 0;
        let conceptosAsesor = window.datosAsesores.kpi_data[asesor] || {};
        for (const [concepto, cantidad] of Object.entries(conceptosAsesor)) {
            let nombreLimpo = String(concepto).trim().toUpperCase();
            if (nombreLimpo.includes("ESTETICA EXTERIOR")) pagoWurth += (cantidad * 25);
            else if (nombreLimpo.includes("KIT")) pagoWurth += (cantidad * 50);
        }
        let pagoSabana = (window.datosAsesores.caratula[asesor] && window.datosAsesores.caratula[asesor].comision) ? window.datosAsesores.caratula[asesor].comision : 0;
        let pagoTotal = pagoWurth + pagoSabana;
        htmlPagos += `<tr><td style="font-weight: bold; text-align: left; background-color: rgba(0, 240, 255, 0.1); color: var(--white);">${asesor}</td><td style="color: var(--spider-cyan);">${window.mxnFormat.format(pagoWurth)}</td><td style="color: var(--grey);">${window.mxnFormat.format(pagoSabana)}</td><td style="color: var(--green-ok); font-weight: 900; background-color: rgba(40, 167, 69, 0.1);">${window.mxnFormat.format(pagoTotal)}</td></tr>`;
    });
    htmlPagos += `</tbody></table>`;
    if (document.getElementById('asesores-pagos-totales')) document.getElementById('asesores-pagos-totales').innerHTML = htmlPagos;

    // TABLA 3: SERVICIOS
    let htmlServ = `<table class="tabla-asesores"><thead><tr><th>Servicios</th>`;
    listaAsesores.forEach(a => htmlServ += `<th>${a}</th>`);
    htmlServ += `<th>Total</th></tr></thead><tbody>`;
    let categoriasServicios = ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100 o más"];
    let sumasColumnas = {}; listaAsesores.forEach(a => sumasColumnas[a] = 0);
    let sumaGlobalServicios = 0;
    categoriasServicios.forEach(cat => {
        let totalFila = 0; let celdas = "";
        listaAsesores.forEach(asesor => {
            let cant = 0;
            if (window.datosAsesores.servicios[asesor] && window.datosAsesores.servicios[asesor][cat]) cant = window.datosAsesores.servicios[asesor][cat];
            totalFila += cant; sumasColumnas[asesor] += cant; celdas += `<td>${cant}</td>`;
        });
        sumaGlobalServicios += totalFila;
        
        // AGREGAR ESTA LÍNEA EXACTAMENTE AQUÍ:
        window.totalServiciosAsesores = sumaGlobalServicios;
        if(typeof window.calcularRetencion === 'function') window.calcularRetencion();
        htmlServ += `<tr><td style="font-weight: bold; text-align: left;">${cat}</td>${celdas}<td style="font-weight: bold; background-color: rgba(255, 255, 255, 0.05);">${totalFila}</td></tr>`;
    });
    let celdasTotales = "";
    listaAsesores.forEach(asesor => celdasTotales += `<td style="font-weight: 900;">${sumasColumnas[asesor]}</td>`);
    htmlServ += `<tr style="border-top: 3px solid var(--spider-red); background: rgba(225, 0, 36, 0.15);"><td style="font-weight: 900; text-align: left;">Totales</td>${celdasTotales}<td style="font-weight: 900;">${sumaGlobalServicios}</td></tr></tbody></table>`;
    if (document.getElementById('asesores-cantidad-servicios')) document.getElementById('asesores-cantidad-servicios').innerHTML = htmlServ;
}
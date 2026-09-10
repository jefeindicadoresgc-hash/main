// =========================================================
// ARCHIVO: refacciones.js - EN VIVO Y HORA ACT.
// =========================================================

let listenerRefacciones = null;
const formatoSimple = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mesesNombres = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

window.actualizarRelojRefacciones = function() {
    let el = document.getElementById('refacciones-fecha-act');
    if(el) {
        let h = new Date().toLocaleTimeString();
        el.innerText = `ÚLT. ACT: EN VIVO (${h})`;
    }
};

window.escucharRefaccionesEnVivo = function() {
    let mes = document.getElementById('select-mes').value;
    let anio = document.getElementById('select-anio').value;
    let llaveMes = `${anio}-${mes}`; 

    if (listenerRefacciones && window.appPython) window.appPython.database().ref('respaldos').off('value', listenerRefacciones);
    if (!window.appPython) return;

    listenerRefacciones = window.appPython.database().ref(`respaldos/${llaveMes}`).on('value', (snapshot) => {
        window.actualizarRelojRefacciones();
        let data = snapshot.val() || {};
        let compras = data.compras || {};
        let ventas = data.ventas || { mostrador: { obj:0, venta:0, costo:0 }, taller: { obj:0, venta:0, costo:0 } };
        let obsoletos = data.obsoletos || [];

        const lineas = [
            { id: 'mobis', dbKey: 'MOBIS' }, { id: 'semi', dbKey: 'SEMI-SINTETICO' }, 
            { id: 'sint', dbKey: 'SINTETICO' }, { id: 'wurth', dbKey: 'WURTH' }, 
            { id: 'llantas', dbKey: 'LLANTAS' }, { id: 'acc', dbKey: 'ACCESORIOS' }
        ];

        let totObjComp = 0, totComp = 0;
        lineas.forEach(linea => {
            let obj = compras[linea.dbKey] ? parseFloat(compras[linea.dbKey].obj) || 0 : 0;
            let real = compras[linea.dbKey] ? parseFloat(compras[linea.dbKey].real) || 0 : 0;

            totObjComp += obj; totComp += real;
            let alc = obj > 0 ? (real / obj) * 100 : 0;
            let dif = real - obj;

            if(document.getElementById(`obj-${linea.id}`)) document.getElementById(`obj-${linea.id}`).innerText = formatoSimple.format(obj);
            if(document.getElementById(`comp-${linea.id}`)) document.getElementById(`comp-${linea.id}`).innerText = formatoSimple.format(real);
            
            let elAlc = document.getElementById(`alc-${linea.id}`);
            let elDif = document.getElementById(`dif-${linea.id}`);
            if(elAlc) { elAlc.innerText = alc.toFixed(0) + '%'; elAlc.style.color = alc >= 100 ? '#28a745' : '#e10024'; }
            if(elDif) { elDif.innerText = window.mxnFormat.format(dif); elDif.style.color = dif < 0 ? '#e10024' : '#28a745'; }
        });

        let totAlcComp = totObjComp > 0 ? (totComp / totObjComp) * 100 : 0;
        let totDifComp = totComp - totObjComp;
        
        if(document.getElementById('tot-obj-comp')) document.getElementById('tot-obj-comp').innerText = window.mxnFormat.format(totObjComp);
        if(document.getElementById('tot-comp')) document.getElementById('tot-comp').innerText = window.mxnFormat.format(totComp);
        let elTotAlc = document.getElementById('tot-alc-comp');
        if(elTotAlc) { elTotAlc.innerText = totAlcComp.toFixed(0) + '%'; elTotAlc.style.color = totAlcComp >= 100 ? '#28a745' : '#e10024'; }
        let elTotDif = document.getElementById('tot-dif-comp');
        if(elTotDif) { elTotDif.innerText = window.mxnFormat.format(totDifComp); elTotDif.style.color = totDifComp < 0 ? '#e10024' : '#28a745'; }

        let objMost = parseFloat(ventas.mostrador?.obj || 0); let venMost = parseFloat(ventas.mostrador?.venta || 0); let cosMost = parseFloat(ventas.mostrador?.costo || 0);
        let objTall = parseFloat(ventas.taller?.obj || 0); let venTall = parseFloat(ventas.taller?.venta || 0); let cosTall = parseFloat(ventas.taller?.costo || 0);

        if(document.getElementById('obj-mostrador')) document.getElementById('obj-mostrador').innerText = formatoSimple.format(objMost);
        if(document.getElementById('cos-mostrador')) document.getElementById('cos-mostrador').innerText = formatoSimple.format(cosMost);
        if(document.getElementById('obj-taller')) document.getElementById('obj-taller').innerText = formatoSimple.format(objTall);
        if(document.getElementById('cos-taller')) document.getElementById('cos-taller').innerText = formatoSimple.format(cosTall);

        let objTotRef = objMost + objTall; let venTotRef = venMost + venTall; let cosTotRef = cosMost + cosTall;
        if(document.getElementById('obj-tot-ref')) document.getElementById('obj-tot-ref').innerText = window.mxnFormat.format(objTotRef);
        if(document.getElementById('cos-tot-ref')) document.getElementById('cos-tot-ref').innerText = window.mxnFormat.format(cosTotRef);

        let elVenMostrador = document.getElementById('ven-mostrador');
        if(elVenMostrador) { elVenMostrador.innerText = formatoSimple.format(venMost); elVenMostrador.style.color = venMost >= objMost ? '#28a745' : '#e10024'; }
        let elVenTaller = document.getElementById('ven-taller');
        if(elVenTaller) { elVenTaller.innerText = formatoSimple.format(venTall); elVenTaller.style.color = venTall >= objTall ? '#28a745' : '#e10024'; }
        let elVenTotRef = document.getElementById('ven-tot-ref');
        if(elVenTotRef) { elVenTotRef.innerText = window.mxnFormat.format(venTotRef); elVenTotRef.style.color = venTotRef >= objTotRef ? '#28a745' : '#e10024'; }

        let utMost = venMost - cosMost; let utTall = venTall - cosTall; let utTotRef = utMost + utTall;
        if(document.getElementById('ut-mostrador')) document.getElementById('ut-mostrador').innerText = window.mxnFormat.format(utMost);
        if(document.getElementById('ut-taller')) document.getElementById('ut-taller').innerText = window.mxnFormat.format(utTall);
        if(document.getElementById('ut-tot-ref')) document.getElementById('ut-tot-ref').innerText = window.mxnFormat.format(utTotRef);

        let alcTotRef = objTotRef > 0 ? (venTotRef / objTotRef) * 100 : 0;
        let elAlcTotRef = document.getElementById('alcance-tot-ref');
        if(elAlcTotRef) { elAlcTotRef.innerText = alcTotRef.toFixed(0) + '%'; elAlcTotRef.style.color = alcTotRef >= 100 ? '#28a745' : '#e10024'; }

        let g3_count = 0, g3_imp = 0, g4_count = 0, g4_imp = 0;
        obsoletos.forEach(item => {
            if (item.clasificacion && item.clasificacion.includes("G3")) { g3_count++; g3_imp += parseFloat(item.importe) || 0; }
            if (item.clasificacion && item.clasificacion.includes("G4")) { g4_count++; g4_imp += parseFloat(item.importe) || 0; }
        });
        if(document.getElementById('g3-sku-val')) document.getElementById('g3-sku-val').innerText = g3_count;
        if(document.getElementById('g3-monto-val')) document.getElementById('g3-monto-val').innerText = window.mxnFormat.format(g3_imp);
        if(document.getElementById('g4-sku-val')) document.getElementById('g4-sku-val').innerText = g4_count;
        if(document.getElementById('g4-monto-val')) document.getElementById('g4-monto-val').innerText = window.mxnFormat.format(g4_imp);

        window.utilidadMostrador = utMost;
        if(typeof calcularRentabilidad === 'function') window.calcularRentabilidad();
    });
};

window.cargarAccesoriosEnVivo = function() {
    let mesIdx = parseInt(document.getElementById('select-mes').value) - 1;
    let anio = document.getElementById('select-anio').value;
    let mesNombre = mesesNombres[mesIdx];
    if (!window.appPython) return;

    window.appPython.database().ref(`accesorios/ventas_${anio}/${mesNombre}`).on('value', (snapshot) => {
        window.actualizarRelojRefacciones();
        let data = snapshot.val();
        let agregados = {};
        if (data) {
            let registros = Array.isArray(data) ? data : Object.values(data);
            registros.forEach(tx => {
                if(!tx) return;
                let vendedor = tx.ASESOR || tx.asesor || tx.VENDEDOR || tx.vendedor || tx.Nombre || "SIN ASIGNAR";
                let costoRaw = tx['COSTO ACUM.'] || tx.costo_acum || tx.costo || tx.COSTO || tx.Costo || "0";
                let costo = parseFloat(String(costoRaw).replace(/[^0-9.-]+/g,"")) || 0;
                if(!agregados[vendedor]) agregados[vendedor] = 0;
                agregados[vendedor] += costo;
            });
        }
        
        let html = `<table class="telemetry-table"><thead><tr><th style="text-align:left; font-size: 1.4rem;">VENDEDOR</th><th style="font-size: 1.4rem;">COSTO</th></tr></thead><tbody>`;
        let totCosto = 0;
        for (let [vendedor, costo] of Object.entries(agregados)) {
            if (costo > 0) {
                totCosto += costo;
                html += `<tr><td style="text-align:left; color:#fff; font-weight:bold; font-size:0.95rem;">${vendedor}</td><td style="color:var(--spider-cyan); font-weight:bold; font-size:1.1rem;">${window.mxnFormat.format(costo)}</td></tr>`;
            }
        }
        if (totCosto === 0) { html += `<tr><td colspan="2" style="color:#aaa; font-style:italic;">No hay datos en la nube para ${mesNombre} ${anio}</td></tr>`; } 
        else { html += `<tr style="border-top:2px solid var(--spider-red); background:rgba(225,0,36,0.1);"><td style="text-align:left; color:var(--spider-cyan); font-weight:bold; font-size:1.2rem;">TOTAL ACUMULADO</td><td style="color:#fff; font-weight:bold; font-size:1.3rem;">${window.mxnFormat.format(totCosto)}</td></tr>`; }
        html += `</tbody></table>`;
        let cont = document.getElementById('tabla-accesorios-container');
        if(cont) cont.innerHTML = html;
    });
};

document.addEventListener("DOMContentLoaded", () => {
    let elMes = document.getElementById('select-mes');
    let elAnio = document.getElementById('select-anio');
    if (elMes) { elMes.addEventListener('change', window.escucharRefaccionesEnVivo); elMes.addEventListener('change', window.cargarAccesoriosEnVivo); }
    if (elAnio) { elAnio.addEventListener('change', window.escucharRefaccionesEnVivo); elAnio.addEventListener('change', window.cargarAccesoriosEnVivo); }
    setTimeout(() => { window.escucharRefaccionesEnVivo(); window.cargarAccesoriosEnVivo(); }, 800);
});
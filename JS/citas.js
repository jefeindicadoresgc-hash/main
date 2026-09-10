// =========================================================
// ARCHIVO: citas.js - CITAS, MODAL Y RETENCIÓN
// =========================================================

window.datosCitasRaw = {};
window.citasReagendadasArray = [];
window.citasPerdidasArray = [];

document.addEventListener("DOMContentLoaded", () => {
    let selectDia = document.getElementById('select-dia-citas');
    let elMes = document.getElementById('select-mes');
    let elAnio = document.getElementById('select-anio');
    
    if (selectDia) selectDia.addEventListener('change', window.procesarDatosCitas);
    if (elMes) elMes.addEventListener('change', window.procesarDatosCitas);
    if (elAnio) elAnio.addEventListener('change', window.procesarDatosCitas);

    if (window.appPython) {
        window.appPython.database().ref('citas_diarias').on('value', snap => {
            window.datosCitasRaw = snap.val() || {};
            window.procesarDatosCitas();
        });
    }

    let configGuardada = localStorage.getItem('spiderRetencionConfig');
    if (configGuardada) {
        try {
            let conf = JSON.parse(configGuardada);
            if(document.getElementById('ret-dias-lv')) document.getElementById('ret-dias-lv').value = conf.lv;
            if(document.getElementById('ret-dias-sab')) document.getElementById('ret-dias-sab').value = conf.sab;
            if(document.getElementById('ret-tecnicos')) document.getElementById('ret-tecnicos').value = conf.tec;
            if(document.getElementById('ret-obj-mant')) document.getElementById('ret-obj-mant').value = conf.om;
            if(document.getElementById('ret-obj-ord')) document.getElementById('ret-obj-ord').value = conf.oo;
        } catch(e) { console.error("Error leyendo localStorage", e); }
    }

    setTimeout(window.calcularRetencion, 1000);
});

window.procesarDatosCitas = function() {
    let mes = document.getElementById('select-mes')?.value || '08';
    let anio = document.getElementById('select-anio')?.value || '2026';
    let dia = document.getElementById('select-dia-citas')?.value || 'ALL';

    let totCitas = 0, totNoShow = 0;
    window.citasReagendadasArray = []; 
    window.citasPerdidasArray = [];
    let motivosCount = {};

    Object.values(window.datosCitasRaw).forEach(cita => {
        if(!cita || !cita.Fecha) return;
        let parts = cita.Fecha.split('/'); 
        if(parts.length < 3) return;

        let cDia = parts[0], cMes = parts[1], cAnio = parts[2];

        if(cMes === mes && cAnio === anio) {
            if(dia === 'ALL' || cDia === dia) {
                totCitas++;
                let asistio = String(cita.asistio || '').toLowerCase().trim();
                if(asistio === 'no') {
                    totNoShow++;
                    let reagendo = String(cita.reagendo || '').toLowerCase().trim();
                    if(reagendo === 'sí' || reagendo === 'si' || reagendo === 'yes') {
                        window.citasReagendadasArray.push(cita);
                    } else {
                        window.citasPerdidasArray.push(cita);
                    }

                    let mot = cita.motivo || 'No Especificado';
                    motivosCount[mot] = (motivosCount[mot] || 0) + 1;
                }
            }
        }
    });

    if(document.getElementById('taller-citas-tot')) document.getElementById('taller-citas-tot').innerText = totCitas;
    if(document.getElementById('taller-noshow-tot')) document.getElementById('taller-noshow-tot').innerText = totNoShow;
    if(document.getElementById('taller-reagendadas')) document.getElementById('taller-reagendadas').innerText = window.citasReagendadasArray.length;
    if(document.getElementById('taller-perdidas')) document.getElementById('taller-perdidas').innerText = window.citasPerdidasArray.length;

    let htmlMotivos = `<table class="comic-table dark-table" style="width: 100%;">
                        <thead><tr><th>MOTIVO DE NO SHOW</th><th style="width: 80px;">CANTIDAD</th></tr></thead><tbody>`;
    let mKeys = Object.keys(motivosCount);
    if(mKeys.length === 0) { 
        htmlMotivos += `<tr><td colspan="2" class="empty-msg" style="text-align:center;">No hay incidencias registradas.</td></tr>`; 
    } else {
        let sortedMotivos = Object.entries(motivosCount).sort((a, b) => b[1] - a[1]);
        sortedMotivos.forEach(([mot, count]) => {
            htmlMotivos += `<tr><td style="text-align:left; color:#fff;">${mot}</td>
                            <td style="color:var(--spider-cyan); font-weight:bold; font-size:1.2rem;">${count}</td></tr>`;
        });
    }
    htmlMotivos += `</tbody></table>`;
    if(document.getElementById('taller-motivos-container')) document.getElementById('taller-motivos-container').innerHTML = htmlMotivos;
};

window.mostrarDetalleCitas = function(tipo) {
    let arr = tipo === 'reagendadas' ? window.citasReagendadasArray : window.citasPerdidasArray;
    let titulo = tipo === 'reagendadas' ? 'CITAS REAGENDADAS' : 'CITAS PERDIDAS DEFINITIVAS';
    document.getElementById('modal-titulo').innerText = titulo;

    let html = "";
    if (arr.length === 0) {
        html = `<tr><td colspan="5" class="empty-msg" style="text-align:center; padding: 20px;">No hay clientes en esta categoría para la fecha seleccionada.</td></tr>`;
    } else {
        arr.forEach(c => {
            let cliente = c.cliente || c.nombre || c.Cliente || c.Nombre || "SIN REGISTRO";
            let telefono = c.telefono || c.Telefono || c.celular || "SIN REGISTRO";
            let vehiculo = c.vehiculo || c.Unidad || c.unidad || c.modelo || "SIN REGISTRO";
            let fechaOrig = c.Fecha || "SIN FECHA";
            let motivo = c.motivo || "No especificado";

            html += `<tr>
                <td style="text-align:left; color:var(--spider-cyan); font-weight:bold;">${cliente}</td>
                <td style="color:#fff;">${telefono}</td>
                <td style="color:#aaa;">${vehiculo}</td>
                <td style="color:#fff;">${fechaOrig}</td>
                <td style="color:var(--spider-red); font-weight:bold;">${motivo}</td>
            </tr>`;
        });
    }

    document.getElementById('modal-tbody').innerHTML = html;
    document.getElementById('citas-modal').style.display = 'flex';
};

window.calcularRetencion = function() {
    let diasLV = parseFloat(document.getElementById('ret-dias-lv')?.value) || 0;
    let diasSab = parseFloat(document.getElementById('ret-dias-sab')?.value) || 0;
    let tecnicos = parseFloat(document.getElementById('ret-tecnicos')?.value) || 0;
    let objMant = parseFloat(document.getElementById('ret-obj-mant')?.value) || 0;
    let objOrd = parseFloat(document.getElementById('ret-obj-ord')?.value) || 0;

    let configToSave = { lv: diasLV, sab: diasSab, tec: tecnicos, om: objMant, oo: objOrd };
    localStorage.setItem('spiderRetencionConfig', JSON.stringify(configToSave));

    let totalDiasTaller = diasLV + diasSab;
    let objDiario = totalDiasTaller > 0 ? (objMant / totalDiasTaller) : 0;
    let horasTotales = ((diasLV * 8.5) + (diasSab * 5.5)) * tecnicos;

    let mantReales = window.totalServiciosAsesores || 0; 
    
    // AQUÍ SE CORRIGIÓ: Se lee la orden "Normal" directamente del Excel de Órdenes Facturadas.
    let ordReales = window.objOrdenesFacturadas ? (window.objOrdenesFacturadas['Normal'] || 0) : 0;

    let alcMant = objMant > 0 ? (mantReales / objMant) * 100 : 0;
    let alcOrd = objOrd > 0 ? (ordReales / objOrd) * 100 : 0;

    if(document.getElementById('ret-mant-real')) document.getElementById('ret-mant-real').innerText = mantReales;
    if(document.getElementById('ret-alcance-mant')) {
        document.getElementById('ret-alcance-mant').innerText = alcMant.toFixed(1) + "%";
        document.getElementById('ret-alcance-mant').style.color = alcMant >= 100 ? 'var(--green-ok)' : 'var(--spider-red)';
    }

    if(document.getElementById('ret-ord-real')) document.getElementById('ret-ord-real').innerText = ordReales;
    if(document.getElementById('ret-alcance-ord')) {
        document.getElementById('ret-alcance-ord').innerText = alcOrd.toFixed(1) + "%";
        document.getElementById('ret-alcance-ord').style.color = alcOrd >= 100 ? 'var(--green-ok)' : 'var(--spider-red)';
    }

    if(document.getElementById('ret-obj-diario')) document.getElementById('ret-obj-diario').innerText = objDiario.toFixed(1);
    if(document.getElementById('ret-hrs-disp')) document.getElementById('ret-hrs-disp').innerText = horasTotales.toFixed(1) + " Hrs Disp.";
};
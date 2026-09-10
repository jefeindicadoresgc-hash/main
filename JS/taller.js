// =========================================================
// ARCHIVO: taller.js - RANGOS AUTOMÁTICOS Y MATRIZ
// =========================================================

window.datosTallerRaw = {};

document.addEventListener("DOMContentLoaded", () => {
    let inputDesde = document.getElementById('taller-fecha-desde');
    let inputHasta = document.getElementById('taller-fecha-hasta');
    let elMes = document.getElementById('select-mes');
    let elAnio = document.getElementById('select-anio');
    
    if (inputDesde) inputDesde.addEventListener('change', window.procesarDatosTaller);
    if (inputHasta) inputHasta.addEventListener('change', window.procesarDatosTaller);
    
    if (elMes) elMes.addEventListener('change', window.establecerFechasDefaultTaller);
    if (elAnio) elAnio.addEventListener('change', window.establecerFechasDefaultTaller);

    if (window.appPython) {
        window.appPython.database().ref('kpi_taller').on('value', snap => {
            window.datosTallerRaw = snap.val() || {};
            window.procesarDatosTaller();
        });
    }

    setTimeout(window.establecerFechasDefaultTaller, 300);
});

// CALCULA DESDE EL DÍA 1 HASTA HOY (DEL MES SELECCIONADO)
window.establecerFechasDefaultTaller = function() {
    let mes = document.getElementById('select-mes').value;
    let anio = document.getElementById('select-anio').value;
    let inputDesde = document.getElementById('taller-fecha-desde');
    let inputHasta = document.getElementById('taller-fecha-hasta');
    
    let hoy = new Date();
    let mesActualStr = String(hoy.getMonth() + 1).padStart(2, '0');
    let anioActualStr = String(hoy.getFullYear());
    
    if(inputDesde) inputDesde.value = `${anio}-${mes}-01`;
    
    if(inputHasta) {
        if (mes === mesActualStr && anio === anioActualStr) {
            inputHasta.value = `${anio}-${mes}-${String(hoy.getDate()).padStart(2, '0')}`;
        } else {
            let ultimoDia = new Date(anio, parseInt(mes), 0).getDate();
            inputHasta.value = `${anio}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
        }
    }
    window.procesarDatosTaller();
};

window.procesarDatosTaller = function() {
    let valDesde = document.getElementById('taller-fecha-desde')?.value;
    let valHasta = document.getElementById('taller-fecha-hasta')?.value;
    
    let timeDesde = valDesde ? new Date(valDesde + 'T00:00:00').getTime() : null;
    let timeHasta = valHasta ? new Date(valHasta + 'T23:59:59').getTime() : null;

    let mix = { mant: 0, rep: 0, diag: 0 };
    let tecnicos = {};

    for (let [llave, trabajo] of Object.entries(window.datosTallerRaw)) {
        if(!trabajo) continue;
        let parts = llave.split('_');
        if(parts.length < 2) continue;
        
        let timestamp = parseInt(parts[1]);
        if(isNaN(timestamp)) continue;

        let caeEnFiltro = false;

        if (timeDesde && timeHasta) {
            if (timestamp >= timeDesde && timestamp <= timeHasta) caeEnFiltro = true;
        }

        if (caeEnFiltro) {
            let cat = String(trabajo.categoria || '').toLowerCase().trim();
            
            // Evaluador estricto para las 4 combinaciones
            let esMantDiag = cat.includes('mantenimiento') && cat.includes('diagnostico');
            let esMant = cat === 'mantenimiento';
            let esDiag = cat === 'diagnostico' || cat === 'diagnóstico';
            let esRep = cat.includes('reparacion') || cat.includes('reparación');

            if(esMantDiag || esMant) mix.mant++;
            if(esRep) mix.rep++;
            if(esMantDiag || esDiag) mix.diag++;

            let tec = (trabajo.tecnico || 'Sin Asignar').toUpperCase();
            if (!tecnicos[tec]) tecnicos[tec] = { m: 0, md: 0, r: 0, d: 0, tot: 0 };
            
            if (esMantDiag) tecnicos[tec].md++;
            else if (esMant) tecnicos[tec].m++;
            else if (esRep) tecnicos[tec].r++;
            else if (esDiag) tecnicos[tec].d++;
            
            tecnicos[tec].tot++;
        }
    }

    if(document.getElementById('mix-mant')) document.getElementById('mix-mant').innerText = mix.mant;
    if(document.getElementById('mix-rep')) document.getElementById('mix-rep').innerText = mix.rep;
    if(document.getElementById('mix-diag')) document.getElementById('mix-diag').innerText = mix.diag;

    let htmlTec = `<table class="comic-table dark-table" style="width: 100%; font-size: 0.9rem;">
                    <thead><tr><th style="text-align:left;">TÉCNICO</th><th>MANT</th><th>MANT+DIAG</th><th>REP</th><th>DIAG</th><th>TOT</th></tr></thead><tbody>`;
    let tKeys = Object.keys(tecnicos);
    if(tKeys.length === 0) { htmlTec += `<tr><td colspan="6" class="empty-msg" style="text-align:center;">Sin trabajos en este periodo</td></tr>`; } 
    else {
        let sortedTec = Object.entries(tecnicos).sort((a, b) => b[1].tot - a[1].tot);
        sortedTec.forEach(([t, data]) => {
            htmlTec += `<tr>
                <td style="text-align:left; color:#fff; font-weight:bold;">${t}</td>
                <td style="color:var(--spider-cyan); font-weight:bold;">${data.m}</td>
                <td style="color:var(--spider-yellow); font-weight:bold;">${data.md}</td>
                <td style="color:var(--spider-red); font-weight:bold;">${data.r}</td>
                <td style="color:var(--green-ok); font-weight:bold;">${data.d}</td>
                <td style="color:#fff; font-weight:bold; font-size:1.1rem; background:rgba(255,255,255,0.1);">${data.tot}</td>
            </tr>`;
        });
    }
    htmlTec += `</tbody></table>`;
    if(document.getElementById('taller-tecnicos-container')) document.getElementById('taller-tecnicos-container').innerHTML = htmlTec;
};
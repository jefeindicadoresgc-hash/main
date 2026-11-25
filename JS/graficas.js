// #region 1. CONFIGURACIÓN GLOBAL, PALETA EDITORIAL E INSTANCIAS
const instanciasGraficas = {
    rentabilidad: null,
    refacciones: null,
    asesores: null,
    taller: null
};

const PALETA = {
    negro: '#181818',
    verde: '#256d47',
    rojo: '#b83227',
    alerta: '#b7791f',
    grisSuave: '#d6cfc0',
    grisTexto: '#5c5950',
    bordeGrid: '#ece8dc'
};

let timerDebounceGraficas = null;
let graficasPendientes = false;

function formatearEjeDinero(valor) {
    const num = window.parseNumero ? window.parseNumero(valor) : (parseFloat(valor) || 0);
    if (Math.abs(num) >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1000) return '$' + (num / 1000).toFixed(0) + 'k';
    return '$' + num;
}

function opcionesBaseBarras(esDinero = true) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    boxWidth: 10,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    color: PALETA.grisTexto,
                    font: { family: "'DM Sans', sans-serif", size: 11, weight: '600' }
                }
            },
            tooltip: {
                backgroundColor: PALETA.negro,
                titleFont: { family: "'DM Sans', sans-serif", size: 12, weight: '700' },
                bodyFont: { family: "'DM Sans', sans-serif", size: 12 },
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                    label: (ctx) => {
                        const val = ctx.parsed.y || 0;
                        const formato = esDinero && window.mxnFormat ? window.mxnFormat.format(val) : val;
                        return ` ${ctx.dataset.label}: ${formato}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: PALETA.grisTexto, font: { family: "'DM Sans', sans-serif", size: 11, weight: '600' } }
            },
            y: {
                beginAtZero: true,
                grid: { color: PALETA.bordeGrid },
                border: { display: false },
                ticks: {
                    color: PALETA.grisTexto,
                    font: { family: "'DM Sans', sans-serif", size: 11 },
                    callback: (v) => esDinero ? formatearEjeDinero(v) : v
                }
            }
        }
    };
}

function renderizarGrafica(clave, canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    try {
        if (instanciasGraficas[clave]) {
            instanciasGraficas[clave].destroy();
        }
        instanciasGraficas[clave] = new Chart(canvas.getContext('2d'), config);
    } catch (err) {
        console.error(`Error renderizando gráfica (${clave}):`, err);
    }
}
// #endregion

// #region 2. GRÁFICAS INDIVIDUALES

// #region 2.1 RENTABILIDAD (VENTA S/IVA VS OBJETIVO POR SECCIÓN)
function dibujarGraficaRentabilidad() {
    const items = window.datosRentabilidad?.items || [];
    const objMem = window.objFilaMemoria || {};

    const labels = [];
    const ventas = [];
    const objetivos = [];

    items.forEach(item => {
        if (!item) return;
        const ventaSinIva = window.parseNumero(item.ventaBruta) / 1.16;
        const obj = window.parseNumero(objMem[item.nombre]);
        if (ventaSinIva > 0 || obj > 0) {
            labels.push(item.nombre);
            ventas.push(Math.round(ventaSinIva));
            objetivos.push(Math.round(obj));
        }
    });

    const hayDatos = labels.length > 0;
    renderizarGrafica('rentabilidad', 'chartRentabilidad', {
        type: 'bar',
        data: {
            labels: hayDatos ? labels : ['Sin datos'],
            datasets: [
                {
                    label: 'Objetivo',
                    data: hayDatos ? objetivos : [0],
                    backgroundColor: PALETA.grisSuave,
                    borderRadius: 6,
                    maxBarThickness: 28
                },
                {
                    label: 'Venta (S/IVA)',
                    data: hayDatos ? ventas : [0],
                    backgroundColor: PALETA.negro,
                    borderRadius: 6,
                    maxBarThickness: 28
                }
            ]
        },
        options: opcionesBaseBarras(true)
    });
}
// #endregion

// #region 2.2 REFACCIONES (COMPRAS VS OBJETIVO POR LÍNEA)
function dibujarGraficaRefacciones() {
    const refData = window.datosRefaccionesGrafica || { labels: [], objetivos: [], compras: [] };
    const hayDatos = Array.isArray(refData.labels) && refData.labels.length > 0;

    renderizarGrafica('refacciones', 'chartRefacciones', {
        type: 'bar',
        data: {
            labels: hayDatos ? refData.labels : ['Sin datos'],
            datasets: [
                {
                    label: 'Objetivo',
                    data: hayDatos ? refData.objetivos : [0],
                    backgroundColor: PALETA.grisSuave,
                    borderRadius: 6,
                    maxBarThickness: 26
                },
                {
                    label: 'Compras',
                    data: hayDatos ? refData.compras : [0],
                    backgroundColor: PALETA.verde,
                    borderRadius: 6,
                    maxBarThickness: 26
                }
            ]
        },
        options: opcionesBaseBarras(true)
    });
}
// #endregion

// #region 2.3 ASESORES (VENTA VS OBJETIVO)
function dibujarGraficaAsesores() {
    const aseData = window.datosAsesoresGrafica || { labels: [], objetivos: [], ventas: [] };
    const hayDatos = Array.isArray(aseData.labels) && aseData.labels.length > 0;

    renderizarGrafica('asesores', 'chartAsesores', {
        type: 'bar',
        data: {
            labels: hayDatos ? aseData.labels : ['Sin datos'],
            datasets: [
                {
                    label: 'Objetivo',
                    data: hayDatos ? aseData.objetivos : [0],
                    backgroundColor: PALETA.grisSuave,
                    borderRadius: 6,
                    maxBarThickness: 32
                },
                {
                    label: 'Venta Real',
                    data: hayDatos ? aseData.ventas : [0],
                    backgroundColor: PALETA.negro,
                    borderRadius: 6,
                    maxBarThickness: 32
                }
            ]
        },
        options: opcionesBaseBarras(true)
    });
}
// #endregion

// #region 2.4 TALLER (MEZCLA DE TRABAJO - DONA)
function dibujarGraficaTaller() {
    const mix = window.datosTallerGrafica || { mant: 0, rep: 0, diag: 0 };
    const mant = window.parseNumero(mix.mant);
    const rep = window.parseNumero(mix.rep);
    const diag = window.parseNumero(mix.diag);
    const total = mant + rep + diag;

    renderizarGrafica('taller', 'chartTaller', {
        type: 'doughnut',
        data: {
            labels: ['Mantenimiento', 'Reparación', 'Diagnóstico'],
            datasets: [{
                data: total > 0 ? [mant, rep, diag] : [1],
                backgroundColor: total > 0
                    ? [PALETA.negro, PALETA.alerta, PALETA.verde]
                    : [PALETA.bordeGrid],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 350 },
            cutout: '64%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 10,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        color: PALETA.grisTexto,
                        font: { family: "'DM Sans', sans-serif", size: 12, weight: '600' }
                    }
                },
                tooltip: {
                    enabled: total > 0,
                    backgroundColor: PALETA.negro,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => {
                            const val = ctx.parsed || 0;
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${val} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}
// #endregion

// #endregion

// #region 3. ORQUESTADOR GLOBAL CON AHORRO DE RECURSOS
window.actualizarGraficas = function (forzar = false) {
    // Si no estás viendo el Dashboard, ahorra CPU/GPU y marca pendiente
    if (!forzar && window.vistaAdminActual && window.vistaAdminActual !== 'dashboard') {
        graficasPendientes = true;
        return;
    }

    if (timerDebounceGraficas) clearTimeout(timerDebounceGraficas);
    timerDebounceGraficas = setTimeout(() => {
        graficasPendientes = false;
        dibujarGraficaRentabilidad();
        dibujarGraficaRefacciones();
        dibujarGraficaAsesores();
        dibujarGraficaTaller();
    }, 80);
};

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => window.actualizarGraficas(true), 550);
});
// #endregion
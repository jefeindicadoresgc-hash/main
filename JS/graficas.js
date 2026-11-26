// #region 1. CONFIGURACIÓN GLOBAL, PALETA E INSTANCIAS
const instanciasGraficas = {
    termometro: null,
    proyeccion: null,
    asesores: null,
    taller: null,
    citasDiarias: null
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

function formatearEjeDinero(valor) {
    const num = window.parseNumero ? window.parseNumero(valor) : (parseFloat(valor) || 0);
    if (Math.abs(num) >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1000) return '$' + (num / 1000).toFixed(0) + 'k';
    return '$' + num;
}

function leerPorcentajeDOM(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    return window.parseNumero(el.textContent);
}

function calcularAvanceIdealMes() {
    const mes = parseInt(document.getElementById('select-mes')?.value || '1', 10) - 1;
    const anio = parseInt(document.getElementById('select-anio')?.value || '2026', 10);
    const diasLV = window.parseNumero(document.getElementById('ret-dias-lv')?.value) || 22;
    const diasSab = window.parseNumero(document.getElementById('ret-dias-sab')?.value) || 4;
    const totalDias = diasLV + diasSab;

    const hoy = new Date();
    let transcurridos = 0;

    if (hoy.getFullYear() > anio || (hoy.getFullYear() === anio && hoy.getMonth() > mes)) {
        transcurridos = totalDias;
    } else if (hoy.getFullYear() < anio || (hoy.getFullYear() === anio && hoy.getMonth() < mes)) {
        transcurridos = 0;
    } else {
        for (let d = 1; d <= hoy.getDate(); d++) {
            if (new Date(anio, mes, d).getDay() !== 0) transcurridos++;
        }
        if (transcurridos > totalDias) transcurridos = totalDias;
    }

    const pctIdeal = totalDias > 0 ? (transcurridos / totalDias) * 100 : 0;
    return { totalDias, transcurridos, restantes: Math.max(0, totalDias - transcurridos), pctIdeal };
}

function renderizarGrafica(clave, canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    try {
        if (instanciasGraficas[clave]) instanciasGraficas[clave].destroy();
        instanciasGraficas[clave] = new Chart(canvas.getContext('2d'), config);
    } catch (err) {
        console.error(`Error renderizando gráfica (${clave}):`, err);
    }
}
// #endregion

// #region 2. GRÁFICA 1: TERMÓMETRO DE AVANCE VS. DÍA DE HOY (%)
function dibujarTermometro30() {
    const { pctIdeal } = calcularAvanceIdealMes();

    const pill = document.getElementById('dash-dia-ideal-pill');
    if (pill) pill.innerText = `Ritmo ideal hoy: ${pctIdeal.toFixed(0)}%`;

    const ase = window.datosAsesoresGrafica || { objetivos: [], ventas: [] };
    const sumObjAse = (ase.objetivos || []).reduce((a, b) => a + b, 0);
    const sumVenAse = (ase.ventas || []).reduce((a, b) => a + b, 0);
    const alcAsesores = sumObjAse > 0 ? (sumVenAse / sumObjAse) * 100 : 0;

    const labels = [
        'Rentabilidad',
        'Refacc. Ventas',
        'Refacc. Compras',
        'Asesores',
        'Mantenimientos',
        'Órd. Normales'
    ];

    const valores = [
        leerPorcentajeDOM('kpi-alcance'),
        leerPorcentajeDOM('alcance-tot-ref'),
        leerPorcentajeDOM('tot-alc-comp'),
        parseFloat(alcAsesores.toFixed(1)),
        leerPorcentajeDOM('ret-alcance-mant'),
        leerPorcentajeDOM('ret-alcance-ord')
    ];

    const colores = valores.map(v => v >= pctIdeal ? PALETA.verde : PALETA.rojo);
    const maxEscala = Math.max(100, Math.ceil(Math.max(...valores, pctIdeal) / 10) * 10);

    const pluginLineaHoy = {
        id: 'lineaRitmoIdeal',
        afterDatasetsDraw(chart) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            const xPos = x.getPixelForValue(pctIdeal);
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([5, 4]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = PALETA.negro;
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.stroke();

            ctx.fillStyle = PALETA.negro;
            ctx.font = "700 10px 'Inter', sans-serif";
            ctx.textAlign = 'center';
            ctx.fillText(`HOY ${pctIdeal.toFixed(0)}%`, xPos, top - 6);
            ctx.restore();
        }
    };

    renderizarGrafica('termometro', 'chartTermometro30', {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Avance Actual (%)',
                data: valores,
                backgroundColor: colores,
                borderRadius: 6,
                barThickness: 18
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 18, right: 12 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: PALETA.negro,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => ` Avance: ${ctx.parsed.x.toFixed(1)}% (Ideal hoy: ${pctIdeal.toFixed(0)}%)`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: maxEscala,
                    grid: { color: PALETA.bordeGrid },
                    ticks: {
                        color: PALETA.grisTexto,
                        font: { family: "'Inter', sans-serif", size: 11 },
                        callback: (v) => v + '%'
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: PALETA.negro, font: { family: "'Inter', sans-serif", size: 11, weight: '600' } }
                }
            }
        },
        plugins: [pluginLineaHoy]
    });
}
// #endregion

// #region 3. GRÁFICA 2: PROYECCIÓN DE CIERRE A 30 DÍAS (RENTABILIDAD)
function dibujarProyeccion30() {
    const { totalDias, transcurridos, restantes } = calcularAvanceIdealMes();
    const objetivo = window.parseNumero(document.getElementById('input-objetivo')?.value);
    const utilidadReal = window.parseNumero(document.getElementById('kpi-utilidad')?.textContent);

    const metaDiaria = totalDias > 0 ? objetivo / totalDias : 0;
    const esperadoHoy = metaDiaria * transcurridos;
    const ritmoActual = transcurridos > 0 ? utilidadReal / transcurridos : 0;
    const proyeccionCierre = ritmoActual * totalDias;
    const pctProy = objetivo > 0 ? (proyeccionCierre / objetivo) * 100 : 0;

    const faltante = Math.max(0, objetivo - utilidadReal);
    const cuotaRestante = restantes > 0 ? (faltante / restantes) : faltante;
    const elCuota = document.getElementById('dash-cuota-restante');
    if (elCuota) {
        elCuota.innerText = window.mxnFormat.format(cuotaRestante) + ' / día';
        elCuota.style.color = cuotaRestante <= ritmoActual ? 'var(--color-ok)' : 'var(--color-error)';
    }

    const pillProy = document.getElementById('dash-proy-pill');
    if (pillProy) {
        pillProy.innerText = `Proyección cierre: ${pctProy.toFixed(0)}%`;
        pillProy.style.color = pctProy >= 100 ? 'var(--color-ok)' : 'var(--color-error)';
    }

    renderizarGrafica('proyeccion', 'chartProyeccion30', {
        type: 'bar',
        data: {
            labels: ['Utilidad Real', 'Esperado Hoy', 'Proyección 30d', 'Objetivo Mes'],
            datasets: [{
                label: 'Monto ($)',
                data: [
                    Math.round(utilidadReal),
                    Math.round(esperadoHoy),
                    Math.round(proyeccionCierre),
                    Math.round(objetivo)
                ],
                backgroundColor: [
                    PALETA.negro,
                    PALETA.grisSuave,
                    proyeccionCierre >= objetivo ? PALETA.verde : PALETA.rojo,
                    '#9ca3af'
                ],
                borderRadius: 8,
                maxBarThickness: 46
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: PALETA.negro,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => ` ${window.mxnFormat.format(ctx.parsed.y || 0)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: PALETA.negro, font: { family: "'Inter', sans-serif", size: 11, weight: '600' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: PALETA.bordeGrid },
                    border: { display: false },
                    ticks: {
                        color: PALETA.grisTexto,
                        font: { family: "'Inter', sans-serif", size: 11 },
                        callback: (v) => formatearEjeDinero(v)
                    }
                }
            }
        }
    });
}
// #endregion

// #region 4. GRÁFICAS 3 Y 4: ASESORES Y TALLER
function dibujarGraficaAsesores() {
    const aseData = window.datosAsesoresGrafica || { labels: [], objetivos: [], ventas: [] };
    const hayDatos = Array.isArray(aseData.labels) && aseData.labels.length > 0;

    renderizarGrafica('asesores', 'chartAsesores', {
        type: 'bar',
        data: {
            labels: hayDatos ? aseData.labels : ['Sin datos'],
            datasets: [
                { label: 'Objetivo', data: hayDatos ? aseData.objetivos : [0], backgroundColor: PALETA.grisSuave, borderRadius: 6, maxBarThickness: 32 },
                { label: 'Venta Real', data: hayDatos ? aseData.ventas : [0], backgroundColor: PALETA.negro, borderRadius: 6, maxBarThickness: 32 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', align: 'end', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', color: PALETA.grisTexto } },
                tooltip: {
                    backgroundColor: PALETA.negro,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${window.mxnFormat.format(ctx.parsed.y || 0)}` }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: PALETA.grisTexto, font: { family: "'Inter', sans-serif", size: 11, weight: '600' } } },
                y: { beginAtZero: true, grid: { color: PALETA.bordeGrid }, border: { display: false }, ticks: { color: PALETA.grisTexto, callback: (v) => formatearEjeDinero(v) } }
            }
        }
    });
}

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
                backgroundColor: total > 0 ? [PALETA.negro, PALETA.alerta, PALETA.verde] : [PALETA.bordeGrid],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '64%',
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle', color: PALETA.grisTexto } },
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

// #region 4B. GRÁFICA DE CONTROL: CITAS DIARIAS (MÍN 8 / MÁX 16)
window.dibujarGraficaCitasDiarias = function () {
    const canvas = document.getElementById('chartCitasDiarias');
    if (!canvas || typeof Chart === 'undefined') return;

    const LCI = 8;
    const LCS = 16;
    const dataCitas = window.datosCitasDiariasGrafica || { dias: [], conteos: [] };
    const hayDatos = Array.isArray(dataCitas.dias) && dataCitas.dias.length > 0;

    const conteos = hayDatos ? dataCitas.conteos : [0];
    const suma = conteos.reduce((acc, n) => acc + n, 0);
    const promedio = hayDatos ? (suma / conteos.length) : 0;

    const pill = document.getElementById('citas-promedio-pill');
    if (pill) {
        pill.innerText = `Promedio: ${promedio.toFixed(1)} / día · LCI: ${LCI} · LCS: ${LCS}`;
        pill.style.color = (promedio >= LCI && promedio <= LCS) ? 'var(--color-ok)' : 'var(--color-error)';
    }

    const maxDato = Math.max(...conteos, LCS);
    const ejeYMax = Math.ceil((maxDato + 2) / 2) * 2;

    const coloresPuntos = conteos.map(v => (v < LCI || v > LCS) ? PALETA.rojo : '#1d4ed8');
    const radiosPuntos = conteos.map(v => (v < LCI || v > LCS) ? 5.5 : 4);

    const pluginLimitesControl = {
        id: 'limitesControlCitas',
        afterDatasetsDraw(chart) {
            const { ctx, chartArea: { left, right }, scales: { y } } = chart;
            const lineas = [
                { valor: LCS, color: PALETA.rojo, texto: `LCS = ${LCS}` },
                { valor: promedio, color: PALETA.verde, texto: `X̄ = ${promedio.toFixed(1)}` },
                { valor: LCI, color: PALETA.rojo, texto: `LCI = ${LCI}` }
            ];

            ctx.save();
            lineas.forEach(l => {
                if (l.valor === 0 && !hayDatos) return;
                const yPos = y.getPixelForValue(l.valor);
                ctx.beginPath();
                ctx.lineWidth = 1.8;
                ctx.strokeStyle = l.color;
                ctx.moveTo(left, yPos);
                ctx.lineTo(right, yPos);
                ctx.stroke();

                ctx.fillStyle = l.color;
                ctx.font = "700 11px 'Inter', sans-serif";
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(l.texto, right + 8, yPos);
            });
            ctx.restore();
        }
    };

    renderizarGrafica('citasDiarias', 'chartCitasDiarias', {
        type: 'line',
        data: {
            labels: hayDatos ? dataCitas.dias : ['Sin citas'],
            datasets: [{
                label: 'Citas del día',
                data: conteos,
                borderColor: '#1d4ed8',
                backgroundColor: '#1d4ed8',
                borderWidth: 2,
                tension: 0,
                pointBackgroundColor: coloresPuntos,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1.5,
                pointRadius: radiosPuntos,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 82, top: 8 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: PALETA.negro,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => {
                            const val = ctx.parsed.y || 0;
                            const estado = val < LCI ? ' (Bajo mínimo)' : (val > LCS ? ' (Sobre máximo)' : ' (En control)');
                            return ` Citas: ${val}${estado}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: PALETA.grisTexto, font: { family: "'Inter', sans-serif", size: 11, weight: '600' } }
                },
                y: {
                    beginAtZero: true,
                    max: ejeYMax,
                    grid: { color: PALETA.bordeGrid },
                    ticks: {
                        stepSize: 2,
                        color: PALETA.grisTexto,
                        font: { family: "'Inter', sans-serif", size: 11 }
                    }
                }
            }
        },
        plugins: [pluginLimitesControl]
    });
};
// #endregion

// #region 5. ORQUESTADOR GLOBAL
window.actualizarGraficas = function (forzar = false) {
    if (!forzar && window.vistaAdminActual && window.vistaAdminActual !== 'dashboard') return;

    if (timerDebounceGraficas) clearTimeout(timerDebounceGraficas);
    timerDebounceGraficas = setTimeout(() => {
        dibujarTermometro30();
        dibujarProyeccion30();
        dibujarGraficaAsesores();
        dibujarGraficaTaller();
    }, 80);
};

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => window.actualizarGraficas(true), 600);
});
// #endregion
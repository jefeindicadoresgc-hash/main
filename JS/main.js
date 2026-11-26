// #region 1. CONEXIONES FIREBASE (DOBLE BASE DE DATOS) Y UTILIDADES GLOBALES
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

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(configOrdenes);
}

window.appPython = null;
window.firestorePython = null;
try {
    window.appPython = firebase.initializeApp(configAsesores, "AppPython");
    window.firestorePython = window.appPython.firestore();
} catch (error) {
    window.appPython = firebase.app("AppPython");
    window.firestorePython = window.appPython.firestore();
}

window.database = firebase.database();
window.dbFirestore = window.firestorePython;

window.DB_NOTAS_COMPARTIDAS = {};
window.mxnFormat = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
window.datosRentabilidad = { totalGlobal: 0, items: [] };
window.utilidadMostrador = 0;
window.datosAsesores = { caratula: {}, kpi_config: {}, kpi_data: {}, servicios: {}, historial: {} };
window.objFilaMemoria = {};
window.vistaAdminActual = 'dashboard';

window.parseNumero = function (valor) {
    if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
    if (valor === null || valor === undefined) return 0;
    const limpio = String(valor).replace(/[^0-9.-]+/g, "");
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
};

window.safeJSONParse = function (texto, respaldo = {}) {
    if (!texto) return respaldo;
    try { return JSON.parse(texto); } catch { return respaldo; }
};

window.escapeHTML = function (texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};
// #endregion

// #region 2. INTERFAZ, NAVEGACIÓN BLINDADA, CAJÓN Y TOAST
const titulosAdmin = {
    dashboard: "KPI Ejecutivo · Hyundai Coatzacoalcos",
    rentabilidad: "Rentabilidad · Hyundai Coatzacoalcos",
    refacciones: "Refacciones · Hyundai Coatzacoalcos",
    asesores: "Asesores y Comisiones · Hyundai Coatzacoalcos",
    citas: "Citas y Retención · Hyundai Coatzacoalcos",
    prepiking: "Prepiking · Hyundai Coatzacoalcos",
    taller: "Taller · Hyundai Coatzacoalcos",
    fallas: "Reportes de Fallas · Hyundai Coatzacoalcos"
};

let toastTimer = null;
window.mostrarToast = function (mensaje) {
    const el = document.getElementById('toastAviso');
    if (!el) return alert(mensaje);
    el.innerText = mensaje;
    el.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3400);
};
window.mostrarAlertaSpidey = window.mostrarToast;

window.toggleDrawer = function (forzarCerrar = false) {
    const drawer = document.getElementById('side-drawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (!drawer) return;
    const abrir = forzarCerrar ? false : !drawer.classList.contains('open');
    drawer.classList.toggle('open', abrir);
    backdrop?.classList.toggle('open', abrir);
};

window.cambiarVistaAdmin = function (vista) {
    if (!vista) return;
    window.vistaAdminActual = vista;

    document.querySelectorAll('.action[data-view]').forEach(btn => {
        btn.classList.toggle('activa', btn.dataset.view === vista);
    });

    document.querySelectorAll('section[id^="vista-"]').forEach(sec => {
        sec.classList.add('oculto');
    });

    const target = document.getElementById(`vista-${vista}`);
    if (target) target.classList.remove('oculto');

    const tituloEl = document.getElementById('tituloAdmin');
    if (tituloEl) tituloEl.innerText = titulosAdmin[vista] || "Administrador KPI";

    if (vista === 'dashboard' && typeof window.actualizarGraficas === 'function') {
        setTimeout(() => window.actualizarGraficas(true), 60);
    }
    if (vista === 'citas' && typeof window.dibujarGraficaCitasDiarias === 'function') {
        setTimeout(() => window.dibujarGraficaCitasDiarias(), 60);
    }
    if (vista === 'prepiking' && typeof window.renderizarPrepiking === 'function') {
        window.renderizarPrepiking();
    }
};

// Delegación global de clics en el menú lateral (nunca falla)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.action[data-view]');
    if (btn && btn.dataset.view) {
        window.cambiarVistaAdmin(btn.dataset.view);
    }
});
// #endregion

// #region 3. SNAPSHOTS MENSUALES (GUARDAR Y CARGAR EN FIRESTORE)
window.subirSnapshotMes = function () {
    if (!window.dbFirestore) return window.mostrarToast("Sin conexión a Firestore.");
    const mes = document.getElementById('select-mes').value;
    const anio = document.getElementById('select-anio').value;
    const clave = `${anio}_${mes}`;
    const fechaGuardado = new Date().toLocaleString('es-MX');

    const snapshotCompleto = {
        fecha_registro: fechaGuardado,
        mes,
        anio,
        objetivoMensual: window.parseNumero(document.getElementById('input-objetivo')?.value) || 1000000,
        rentabilidad: window.datosRentabilidad,
        asesores: window.datosAsesores,
        ordenesNotas: window.DB_NOTAS_COMPARTIDAS,
        ordenesMemoria: window.objOrdenesFacturadas || {},
        anioPasadoMemoria: window.objAnioPasado || {},
        objetivosFilaMemoria: window.objFilaMemoria || {},
        retencionConfig: {
            diasLV: document.getElementById('ret-dias-lv')?.value || 22,
            diasSab: document.getElementById('ret-dias-sab')?.value || 4,
            tecnicos: document.getElementById('ret-tecnicos')?.value || 5,
            objMant: document.getElementById('ret-obj-mant')?.value || 300,
            objOrd: document.getElementById('ret-obj-ord')?.value || 250
        }
    };

    window.dbFirestore.collection('historico_mensual').doc(clave).set(snapshotCompleto)
        .then(() => {
            window.mostrarToast(`Mes ${mes}/${anio} guardado en la nube.`);
            const lbl = document.getElementById('rentabilidad-fecha-act');
            if (lbl) lbl.innerText = "ÚLT. ACT: " + fechaGuardado;
            localStorage.removeItem(`objetivo_${anio}_${mes}`);
        })
        .catch((error) => {
            console.error("Error al guardar snapshot:", error);
            window.mostrarToast("Error al guardar: " + error.message);
        });
};

window.cargarSnapshotMes = function (silent = false) {
    if (!window.dbFirestore) return;
    const mes = document.getElementById('select-mes').value;
    const anio = document.getElementById('select-anio').value;
    const clave = `${anio}_${mes}`;

    const hoy = new Date();
    const esMesEnCurso = (mes === String(hoy.getMonth() + 1).padStart(2, '0') && anio === String(hoy.getFullYear()));

    if (document.getElementById('rentabilidad-fecha-act')) document.getElementById('rentabilidad-fecha-act').innerText = "ÚLT. ACT: BUSCANDO...";

    window.objOrdenesFacturadas = {};
    window.objAnioPasado = {};
    window.objFilaMemoria = {};
    window.datosRentabilidad = { items: [], totalGlobal: 0 };

    if (!esMesEnCurso) {
        window.datosAsesores = { caratula: {}, kpi_config: {}, kpi_data: {}, servicios: {}, historial: {} };
        ['asesores-ventas-objetivos', 'asesores-kpi-refacciones', 'asesores-pagos-totales', 'asesores-cantidad-servicios'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = "";
        });
        const labelAsesores = document.getElementById('asesores-fecha-act');
        if (labelAsesores) labelAsesores.innerText = "ÚLTIMA SINCRONIZACIÓN: SIN DATOS";
        window.totalServiciosAsesores = 0;
    } else if (window.datosAsesoresLive) {
        window.datosAsesores = window.datosAsesoresLive;
        if (typeof window.construirTablasAsesores === 'function') window.construirTablasAsesores();
    }

    window.dbFirestore.collection('historico_mensual').doc(clave).get()
        .then((doc) => {
            const objLocalGuardado = localStorage.getItem(`objetivo_${anio}_${mes}`);
            const inputObj = document.getElementById('input-objetivo');

            if (doc.exists) {
                const data = doc.data();
                if (document.getElementById('rentabilidad-fecha-act')) {
                    document.getElementById('rentabilidad-fecha-act').innerText = "ÚLT. ACT: " + (data.fecha_registro || "SIN REGISTRO");
                }

                if (inputObj) {
                    if (objLocalGuardado !== null) inputObj.value = objLocalGuardado;
                    else if (data.objetivoMensual) inputObj.value = data.objetivoMensual;
                    else inputObj.value = 1000000;
                }

                if (data.ordenesMemoria) window.objOrdenesFacturadas = data.ordenesMemoria;
                if (data.anioPasadoMemoria) window.objAnioPasado = data.anioPasadoMemoria;
                if (data.objetivosFilaMemoria) window.objFilaMemoria = data.objetivosFilaMemoria;

                if (data.rentabilidad) window.datosRentabilidad = data.rentabilidad;
                if (data.asesores && !esMesEnCurso) {
                    window.datosAsesores = data.asesores;
                    if (typeof window.construirTablasAsesores === 'function') window.construirTablasAsesores();
                }

                if (data.retencionConfig) {
                    if (document.getElementById('ret-dias-lv')) document.getElementById('ret-dias-lv').value = data.retencionConfig.diasLV;
                    if (document.getElementById('ret-dias-sab')) document.getElementById('ret-dias-sab').value = data.retencionConfig.diasSab;
                    if (document.getElementById('ret-tecnicos')) document.getElementById('ret-tecnicos').value = data.retencionConfig.tecnicos;
                    if (document.getElementById('ret-obj-mant')) document.getElementById('ret-obj-mant').value = data.retencionConfig.objMant;
                    if (document.getElementById('ret-obj-ord')) document.getElementById('ret-obj-ord').value = data.retencionConfig.objOrd;
                }

                if (!silent) window.mostrarToast(`Datos de ${mes}/${anio} cargados.`);
            } else {
                if (document.getElementById('rentabilidad-fecha-act')) document.getElementById('rentabilidad-fecha-act').innerText = "ÚLT. ACT: SIN DATOS GUARDADOS";
                if (inputObj) inputObj.value = objLocalGuardado !== null ? objLocalGuardado : 1000000;
            }

            if (typeof window.calcularRentabilidad === 'function') window.calcularRentabilidad();
            if (typeof window.calcularRetencion === 'function') window.calcularRetencion();
        })
        .catch((error) => {
            console.error("Error al cargar snapshot:", error);
            if (typeof window.calcularRentabilidad === 'function') window.calcularRentabilidad();
        });
};
// #endregion

// #region 4. BANDEJA DE REPORTES DE FALLAS (EN VIVO)
function iniciarBandejaFallas() {
    if (!window.appPython) return;
    window.appPython.database().ref('reportes_fallas').on('value', (snap) => {
        const data = snap.val() || {};
        const lista = Object.values(data).sort((a, b) => (b.ts || 0) - (a.ts || 0));
        const pendientes = lista.filter(r => !r.leido);

        const badge = document.getElementById('badgeFallasAdmin');
        if (badge) {
            badge.innerText = pendientes.length;
            badge.classList.toggle('oculto', pendientes.length === 0);
        }

        const tbody = document.getElementById('tbody-fallas-admin');
        if (!tbody) return;

        if (lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding:20px; color:var(--texto-secundario);">Sin reportes registrados.</td></tr>`;
            return;
        }

        tbody.innerHTML = lista.map(r => `
            <tr style="${r.leido ? 'opacity:0.55;' : 'background:#fff9eb;'}">
                <td>${window.escapeHTML(r.fechaStr)}</td>
                <td><strong>${window.escapeHTML(r.asesor || 'Usuario')}</strong></td>
                <td>${window.escapeHTML(r.apartado || 'General')}</td>
                <td style="text-align:left;">${window.escapeHTML(r.descripcion)}</td>
                <td>
                    ${r.leido
                        ? `<span style="color:var(--color-ok); font-weight:700; font-size:0.78rem;">✓ Atendido</span>`
                        : `<button type="button" class="btn-pildora" style="padding:4px 10px; font-size:0.75rem;" onclick="window.marcarFallaAtendida('${window.escapeHTML(r.id)}')">✓ Marcar atendido</button>`
                    }
                </td>
            </tr>
        `).join('');
    }, (err) => console.error("Error leyendo reportes_fallas:", err));
}

window.marcarFallaAtendida = function (id) {
    if (!window.appPython || !id) return;
    window.appPython.database().ref(`reportes_fallas/${id}`).update({ leido: true })
        .then(() => window.mostrarToast("Reporte marcado como atendido."))
        .catch(err => window.mostrarToast("Error al actualizar reporte: " + err.message));
};
// #endregion

// #region 5. INICIALIZACIÓN Y ATAJOS DE TECLADO
document.addEventListener("DOMContentLoaded", () => {
    const now = new Date();
    const elMes = document.getElementById('select-mes');
    const elAnio = document.getElementById('select-anio');
    if (elMes) elMes.value = String(now.getMonth() + 1).padStart(2, '0');
    if (elAnio) elAnio.value = String(now.getFullYear());

    const selectDiaCitas = document.getElementById('select-dia-citas');
    if (selectDiaCitas) {
        for (let i = 1; i <= 31; i++) {
            const val = String(i).padStart(2, '0');
            selectDiaCitas.innerHTML += `<option value="${val}">Día ${val}</option>`;
        }
    }

    if (elMes) elMes.addEventListener('change', () => window.cargarSnapshotMes(true));
    if (elAnio) elAnio.addEventListener('change', () => window.cargarSnapshotMes(true));

    const dockMenu = document.getElementById('dockMenu');
    const areaTrabajo = document.getElementById('areaTrabajo');
    document.getElementById('btnToggleDock')?.addEventListener('click', () => {
        const escondido = dockMenu.classList.toggle('escondido');
        areaTrabajo.classList.toggle('dock-oculto', escondido);
    });

    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            window.subirSnapshotMes();
        } else if (e.key === 'Escape') {
            window.toggleDrawer(true);
            const modal = document.getElementById('citas-modal');
            if (modal) modal.style.display = 'none';
        }
    });

    iniciarBandejaFallas();
    setTimeout(() => window.cargarSnapshotMes(true), 450);
});
// #endregion
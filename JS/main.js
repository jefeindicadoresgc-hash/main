// =========================================================
// ARCHIVO: main.js - NÚCLEO Y CONEXIONES (RESTAURADO)
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

if (typeof firebase !== 'undefined' && !firebase.apps.length) firebase.initializeApp(configOrdenes);

window.appPython = null; window.firestorePython = null;
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

document.addEventListener("DOMContentLoaded", () => {
    let now = new Date();
    let mesActual = String(now.getMonth() + 1).padStart(2, '0');
    let anioActual = String(now.getFullYear());
    
    let elMes = document.getElementById('select-mes');
    let elAnio = document.getElementById('select-anio');
    if (elMes) elMes.value = mesActual;
    if (elAnio) elAnio.value = anioActual;

    let selectDiaCitas = document.getElementById('select-dia-citas');
    if(selectDiaCitas) {
        for(let i = 1; i <= 31; i++) {
            let val = i < 10 ? '0' + i : '' + i;
            selectDiaCitas.innerHTML += `<option value="${val}">Día ${val}</option>`;
        }
    }

    if (elMes) { elMes.addEventListener('change', () => { window.cargarSnapshotMes(true); }); }
    if (elAnio) { elAnio.addEventListener('change', () => { window.cargarSnapshotMes(true); }); }

    setTimeout(() => { if(typeof cargarSnapshotMes === 'function') cargarSnapshotMes(true); }, 500);

    const introScreen = document.getElementById('intro-screen');
    const introLogo = document.getElementById('intro-logo');
    const introVideo = document.getElementById('intro-video');
    let secretBuffer = "";

    if(introVideo) {
        const introsDisponibles = ['INTRO.mp4', 'INTRO1.mp4', 'INTRO2.mp4', 'INTRO3.mp4', 'INTRO4.mp4', 'INTRO5.mp4'];
        const introElegido = introsDisponibles[Math.floor(Math.random() * introsDisponibles.length)];
        introVideo.src = 'MEDIA/' + introElegido;
    }

    if(introLogo) {
        introLogo.addEventListener('click', () => {
            introLogo.style.display = 'none';
            if(introVideo) { introVideo.style.display = 'block'; introVideo.play(); }
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

window.toggleDrawer = function() { document.getElementById('side-drawer').classList.toggle('open'); };
window.toggleDrawerAcc = function() { document.getElementById('side-drawer-acc').classList.toggle('open'); };

window.subirSnapshotMes = function() {
    if (!window.dbFirestore) return;
    let mes = document.getElementById('select-mes').value;
    let anio = document.getElementById('select-anio').value;
    let clave = `${anio}_${mes}`;
    let fechaGuardado = new Date().toLocaleString();

    let snapshotCompleto = {
        fecha_registro: fechaGuardado, 
        mes: mes, anio: anio,
        objetivoMensual: document.getElementById('input-objetivo')?.value || 1000000,
        rentabilidad: window.datosRentabilidad,
        asesores: window.datosAsesores, 
        ordenesNotas: window.DB_NOTAS_COMPARTIDAS,
        ordenesMemoria: window.objOrdenesFacturadas || {}, 
        anioPasadoMemoria: window.objAnioPasado || {},
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
            alert(`¡Datos del mes ${mes}/${anio} guardados correctamente en la nube! ☁`); 
            document.getElementById('rentabilidad-fecha-act').innerText = "ÚLT. ACT: " + fechaGuardado;
            localStorage.removeItem(`objetivo_${anio}_${mes}`);
        })
        .catch((error) => { console.error("Error: ", error); alert("Error al subir info: " + error.message); });
};

window.cargarSnapshotMes = function(silent = false) {
    if (!window.dbFirestore) return;
    let mes = document.getElementById('select-mes').value;
    let anio = document.getElementById('select-anio').value;
    let clave = `${anio}_${mes}`;

    // SE RESPETA EL OBJETIVO POR DEFECTO
    document.getElementById('input-objetivo').value = 1000000; 
    document.getElementById('rentabilidad-fecha-act').innerText = "ÚLT. ACT: BUSCANDO...";
    
    window.objOrdenesFacturadas = {}; window.objAnioPasado = {};
    window.datosRentabilidad = { items: [], totalGlobal: 0 };
    if(typeof calcularRentabilidad === 'function') window.calcularRentabilidad();
    
    window.datosAsesores = { caratula: {}, kpi_config: {}, kpi_data: {}, servicios: {}, historial: {} };
    let divVentas = document.getElementById('asesores-ventas-objetivos'); if(divVentas) divVentas.innerHTML = "";
    let divKpi = document.getElementById('asesores-kpi-refacciones'); if(divKpi) divKpi.innerHTML = "";
    let divPagos = document.getElementById('asesores-pagos-totales'); if(divPagos) divPagos.innerHTML = "";
    let divServ = document.getElementById('asesores-cantidad-servicios'); if(divServ) divServ.innerHTML = "";
    let labelAsesores = document.getElementById('asesores-fecha-act'); if(labelAsesores) labelAsesores.innerText = "ÚLTIMA SINCRONIZACIÓN: SIN DATOS";

    window.totalServiciosAsesores = 0;
    if(typeof window.calcularRetencion === 'function') window.calcularRetencion();

    window.dbFirestore.collection('historico_mensual').doc(clave).get()
        .then((doc) => {
            let objLocalGuardado = localStorage.getItem(`objetivo_${anio}_${mes}`);

            if (doc.exists) {
                let data = doc.data();
                document.getElementById('rentabilidad-fecha-act').innerText = "ÚLT. ACT: " + (data.fecha_registro || "SIN REGISTRO");
                
                if (objLocalGuardado) document.getElementById('input-objetivo').value = objLocalGuardado;
                else if (data.objetivoMensual) document.getElementById('input-objetivo').value = data.objetivoMensual;
                
                if (data.ordenesMemoria) window.objOrdenesFacturadas = data.ordenesMemoria;
                if (data.anioPasadoMemoria) window.objAnioPasado = data.anioPasadoMemoria;
                if (data.rentabilidad) { window.datosRentabilidad = data.rentabilidad; if(typeof calcularRentabilidad === 'function') window.calcularRentabilidad(); }
                if (data.asesores) { window.datosAsesores = data.asesores; if(typeof construirTablasAsesores === 'function') window.construirTablasAsesores(); }
                
                if (data.retencionConfig) {
                    if(document.getElementById('ret-dias-lv')) document.getElementById('ret-dias-lv').value = data.retencionConfig.diasLV;
                    if(document.getElementById('ret-dias-sab')) document.getElementById('ret-dias-sab').value = data.retencionConfig.diasSab;
                    if(document.getElementById('ret-tecnicos')) document.getElementById('ret-tecnicos').value = data.retencionConfig.tecnicos;
                    if(document.getElementById('ret-obj-mant')) document.getElementById('ret-obj-mant').value = data.retencionConfig.objMant;
                    if(document.getElementById('ret-obj-ord')) document.getElementById('ret-obj-ord').value = data.retencionConfig.objOrd;
                }
                if(typeof window.calcularRetencion === 'function') window.calcularRetencion();

                if(!silent) alert(`Datos del mes ${mes}/${anio} cargados con éxito. 🔍`);
            } else { 
                document.getElementById('rentabilidad-fecha-act').innerText = "ÚLT. ACT: SIN DATOS";
                if (objLocalGuardado) document.getElementById('input-objetivo').value = objLocalGuardado;
            }
            
            if(typeof window.calcularRentabilidad === 'function') window.calcularRentabilidad();

        }).catch((error) => { console.error("Error: ", error); });
};
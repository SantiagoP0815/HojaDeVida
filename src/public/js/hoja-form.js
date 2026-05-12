function mostrarSeccion(id) {
    document.querySelectorAll('.seccion-tab').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));

    const target = document.getElementById('sec-' + id);
    if (target) {
        target.classList.add('active');
        document.querySelector('.editor-content').scrollTo({ top: 0, behavior: 'smooth' });
    }

    const navBtn = document.getElementById('nav-btn-' + id);
    if (navBtn) navBtn.classList.add('active');
}

function togglePais(radio) {
    const input = document.getElementById('inputPais');
    if (radio.value.includes('COLOMBIA')) { input.value = 'COLOMBIA'; input.readOnly = true; }
    else { input.value = ''; input.readOnly = false; }
}

function enviarFormulario() {
    const form = document.getElementById('hojaForm');
    const btnDesktop = document.getElementById('btnGuardarDesktop');
    const btnMovil = document.getElementById('btnGuardarMovil');

    if (btnDesktop) {
        btnDesktop.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
        btnDesktop.disabled = true;
    }
    if (btnMovil) {
        btnMovil.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btnMovil.disabled = true;
    }

    form.submit();
}

function descargarPDF() { window.location.href = '/hoja/generar-pdf'; }

function agregarBloque(containerId, itemClass) {
    const container = document.getElementById(containerId);
    const items = container.querySelectorAll('.' + itemClass);

    if (items.length >= 5) return alert('Máximo 5 registros.');

    const clone = items[0].cloneNode(true);

    let newIndex = items.length;
    if (containerId === 'container-empleos') newIndex = items.length + 1;

    clone.querySelectorAll('input, select, label').forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
            el.value = '';
            if (el.type === 'radio' || el.type === 'checkbox') el.checked = false;
        }
        if (el.name) el.name = el.name.replace(/_\d+$/, '_' + newIndex);
        if (el.id) el.id = el.id.replace(/_\d+$/, '_' + newIndex);
        if (el.getAttribute('for')) {
            const oldFor = el.getAttribute('for');
            el.setAttribute('for', oldFor.replace(/_\d+$/, '_' + newIndex));
        }
    });

    const links = clone.querySelectorAll('a');
    links.forEach(l => l.remove());

    container.appendChild(clone);
}

function eliminarBloque(btn) {
    const item = btn.closest('.dynamic-item');
    const container = item.parentElement;
    const items = container.querySelectorAll('.dynamic-item');

    if (items.length <= 1) {
        alert('Debe haber al menos un registro. Si no tiene información, puede dejarlo vacío.');
        return;
    }

    item.remove();
    reindexarBloques(container);
}

function reindexarBloques(container) {
    const items = container.querySelectorAll('.dynamic-item');
    const isEmpleos = container.id === 'container-empleos';

    items.forEach((item, i) => {
        const newIndex = isEmpleos ? i + 1 : i;

        item.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.name) el.name = el.name.replace(/_\d+$/, '_' + newIndex);
            if (el.id) el.id = el.id.replace(/_\d+$/, '_' + newIndex);
        });
        item.querySelectorAll('label').forEach(el => {
            if (el.getAttribute('for')) el.setAttribute('for', el.getAttribute('for').replace(/_\d+$/, '_' + newIndex));
        });
    });
}

function calcularTiempoTotal() {
    const aniosPub = parseInt(document.querySelector('input[name="anios_servidor_publico"]').value) || 0;
    const aniosPriv = parseInt(document.querySelector('input[name="anios_sector_privado"]').value) || 0;
    const aniosInd = parseInt(document.querySelector('input[name="anios_trabajador_independiente"]').value) || 0;

    const mesesPub = parseInt(document.querySelector('input[name="meses_servidor_publico"]').value) || 0;
    const mesesPriv = parseInt(document.querySelector('input[name="meses_sector_privado"]').value) || 0;
    const mesesInd = parseInt(document.querySelector('input[name="meses_trabajador_independiente"]').value) || 0;

    let totalAnios = aniosPub + aniosPriv + aniosInd;
    let totalMeses = mesesPub + mesesPriv + mesesInd;

    if (totalMeses >= 12) {
        totalAnios += Math.floor(totalMeses / 12);
        totalMeses = totalMeses % 12;
    }

    document.querySelector('input[name="anios_total_experiencia"]').value = totalAnios;
    document.querySelector('input[name="meses_total_experiencia"]').value = totalMeses;
}

document.addEventListener('DOMContentLoaded', function () {
    // Event delegation for section navigation
    document.addEventListener('click', function (e) {
        const navTarget = e.target.closest('[data-seccion]');
        if (navTarget) mostrarSeccion(navTarget.dataset.seccion);

        const addTarget = e.target.closest('[data-agregar-container]');
        if (addTarget) agregarBloque(addTarget.dataset.agregarContainer, addTarget.dataset.agregarClase);

        const deleteTarget = e.target.closest('.btn-delete-float');
        if (deleteTarget) eliminarBloque(deleteTarget);

        const pdfTarget = e.target.closest('.btn-descargar-pdf');
        if (pdfTarget) descargarPDF();
    });

    // Save buttons
    const btnDesktop = document.getElementById('btnGuardarDesktop');
    const btnMovil = document.getElementById('btnGuardarMovil');
    if (btnDesktop) btnDesktop.addEventListener('click', enviarFormulario);
    if (btnMovil) btnMovil.addEventListener('click', enviarFormulario);

    // Nacionalidad toggle
    document.querySelectorAll('input[name="nacionalidad"]').forEach(radio => {
        radio.addEventListener('change', function () { togglePais(this); });
    });

    // Tiempo total auto-calculate
    const inputsTiempo = [
        'anios_servidor_publico', 'meses_servidor_publico',
        'anios_sector_privado', 'meses_sector_privado',
        'anios_trabajador_independiente', 'meses_trabajador_independiente'
    ];
    inputsTiempo.forEach(name => {
        const input = document.querySelector(`input[name="${name}"]`);
        if (input) {
            input.addEventListener('input', calcularTiempoTotal);
            input.addEventListener('change', calcularTiempoTotal);
        }
    });
});

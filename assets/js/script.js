/* ==========================================================
SPIN OUTFIT — app.js
Lógica principal: gestión de ruletas, canvas, localStorage
========================================================== */

// ──────────────────────────────────────────────
// PALETA DE COLORES PARA LOS SEGMENTOS DE LA RULETA
// (puedes añadir o cambiar estos colores)
// ──────────────────────────────────────────────
const PALETA_RULETA = [
'#4b2d7f', // morado profundo
'#2a1f5e', // azul-morado oscuro
'#7b4fc9', // morado medio
'#3d1a6e', // índigo
'#6238a8', // violeta medio
'#1e1640', // azul muy oscuro
'#5c3590', // morado lavanda
'#341566', // uva oscura
];

// ──────────────────────────────────────────────
// PERSISTENCIA: carga y guarda en localStorage
// ──────────────────────────────────────────────
const STORAGE_KEY = 'spinoutfit_ruletas_v1';

function cargarDatos() {
try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
} catch {
    return [];
}
}

function guardarDatos(datos) {
try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
} catch (e) {
    console.warn('No se pudo guardar en localStorage', e);
}
}

// ──────────────────────────────────────────────
// ESTADO GLOBAL
// ──────────────────────────────────────────────
let ruletas = cargarDatos(); // array de { id, nombre, genero, items: [] }
let ruletaActualId = null;   // ID de la ruleta que se está viendo
let anguloActual = 0;        // ángulo acumulado del canvas
let animFrame = null;        // referencia al requestAnimationFrame

// ──────────────────────────────────────────────
// REFS DE DOM
// ──────────────────────────────────────────────
const ruletasGrid     = document.getElementById('ruletasGrid');
const emptyState      = document.getElementById('emptyState');
const controlPanel    = document.getElementById('controlPanel');
const ruletaDetalle   = document.getElementById('ruletaDetalle');

const modalCrear      = document.getElementById('modalCrear');
const inputNombre     = document.getElementById('inputNombreRuleta');
const inputGenero     = document.getElementById('inputGenero');

const detalleTitulo   = document.getElementById('detalleTitulo');
const detalleGenero   = document.getElementById('detalleGenero');
const itemsList       = document.getElementById('itemsList');
const inputNuevoItem  = document.getElementById('inputNuevoItem');

const canvas          = document.getElementById('ruletaCanvas');
const ctx             = canvas.getContext('2d');
const btnGirar        = document.getElementById('btnGirar');
const resultadoBox    = document.getElementById('resultado');
const resultadoTexto  = document.getElementById('resultadoTexto');

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function uid() {
return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getRuletaById(id) {
return ruletas.find(r => r.id === id) || null;
}

// ──────────────────────────────────────────────
// RENDERIZAR GRID DE RULETAS
// ──────────────────────────────────────────────
function renderGrid() {
ruletasGrid.innerHTML = '';

if (ruletas.length === 0) {
    emptyState.classList.add('visible');
    return;
}

emptyState.classList.remove('visible');

ruletas.forEach(r => {
    const card = document.createElement('div');
    card.className = 'ruleta-card';
    card.dataset.id = r.id;
    card.innerHTML = `
    <p class="card-categoria">${escapeHtml(r.nombre)}</p>
    <div class="card-meta">
        <span class="badge ${r.genero}">${r.genero}</span>
        <span class="card-count">${r.items.length} prenda${r.items.length !== 1 ? 's' : ''}</span>
    </div>
    <span class="card-arrow">→</span>
    `;
    card.addEventListener('click', () => abrirDetalle(r.id));
    ruletasGrid.appendChild(card);
});
}

// ──────────────────────────────────────────────
// ABRIR DETALLE DE RULETA
// ──────────────────────────────────────────────
function abrirDetalle(id) {
ruletaActualId = id;
const r = getRuletaById(id);
if (!r) return;

detalleTitulo.textContent = r.nombre;
detalleGenero.textContent = r.genero;
detalleGenero.className = `badge ${r.genero}`;

controlPanel.style.display = 'none';
ruletaDetalle.hidden = false;

anguloActual = 0;
resultadoBox.hidden = true;

renderItems();
dibujarRuleta(r.items, anguloActual);
actualizarBtnGirar();
}

function volverAlPanel() {
ruletaActualId = null;
if (animFrame) cancelAnimationFrame(animFrame);
controlPanel.style.display = '';
ruletaDetalle.hidden = true;
renderGrid();
}

// ──────────────────────────────────────────────
// RENDERIZAR LISTA DE ITEMS
// ──────────────────────────────────────────────
function renderItems() {
const r = getRuletaById(ruletaActualId);
if (!r) return;

itemsList.innerHTML = '';

if (r.items.length === 0) {
    const li = document.createElement('li');
    li.style.cssText = 'color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0; text-align: center;';
    li.textContent = 'Aún no hay prendas. ¡Añade la primera!';
    itemsList.appendChild(li);
    return;
}

r.items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'item-row';
    li.innerHTML = `
    <span class="item-nombre">${escapeHtml(item)}</span>
    <button class="item-delete" data-index="${i}" title="Eliminar">✕</button>
    `;
    li.querySelector('.item-delete').addEventListener('click', () => eliminarItem(i));
    itemsList.appendChild(li);
});
}

// ──────────────────────────────────────────────
// AÑADIR / ELIMINAR ITEMS
// ──────────────────────────────────────────────
function agregarItem() {
const valor = inputNuevoItem.value.trim();
if (!valor) return;

const r = getRuletaById(ruletaActualId);
if (!r) return;

r.items.push(valor);
guardarDatos(ruletas);
inputNuevoItem.value = '';

renderItems();
dibujarRuleta(r.items, anguloActual);
actualizarBtnGirar();
}

function eliminarItem(index) {
const r = getRuletaById(ruletaActualId);
if (!r) return;

r.items.splice(index, 1);
guardarDatos(ruletas);

renderItems();
dibujarRuleta(r.items, anguloActual);
actualizarBtnGirar();
resultadoBox.hidden = true;
}

function actualizarBtnGirar() {
const r = getRuletaById(ruletaActualId);
btnGirar.disabled = !r || r.items.length < 2;
}

// ──────────────────────────────────────────────
// DIBUJAR LA RULETA EN EL CANVAS
// ──────────────────────────────────────────────
function dibujarRuleta(items, rotacion) {
const W = canvas.width;
const H = canvas.height;
const cx = W / 2;
const cy = H / 2;
const radio = cx - 8;

ctx.clearRect(0, 0, W, H);

if (!items || items.length === 0) {
    // Dibuja un círculo vacío con mensaje
    ctx.beginPath();
    ctx.arc(cx, cy, radio, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1a2e';
    ctx.fill();
    ctx.strokeStyle = '#2a2742';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#5c5480';
    ctx.font = '500 14px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Añade prendas para girar', cx, cy);
    return;
}

const n = items.length;
const slice = (Math.PI * 2) / n;

items.forEach((item, i) => {
    const startAngle = rotacion + i * slice;
    const endAngle   = startAngle + slice;
    const color      = PALETA_RULETA[i % PALETA_RULETA.length];

    // Segmento
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radio, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Borde del segmento
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Texto del segmento
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + slice / 2);

    const distTexto = radio * 0.62;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const maxChars = 18;
    const label = item.length > maxChars ? item.slice(0, maxChars - 1) + '…' : item;

    // Sombra del texto
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;

    ctx.fillStyle = '#ffffff';
    const fontSize = n > 10 ? 11 : n > 6 ? 13 : 15;
    ctx.font = `500 ${fontSize}px "DM Sans", sans-serif`;
    ctx.fillText(label, distTexto, 0);

    ctx.restore();
});

// Centro decorativo
ctx.beginPath();
ctx.arc(cx, cy, 18, 0, Math.PI * 2);
ctx.fillStyle = '#0a0a0f';
ctx.fill();
ctx.strokeStyle = '#7b4fc9';
ctx.lineWidth = 2.5;
ctx.stroke();

// Ícono central
ctx.fillStyle = '#c9a84c';
ctx.font = 'bold 14px serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('✦', cx, cy);
}

// ──────────────────────────────────────────────
// ANIMACIÓN DE GIRO
// ──────────────────────────────────────────────
function girarRuleta() {
const r = getRuletaById(ruletaActualId);
if (!r || r.items.length < 2) return;

resultadoBox.hidden = true;
btnGirar.classList.add('girando');
btnGirar.disabled = true;

// Giro total: entre 5 y 10 vueltas completas + aleatorio
const vueltasExtra = Math.random() * Math.PI * 2;
const vueltasBase  = (5 + Math.floor(Math.random() * 5)) * Math.PI * 2;
const giroTotal    = vueltasBase + vueltasExtra;

const duracion = 4000 + Math.random() * 1500; // 4–5.5 s
const inicio   = performance.now();
const anguloInicio = anguloActual;

function easeOut(t) {
    // Función de aceleración: arranca rápido, frena suave
    return 1 - Math.pow(1 - t, 4);
}

function animar(ahora) {
    const elapsed  = ahora - inicio;
    const progress = Math.min(elapsed / duracion, 1);
    const ease     = easeOut(progress);

    anguloActual = anguloInicio + giroTotal * ease;
    dibujarRuleta(r.items, anguloActual);

    if (progress < 1) {
    animFrame = requestAnimationFrame(animar);
    } else {
    // Terminó el giro
    btnGirar.classList.remove('girando');
    btnGirar.disabled = false;
    mostrarResultado(r.items);
    }
}

animFrame = requestAnimationFrame(animar);
}

// ──────────────────────────────────────────────
// CALCULAR Y MOSTRAR RESULTADO
// ──────────────────────────────────────────────
function mostrarResultado(items) {
const n = items.length;
const slice = (Math.PI * 2) / n;

// La flecha apunta hacia arriba (−PI/2), calculamos qué segmento queda ahí
// Normalizamos el ángulo de rotación
let angNorm = anguloActual % (Math.PI * 2);
if (angNorm < 0) angNorm += Math.PI * 2;

// El puntero está en el ángulo −PI/2 relativo al canvas (arriba)
// Segmento en la posición del puntero:
const puntero = (Math.PI * 2 - angNorm + Math.PI * 1.5) % (Math.PI * 2);
const indice  = Math.floor(puntero / slice) % n;

resultadoTexto.textContent = items[indice];
resultadoBox.hidden = false;
}

// ──────────────────────────────────────────────
// CREAR NUEVA RULETA
// ──────────────────────────────────────────────
function crearRuleta() {
const nombre = inputNombre.value.trim();
const genero = inputGenero.value;

if (!nombre) {
    inputNombre.focus();
    inputNombre.style.borderColor = 'var(--danger)';
    setTimeout(() => inputNombre.style.borderColor = '', 1500);
    return;
}

const nueva = { id: uid(), nombre, genero, items: [] };
ruletas.push(nueva);
guardarDatos(ruletas);

cerrarModal();
renderGrid();
}

// ──────────────────────────────────────────────
// ELIMINAR RULETA ACTUAL
// ──────────────────────────────────────────────
function eliminarRuleta() {
const r = getRuletaById(ruletaActualId);
if (!r) return;

const confirmar = window.confirm(`¿Eliminar la ruleta "${r.nombre}"? Esta acción no se puede deshacer.`);
if (!confirmar) return;

ruletas = ruletas.filter(x => x.id !== ruletaActualId);
guardarDatos(ruletas);
volverAlPanel();
}

// ──────────────────────────────────────────────
// MODAL HELPERS
// ──────────────────────────────────────────────
function abrirModal() {
inputNombre.value = '';
inputGenero.value = 'unisex';
modalCrear.classList.add('visible');
modalCrear.removeAttribute('aria-hidden');
setTimeout(() => inputNombre.focus(), 50);
}

function cerrarModal() {
modalCrear.classList.remove('visible');
modalCrear.setAttribute('aria-hidden', 'true');
}

// ──────────────────────────────────────────────
// ESCAPE HTML (seguridad básica)
// ──────────────────────────────────────────────
function escapeHtml(str) {
const d = document.createElement('div');
d.textContent = str;
return d.innerHTML;
}

// ──────────────────────────────────────────────
// EVENT LISTENERS
// ──────────────────────────────────────────────

// Abrir modal nueva ruleta
document.getElementById('btnNuevaRuleta').addEventListener('click', abrirModal);

// Confirmar crear
document.getElementById('btnConfirmarCrear').addEventListener('click', crearRuleta);

// Enter en el input de nombre también crea
inputNombre.addEventListener('keydown', e => { if (e.key === 'Enter') crearRuleta(); });

// Cerrar modal
document.getElementById('btnCerrarCrear').addEventListener('click', cerrarModal);
document.getElementById('btnCancelarCrear').addEventListener('click', cerrarModal);

// Cerrar modal al hacer clic fuera
modalCrear.addEventListener('click', e => { if (e.target === modalCrear) cerrarModal(); });

// Volver al panel
document.getElementById('btnVolver').addEventListener('click', volverAlPanel);

// Girar ruleta
btnGirar.addEventListener('click', girarRuleta);

// Añadir item
document.getElementById('btnAgregarItem').addEventListener('click', agregarItem);
inputNuevoItem.addEventListener('keydown', e => { if (e.key === 'Enter') agregarItem(); });

// Eliminar ruleta
document.getElementById('btnEliminarRuleta').addEventListener('click', eliminarRuleta);

// Escape cierra el modal
document.addEventListener('keydown', e => {
if (e.key === 'Escape' && modalCrear.classList.contains('visible')) {
    cerrarModal();
}
});

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
renderGrid();
dibujarRuleta([], 0); // canvas vacío por si acaso
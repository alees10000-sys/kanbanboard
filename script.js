"use strict";

const COLUMNS = [
  { key: "todo", title: "Por hacer" },
  { key: "doing", title: "En progreso" },
  { key: "done", title: "Hecho" },
];
const PRIORITY_LABEL = { low: "Baja", medium: "Media", high: "Alta" };
const STORE_KEY = "kanban.tasks.v1";
const THEME_KEY = "kanban.theme";

let tasks = load();
let editingId = null;

/* ---------- Persistencia ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return seed();
}
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
}
function seed() {
  return [
    { id: id(), title: "Bienvenido a tu Kanban", desc: "Arrastra esta tarjeta a otra columna.", priority: "medium", status: "todo" },
    { id: id(), title: "Crear una tarea", desc: "Pulsa “+ Añadir tarea”.", priority: "low", status: "todo" },
    { id: id(), title: "Diseñar la interfaz", desc: "Columnas, tarjetas y arrastrar.", priority: "high", status: "doing" },
    { id: id(), title: "Configurar el proyecto", desc: "HTML, CSS y JS puros.", priority: "medium", status: "done" },
  ];
}
function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ---------- Render ---------- */
const board = document.getElementById("board");
const tpl = document.getElementById("column-tpl");
const search = document.getElementById("search");

function render() {
  const q = search.value.trim().toLowerCase();
  board.innerHTML = "";

  COLUMNS.forEach((col) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.key = col.key;
    node.querySelector("h2").textContent = col.title;

    const list = node.querySelector(".cards");
    const items = tasks.filter(
      (t) => t.status === col.key &&
      (!q || t.title.toLowerCase().includes(q) || (t.desc || "").toLowerCase().includes(q))
    );

    node.querySelector(".count").textContent = items.length;

    if (items.length === 0) {
      const hint = document.createElement("div");
      hint.className = "empty-hint";
      hint.textContent = q ? "Sin coincidencias" : "Sin tareas";
      list.appendChild(hint);
    } else {
      items.forEach((t) => list.appendChild(cardEl(t)));
    }

    // Dropzone
    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      list.classList.add("drag-over");
    });
    list.addEventListener("dragleave", () => list.classList.remove("drag-over"));
    list.addEventListener("drop", (e) => {
      e.preventDefault();
      list.classList.remove("drag-over");
      const tid = e.dataTransfer.getData("text/plain");
      const task = tasks.find((x) => x.id === tid);
      if (task && task.status !== col.key) {
        task.status = col.key;
        save();
        render();
      }
    });

    node.querySelector(".add-card").addEventListener("click", () => openModal(col.key));
    board.appendChild(node);
  });
}

function cardEl(t) {
  const el = document.createElement("article");
  el.className = "card";
  el.draggable = true;
  el.dataset.id = t.id;
  el.dataset.priority = t.priority;

  el.innerHTML = `
    <div class="card-title"></div>
    ${t.desc ? '<div class="card-desc"></div>' : ""}
    <div class="card-foot">
      <span class="badge ${t.priority}">${PRIORITY_LABEL[t.priority]}</span>
      <div class="card-tools">
        <button class="icon-btn edit" title="Editar">✎</button>
        <button class="icon-btn del" title="Eliminar">🗑</button>
      </div>
    </div>`;

  el.querySelector(".card-title").textContent = t.title;
  if (t.desc) el.querySelector(".card-desc").textContent = t.desc;

  el.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", t.id);
    el.classList.add("dragging");
  });
  el.addEventListener("dragend", () => el.classList.remove("dragging"));

  el.querySelector(".edit").addEventListener("click", () => openModal(t.status, t));
  el.querySelector(".del").addEventListener("click", () => {
    tasks = tasks.filter((x) => x.id !== t.id);
    save();
    render();
  });

  return el;
}

/* ---------- Modal ---------- */
const modal = document.getElementById("modal");
const form = document.getElementById("task-form");
const fTitle = document.getElementById("f-title");
const fDesc = document.getElementById("f-desc");
const fPriority = document.getElementById("f-priority");
const fStatus = document.getElementById("f-status");
const modalTitle = document.getElementById("modal-title");

fStatus.innerHTML = COLUMNS.map((c) => `<option value="${c.key}">${c.title}</option>`).join("");

function openModal(status, task = null) {
  editingId = task ? task.id : null;
  modalTitle.textContent = task ? "Editar tarea" : "Nueva tarea";
  fTitle.value = task ? task.title : "";
  fDesc.value = task ? task.desc || "" : "";
  fPriority.value = task ? task.priority : "medium";
  fStatus.value = task ? task.status : status;
  modal.hidden = false;
  fTitle.focus();
}
function closeModal() { modal.hidden = true; editingId = null; form.reset(); }

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {
    title: fTitle.value.trim(),
    desc: fDesc.value.trim(),
    priority: fPriority.value,
    status: fStatus.value,
  };
  if (!data.title) return;

  if (editingId) {
    const t = tasks.find((x) => x.id === editingId);
    Object.assign(t, data);
  } else {
    tasks.push({ id: id(), ...data });
  }
  save();
  render();
  closeModal();
});

document.getElementById("cancel-btn").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

/* ---------- Controles superiores ---------- */
search.addEventListener("input", render);
document.getElementById("clear-all").addEventListener("click", () => {
  if (confirm("¿Borrar todas las tareas?")) { tasks = []; save(); render(); }
});

const themeToggle = document.getElementById("theme-toggle");
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  themeToggle.textContent = t === "light" ? "🌙" : "☀️";
}
applyTheme(localStorage.getItem(THEME_KEY) || "dark");
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

/* ---------- Init ---------- */
render();

const config = window.APP_CONFIG || {};
const form = document.querySelector("#attendance-form");
const dialog = document.querySelector("#confirmation-dialog");
const confirmationData = document.querySelector("#confirmation-data");
const confirmButton = document.querySelector("#confirm-submit");
const loadingOverlay = document.querySelector("#loading-overlay");
const resultPanel = document.querySelector("#result-panel");
const linkError = document.querySelector("#link-error");
const eventInput = document.querySelector("#evento-id");
const eventLabel = document.querySelector("#event-label");
const params = new URLSearchParams(window.location.search);
const eventoId = normalizeCode(params.get("evento") || "");

eventInput.value = eventoId;
eventLabel.textContent = eventoId || "Evento no identificado";

if (!eventoId) {
  linkError.hidden = false;
  form.querySelectorAll("input, select, button").forEach((element) => {
    element.disabled = true;
  });
}

function normalizeCode(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

function normalizeDocument(value) {
  return value.replace(/\D/g, "");
}

document.querySelectorAll("#numero-documento, #confirmar-documento").forEach((input) => {
  input.addEventListener("input", () => {
    input.value = normalizeDocument(input.value);
  });
});

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function cleanName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizePersonName(value) {
  return value.replace(/[^\p{L}\s]/gu, "");
}

const fullNameInput = document.querySelector("#nombre-completo");
fullNameInput.addEventListener("input", () => {
  fullNameInput.value = normalizePersonName(fullNameInput.value);
});

function setError(id, message) {
  const input = document.getElementById(id);
  const target = document.querySelector(`[data-error-for="${id}"]`);
  input?.classList.toggle("invalid", Boolean(message));
  if (target) target.textContent = message;
}

function validateForm() {
  const values = {
    tipoDocumento: document.querySelector("#tipo-documento").value,
    numeroDocumento: normalizeDocument(document.querySelector("#numero-documento").value),
    confirmarDocumento: normalizeDocument(document.querySelector("#confirmar-documento").value),
    nombreCompleto: cleanName(normalizePersonName(document.querySelector("#nombre-completo").value)),
    correo: normalizeEmail(document.querySelector("#correo").value),
    confirmarCorreo: normalizeEmail(document.querySelector("#confirmar-correo").value),
    empresa: cleanName(document.querySelector("#empresa").value),
    autorizaDatos: document.querySelector("#autoriza-datos").checked
  };

  const errors = {
    "tipo-documento": values.tipoDocumento ? "" : "Selecciona el tipo de documento.",
    "numero-documento": /^\d{5,24}$/.test(values.numeroDocumento) ? "" : "Ingresa un documento válido usando solo números.",
    "confirmar-documento": values.numeroDocumento === values.confirmarDocumento ? "" : "Los documentos no coinciden.",
    "nombre-completo": /^[\p{L}]+(?: [\p{L}]+)*$/u.test(values.nombreCompleto) && values.nombreCompleto.length >= 5 ? "" : "Escribe tu nombre usando solo letras.",
    correo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.correo) ? "" : "Ingresa un correo válido.",
    "confirmar-correo": values.correo === values.confirmarCorreo ? "" : "Los correos no coinciden.",
    "autoriza-datos": values.autorizaDatos ? "" : "Debes autorizar el tratamiento de datos."
  };

  Object.entries(errors).forEach(([id, message]) => setError(id, message));
  return { valid: !Object.values(errors).some(Boolean), values };
}

function renderConfirmation(values) {
  const rows = [
    ["Documento", `${values.tipoDocumento} ${values.numeroDocumento}`],
    ["Nombre", values.nombreCompleto],
    ["Correo", values.correo],
    ["Empresa", values.empresa || "No informada"],
    ["Evento", eventoId]
  ];
  confirmationData.replaceChildren();
  rows.forEach(([term, description]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = description;
    confirmationData.append(dt, dd);
  });
}

function buildPayload(values) {
  return {
    eventoId,
    tipoDocumento: values.tipoDocumento,
    numeroDocumento: values.numeroDocumento,
    claveParticipante: `${values.tipoDocumento}|${values.numeroDocumento}`,
    nombreCompleto: values.nombreCompleto,
    correo: values.correo,
    empresa: values.empresa,
    autorizaDatos: "Si",
    origen: "GitHubPages"
  };
}

async function sendAttendance(payload) {
  if (!config.powerAutomateUrl) {
    throw new Error("El formulario aún no está conectado con Power Automate.");
  }

  const response = await fetch(config.powerAutomateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.mensaje || "No fue posible registrar la asistencia.");
  }

  return data;
}

function showResult(success, title, message) {
  form.hidden = true;
  resultPanel.hidden = false;
  document.querySelector("#result-icon").textContent = success ? "✓" : "!";
  document.querySelector("#result-title").textContent = title;
  document.querySelector("#result-message").textContent = message;
}

function setLoading(isLoading) {
  loadingOverlay.hidden = !isLoading;
  document.body.classList.toggle("is-loading", isLoading);
  form.setAttribute("aria-busy", String(isLoading));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = validateForm();
  if (!result.valid) {
    document.querySelector(".invalid")?.focus();
    return;
  }
  form.dataset.pendingPayload = JSON.stringify(buildPayload(result.values));
  renderConfirmation(result.values);
  dialog.showModal();
});

dialog.addEventListener("close", async () => {
  if (dialog.returnValue !== "confirm") return;
  const payload = JSON.parse(form.dataset.pendingPayload || "{}");
  confirmButton.disabled = true;
  setLoading(true);
  try {
    const data = await sendAttendance(payload);
    showResult(true, "Asistencia registrada", data.mensaje || "Tu registro fue recibido correctamente.");
  } catch (error) {
    showResult(false, "No pudimos registrar la asistencia", error.message);
  } finally {
    setLoading(false);
    confirmButton.disabled = false;
  }
});

document.querySelector("#new-attempt").addEventListener("click", () => {
  resultPanel.hidden = true;
  form.hidden = false;
});

form.addEventListener("input", (event) => {
  if (event.target.id) setError(event.target.id, "");
});

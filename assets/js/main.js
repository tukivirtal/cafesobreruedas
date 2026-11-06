/* Café sobre Ruedas: interacciones del sitio */

const TIME_ZONE = 'America/Montevideo';

// Horario semanal: 0 = domingo … 6 = sábado, [apertura, cierre] en horas
const SCHEDULE = { 0: [16, 22], 4: [16, 22], 5: [17, 23], 6: [17, 23] };
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const hour = (h) => `${h}:00`;

function nowInMontevideo() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    day: WEEKDAYS_EN.indexOf(get('weekday')),
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

function getStatus() {
  const { day, minutes } = nowInMontevideo();
  const today = SCHEDULE[day];

  if (today) {
    const [open, close] = today;
    if (minutes >= open * 60 && minutes < close * 60) {
      return {
        day,
        open: true,
        short: `Abierto ahora, hasta las ${hour(close)}`,
        long: `Estamos abiertos. Hoy atendemos hasta las ${hour(close)}.`,
      };
    }
    if (minutes < open * 60) {
      return {
        day,
        open: false,
        short: `Hoy abrimos a las ${hour(open)}`,
        long: `Hoy abrimos a las ${hour(open)}. Te esperamos.`,
      };
    }
  }

  for (let i = 1; i <= 7; i += 1) {
    const next = (day + i) % 7;
    if (SCHEDULE[next]) {
      const when = i === 1 ? 'mañana' : `el ${DAY_NAMES[next]}`;
      return {
        day,
        open: false,
        short: `Cerrado. Volvemos ${when} a las ${hour(SCHEDULE[next][0])}`,
        long: `Ahora estamos cerrados. Volvemos ${when} a las ${hour(SCHEDULE[next][0])}.`,
      };
    }
  }
  return null;
}

// Solo toca el texto si cambió, así las regiones aria-live no se repiten cada minuto
function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

function renderStatus() {
  const status = getStatus();
  if (!status) return;

  document.querySelectorAll('[data-status]').forEach((el) => {
    el.dataset.open = String(status.open);
  });
  document.querySelectorAll('[data-status-text]').forEach((el) => setText(el, status.short));
  document.querySelectorAll('[data-status-long]').forEach((el) => setText(el, status.long));
  document.querySelectorAll('.week li').forEach((li) => {
    if (Number(li.dataset.day) === status.day) li.setAttribute('aria-current', 'date');
    else li.removeAttribute('aria-current');
  });
}

function initHeader() {
  const header = document.querySelector('.site-header');
  const awning = document.querySelector('.hero__awning');
  if (!header || !awning) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      header.dataset.state = entry.isIntersecting ? 'top' : 'solid';
    },
    { rootMargin: `-${header.offsetHeight}px 0px 0px 0px` },
  );
  observer.observe(awning);
}

function initMobileMenu() {
  const root = document.documentElement;
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('menu-movil');
  if (!toggle || !menu) return;

  const label = toggle.querySelector('[data-toggle-label]');
  menu.inert = true;

  const setOpen = (open) => {
    root.dataset.menu = open ? 'open' : 'closed';
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Cerrar' : 'Menú';
    menu.inert = !open;
    root.style.overflow = open ? 'hidden' : '';
  };

  toggle.addEventListener('click', () => setOpen(root.dataset.menu !== 'open'));
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.dataset.menu === 'open') {
      setOpen(false);
      toggle.focus();
    }
  });
  matchMedia('(min-width: 960px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

function initMenuTabs() {
  const tablist = document.querySelector('[role="tablist"]');
  if (!tablist) return;

  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const images = document.querySelectorAll('[data-panel-img]');

  const select = (tab, moveFocus = false) => {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
    });
    const key = document.getElementById(tab.getAttribute('aria-controls')).dataset.panel;
    images.forEach((img) => img.classList.toggle('is-active', img.dataset.panelImg === key));
    if (moveFocus) tab.focus();
  };

  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tab);
  });

  tablist.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const moves = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      select(tabs[moves[event.key]], true);
    }
  });
}

function formatDate(value) {
  if (!value) return 'a definir';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

// Las consultas viajan por FormSubmit (formsubmit.co), que envía el correo sin servidor propio.
// La primera vez que llega una consulta, FormSubmit pide activar la dirección de destino
// desde un correo de confirmación que manda a esa misma dirección.
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/';
const SEND_TIMEOUT_MS = 15000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readInquiry(form) {
  const data = new FormData(form);
  const value = (name) => String(data.get(name) ?? '').trim();
  const tipo = value('tipo');
  const fecha = formatDate(value('fecha'));
  return {
    subject: `Consulta de evento: ${tipo}, ${fecha}`,
    nombre: value('nombre'),
    contacto: value('contacto'),
    fields: {
      Nombre: value('nombre'),
      Contacto: value('contacto'),
      'Tipo de evento': tipo,
      Fecha: fecha,
      Personas: value('personas') || 'a definir',
      Mensaje: value('mensaje') || '(sin mensaje)',
    },
  };
}

async function sendInquiry(email, inquiry) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch(`${FORM_ENDPOINT}${email}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: inquiry.subject,
        _template: 'table',
        _captcha: 'false',
        ...inquiry.fields,
        // Con un email de contacto, FormSubmit lo usa como "Responder a"
        ...(EMAIL_PATTERN.test(inquiry.contacto) && { email: inquiry.contacto }),
      }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || String(result.success) !== 'true') {
      throw new Error(result.message || `HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// Respaldo si el envío falla: la consulta lista en el programa de correo de quien visita
function mailtoLink(email, inquiry) {
  const body = Object.entries(inquiry.fields)
    .map(([label, text]) => `${label}: ${text}`)
    .join('\n');
  return `mailto:${email}?subject=${encodeURIComponent(inquiry.subject)}&body=${encodeURIComponent(body)}`;
}

function initEventForm() {
  const form = document.querySelector('[data-event-form]');
  if (!form) return;

  const submit = form.querySelector('[data-submit]');
  const errorBox = form.querySelector('[data-form-error]');
  const done = form.querySelector('[data-form-done]');
  const idleLabel = submit.textContent;
  let fallbackLink = '';
  const dateInput = form.elements.fecha;
  const now = new Date();
  // Fecha local de quien visita (toISOString daría la fecha UTC, que de noche ya es mañana)
  dateInput.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const messages = {
    nombre: 'Escribí tu nombre.',
    contacto: 'Dejanos un teléfono o un email para responderte.',
  };

  const setError = (input, message) => {
    const field = input.closest('.field');
    let error = field.querySelector('.field__error');
    if (message) {
      field.dataset.invalid = '';
      input.setAttribute('aria-invalid', 'true');
      if (!error) {
        error = document.createElement('p');
        error.className = 'field__error';
        error.id = `${input.id}-error`;
        field.append(error);
      }
      error.textContent = message;
      input.setAttribute('aria-describedby', error.id);
    } else {
      delete field.dataset.invalid;
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      error?.remove();
    }
  };

  form.addEventListener('input', (event) => {
    if (event.target.name in messages && event.target.value.trim()) setError(event.target, '');
  });

  const setSending = (sending) => {
    form.dataset.state = sending ? 'sending' : '';
    form.setAttribute('aria-busy', String(sending));
    submit.disabled = sending;
    submit.textContent = sending ? 'Enviando…' : idleLabel;
  };

  const showSent = (inquiry) => {
    done.querySelector('[data-done-name]').textContent = inquiry.nombre;
    done.querySelector('[data-done-contact]').textContent = inquiry.contacto;
    form.reset();
    form.dataset.state = 'sent';
    done.hidden = false;
    done.focus();
  };

  errorBox.querySelector('[data-mailto]').addEventListener('click', () => {
    if (fallbackLink) window.location.href = fallbackLink;
  });

  done.querySelector('[data-form-reset]').addEventListener('click', () => {
    form.dataset.state = '';
    done.hidden = true;
    form.elements.nombre.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.state === 'sending') return;
    errorBox.hidden = true;

    let firstInvalid = null;
    Object.entries(messages).forEach(([name, message]) => {
      const input = form.elements[name];
      const empty = !input.value.trim();
      setError(input, empty ? message : '');
      if (empty && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const inquiry = readInquiry(form);

    // Los bots rellenan el campo oculto: les mostramos el éxito y no enviamos nada
    if (form.elements._honey.value) {
      showSent(inquiry);
      return;
    }

    setSending(true);
    try {
      await sendInquiry(form.dataset.email, inquiry);
    } catch (error) {
      console.warn('No se pudo enviar la consulta:', error.message);
      fallbackLink = mailtoLink(form.dataset.email, inquiry);
      setSending(false);
      errorBox.hidden = false;
      return;
    }
    setSending(false);
    showSent(inquiry);
  });
}

renderStatus();
setInterval(renderStatus, 60 * 1000);
initHeader();
initMobileMenu();
initMenuTabs();
initEventForm();

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});

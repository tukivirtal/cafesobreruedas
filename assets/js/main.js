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

function initEventForm() {
  const form = document.querySelector('[data-event-form]');
  if (!form) return;

  const status = form.querySelector('[data-form-status]');
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

  form.addEventListener('submit', (event) => {
    event.preventDefault();

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

    const data = new FormData(form);
    const tipo = data.get('tipo');
    const fecha = formatDate(data.get('fecha'));
    const subject = `Consulta de evento: ${tipo}, ${fecha}`;
    const body = [
      `Nombre: ${data.get('nombre').trim()}`,
      `Contacto: ${data.get('contacto').trim()}`,
      `Tipo de evento: ${tipo}`,
      `Fecha: ${fecha}`,
      `Personas: ${data.get('personas') || 'a definir'}`,
      '',
      data.get('mensaje').trim(),
    ].join('\n');

    window.location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = `Abrimos tu correo con la consulta lista para enviar. Si no se abre, escribinos a ${form.dataset.email}.`;
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

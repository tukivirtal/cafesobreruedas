# Café sobre Ruedas

Sitio web de Café sobre Ruedas, cafetería móvil (food truck) en Nueva Palmira, Colonia, Uruguay. Café, meriendas y cenas caseras de jueves a domingo.

Es un sitio estático (HTML, CSS y JavaScript sin dependencias) pensado para publicarse en Vercel.

## Estructura

```
index.html            Página completa: inicio, historia, carta, combos, horarios, eventos
assets/css/styles.css Estilos (paleta, tipografía y componentes)
assets/js/main.js     Estado abierto/cerrado en vivo, menú móvil, pestañas de la carta y formulario
assets/img/           Favicon e ícono para iPhone
vercel.json           Optimización de imágenes, caché y cabeceras de seguridad
```

## Identidad visual

- Colores tomados del logo: marrón café `#4a3116`, oro oliva `#a27c2e`, verde oliva `#55562a`, espresso `#2b1c11` y espuma `#f1ebdf`.
- Tipografías: Bodoni Moda para títulos y Jost para textos (Google Fonts).
- El emblema (taza sobre una rueda) está redibujado en SVG dentro de `index.html` (`#emblem`) y en `assets/img/favicon.svg`. Si tienen el logo original en vector, se puede reemplazar ahí.

## Imágenes

Las fotos fueron generadas con Leonardo (modelo Lucid Realism) y se sirven desde `cdn.leonardo.ai` a través del optimizador de imágenes de Vercel (`/_vercel/image`), que entrega AVIF o WebP en el tamaño justo para cada pantalla. La configuración está en `vercel.json` (`images`).

Para cambiar una imagen, reemplazá en `index.html` la URL codificada que va después de `url=`. Si la nueva imagen viene de otro dominio, agregalo en `images.remotePatterns` de `vercel.json`.

El optimizador solo funciona en Vercel: para verlas en local usá `npx vercel dev`. Con cualquier otro servidor estático la página funciona, pero sin fotos.

## Datos a completar

El contacto es provisorio. Buscá y reemplazá en `index.html`:

- `cafesobreruedas` (usuario de Instagram, aparece en la sección de horarios y en el pie)
- `hola@cafesobreruedas.uy` (email del pie de página)

## Formulario de eventos

El formulario envía la consulta por correo con [FormSubmit](https://formsubmit.co), sin servidor propio y sin cuenta. El destino está en el atributo `data-email` del formulario en `index.html` (hoy `fcippollini@gmail.com`). Para sumar a otra persona en copia, agregá el campo `_cc` al envío en `assets/js/main.js` (`sendInquiry`).

- **Activación (una sola vez):** la primera vez que llega una consulta, FormSubmit manda un correo de activación a la dirección de destino (revisá también spam). Hay que abrirlo y tocar *Activate Form*. Hasta entonces la web puede mostrar el aviso de error.
- **Si el envío falla:** la persona ve un aviso y puede abrir su programa de correo con la consulta ya escrita.
- **Privacidad:** la dirección de destino queda visible en el código de la página, así que puede recibir spam. FormSubmit ofrece un alias para ocultarla una vez activado el formulario.
- **Anti-spam:** el formulario tiene un campo oculto que solo completan los bots; esas consultas se descartan.

## Horarios y precios

- Horarios: lista `.week` y pie en `index.html`, datos estructurados (`openingHoursSpecification`) en el `<head>` y la constante `SCHEDULE` en `assets/js/main.js`, que calcula el estado abierto/cerrado con la hora de Montevideo.
- Combos y precios (en pesos uruguayos): sección `#combos` de `index.html`.

## Publicación

El proyecto de Vercel está conectado a este repositorio: cada pull request genera una vista previa y lo que entra a `main` se publica en producción.

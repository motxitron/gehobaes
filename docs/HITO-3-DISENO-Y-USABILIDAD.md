# Hito 3: diseño visual y usabilidad

**Estado:** en implementación; se eligió A como estilo predeterminado y se acordó ofrecer las tres opciones en un selector.
**Objetivo:** acordar y aplicar un estilo coherente para el calendario, el resumen anual, la edición diaria y la cuadrícula global, conservando el uso adaptable y la lectura clara de las categorías.

## Ejemplos de dirección visual

Las tres opciones mantienen las mismas funciones y datos; cambian la paleta, densidad y jerarquía visual. A es la opción inicial. Las personas usuarias pueden cambiar el tema desde **Diseño** y la preferencia se guarda en este navegador.

### A — Corporativo sobrio

- **Paleta:** azul tinta `#17233B`, azul `#4667E8`, fondo frío `#F5F7FB` y tarjetas blancas.
- **Aspecto:** limpio y cercano al prototipo actual; encabezados discretos, tarjetas con bordes suaves y el calendario como foco.
- **Cuándo encaja:** si se quiere una herramienta profesional reconocible, con pocos cambios respecto a la experiencia actual.

```text
┌ Mis horarios · 2026 ──────────────────────────────┐
│ [Resumen anual]       [‹] [Today] [Informe]       │
│ Lun     Mar     Mié     Jue     Vie     Sáb     Dom│
│  1       2       3       4       5       6       7 │
│      tarjetas blancas · azul para acciones         │
└───────────────────────────────────────────────────┘
```

### B — Agenda compacta

- **Paleta:** azul pizarra `#263548`, verde azulado `#168C83`, fondo gris claro `#EEF2F5`.
- **Aspecto:** menos espacio entre paneles, encabezado y controles más compactos, más información útil visible sin desplazarse.
- **Cuándo encaja:** si prima revisar muchos días y datos de un vistazo en pantalla completa.

```text
┌ 2026 · JUNIO   [‹] [›] [Hoy]     Vacaciones 18/22 │
│ L  M  X  J  V  S  D                                │
│ 1  2  3  4  5  6  7    celdas compactas            │
│ F  M  ·  X  C  ·  ·    códigos visibles            │
└────────────────────────────────────────────────────┘
```

### C — Alto contraste accesible

- **Paleta:** texto casi negro `#111827`, azul intenso `#005FCC`, fondo blanco y bordes definidos.
- **Aspecto:** tipografía y controles más marcados, estados con texto además de color y foco de teclado muy visible.
- **Cuándo encaja:** si se priorizan legibilidad, accesibilidad y uso en pantallas con condiciones de visualización distintas.

```text
┌ MIS HORARIOS · JUNIO 2026 ─────────────────────────┐
│ Hoy: 12 días restantes       [Anterior] [Siguiente]│
│ LUN       MAR       MIÉ       JUE       VIE        │
│  1         2         3         4         5          │
│ [F 2:00]  [Festivo] [—]      [M 1:00]  [X]         │
└────────────────────────────────────────────────────┘
```

Los códigos y sus colores actuales se conservarán como identificadores consistentes en todas las vistas. Ningún estado dependerá exclusivamente del color; los controles seguirán teniendo etiquetas, foco de teclado y una disposición usable en ventanas estrechas.

## Observaciones diarias

La aplicación piloto incorpora un campo de observaciones por fecha:

- Admite hasta 500 caracteres y se puede usar también en días festivos.
- Se guarda dentro del registro diario en el almacenamiento local del navegador.
- La cuadrícula muestra un avance del texto y el informe mensual incluye la observación completa, escapada como texto.
- No debe utilizarse para almacenar información personal, médica o confidencial. El piloto no cifra ni sincroniza esos datos.

## Decisiones pendientes

- [x] Elegir A — Corporativo sobrio como estilo predeterminado.
- [x] Ofrecer un selector entre Corporativo sobrio, Agenda compacta y Alto contraste.
- [ ] Revisar densidad, tamaño de texto y comportamiento de las categorías en la cuadrícula.
- [ ] Revisar el resultado en escritorio, ventana estrecha y navegación por teclado.

## Criterios de aceptación

- Las tres opciones del selector cambian de manera visible la paleta, densidad, tarjetas y estados sin cambiar datos ni funciones.
- El calendario y la cuadrícula global se entienden con categorías de varios colores y con texto.
- La interfaz mantiene contraste suficiente, indicadores de foco visibles y controles accesibles.
- La distribución funciona en pantalla completa y en ventanas estrechas sin ocultar acciones necesarias.
- Las observaciones persisten al recargar, se pueden modificar o borrar y aparecen en el calendario y en el informe sin interpretar su contenido como HTML.
- No se introducen datos reales o confidenciales en los ejemplos, pruebas ni documentación.

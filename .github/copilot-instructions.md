# Instrucciones del repositorio para Copilot

## Idioma y comunicación

- Comunícate siempre en castellano, incluidas respuestas, confirmaciones, preguntas, formularios, explicaciones y resúmenes.
- Redacta en castellano los títulos y descripciones de Pull Requests e incidencias, los comentarios de revisión, las respuestas, los mensajes de commit, la documentación y los comentarios de código.
- Mantén en su idioma original los identificadores, comandos, nombres de acciones y términos técnicos que deban coincidir exactamente con una herramienta. Conserva también marcas y etiquetas de interfaz que el producto haya solicitado explícitamente, como el botón **Today**.
- No añadas comentarios al código salvo que aclaren una decisión o comportamiento no evidente; si los añades, escríbelos en castellano.

## Flujo de trabajo

- Lee `README.md`, `docs/PROCESO-Y-HITOS.md` y `docs/MANUAL-USO.md` cuando el cambio afecte a instalación, uso, arquitectura o proceso. Para reglas de horarios, coberturas o festivos, consulta también `docs/HITO-2-GESTION-HORAS.md`.
- Trabaja desde `main` en una rama breve (`feat/`, `fix/` o `docs/`). No hagas commits ni pushes directamente a `main`.
- Usa `.github/PULL_REQUEST_TEMPLATE.md`; mantén en castellano el título, cuerpo y conversación del PR.
- Ejecuta `npm ci` si cambian las dependencias y `npm run build` para validar cambios de código.
- Espera a que CI pase y solicita revisión antes de fusionar. No fusiones un PR sin autorización explícita del usuario.
- Tras fusionar, comprueba el despliegue de GitHub Pages y que `main` local coincide con `origin/main`.

## Convenciones del proyecto

- Aplicación React, TypeScript y Vite; se publica en GitHub Pages bajo `/gehobaes/`.
- Usa textos de interfaz en castellano, salvo las etiquetas técnicas o de producto acordadas explícitamente.
- El repositorio es público: utiliza únicamente datos ficticios. No leas, copies, subas ni derives datos del Excel original ni de registros reales del personal.
- El prototipo usa `localStorage` y no ofrece autenticación, permisos ni sincronización compartida. No describas esas capacidades como implementadas.
- Mantén README, manual y guía de proceso sincronizados con el comportamiento real.

# Motxitron

Piloto de una aplicación web para consultar y gestionar horarios de personal por año y mes. La interfaz está pensada para pantalla completa y se adapta a pantallas pequeñas.

## Estado

Piloto funcional para una cuenta ficticia (`user1`): configura jornada por año, registra actividades por horas y coberturas, administra festivos y excepciones, y abre un informe mensual. El botón **Today** vuelve al mes actual y enfoca el día de hoy. Los datos se guardan únicamente en el almacenamiento local del navegador.

> **No es un sistema de producción ni ofrece autenticación, permisos reales o sincronización entre dispositivos.** GitHub Pages publica archivos estáticos; no debe usarse como mecanismo de control de acceso ni almacenarse aquí información real del personal.

## Desarrollo local

Requisitos: Node.js 20 o posterior.

```bash
npm ci
npm test
npm run dev
```

Para comprobar la versión de producción:

```bash
npm run build
npm test
npm run preview
```

## Manual de uso

Consulta el [Manual de uso](docs/MANUAL-USO.md) para navegar por el calendario, editar actividades y entender dónde se guardan los cambios.

## Publicación

El workflow `.github/workflows/deploy-pages.yml` compila y publica `dist` en GitHub Pages al actualizar `main`. Pages está configurado para desplegar mediante GitHub Actions. La aplicación está publicada en `https://motxitron.github.io/gehobaes/`.

## Datos y privacidad

- El libro Excel de origen y cualquier fichero Excel quedan excluidos por `.gitignore`.
- Los PDF fuente también quedan excluidos: se leen íntegramente en el navegador y no se suben ni conservan.
- La demostración contiene solo datos inventados; no copiar nombres, identificadores, turnos ni otros datos de empleados al repositorio.
- El calendario de demostración se almacena en el navegador de quien lo usa. Borrar los datos del sitio elimina esos cambios.
- Antes de manejar información real se requiere acordar identidad, backend, autorización en servidor, auditoría, retención y aprobación de seguridad y privacidad.

## Proceso e hitos

Consultar [Proceso de desarrollo e hitos](docs/PROCESO-Y-HITOS.md) para el flujo de Pull Requests, criterios de revisión y evolución propuesta.
La especificación funcional de gestión horaria está en [Hito 2: gestión de horas](docs/HITO-2-GESTION-HORAS.md).

## Instrucciones para Copilot

Las reglas permanentes de idioma, Pull Requests, privacidad y validación están en [`.github/copilot-instructions.md`](.github/copilot-instructions.md). Copilot CLI puede mostrar las instrucciones detectadas para este repositorio con `copilot instruction list`.

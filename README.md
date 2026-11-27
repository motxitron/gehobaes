# Motxitron

Piloto de una aplicación web para consultar y gestionar horarios de personal por año y mes. La interfaz está pensada para pantalla completa y se adapta a pantallas pequeñas.

## Estado

Primera versión de demostración: una cuenta de muestra (`user1`), un perfil ficticio y una cuadrícula mensual editable. Los cambios se guardan únicamente en el almacenamiento local del navegador.

> **No es un sistema de producción ni ofrece autenticación, permisos reales o sincronización entre dispositivos.** GitHub Pages publica archivos estáticos; no debe usarse como mecanismo de control de acceso ni almacenarse aquí información real del personal.

## Desarrollo local

Requisitos: Node.js 20 o posterior.

```bash
npm ci
npm run dev
```

Para comprobar la versión de producción:

```bash
npm run build
npm run preview
```

## Publicación

El workflow `.github/workflows/deploy-pages.yml` compila y publica `dist` en GitHub Pages al actualizar `main`. En el repositorio, activar **Settings → Pages → Build and deployment → GitHub Actions**. La URL prevista para un repositorio llamado `motxitron` será `https://<propietario>.github.io/motxitron/`.

## Datos y privacidad

- El libro Excel de origen y cualquier fichero Excel quedan excluidos por `.gitignore`.
- La demostración contiene solo datos inventados; no copiar nombres, identificadores, turnos ni otros datos de empleados al repositorio.
- El calendario de demostración se almacena en el navegador de quien lo usa. Borrar los datos del sitio elimina esos cambios.
- Antes de manejar información real se requiere acordar identidad, backend, autorización en servidor, auditoría, retención y aprobación de seguridad y privacidad.

## Proceso e hitos

Consultar [Proceso de desarrollo e hitos](docs/PROCESO-Y-HITOS.md) para el flujo de Pull Requests, criterios de revisión y evolución propuesta.

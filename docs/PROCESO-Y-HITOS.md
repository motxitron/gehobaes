# Proceso de desarrollo e hitos

## Flujo de trabajo

1. Abrir una issue pequeña con objetivo, alcance y criterios de aceptación.
2. Crear una rama desde `main` (`feat/`, `fix/` o `docs/`) y trabajar en esa rama.
3. Abrir un Pull Request hacia `main`; no subir cambios directamente a `main`.
4. Esperar a que CI ejecute `npm ci` y `npm run build`. Revisar la interfaz y el diff; retirar cualquier dato personal antes de solicitar revisión.
5. Actualizar README o este documento cuando cambien instalación, comportamiento, arquitectura o controles de privacidad.
6. Aprobar y fusionar el PR. La publicación en Pages se ejecuta desde `main`.

Usar la plantilla de PR. Un hito solo se considera terminado cuando sus criterios se cumplen y el cambio está integrado mediante PR.

## Hitos

### H0 — Piloto de interfaz (en curso)

- [x] Aplicación React/TypeScript adaptable con selección de año y cuadrícula mensual.
- [x] Cuenta y perfil ficticios para el piloto `user1`.
- [x] Edición de marcas de horario y persistencia local en el navegador.
- [x] CI y despliegue automatizado a Pages preparados.
- [ ] Crear el repositorio remoto, activar Pages y verificar el primer despliegue.

### H1 — Perfiles y catálogos

- Definir modelo de usuario y perfil de personal separado de la cuenta de acceso.
- Gestionar dominios, roles, jornada y códigos de actividad desde catálogos mantenibles.
- Validar jornadas, calendario, permisos y cambios de perfil.
- Mantener fixtures sintéticos para pruebas.

### H2 — Identidad y permisos

- Elegir proveedor autorizado para autenticación, backend y base de datos.
- Implementar permisos en el servidor: usuario normal sobre su propio perfil; administración de dominio/rol sobre el ámbito asignado; administrador total según política aprobada.
- No confiar en controles de interfaz como barrera de seguridad. Añadir pruebas que intenten operaciones no autorizadas.
- Revisar privacidad, seguridad, auditoría y gestión de credenciales antes de cargar datos reales.

### H3 — Datos compartidos e historial

- Persistir cambios en una fuente común con control de concurrencia y zona horaria acordada.
- Registrar quién cambió qué y cuándo, y definir retención y restauración.
- Diseñar exportación/importación validada, con anonimización comprobable y confirmación previa.

### H4 — Preparación para producción

- Acordar operación, monitorización, copias, soporte y respuesta a incidentes.
- Completar revisión de accesibilidad y pruebas en dispositivos/navegadores objetivo.
- Obtener aprobación explícita para cualquier dato real y para el entorno de despliegue.

## Reglas para los datos del repositorio

- Nunca incluir el Excel original ni copias, exportaciones o capturas con datos identificables.
- Usar datos sintéticos, sin códigos de usuario reales ni combinaciones que permitan reidentificar personas.
- Revisar archivos añadidos y cambios en fixtures antes de aprobar cada PR.
- Las credenciales y secretos no se guardan en el código ni en `VITE_*`; esas variables se incorporan al bundle público.

## Criterios mínimos para PR

- El cambio cumple los criterios de aceptación y no amplía el alcance sin acuerdo.
- `npm run build` pasa.
- Se revisa el resultado en escritorio y vista estrecha cuando afecta a la interfaz.
- No se filtran datos personales o secretos.
- La documentación de procesos o hitos está al día.

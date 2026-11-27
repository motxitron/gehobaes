# Proceso de desarrollo e hitos

## Repositorio y publicación actuales

- Repositorio público: <https://github.com/motxitron/gehobaes>
- Rama estable: `main`.
- Sitio: <https://motxitron.github.io/gehobaes/>.
- GitHub Pages se configura con `build_type: workflow`. El workflow `.github/workflows/deploy-pages.yml` construye `dist` y lo publica al recibir cambios en `main`.
- `.github/workflows/ci.yml` instala dependencias con `npm ci` y ejecuta `npm run build` en cada Pull Request y actualización de `main`.
- La ruta base de Vite es `/gehobaes/`; si cambia el nombre del repositorio, hay que actualizar `vite.config.ts` y este documento.

La creación inicial se hizo con una sesión autenticada de GitHub CLI. Para repetir la configuración en otra máquina Windows:

```powershell
winget install --id GitHub.cli --exact
gh auth login --hostname github.com --web --git-protocol https --scopes workflow
gh auth status
gh api user --jq .login
```

Inicia sesión con la cuenta propietaria del repositorio en el navegador. No pegues tokens ni códigos de dispositivo en issues, Pull Requests o archivos del proyecto. Si una terminal abierta no reconoce `gh`, vuelve a abrirla; la ubicación de instalación habitual es `C:\Program Files\GitHub CLI`.

Para crear un repositorio remoto desde una carpeta local ya inicializada y con un commit:

```powershell
gh repo create motxitron/gehobaes --public --source . --remote origin --push
gh api --method POST repos/motxitron/gehobaes/pages -f build_type=workflow
```

El segundo comando activa Pages para despliegues con GitHub Actions. Esta configuración ya está hecha para el repositorio del piloto.

## Preparar el entorno local

Requisitos: Git y Node.js 20 o posterior. Clona el repositorio e instala dependencias:

```powershell
git clone https://github.com/motxitron/gehobaes.git
Set-Location gehobaes
npm ci
npm run dev
```

Para verificar la compilación local antes de un PR:

```powershell
npm run build
npm run preview
```

## Flujo de Pull Request

1. Abrir una issue pequeña con objetivo, alcance y criterios de aceptación.
2. Actualizar `main` y crear una rama específica:

   ```powershell
   git switch main
   git pull --ff-only
   git switch -c feat/descripcion-breve
   ```

3. Implementar el cambio, probar `npm run build` y actualizar README, manual o hitos que hayan quedado desfasados.
4. Revisar los archivos que se van a subir. No añadir el Excel, exportaciones, capturas ni datos identificables.
5. Confirmar cambios y publicar la rama:

   ```powershell
   git add <archivos-del-cambio>
   git diff --cached --check
   git commit -m "Describe el cambio"
   git push -u origin feat/descripcion-breve
   ```

6. Abrir un Pull Request hacia `main` (desde la interfaz de GitHub o con `gh pr create`). Usar `.github/PULL_REQUEST_TEMPLATE.md`.
7. Esperar CI, revisar el diff, los criterios de aceptación y la interfaz. Fusionar el PR después de la revisión.
8. Tras la fusión, comprobar el workflow **Deploy to GitHub Pages** y visitar el sitio publicado.

No se deben subir cambios directamente a `main`. La plantilla del PR incluye una lista de comprobación para build, diseño adaptable, privacidad y documentación.

## Hitos

### H0 — Piloto de interfaz (completado)

- [x] Aplicación React/TypeScript adaptable con selección de año y cuadrícula mensual.
- [x] Cuenta y perfil ficticios para el piloto `user1`.
- [x] Edición de marcas de horario y persistencia local en el navegador.
- [x] Botón Today que navega al mes actual, resalta la fecha y enfoca su celda.
- [x] Repositorio público, CI y despliegue automatizado en Pages verificados.
- [x] Manual de uso y proceso de contribución documentados.

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

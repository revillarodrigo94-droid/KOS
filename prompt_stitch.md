# Prompt para Google Stitch - KitchenOS (KOS)

Copia y pega el siguiente prompt en Google Stitch para generar o expandir el proyecto:

```markdown
Desarrolla una aplicación web progresiva (PWA) de gestión y control educativo para escuelas de cocina y hostelería llamada **KitchenOS (KOS)**, adaptada para su visualización web y su posterior compilación como aplicación nativa de Android (usando vistas adaptadas a pantallas táctiles de tablets de taller).

La aplicación debe utilizar una estética **Neo-SaaS / Dark UI Premium** inspirada en interfaces como Linear o Vercel. 
- Colores principales: Fondo mate súper oscuro (#09090b), tarjetas Bento Grid en gris oscuro técnico (#18181b), bordes ultrafinos de 1px (#27272a) y acentos interactivos en oro/ámbar (#f59e0b) junto con rojo (#ef4444) para alertas de temperatura.
- Tipografía moderna (Inter) e iconos minimalistas de línea (tipo Lucide).

### 1. ROLES Y CONTROL DE ACCESO (Supabase Auth)
- **Alumno:** Acceso limitado. Solo puede registrar datos diarios y visualizar información en su panel asignado.
- **Profesor:** Gestión de grupos, alumnos, checklists, planificación de briefing y evaluación en taller.
- **Administrador:** Superusuario con permisos de modificación, edición y eliminación de cualquier registro del sistema, además de la aprobación o rechazo de nuevas solicitudes de usuarios registrados.

### 2. ARQUITECTURA DE PANTALLAS (Diseño Bento Grid)

#### Pantalla Principal (Dashboard dinámico según rol):
- **Dashboard del Alumno (Tablet/Web):** Disposición Bento Grid que muestra de un vistazo:
  1. *Carta del día (Briefing):* Plato principal con iconos interactivos de los 14 alérgenos de la UE.
  2. *Mis Checklists:* Acceso al checklist de producción si es Jefe de Cocina hoy, o al checklist de limpieza de su aula asignada.
  3. *Registro de Temperaturas:* Indicador rápido del estado de registro diario.
  4. *Inventario Rápido:* Buscador de stock activo.
  5. *Nueva Incidencia:* Botón para reportar averías en 140 caracteres.
- **Dashboard del Profesor (Web/Escritorio):** Bento Grid que muestra:
  1. *Supervisión Taller:* Listado rápido de alumnos para evaluar desempeño (uniformidad, higiene, actitud, técnica) con 1-5 estrellas al pulsar "+".
  2. *Control de Checklists:* Estado y firmas de los checklists de cocina y limpieza del día en tiempo real.
  3. *Briefing Semanal:* Calendario interactivo para programar menús y alérgenos.
  4. *Alertas APPCC:* Reporte inmediato de temperaturas fuera de rango hoy.

### 3. FUNCIONALIDADES TÉCNICAS CLAVE
- **Registro APPCC de Temperaturas:** Formulario diario (Inicio y Fin de clase) para registrar temperaturas de cámaras de conservación. Si una cámara de refrigeración supera los 4ºC o una de congelación supera los -18ºC, la tarjeta de la cámara se tiñe de rojo con un icono de advertencia (⚠️). Incluye exportador a PDF oficial maquetado con campos de firma para auditorías.
- **Inventario Activo por Zonas:** Los alumnos registran entradas (+ cantidad) o salidas (- cantidad) de materia prima en zonas (economato, bodega, cámaras) seleccionando ingredientes estrictamente de una "Lista Maestra" predefinida por profesores para evitar nombres duplicados. Genera un historial de trazabilidad (quién, qué y cuándo).
- **Checklists Firmados y Congelados:** El alumno Jefe de Cocina (producción/mise en place) y el encargado de limpieza (limpieza de aulas/talleres) rellenan sus listas de tareas diarias. Al terminar, añaden observaciones y pulsan "Guardar y firmar", congelando el registro en Supabase con fecha y firma.
- **Microblog de Incidencias:** Formulario ágil para reportar roturas o averías en taller limitando la descripción a un máximo estricto de 140 caracteres, notificando al profesor correspondiente.
```

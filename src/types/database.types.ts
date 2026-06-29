export type UserRole = 'alumno' | 'profesor' | 'admin';
export type GradoTipo = 'GB' | 'GM' | 'GS' | 'CE';
export type CamaraTipo = 'refrigeracion' | 'congelacion';
export type MomentoRegistro = 'inicio' | 'fin';
export type ZonaAlmacen = 'economato' | 'bodega' | 'camaras' | 'refrigeradora' | 'congeladora';
export type InventarioOperacion = 'entrada' | 'salida' | 'ajuste';
export type IncidenciaTipo = 'averia' | 'rotura' | 'extravio' | 'peligro' | 'otro';
export type IncidenciaEstado = 'pendiente' | 'notificado_centro' | 'resuelto';
export type IncidenciaPrioridad = 'baja' | 'media' | 'critica';
export type InsigniaTipo = 'chef_estrella' | 'uniforme_gala' | 'guardian_higiene' | 'maestro_fuego' | 'corazon_cocina' | 'pesadilla';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: UserRole;
  estado_aprobacion: boolean;
  creado_en: string;
}

export interface Grado {
  id: string;
  tipo: GradoTipo;
  nombre: string;
}

export interface Modulo {
  id: string;
  grado_id: string;
  curso: number | null;
  nombre: string;
}

export interface Grupo {
  id: string;
  nombre: string;
  grado_id: string;
  curso: number | null;
  profesor_id: string;
  activo: boolean;
  creado_en: string;
}

export interface AlumnoGrupo {
  grupo_id: string;
  alumno_id: string;
}

export interface Camara {
  id: string;
  nombre: string;
  tipo: CamaraTipo;
  temperatura_limite: number;
  profesor_id: string;
  activa: boolean;
}

export interface RegistroTemperatura {
  id: string;
  camara_id: string;
  fecha: string;
  momento: MomentoRegistro;
  temperatura: number;
  usuario_id: string;
  alerta: boolean;
  creado_en: string;
}

export interface InventarioMaestro {
  id: string;
  nombre: string;
  categoria: string;
  unidad_medida: string;
  creado_por: string | null;
}

export interface InventarioActivo {
  id: string;
  ingrediente_id: string;
  zona: ZonaAlmacen;
  cantidad: number;
  stock_minimo: number;
  ultima_modificacion_por: string | null;
  actualizado_en: string;
}

export interface HistorialInventario {
  id: string;
  ingrediente_id: string;
  zona: ZonaAlmacen;
  cantidad_anterior: number;
  cantidad_nueva: number;
  tipo_operacion: InventarioOperacion;
  usuario_id: string;
  fecha: string;
}

export interface Elaboracion {
  id: string;
  nombre: string;
  descripcion: string | null;
  alergenos: string[]; // Listado de alérgenos activos
  coste_materia_prima: number;
  raciones_previstas: number;
  partida: string;
  creado_by: string | null;
}

export interface CartaSemanal {
  id: string;
  grupo_id: string;
  fecha: string;
  elaboraciones: string[]; // Array de IDs de elaboraciones
  creado_por: string | null;
}

export interface JefeCocina {
  id: string;
  fecha: string;
  grupo_id: string;
  jefe_id: string;
  limpieza_id: string;
  observaciones_produccion: string | null;
  observaciones_limpieza: string | null;
  firmado: boolean;
  firmado_en: string | null;
  firma_nombre: string | null;
  fotos_revision: string[];
  comentario_revision: string | null;
}

export interface ChecklistProduccionTarea {
  id: string;
  grupo_id: string;
  tarea: string;
  activa: boolean;
}

export interface ChecklistProduccionRegistro {
  id: string;
  jefe_cocina_id: string;
  tarea_id: string;
  completada: boolean;
  actualizado_en: string;
}

export interface ChecklistLimpiezaTarea {
  id: string;
  aula: string;
  tarea: string;
  activa: boolean;
}

export interface ChecklistLimpiezaRegistro {
  id: string;
  jefe_cocina_id: string;
  tarea_id: string;
  completada: boolean;
  actualizado_en: string;
}

export interface Incidencia {
  id: string;
  usuario_id: string;
  tipo: IncidenciaTipo;
  descripcion: string;
  estado: IncidenciaEstado;
  prioridad: IncidenciaPrioridad;
  fecha: string;
}

export interface RespuestaIncidencia {
  id: string;
  incidencia_id: string;
  usuario_id: string;
  mensaje: string;
  creado_en: string;
}

export interface InsigniaAlumno {
  id: string;
  alumno_id: string;
  tipo_insignia: InsigniaTipo;
  fecha_otorgada: string;
}

export interface SupervisionTaller {
  id: string;
  alumno_id: string;
  profesor_id: string;
  fecha: string;
  uniformidad: number; // 1-5
  higiene: number; // 1-5
  tecnica: number; // 1-5
  actitud: number; // 1-5
  observaciones: string | null;
  creado_en: string;
}

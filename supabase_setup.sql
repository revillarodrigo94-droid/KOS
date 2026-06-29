-- ==========================================
-- KITCHENOS - SCRIPT DE BASE DE DATOS
-- Ejecutar en el SQL Editor de Supabase
-- ==========================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS Y CONFIGURACIÓN DE ROLES
CREATE TYPE public.user_role AS ENUM ('alumno', 'profesor', 'admin');
CREATE TYPE public.grado_tipo AS ENUM ('GB', 'GM', 'GS', 'CE');
CREATE TYPE public.camara_tipo AS ENUM ('refrigeracion', 'congelacion');
CREATE TYPE public.momento_registro AS ENUM ('inicio', 'fin');
CREATE TYPE public.zona_almacen AS ENUM ('economato', 'bodega', 'camaras');
CREATE TYPE public.inventario_operacion AS ENUM ('entrada', 'salida', 'ajuste');
CREATE TYPE public.incidencia_tipo AS ENUM ('averia', 'rotura', 'extravio', 'peligro', 'otro');
CREATE TYPE public.incidencia_estado AS ENUM ('pendiente', 'notificado_centro', 'resuelto');

-- 2. TABLA DE USUARIOS (Vinculada a Supabase Auth)
CREATE TABLE public.usuarios (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    rol public.user_role NOT NULL DEFAULT 'alumno',
    estado_aprobacion BOOLEAN NOT NULL DEFAULT false,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Seguridad a Nivel de Fila (RLS) en Usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Trigger para crear perfil de usuario automáticamente desde Supabase Auth metadata
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario_nuevo()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, apellidos, rol, estado_aprobacion)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Nombre'),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', 'Apellidos'),
    COALESCE((NEW.raw_user_meta_data->>'rol')::public.user_role, 'alumno'::public.user_role),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_crear_perfil_usuario
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_usuario_nuevo();

-- 3. ESTRUCTURA ACADÉMICA (CURRÍCULOS NACIONALES)
CREATE TABLE public.grados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo public.grado_tipo NOT NULL,
    nombre TEXT UNIQUE NOT NULL
);

CREATE TABLE public.modulos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grado_id UUID REFERENCES public.grados(id) ON DELETE CASCADE NOT NULL,
    curso INTEGER CHECK (curso IN (1, 2)),
    nombre TEXT NOT NULL,
    UNIQUE (grado_id, curso, nombre)
);

CREATE TABLE public.grupos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    grado_id UUID REFERENCES public.grados(id) NOT NULL,
    curso INTEGER CHECK (curso IN (1, 2)),
    profesor_id UUID REFERENCES public.usuarios(id) NOT NULL,
    activo BOOLEAN DEFAULT true NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE public.alumnos_grupos (
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE,
    alumno_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (grupo_id, alumno_id)
);

ALTER TABLE public.grados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos_grupos ENABLE ROW LEVEL SECURITY;

-- 4. TABLAS APPCC (REGISTRO DE TEMPERATURAS)
CREATE TABLE public.camaras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo public.camara_tipo NOT NULL,
    temperatura_limite DECIMAL NOT NULL, -- 4.0 para refrigeracion, -18.0 para congelacion
    profesor_id UUID REFERENCES public.usuarios(id) NOT NULL,
    activa BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE public.registro_temperaturas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    camara_id UUID REFERENCES public.camaras(id) ON DELETE CASCADE NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    momento public.momento_registro NOT NULL,
    temperatura DECIMAL NOT NULL,
    usuario_id UUID REFERENCES public.usuarios(id) NOT NULL,
    alerta BOOLEAN DEFAULT false NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.camaras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_temperaturas ENABLE ROW LEVEL SECURITY;

-- Trigger automático para detectar alertas en temperaturas APPCC
CREATE OR REPLACE FUNCTION public.verificar_temperatura_alerta() 
RETURNS TRIGGER AS $$
DECLARE
    limite DECIMAL;
    camara_tipo_var public.camara_tipo;
BEGIN
    SELECT temperatura_limite, tipo INTO limite, camara_tipo_var FROM public.camaras WHERE id = NEW.camara_id;
    IF camara_tipo_var = 'refrigeracion' AND NEW.temperatura > limite THEN
        NEW.alerta := true;
    ELSIF camara_tipo_var = 'congelacion' AND NEW.temperatura > limite THEN -- Ej: -10 es mayor que -18 (temperatura mas caliente)
        NEW.alerta := true;
    ELSE
        NEW.alerta := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_temperatura_alerta
BEFORE INSERT OR UPDATE ON public.registro_temperaturas
FOR EACH ROW EXECUTE FUNCTION public.verificar_temperatura_alerta();

-- 5. TABLAS DE INVENTARIO
CREATE TABLE public.inventario_maestro (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    categoria TEXT NOT NULL,
    unidad_medida TEXT NOT NULL, -- kg, l, ud, etc.
    creado_por UUID REFERENCES public.usuarios(id)
);

CREATE TABLE public.inventario_activo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ingrediente_id UUID REFERENCES public.inventario_maestro(id) ON DELETE RESTRICT NOT NULL,
    zona public.zona_almacen NOT NULL,
    cantidad DECIMAL NOT NULL DEFAULT 0.0 CHECK (cantidad >= 0.0),
    ultima_modificacion_por UUID REFERENCES public.usuarios(id),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (ingrediente_id, zona)
);

CREATE TABLE public.historial_inventario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ingrediente_id UUID REFERENCES public.inventario_maestro(id) ON DELETE CASCADE NOT NULL,
    zona public.zona_almacen NOT NULL,
    cantidad_anterior DECIMAL NOT NULL,
    cantidad_nueva DECIMAL NOT NULL,
    tipo_operacion public.inventario_operacion NOT NULL,
    usuario_id UUID REFERENCES public.usuarios(id) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.inventario_maestro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_activo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_inventario ENABLE ROW LEVEL SECURITY;

-- Trigger para registrar automáticamente transacciones en el historial al modificar inventario_activo
CREATE OR REPLACE FUNCTION public.registrar_historial_inventario()
RETURNS TRIGGER AS $$
DECLARE
    tipo_op public.inventario_operacion;
    cant_anterior DECIMAL;
BEGIN
    IF TG_OP = 'INSERT' THEN
        tipo_op := 'entrada';
        cant_anterior := 0.0;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.cantidad > OLD.cantidad THEN
            tipo_op := 'entrada';
        ELSIF NEW.cantidad < OLD.cantidad THEN
            tipo_op := 'salida';
        ELSE
            tipo_op := 'ajuste';
        END IF;
        cant_anterior := OLD.cantidad;
    END IF;

    INSERT INTO public.historial_inventario (
        ingrediente_id,
        zona,
        cantidad_anterior,
        cantidad_nueva,
        tipo_operacion,
        usuario_id
    ) VALUES (
        NEW.ingrediente_id,
        NEW.zona,
        cant_anterior,
        NEW.cantidad,
        tipo_op,
        NEW.ultima_modificacion_por
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_historial_inventario
AFTER INSERT OR UPDATE ON public.inventario_activo
FOR EACH ROW EXECUTE FUNCTION public.registrar_historial_inventario();

-- 6. TABLAS DE BRIEFING
CREATE TABLE public.elaboraciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    alergenos JSONB NOT NULL, -- Array de 14 booleanos o nombres de los alérgenos activos
    creado_por UUID REFERENCES public.usuarios(id)
);

CREATE TABLE public.cartas_semanales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE NOT NULL,
    fecha DATE NOT NULL,
    elaboraciones UUID[] NOT NULL,
    creado_por UUID REFERENCES public.usuarios(id)
);

ALTER TABLE public.elaboraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartas_semanales ENABLE ROW LEVEL SECURITY;

-- 7. TABLAS DE CHECKLISTS (DIARIOS Y LIMPIEZA)
CREATE TABLE public.jefes_cocina (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    grupo_id UUID REFERENCES public.grupos(id) NOT NULL,
    jefe_id UUID REFERENCES public.usuarios(id) NOT NULL, -- Alumno Jefe Cocina
    limpieza_id UUID REFERENCES public.usuarios(id) NOT NULL, -- Alumno Responsable Limpieza
    observaciones_produccion TEXT,
    observaciones_limpieza TEXT,
    firmado BOOLEAN DEFAULT false NOT NULL,
    firmado_en TIMESTAMP WITH TIME ZONE,
    UNIQUE (fecha, grupo_id)
);

CREATE TABLE public.checklist_produccion_tareas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE NOT NULL,
    tarea TEXT NOT NULL,
    activa BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE public.checklist_produccion_registro (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jefe_cocina_id UUID REFERENCES public.jefes_cocina(id) ON DELETE CASCADE NOT NULL,
    tarea_id UUID REFERENCES public.checklist_produccion_tareas(id) ON DELETE CASCADE NOT NULL,
    completada BOOLEAN DEFAULT false NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (jefe_cocina_id, tarea_id)
);

CREATE TABLE public.checklist_limpieza_tareas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aula TEXT NOT NULL,
    tarea TEXT NOT NULL,
    activa BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE public.checklist_limpieza_registro (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jefe_cocina_id UUID REFERENCES public.jefes_cocina(id) ON DELETE CASCADE NOT NULL,
    tarea_id UUID REFERENCES public.checklist_limpieza_tareas(id) ON DELETE CASCADE NOT NULL,
    completada BOOLEAN DEFAULT false NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (jefe_cocina_id, tarea_id)
);

ALTER TABLE public.jefes_cocina ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_produccion_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_produccion_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_limpieza_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_limpieza_registro ENABLE ROW LEVEL SECURITY;

-- 8. TABLA DE INCIDENCIAS
CREATE TABLE public.incidencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES public.usuarios(id) NOT NULL,
    tipo public.incidencia_tipo NOT NULL,
    descripcion VARCHAR(140) NOT NULL,
    estado public.incidencia_estado NOT NULL DEFAULT 'pendiente',
    fecha TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

-- 9. TABLA DE SUPERVISIÓN DE TALLER
CREATE TABLE public.supervision_taller (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    profesor_id UUID REFERENCES public.usuarios(id) NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    uniformidad INT CHECK (uniformidad BETWEEN 1 AND 5) NOT NULL,
    higiene INT CHECK (higiene BETWEEN 1 AND 5) NOT NULL,
    tecnica INT CHECK (tecnica BETWEEN 1 AND 5) NOT NULL,
    actitud INT CHECK (actitud BETWEEN 1 AND 5) NOT NULL,
    observaciones TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (alumno_id, fecha)
);

ALTER TABLE public.supervision_taller ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS) GENERALES
-- ==========================================

-- Usuarios: Lectura permitida a usuarios aprobados. Escritura a admins y al propio usuario.
CREATE POLICY usuarios_lectura ON public.usuarios
    FOR SELECT USING (estado_aprobacion = true OR auth.uid() = id);

CREATE POLICY usuarios_insercion_propia ON public.usuarios
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY usuarios_modificacion_propia_admin ON public.usuarios
    FOR UPDATE USING (auth.uid() = id OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin');

-- Grados, Modulos y Grupos: Lectura a todos los aprobados. Escritura solo a profesores y admins.
CREATE POLICY lectura_academica ON public.grados FOR SELECT USING (true);
CREATE POLICY escritura_grados_admin ON public.grados FOR ALL USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY lectura_modulos ON public.modulos FOR SELECT USING (true);
CREATE POLICY escritura_modulos_admin ON public.modulos FOR ALL USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY lectura_grupos ON public.grupos FOR SELECT USING (true);
CREATE POLICY escritura_grupos_profesor_admin ON public.grupos FOR ALL USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('profesor', 'admin')
);

CREATE POLICY lectura_alumnos_grupos ON public.alumnos_grupos FOR SELECT USING (true);
CREATE POLICY escritura_alumnos_grupos ON public.alumnos_grupos FOR ALL USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('profesor', 'admin')
);

-- Cámaras: Lectura a aprobados. Escritura a profesores y admins.
CREATE POLICY lectura_camaras ON public.camaras FOR SELECT USING (true);
CREATE POLICY escritura_camaras ON public.camaras FOR ALL USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('profesor', 'admin')
);

-- Registro Temperaturas: Lectura a aprobados. Escritura a todos (alumnos registran, profesores mod/corrigen).
CREATE POLICY lectura_registro_temperaturas ON public.registro_temperaturas FOR SELECT USING (true);
CREATE POLICY escritura_registro_temperaturas ON public.registro_temperaturas FOR ALL USING (
    (SELECT estado_aprobacion FROM public.usuarios WHERE id = auth.uid()) = true
);

-- Inventario Maestro: Lectura a aprobados. Escritura a profesores y admins.
CREATE POLICY lectura_inventario_maestro ON public.inventario_maestro FOR SELECT USING (true);
CREATE POLICY escritura_inventario_maestro ON public.inventario_maestro FOR ALL USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('profesor', 'admin')
);

-- Inventario Activo e Historial: Lectura a aprobados. Escritura a aprobados.
CREATE POLICY lectura_inventario_activo ON public.inventario_activo FOR SELECT USING (true);
CREATE POLICY escritura_inventario_activo ON public.inventario_activo FOR ALL USING (
    (SELECT estado_aprobacion FROM public.usuarios WHERE id = auth.uid()) = true
);

CREATE POLICY lectura_historial_inventario ON public.historial_inventario FOR SELECT USING (true);
CREATE POLICY escritura_historial_inventario ON public.historial_inventario FOR INSERT WITH CHECK (
    (SELECT estado_aprobacion FROM public.usuarios WHERE id = auth.uid()) = true
);

-- Incidencias: Lectura a aprobados. Escritura a aprobados (inserción) y a profesores/admins (modificación).
CREATE POLICY lectura_incidencias ON public.incidencias FOR SELECT USING (true);
CREATE POLICY insercion_incidencias ON public.incidencias FOR INSERT WITH CHECK (
    (SELECT estado_aprobacion FROM public.usuarios WHERE id = auth.uid()) = true
);
CREATE POLICY gestion_incidencias ON public.incidencias FOR UPDATE USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('profesor', 'admin')
);

-- Supervisión Taller: Lectura y escritura exclusiva a profesores y admins.
CREATE POLICY lectura_supervision ON public.supervision_taller FOR SELECT USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('profesor', 'admin')
);
CREATE POLICY escritura_supervision ON public.supervision_taller FOR ALL USING (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('profesor', 'admin')
);


-- ==========================================
-- CARGA DE DATOS INICIALES (CURRÍCULOS NACIONALES)
-- ==========================================

-- Grados Básico (GB), Medio (GM), Superior (GS) y Cursos Especialización (CE)
INSERT INTO public.grados (id, tipo, nombre) VALUES
    ('10000000-0000-0000-0000-000000000001', 'GB', 'Cocina y Restauración'),
    ('10000000-0000-0000-0000-000000000002', 'GB', 'Actividades de Panadería y Pastelería'),
    ('10000000-0000-0000-0000-000000000003', 'GB', 'Alojamiento y Lavandería'),
    ('10000000-0000-0000-0000-000000000004', 'GM', 'Cocina y Gastronomía'),
    ('10000000-0000-0000-0000-000000000005', 'GM', 'Servicios en Restauración'),
    ('10000000-0000-0000-0000-000000000006', 'GM', 'Comercialización de Productos Alimentarios'),
    ('10000000-0000-0000-0000-000000000007', 'GS', 'Dirección de Cocina'),
    ('10000000-0000-0000-0000-000000000008', 'GS', 'Dirección de Servicios de Restauración'),
    ('10000000-0000-0000-0000-000000000009', 'GS', 'Gestión de Alojamientos Turísticos'),
    ('10000000-0000-0000-0000-000000000010', 'GS', 'Agencias de Viajes y Gestión de Eventos'),
    ('10000000-0000-0000-0000-000000000011', 'GS', 'Guía, Información y Asistencias Turísticas'),
    ('10000000-0000-0000-0000-000000000012', 'CE', 'Maestría de corte y cata de jamón y paleta curados'),
    ('10000000-0000-0000-0000-000000000013', 'CE', 'Panadería y bollería artesanales'),
    ('10000000-0000-0000-0000-000000000014', 'CE', 'Coordinación del Personal en Eventos'),
    ('10000000-0000-0000-0000-000000000015', 'CE', 'Turismo micológico')
ON CONFLICT (nombre) DO NOTHING;

-- Módulos de Cocina y Restauración (Grado Básico)
INSERT INTO public.modulos (grado_id, curso, nombre) VALUES
    ('10000000-0000-0000-0000-000000000001', 1, 'Técnicas elementales de preelaboración'),
    ('10000000-0000-0000-0000-000000000001', 1, 'Procesos básicos de preparación culinaria'),
    ('10000000-0000-0000-0000-000000000001', 2, 'Preparación y montaje de materiales para colectividades y catering'),
    ('10000000-0000-0000-0000-000000000001', 2, 'Procesos básicos de servicio')
ON CONFLICT DO NOTHING;

-- Módulos de Cocina y Gastronomía (Grado Medio)
INSERT INTO public.modulos (grado_id, curso, nombre) VALUES
    ('10000000-0000-0000-0000-000000000004', 1, 'Preelaboración y conservación de alimentos'),
    ('10000000-0000-0000-0000-000000000004', 1, 'Técnicas culinarias'),
    ('10000000-0000-0000-0000-000000000004', 1, 'Procesos básicos de pastelería y repostería'),
    ('10000000-0000-0000-0000-000000000004', 1, 'Seguridad e higiene en la manipulación de alimentos'),
    ('10000000-0000-0000-0000-000000000004', 2, 'Repostería'),
    ('10000000-0000-0000-0000-000000000004', 2, 'Elaboraciones de pastelería y repostería en cocina'),
    ('10000000-0000-0000-0000-000000000004', 2, 'Cocina en miniatura'),
    ('10000000-0000-0000-0000-000000000004', 2, 'Platos preparados'),
    ('10000000-0000-0000-0000-000000000004', 2, 'Gestión de la producción en cocina')
ON CONFLICT DO NOTHING;

-- Módulos de Dirección de Cocina (Grado Superior)
INSERT INTO public.modulos (grado_id, curso, nombre) VALUES
    ('10000000-0000-0000-0000-000000000007', 1, 'Control del aprovisionamiento de materias primas'),
    ('10000000-0000-0000-0000-000000000007', 1, 'Procesos de preelaboración y conservación en cocina'),
    ('10000000-0000-0000-0000-000000000007', 1, 'Elaboraciones culinarias'),
    ('10000000-0000-0000-0000-000000000007', 1, 'Procesos de repostería y pastelería industrial'),
    ('10000000-0000-0000-0000-000000000007', 1, 'Gestión de la calidad y la seguridad e higiene alimentaria'),
    ('10000000-0000-0000-0000-000000000007', 2, 'Gastronomía y nutrición'),
    ('10000000-0000-0000-0000-000000000007', 2, 'Gestión de departamentos de cocina'),
    ('10000000-0000-0000-0000-000000000007', 2, 'Planificación de espacios y maquinaria')
ON CONFLICT DO NOTHING;

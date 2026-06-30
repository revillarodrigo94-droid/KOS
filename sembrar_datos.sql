-- =====================================================================
-- KITCHENOS - SCRIPT DE SIEMBRA DE DATOS ALEATORIOS (SEED DATA)
-- =====================================================================
-- Ejecuta este script en el editor SQL de Supabase para poblar tu base
-- de datos con registros aleatorios realistas generados por Postgres.
-- Este script respecta las claves foráneas y la estructura de tablas 
-- de maestros y stocks activos de forma 100% dinámica.

-- 1. Sembrar cámaras y lecturas térmicas aleatorias para los últimos 14 días usando bloque PL/pgSQL
DO $$
DECLARE
  v_profesor_id UUID;
  v_nevera_carnes_id UUID;
  v_nevera_pescados_id UUID;
  v_congelador_id UUID;
  v_day INT;
BEGIN
  -- Obtener el primer usuario profesor o admin disponible para ser responsable de cámaras
  SELECT id INTO v_profesor_id FROM public.usuarios WHERE rol IN ('profesor', 'admin') LIMIT 1;
  
  -- Si no hay profesores, usar cualquier usuario existente
  IF v_profesor_id IS NULL THEN
    SELECT id INTO v_profesor_id FROM public.usuarios LIMIT 1;
  END IF;

  -- Si hay al menos un usuario, sembrar las cámaras y registros térmicos
  IF v_profesor_id IS NOT NULL THEN
    
    -- Limpiar históricos anteriores
    DELETE FROM public.registro_temperaturas;
    DELETE FROM public.camaras;

    -- Crear cámaras
    INSERT INTO public.camaras (nombre, tipo, temperatura_limite, profesor_id, activa)
    VALUES ('Nevera de Carnes', 'refrigeracion', 4.0, v_profesor_id, true)
    RETURNING id INTO v_nevera_carnes_id;

    INSERT INTO public.camaras (nombre, tipo, temperatura_limite, profesor_id, activa)
    VALUES ('Nevera de Pescados', 'refrigeracion', 2.0, v_profesor_id, true)
    RETURNING id INTO v_nevera_pescados_id;

    INSERT INTO public.camaras (nombre, tipo, temperatura_limite, profesor_id, activa)
    VALUES ('Congelador General', 'congelacion', -18.0, v_profesor_id, true)
    RETURNING id INTO v_congelador_id;

    -- Sembrar lecturas diarias (inicio y fin de turno) de los últimos 14 días
    FOR v_day IN 0..13 LOOP
      
      -- Nevera de Carnes
      INSERT INTO public.registro_temperaturas (camara_id, fecha, momento, temperatura, usuario_id, alerta, creado_en)
      VALUES (
        v_nevera_carnes_id,
        CURRENT_DATE - v_day,
        'inicio',
        round((2.0 + random() * 2.5)::numeric, 1), -- 2.0 a 4.5
        v_profesor_id,
        (round((2.0 + random() * 2.5)::numeric, 1) > 4.0),
        NOW() - (v_day || ' days')::interval - INTERVAL '5 hours'
      );
      
      INSERT INTO public.registro_temperaturas (camara_id, fecha, momento, temperatura, usuario_id, alerta, creado_en)
      VALUES (
        v_nevera_carnes_id,
        CURRENT_DATE - v_day,
        'fin',
        round((2.2 + random() * 2.3)::numeric, 1),
        v_profesor_id,
        (round((2.2 + random() * 2.3)::numeric, 1) > 4.0),
        NOW() - (v_day || ' days')::interval
      );

      -- Nevera de Pescados
      INSERT INTO public.registro_temperaturas (camara_id, fecha, momento, temperatura, usuario_id, alerta, creado_en)
      VALUES (
        v_nevera_pescados_id,
        CURRENT_DATE - v_day,
        'inicio',
        round((0.5 + random() * 1.8)::numeric, 1),
        v_profesor_id,
        (round((0.5 + random() * 1.8)::numeric, 1) > 2.0),
        NOW() - (v_day || ' days')::interval - INTERVAL '5 hours'
      );

      -- Congelador General
      INSERT INTO public.registro_temperaturas (camara_id, fecha, momento, temperatura, usuario_id, alerta, creado_en)
      VALUES (
        v_congelador_id,
        CURRENT_DATE - v_day,
        'inicio',
        round((-22.0 + random() * 5.0)::numeric, 1),
        v_profesor_id,
        (round((-22.0 + random() * 5.0)::numeric, 1) > -18.0),
        NOW() - (v_day || ' days')::interval - INTERVAL '5 hours'
      );

    END LOOP;
  END IF;
END $$;

-- 2. Sembrar ingredientes en Inventario Maestro e Inventario Activo usando bloque PL/pgSQL
DO $$
DECLARE
  v_profesor_id UUID;
  v_ing_solomillo UUID;
  v_ing_rodaballo UUID;
  v_ing_harina UUID;
  v_ing_chocolate UUID;
  v_ing_mantequilla UUID;
  v_ing_huevo UUID;
  v_ing_arroz UUID;
  v_ing_setas UUID;
BEGIN
  -- Obtener el primer usuario disponible
  SELECT id INTO v_profesor_id FROM public.usuarios WHERE rol IN ('profesor', 'admin') LIMIT 1;
  IF v_profesor_id IS NULL THEN
    SELECT id INTO v_profesor_id FROM public.usuarios LIMIT 1;
  END IF;

  -- Limpiar existencias previas e ingredientes maestros
  DELETE FROM public.historial_inventario;
  DELETE FROM public.inventario_activo;
  DELETE FROM public.inventario_maestro;

  IF v_profesor_id IS NOT NULL THEN
    
    -- Insertar ingredientes maestros
    INSERT INTO public.inventario_maestro (nombre, categoria, unidad_medida, creado_por)
    VALUES ('Solomillo de Ternera de Ávila', 'Carnes', 'kg', v_profesor_id)
    RETURNING id INTO v_ing_solomillo;

    INSERT INTO public.inventario_maestro (nombre, categoria, unidad_medida, creado_por)
    VALUES ('Rodaballo Salvaje Cantábrico', 'Pescados/Mariscos', 'kg', v_profesor_id)
    RETURNING id INTO v_ing_rodaballo;

    INSERT INTO public.inventario_maestro (nombre, categoria, unidad_medida, creado_por)
    VALUES ('Harina de Fuerza W300', 'Secos/Almacén', 'kg', v_profesor_id)
    RETURNING id INTO v_ing_harina;

    INSERT INTO public.inventario_maestro (nombre, categoria, unidad_medida, creado_por)
    VALUES ('Chocolate Cobertura Guanaja 70%', 'Otros', 'kg', v_profesor_id)
    RETURNING id INTO v_ing_chocolate;

    INSERT INTO public.inventario_maestro (nombre, categoria, unidad_medida, creado_por)
    VALUES ('Mantequilla Profesional 82% MG', 'Lácteos', 'kg', v_profesor_id)
    RETURNING id INTO v_ing_mantequilla;

    INSERT INTO public.inventario_maestro (nombre, categoria, unidad_medida, creado_por)
    VALUES ('Huevo Ecológico XL', 'Lácteos', 'unidades', v_profesor_id)
    RETURNING id INTO v_ing_huevo;

    INSERT INTO public.inventario_maestro (nombre, categoria, unidad_medida, creado_por)
    VALUES ('Arroz Arborio Riso Gallo', 'Secos/Almacén', 'kg', v_profesor_id)
    RETURNING id INTO v_ing_arroz;

    INSERT INTO public.inventario_maestro (nombre, categoria, unidad_medida, creado_por)
    VALUES ('Setas Silvestres (Boletus)', 'Verduras/Frutas', 'kg', v_profesor_id)
    RETURNING id INTO v_ing_setas;

    -- Asignar stocks activos en las zonas correspondientes
    -- Zonas válidas del enum: 'economato', 'bodega', 'camaras', 'refrigeradora', 'congeladora'
    INSERT INTO public.inventario_activo (ingrediente_id, zona, cantidad, stock_minimo, ultima_modificacion_por)
    VALUES (v_ing_solomillo, 'refrigeradora', round((5.0 + random() * 10.0)::numeric, 1), 12.0, v_profesor_id);

    INSERT INTO public.inventario_activo (ingrediente_id, zona, cantidad, stock_minimo, ultima_modificacion_por)
    VALUES (v_ing_rodaballo, 'refrigeradora', round((2.0 + random() * 5.0)::numeric, 1), 8.0, v_profesor_id);

    INSERT INTO public.inventario_activo (ingrediente_id, zona, cantidad, stock_minimo, ultima_modificacion_por)
    VALUES (v_ing_harina, 'economato', round((25.0 + random() * 20.0)::numeric, 1), 20.0, v_profesor_id);

    INSERT INTO public.inventario_activo (ingrediente_id, zona, cantidad, stock_minimo, ultima_modificacion_por)
    VALUES (v_ing_chocolate, 'economato', round((1.0 + random() * 5.0)::numeric, 1), 6.0, v_profesor_id);

    INSERT INTO public.inventario_activo (ingrediente_id, zona, cantidad, stock_minimo, ultima_modificacion_por)
    VALUES (v_ing_mantequilla, 'refrigeradora', round((12.0 + random() * 10.0)::numeric, 1), 10.0, v_profesor_id);

    INSERT INTO public.inventario_activo (ingrediente_id, zona, cantidad, stock_minimo, ultima_modificacion_por)
    VALUES (v_ing_huevo, 'refrigeradora', floor(random() * 200 + 100)::int, 120, v_profesor_id);

    INSERT INTO public.inventario_activo (ingrediente_id, zona, cantidad, stock_minimo, ultima_modificacion_por)
    VALUES (v_ing_arroz, 'economato', round((12.0 + random() * 10.0)::numeric, 1), 10.0, v_profesor_id);

    INSERT INTO public.inventario_activo (ingrediente_id, zona, cantidad, stock_minimo, ultima_modificacion_por)
    VALUES (v_ing_setas, 'refrigeradora', round((1.0 + random() * 5.0)::numeric, 1), 4.0, v_profesor_id);

  END IF;
END $$;

-- 3. Sembrar elaboraciones del menú diario por partidas y con escandallo (con formato JSONB correcto para alérgenos)
DELETE FROM public.elaboraciones;

INSERT INTO public.elaboraciones (nombre, descripcion, coste_materia_prima, raciones_previstas, partida, alergenos)
VALUES
  ('Risotto de Setas Silvestres', 'Risotto meloso con boletus, butter de trufa y Parmesano Reggiano.', 24.50, 10, 'General', '["Lácteos"]'::jsonb),
  ('Solomillo Wellington con Salsa Oporto', 'Solomillo envuelto en hojaldre con duxelle de champiñones y reducción de vino Oporto.', 85.00, 8, 'Calientes/Carnes', '["Gluten", "Lácteos", "Sulfitos"]'::jsonb),
  ('Ceviche de Rodaballo y Leche de Tigre', 'Ceviche marinado al momento con lima, cebolla morada y cilantro.', 35.00, 6, 'Entrantes/Fríos', '["Pescado"]'::jsonb),
  ('Coulant de Chocolate Cobertura 70%', 'Bizcocho fluido de chocolate horneado al momento servido con helado de vainilla.', 12.00, 12, 'Repostería/Pastelería', '["Gluten", "Lácteos", "Huevos"]'::jsonb);

-- 4. Sembrar evaluaciones técnicas (Taller) para los alumnos reales existentes
DELETE FROM public.supervision_taller;

INSERT INTO public.supervision_taller (alumno_id, profesor_id, fecha, uniformidad, higiene, tecnica, actitud, observaciones, creado_en)
SELECT 
  usr.id,
  null,
  CURRENT_DATE - (d.day || ' days')::interval,
  floor(random() * 3 + 3)::int, -- Calificaciones entre 3 y 5
  floor(random() * 3 + 3)::int,
  floor(random() * 3 + 3)::int,
  floor(random() * 3 + 3)::int,
  CASE floor(random() * 3)::int
    WHEN 0 THEN 'Gran destreza en los cortes y emplatado.'
    WHEN 1 THEN 'Muy buena actitud y compañerismo en el taller.'
    ELSE 'Buen desempeño general, sigue así.'
  END,
  NOW() - (d.day || ' days')::interval
FROM public.usuarios usr
CROSS JOIN (SELECT generate_series(0, 4, 2) AS day) d
WHERE usr.rol = 'alumno';

-- 5. Sembrar incidencias de prueba vinculadas a los usuarios reales existentes
DELETE FROM public.respuestas_incidencias;
DELETE FROM public.incidencias;

-- Insertar incidencias dinámicas basadas en los alumnos registrados
INSERT INTO public.incidencias (id, usuario_id, tipo, descripcion, estado, prioridad, fecha)
SELECT 
  'e1111111-1111-1111-1111-111111111111',
  usr.id,
  'peligro'::public.incidencia_tipo,
  'Fuga de gas detectada en Cocina 2. Se ha procedido a cerrar la válvula central del ala este por precaución.',
  'pendiente'::public.incidencia_estado,
  'critica',
  NOW() - INTERVAL '2 hours'
FROM public.usuarios usr
WHERE usr.rol = 'alumno'
LIMIT 1;

INSERT INTO public.incidencias (id, usuario_id, tipo, descripcion, estado, prioridad, fecha)
SELECT 
  'e2222222-2222-2222-2222-222222222222',
  usr.id,
  'averia'::public.incidencia_tipo,
  'Fallo en el termostato de la nevera de lácteos. La temperatura oscila entre 6 y 9 grados.',
  'pendiente'::public.incidencia_estado,
  'media',
  NOW() - INTERVAL '1 day'
FROM public.usuarios usr
WHERE usr.rol = 'alumno'
OFFSET 1 LIMIT 1;

-- Responder a las incidencias generadas dinámicamente si existen
INSERT INTO public.respuestas_incidencias (incidencia_id, usuario_id, mensaje, creado_en)
SELECT 
  inc.id,
  inc.usuario_id,
  'Ya cerramos la válvula este. Evaluando con los compañeros la hornilla central.',
  NOW() - INTERVAL '1 hour'
FROM public.incidencias inc
WHERE inc.prioridad = 'critica';

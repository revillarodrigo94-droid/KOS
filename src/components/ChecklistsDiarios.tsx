import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { 
  JefeCocina, 
  ChecklistProduccionTarea, 
  ChecklistProduccionRegistro,
  ChecklistLimpiezaTarea,
  ChecklistLimpiezaRegistro,
  Grupo,
  Usuario
} from '../types/database.types';
import { 
  CheckSquare, 
  UserPlus, 
  ClipboardList, 
  FileText, 
  Plus, 
  Check, 
  Trash2, 
  Loader2, 
  UserCheck, 
  Edit3, 
  AlertCircle,
  BookOpen
} from 'lucide-react';

export const ChecklistsDiarios: React.FC = () => {
  const { profile } = useAuth();
  const isAlumno = profile?.rol === 'alumno';
  const isProfesor = profile?.rol === 'profesor';
  const isAdmin = profile?.rol === 'admin';

  // Datos
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [alumnos, setAlumnos] = useState<Usuario[]>([]);
  const [jefaturas, setJefaturas] = useState<(JefeCocina & { grupo_nombre?: string; jefe_nombre?: string; limpieza_nombre?: string })[]>([]);
  
  // Tareas maestras
  const [tareasProd, setTareasProd] = useState<ChecklistProduccionTarea[]>([]);
  const [tareasLimp, setTareasLimp] = useState<ChecklistLimpiezaTarea[]>([]);

  // Registros del día seleccionado
  const [activeJefatura, setActiveJefatura] = useState<(JefeCocina & { grupo_nombre?: string }) | null>(null);
  const [registrosProd, setRegistrosProd] = useState<Record<string, boolean>>({});
  const [registrosLimp, setRegistrosLimp] = useState<Record<string, boolean>>({});

  // Carga
  const [loading, setLoading] = useState(true);
  const [savingAsignacion, setSavingAsignacion] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);

  // Pestañas
  const [activeTab, setActiveTab] = useState<'taller' | 'roles' | 'config'>('taller');
  const [activeChecklistTab, setActiveChecklistTab] = useState<'produccion' | 'limpieza'>('produccion');

  // Formulario de asignación de roles
  const [grupoSel, setGrupoSel] = useState('');
  const [fechaSel, setFechaSel] = useState(new Date().toISOString().split('T')[0]);
  const [jefeSel, setJefeSel] = useState('');
  const [limpiezaSel, setLimpiezaSel] = useState('');

  // Formulario Nueva Tarea Maestra
  const [nuevaTareaTexto, setNuevaTareaTexto] = useState('');
  const [tipoNuevaTarea, setTipoNuevaTarea] = useState<'produccion' | 'limpieza'>('produccion');
  const [aulaTareaLimp, setAulaTareaLimp] = useState('Taller Central');

  // Firmas y Observaciones
  const [observaciones, setObservaciones] = useState('');
  
  // Revisión Docente
  const [comentarioRevision, setComentarioRevision] = useState('');
  const [urlFoto, setUrlFoto] = useState('');
  const [fotosRevision, setFotosRevision] = useState<string[]>([]);
  const [savingRevision, setSavingRevision] = useState(false);

  // Alertas
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Cargar grupos
      const { data: grps } = await supabase
        .from('grupos')
        .select('*')
        .eq('activo', true);
      setGrupos(grps || []);

      // 2. Cargar alumnos
      const { data: alms } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'alumno')
        .eq('estado_aprobacion', true);
      setAlumnos(alms || []);

      // 3. Cargar tareas de producción activas
      const { data: tP } = await supabase
        .from('checklist_produccion_tareas')
        .select('*')
        .eq('activa', true);
      setTareasProd(tP || []);

      // 4. Cargar tareas de limpieza activas
      const { data: tL } = await supabase
        .from('checklist_limpieza_tareas')
        .select('*')
        .eq('activa', true);
      setTareasLimp(tL || []);

      // 5. Cargar asignaciones de roles (Jefaturas)
      const { data: jefs } = await supabase
        .from('jefes_cocina')
        .select(`
          *,
          grupos(nombre)
        `)
        .order('fecha', { ascending: false });

      if (jefs) {
        // Enlazar nombres de los alumnos de forma local para evitar joins complejos cruzando con auth
        const formatted = jefs.map((j: any) => {
          const jefeObj = alms?.find(a => a.id === j.jefe_id);
          const limpObj = alms?.find(a => a.id === j.limpieza_id);
          return {
            ...j,
            grupo_nombre: j.grupos?.nombre || 'General',
            jefe_nombre: jefeObj ? `${jefeObj.nombre} ${jefeObj.apellidos}` : 'No asignado',
            limpieza_nombre: limpObj ? `${limpObj.nombre} ${limpObj.apellidos}` : 'No asignado'
          };
        });
        setJefaturas(formatted);

        // Seleccionar por defecto la jefatura de hoy si existe
        const hoyString = new Date().toISOString().split('T')[0];
        const jefHoy = formatted.find(j => j.fecha === hoyString);
        if (jefHoy) {
          setActiveJefatura(jefHoy);
          setComentarioRevision(jefHoy.comentario_revision || '');
          setFotosRevision(jefHoy.fotos_revision || []);
          await loadRegistrosChecklists(jefHoy.id);
        } else if (formatted.length > 0) {
          // O la última disponible
          setActiveJefatura(formatted[0]);
          setComentarioRevision(formatted[0].comentario_revision || '');
          setFotosRevision(formatted[0].fotos_revision || []);
          await loadRegistrosChecklists(formatted[0].id);
        }
      }

    } catch (err: any) {
      setErrorMsg('Error al cargar checklists: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrosChecklists = async (jefaturaId: string) => {
    try {
      // Cargar registros de producción
      const { data: regP } = await supabase
        .from('checklist_produccion_registro')
        .select('*')
        .eq('jefe_cocina_id', jefaturaId);

      const mapP: Record<string, boolean> = {};
      regP?.forEach(r => {
        mapP[r.tarea_id] = r.completada;
      });
      setRegistrosProd(mapP);

      // Cargar registros de limpieza
      const { data: regL } = await supabase
        .from('checklist_limpieza_registro')
        .select('*')
        .eq('jefe_cocina_id', jefaturaId);

      const mapL: Record<string, boolean> = {};
      regL?.forEach(r => {
        mapL[r.tarea_id] = r.completada;
      });
      setRegistrosLimp(mapL);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  // Manejar cambio de Jefatura seleccionada
  const handleSelectJefatura = async (jef: any) => {
    setActiveJefatura(jef);
    setComentarioRevision(jef.comentario_revision || '');
    setFotosRevision(jef.fotos_revision || []);
    setLoading(true);
    await loadRegistrosChecklists(jef.id);
    setLoading(false);
  };

  // Crear Asignación de Roles
  const handleAsignarRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grupoSel || !jefeSel || !limpiezaSel) {
      alert('Completa todos los campos obligatorios.');
      return;
    }
    setSavingAsignacion(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Verificar si ya existe asignación para esa fecha y grupo
      const { data: existing } = await supabase
        .from('jefes_cocina')
        .select('id')
        .eq('grupo_id', grupoSel)
        .eq('fecha', fechaSel)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('jefes_cocina')
          .update({
            jefe_id: jefeSel,
            limpieza_id: limpiezaSel
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('jefes_cocina')
          .insert([{
            grupo_id: grupoSel,
            fecha: fechaSel,
            jefe_id: jefeSel,
            limpieza_id: limpiezaSel,
            firmado: false
          }]);
        if (error) throw error;
      }

      setSuccessMsg('Roles asignados con éxito.');
      setGrupoSel('');
      setJefeSel('');
      setLimpiezaSel('');
      setActiveTab('taller');
      fetchData();
    } catch (err: any) {
      setErrorMsg('Error al asignar roles: ' + err.message);
    } finally {
      setSavingAsignacion(false);
    }
  };

  // Crear Tarea Maestra
  const handleCrearTareaMaestra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaTareaTexto.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (tipoNuevaTarea === 'produccion') {
        // En checklists de producción la tarea puede ser general o de un grupo
        const { error } = await supabase
          .from('checklist_produccion_tareas')
          .insert([{
            tarea: nuevaTareaTexto.trim(),
            activa: true
          }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('checklist_limpieza_tareas')
          .insert([{
            aula: aulaTareaLimp,
            tarea: nuevaTareaTexto.trim(),
            activa: true
          }]);
        if (error) throw error;
      }

      setSuccessMsg('Tarea maestra añadida correctamente.');
      setNuevaTareaTexto('');
      fetchData();
    } catch (err: any) {
      setErrorMsg('Error al crear tarea: ' + err.message);
    }
  };

  // Completar / Desmarcar Tarea en tiempo real
  const handleToggleTareaRegistro = async (tareaId: string, tipo: 'produccion' | 'limpieza') => {
    if (!activeJefatura) return;

    // Control de permisos: Alumnos solo pueden marcar si tienen asignado el rol correspondiente o son profesores
    const soyJefe = profile?.id === activeJefatura.jefe_id;
    const soyLimpieza = profile?.id === activeJefatura.limpieza_id;
    
    if (isAlumno && tipo === 'produccion' && !soyJefe) {
      alert('Permiso denegado: Solo el Jefe de Cocina de hoy puede modificar el checklist de producción.');
      return;
    }
    if (isAlumno && tipo === 'limpieza' && !soyLimpieza) {
      alert('Permiso denegado: Solo el Encargado de Limpieza de hoy puede modificar el checklist de limpieza.');
      return;
    }

    if (activeJefatura.firmado) {
      alert('Este registro diario ya está congelado y firmado. No se admiten modificaciones.');
      return;
    }

    const tabla = tipo === 'produccion' ? 'checklist_produccion_registro' : 'checklist_limpieza_registro';
    const registrosActuales = tipo === 'produccion' ? registrosProd : registrosLimp;
    const setRegistros = tipo === 'produccion' ? setRegistrosProd : setRegistrosLimp;
    
    const yaCompletada = registrosActuales[tareaId] || false;
    const nuevaCompletada = !yaCompletada;

    // Actualizar optimísticamente en UI
    setRegistros(prev => ({ ...prev, [tareaId]: nuevaCompletada }));

    try {
      // Buscar si ya existe el registro en BD
      const { data: existing } = await supabase
        .from(tabla)
        .select('id')
        .eq('jefe_cocina_id', activeJefatura.id)
        .eq('tarea_id', tareaId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from(tabla)
          .update({ completada: nuevaCompletada, actualizado_en: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(tabla)
          .insert([{
            jefe_cocina_id: activeJefatura.id,
            tarea_id: tareaId,
            completada: nuevaCompletada
          }]);
        if (error) throw error;
      }
    } catch (err: any) {
      // Revertir en caso de error
      setRegistros(prev => ({ ...prev, [tareaId]: yaCompletada }));
      alert('Error al guardar tarea: ' + err.message);
    }
  };

  // Firmar y congelar el checklist diario
  const handleFirmaChecklist = async () => {
    if (!activeJefatura) return;

    const confirmacion = window.confirm('¿Estás seguro de firmar y congelar este checklist? Esta acción no se puede deshacer.');
    if (!confirmacion) return;

    setSavingChecklist(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const nombreFirma = `${profile?.nombre || ''} ${profile?.apellidos || ''}`.trim() || 'Jefe/Encargado';
      
      // Congelar jefatura con firma y observaciones
      const { error } = await supabase
        .from('jefes_cocina')
        .update({
          firmado: true,
          firmado_en: new Date().toISOString(),
          firma_nombre: nombreFirma,
          observaciones_produccion: activeChecklistTab === 'produccion' ? observaciones : activeJefatura.observaciones_produccion,
          observaciones_limpieza: activeChecklistTab === 'limpieza' ? observaciones : activeJefatura.observaciones_limpieza
        })
        .eq('id', activeJefatura.id);

      if (error) throw error;

      setSuccessMsg('Firma registrada. El registro del taller ha sido congelado correctamente.');
      setObservaciones('');
      fetchData();
    } catch (err: any) {
      setErrorMsg('Error al guardar firma: ' + err.message);
    } finally {
      setSavingChecklist(false);
    }
  };

  // Guardar la revisión del profesor
  const handleGuardarRevision = async () => {
    if (!activeJefatura) return;
    setSavingRevision(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('jefes_cocina')
        .update({
          comentario_revision: comentarioRevision.trim() || null,
          fotos_revision: fotosRevision
        })
        .eq('id', activeJefatura.id);

      if (error) throw error;
      setSuccessMsg('Revisión docente guardada correctamente.');
      fetchData();
    } catch (err: any) {
      setErrorMsg('Error al guardar revisión: ' + err.message);
    } finally {
      setSavingRevision(false);
    }
  };

  const soyJefeActivo = activeJefatura && profile?.id === activeJefatura.jefe_id;
  const soyLimpiezaActivo = activeJefatura && profile?.id === activeJefatura.limpieza_id;
  const puedeFirmar = activeJefatura && !activeJefatura.firmado && 
    (isProfesor || isAdmin || (activeChecklistTab === 'produccion' && soyJefeActivo) || (activeChecklistTab === 'limpieza' && soyLimpiezaActivo));

  return (
    <div style={styles.container}>
      {/* CABECERA Y SECTOR DE PESTAÑAS */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckSquare size={24} color="var(--accent)" />
          <h2 style={styles.title}>Checklists Diarios de Cocina y Limpieza</h2>
        </div>

        <div style={styles.tabContainer}>
          <button 
            style={{...styles.tabBtn, ...(activeTab === 'taller' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('taller')}
          >
            Llenar Checklists
          </button>
          
          {(isProfesor || isAdmin) && (
            <>
              <button 
                style={{...styles.tabBtn, ...(activeTab === 'roles' ? styles.activeTab : {})}}
                onClick={() => setActiveTab('roles')}
              >
                Asignar Roles Diarios
              </button>
              <button 
                style={{...styles.tabBtn, ...(activeTab === 'config' ? styles.activeTab : {})}}
                onClick={() => setActiveTab('config')}
              >
                Configurar Tareas
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
      {successMsg && <div style={styles.successAlert}>{successMsg}</div>}

      {loading ? (
        <div style={styles.loaderWrapper}>
          <Loader2 size={32} className="spin-animation" color="var(--accent)" />
          <p>Cargando checklists...</p>
        </div>
      ) : (
        <>
          {/* PESTAÑA 1: LLENAR CHECKLISTS */}
          {activeTab === 'taller' && (
            <div style={styles.tallerLayout}>
              {/* Panel Izquierdo: Fechas / Sesiones */}
              <div style={styles.sideBento}>
                <div style={styles.panelTitle}>Sesiones de Taller</div>
                <div style={styles.recetarioScroll}>
                  {jefaturas.length === 0 ? (
                    <div style={styles.emptyBox}>No hay roles asignados.</div>
                  ) : (
                    jefaturas.map(jef => {
                      const isActive = activeJefatura?.id === jef.id;
                      return (
                        <div 
                          key={jef.id} 
                          onClick={() => handleSelectJefatura(jef)}
                          style={{
                            ...styles.sessionCard,
                            ...(isActive ? styles.sessionCardActive : {})
                          }}
                        >
                          <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{jef.grupo_nombre}</div>
                            {jef.firmado ? (
                              <span style={styles.chipSigned}>Firmado</span>
                            ) : (
                              <span style={styles.chipPending}>Pendiente</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Fecha: {new Date(jef.fecha).toLocaleDateString('es-ES')}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            👨‍🍳 Jefe: {jef.jefe_nombre?.split(' ')[0]} | 🧼 Limp: {jef.limpieza_nombre?.split(' ')[0]}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Panel Derecho: Checklists */}
              {activeJefatura ? (
                <div style={styles.mainBento}>
                  <div style={styles.activeSessionHeader}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {activeJefatura.grupo_nombre}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Servicio del {new Date(activeJefatura.fecha).toLocaleDateString('es-ES')}
                      </p>
                    </div>

                    <div style={styles.checklistTabs}>
                      <button
                        style={{...styles.checkTabBtn, ...(activeChecklistTab === 'produccion' ? styles.activeCheckTabBtn : {})}}
                        onClick={() => setActiveChecklistTab('produccion')}
                      >
                        Producción (Jefe de Cocina)
                      </button>
                      <button
                        style={{...styles.checkTabBtn, ...(activeChecklistTab === 'limpieza' ? styles.activeCheckTabBtn : {})}}
                        onClick={() => setActiveChecklistTab('limpieza')}
                      >
                        Limpieza de Aula
                      </button>
                    </div>
                  </div>

                  {/* Advertencia de solo lectura */}
                  {!isProfesor && !isAdmin && (
                    (activeChecklistTab === 'produccion' && !soyJefeActivo) || 
                    (activeChecklistTab === 'limpieza' && !soyLimpiezaActivo)
                  ) && (
                    <div style={styles.infoBar}>
                      <Info size={16} />
                      <span>Modo Solo Lectura. No eres el alumno asignado a este rol para hoy.</span>
                    </div>
                  )}

                  {/* Alerta de incidencia o revisión docente para alumnos */}
                  {activeJefatura.firmado && (activeJefatura.comentario_revision || (activeJefatura.fotos_revision && activeJefatura.fotos_revision.length > 0)) && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid var(--danger)',
                      color: '#ef4444',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      marginBottom: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                        <AlertCircle size={16} />
                        <span>Incidencia registrada por el Profesor en la revisión del Checklist</span>
                      </div>
                      {activeJefatura.comentario_revision && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          <strong>Comentario:</strong> {activeJefatura.comentario_revision}
                        </p>
                      )}
                      {activeJefatura.fotos_revision && activeJefatura.fotos_revision.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {activeJefatura.fotos_revision.map((url: string, index: number) => (
                            <a key={index} href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'underline' }}>
                              Ver Foto Evidencia #{index + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Estado Congelado */}
                  {activeJefatura.firmado && (
                    <div style={styles.signedBar}>
                      <UserCheck size={16} />
                      <span>
                        Firma registrada: {activeJefatura.firma_nombre || 'Jefe/Encargado'} el {activeJefatura.firmado_en ? new Date(activeJefatura.firmado_en).toLocaleString('es-ES') : ''}
                      </span>
                    </div>
                  )}

                  {/* Listado de Tareas */}
                  <div style={{ marginTop: '20px' }}>
                    <ul style={styles.taskList}>
                      {activeChecklistTab === 'produccion' ? (
                        tareasProd.map(task => {
                          const completada = registrosProd[task.id] || false;
                          return (
                            <li 
                              key={task.id}
                              onClick={() => handleToggleTareaRegistro(task.id, 'produccion')}
                              style={{
                                ...styles.taskItem,
                                ...(completada ? styles.taskCompleted : {})
                              }}
                            >
                              <div style={{
                                ...styles.checkbox,
                                ...(completada ? styles.checkboxActive : {})
                              }}>
                                {completada && <Check size={12} strokeWidth={3} color="#000" />}
                              </div>
                              <span style={{
                                fontSize: '0.85rem',
                                color: completada ? 'var(--text-muted)' : 'var(--text-primary)',
                                textDecoration: completada ? 'line-through' : 'none'
                              }}>
                                {task.tarea}
                              </span>
                            </li>
                          );
                        })
                      ) : (
                        tareasLimp.map(task => {
                          const completada = registrosLimp[task.id] || false;
                          return (
                            <li 
                              key={task.id}
                              onClick={() => handleToggleTareaRegistro(task.id, 'limpieza')}
                              style={{
                                ...styles.taskItem,
                                ...(completada ? styles.taskCompleted : {})
                              }}
                            >
                              <div style={{
                                ...styles.checkbox,
                                ...(completada ? styles.checkboxActive : {})
                              }}>
                                {completada && <Check size={12} strokeWidth={3} color="#000" />}
                              </div>
                              <span style={{
                                fontSize: '0.85rem',
                                color: completada ? 'var(--text-muted)' : 'var(--text-primary)',
                                textDecoration: completada ? 'line-through' : 'none'
                              }}>
                                {task.tarea} <span style={{ fontSize: '0.7rem', color: 'var(--accent)', marginLeft: '6px' }}>({task.aula})</span>
                              </span>
                            </li>
                          );
                        })
                      )}
                    </ul>

                    {/* Firma simplificada y observaciones (en lugar del modal) */}
                    {puedeFirmar ? (
                      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={styles.inputGroup}>
                          <label style={styles.label}>Observaciones y Comentarios finales de la sesión</label>
                          <textarea 
                            placeholder="Detalla si hubo roturas, material faltante, o algún punto crítico del taller..." 
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            style={styles.textarea}
                            rows={3}
                          />
                        </div>
                        <button 
                          onClick={handleFirmaChecklist} 
                          disabled={savingChecklist}
                          style={styles.firmarBtn}
                        >
                          <Edit3 size={16} />
                          {savingChecklist ? 'Congelando...' : 'Estampar Firma y Congelar'}
                        </button>
                      </div>
                    ) : (
                      // Si está firmado, mostrar las observaciones registradas
                      activeJefatura.firmado && (
                        <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Observaciones Registradas:</h4>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', margin: 0, fontStyle: 'italic' }}>
                            {activeChecklistTab === 'produccion' 
                              ? activeJefatura.observaciones_produccion || 'Sin observaciones.' 
                              : activeJefatura.observaciones_limpieza || 'Sin observaciones.'}
                          </p>
                        </div>
                      )
                    )}

                    {/* Panel de Revisión Docente (solo para profesores / admin si ya está firmado) */}
                    {activeJefatura.firmado && (isProfesor || isAdmin) && (
                      <div style={{
                        marginTop: '24px',
                        padding: '20px',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px dashed var(--border-color)',
                        borderRadius: '12px',
                      }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Edit3 size={16} />
                          Panel de Revisión Docente (Revisión Final de Checklist)
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={styles.inputGroup}>
                            <label style={styles.label}>Comentarios de Revisión / Justificación de Incidencia</label>
                            <textarea
                              placeholder="Especifica incidencias encontradas (ej. limpieza deficiente en campanas, mesa de corte sucia...)"
                              value={comentarioRevision}
                              onChange={(e) => setComentarioRevision(e.target.value)}
                              style={styles.textarea}
                              rows={3}
                            />
                          </div>

                          <div style={styles.inputGroup}>
                            <label style={styles.label}>Añadir URL de Foto de Evidencia</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="text"
                                placeholder="Introduce la URL de la imagen de prueba..."
                                value={urlFoto}
                                onChange={(e) => setUrlFoto(e.target.value)}
                                style={styles.input}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (urlFoto.trim()) {
                                    setFotosRevision(prev => [...prev, urlFoto.trim()]);
                                    setUrlFoto('');
                                  }
                                }}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: 'var(--bg-secondary)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-primary)',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Añadir
                              </button>
                            </div>
                          </div>

                          {/* Listado de fotos añadidas en revisión */}
                          {fotosRevision.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span style={styles.label}>Fotos de Evidencia Añadidas ({fotosRevision.length}):</span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {fotosRevision.map((url, index) => (
                                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px', color: 'var(--text-secondary)' }}>
                                      {url}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setFotosRevision(prev => prev.filter((_, i) => i !== index))}
                                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleGuardarRevision}
                            disabled={savingRevision}
                            style={{
                              ...styles.submitBtn,
                              marginTop: '8px',
                              backgroundColor: comentarioRevision.trim() ? 'var(--danger)' : 'var(--accent)'
                            }}
                          >
                            {savingRevision ? 'Guardando...' : 'Guardar Revisión Docente'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={styles.mainBento}>
                  <div style={styles.emptyBox}>No hay ninguna sesión de taller activa seleccionada.</div>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: ASIGNAR ROLES DIARIOS (DOCENTES / ADMIN) */}
          {activeTab === 'roles' && (isProfesor || isAdmin) && (
            <div style={styles.formLayout}>
              <div style={styles.bentoCard}>
                <div style={styles.panelTitle}>Asignación Diaria de Jefatura y Limpieza</div>
                <form onSubmit={handleAsignarRoles} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Grupo Activo</label>
                    <select
                      value={grupoSel}
                      onChange={(e) => setGrupoSel(e.target.value)}
                      style={styles.select}
                      required
                    >
                      <option value="">Selecciona un grupo...</option>
                      {grupos.map(g => (
                        <option key={g.id} value={g.id}>{g.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Fecha del Taller</label>
                    <input 
                      type="date" 
                      value={fechaSel}
                      onChange={(e) => setFechaSel(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Jefe de Cocina (Encargado de Producción)</label>
                    <select
                      value={jefeSel}
                      onChange={(e) => setJefeSel(e.target.value)}
                      style={styles.select}
                      required
                    >
                      <option value="">Elige un alumno...</option>
                      {alumnos.map(a => (
                        <option key={a.id} value={a.id}>{a.nombre} {a.apellidos}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Encargado de Limpieza (Protocolo de Aula)</label>
                    <select
                      value={limpiezaSel}
                      onChange={(e) => setLimpiezaSel(e.target.value)}
                      style={styles.select}
                      required
                    >
                      <option value="">Elige un alumno...</option>
                      {alumnos.map(a => (
                        <option key={a.id} value={a.id}>{a.nombre} {a.apellidos}</option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" disabled={savingAsignacion} style={styles.submitBtn}>
                    {savingAsignacion ? 'Asignando...' : 'Asignar Roles Diarios'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: CONFIGURAR TAREAS MAESTRAS (DOCENTES / ADMIN) */}
          {activeTab === 'config' && (isProfesor || isAdmin) && (
            <div style={styles.tallerLayout}>
              {/* Formulario de creación */}
              <div style={styles.sideBento}>
                <div style={styles.panelTitle}>Añadir Tarea Maestra</div>
                <form onSubmit={handleCrearTareaMaestra} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Tipo de Checklist</label>
                    <div style={styles.optGroup}>
                      <button
                        type="button"
                        style={{...styles.optBtn, ...(tipoNuevaTarea === 'produccion' ? styles.activeOptEntrada : {})}}
                        onClick={() => setTipoNuevaTarea('produccion')}
                      >
                        Producción
                      </button>
                      <button
                        type="button"
                        style={{...styles.optBtn, ...(tipoNuevaTarea === 'limpieza' ? styles.activeOptSalida : {})}}
                        onClick={() => setTipoNuevaTarea('limpieza')}
                      >
                        Limpieza
                      </button>
                    </div>
                  </div>

                  {tipoNuevaTarea === 'limpieza' && (
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Aula / Zona a Limpiar</label>
                      <input 
                        type="text" 
                        value={aulaTareaLimp}
                        onChange={(e) => setAulaTareaLimp(e.target.value)}
                        style={styles.input}
                        required
                      />
                    </div>
                  )}

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Descripción de la Tarea</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Desinfectar picadora de carne" 
                      value={nuevaTareaTexto}
                      onChange={(e) => setNuevaTareaTexto(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <button type="submit" style={styles.submitBtn}>
                    Crear Tarea
                  </button>
                </form>
              </div>

              {/* Panel de visualización y edición */}
              <div style={styles.mainBento}>
                <div style={styles.panelTitle}>Tareas Maestras Registradas</div>
                
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '10px' }}>PRODUCCIÓN / MISE EN PLACE</h4>
                    <ul style={styles.configList}>
                      {tareasProd.map(t => (
                        <li key={t.id} style={styles.configItem}>
                          <span>{t.tarea}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '10px' }}>LIMPIEZA Y PROTOCOLO</h4>
                    <ul style={styles.configList}>
                      {tareasLimp.map(t => (
                        <li key={t.id} style={styles.configItem}>
                          <span>{t.tarea} <strong style={{ color: 'var(--text-muted)' }}>({t.aula})</strong></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}


    </div>
  );
};

const styles = {
  container: {
    padding: '30px',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '35px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
  } as React.CSSProperties,
  title: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  tabContainer: {
    display: 'flex',
    gap: '6px',
    backgroundColor: 'var(--bg-secondary)',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
  } as React.CSSProperties,
  tabBtn: {
    padding: '8px 14px',
    fontSize: '0.8rem',
    fontWeight: '500',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  activeTab: {
    backgroundColor: 'var(--bg-card)',
    color: 'var(--accent)',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-sm)',
  } as React.CSSProperties,
  errorAlert: {
    backgroundColor: 'var(--danger-glow)',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    marginBottom: '20px',
  } as React.CSSProperties,
  successAlert: {
    backgroundColor: 'var(--success-glow)',
    border: '1px solid var(--success)',
    color: 'var(--success)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    marginBottom: '20px',
  } as React.CSSProperties,
  loaderWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '60px',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  tallerLayout: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  mainBento: {
    flex: '2 1 600px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '24px',
  } as React.CSSProperties,
  sideBento: {
    flex: '1 1 300px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  panelTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '16px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
  } as React.CSSProperties,
  recetarioScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '450px',
  } as React.CSSProperties,
  sessionCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '14px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  sessionCardActive: {
    borderColor: 'var(--accent)',
    backgroundColor: 'var(--accent-glow)',
  },
  chipSigned: {
    fontSize: '0.65rem',
    fontWeight: '700',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--success)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: '2px 8px',
    borderRadius: '20px',
  } as React.CSSProperties,
  chipPending: {
    fontSize: '0.65rem',
    fontWeight: '700',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    padding: '2px 8px',
    borderRadius: '20px',
  } as React.CSSProperties,
  
  // Detalle Sesion Activa
  activeSessionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
    marginBottom: '16px',
  } as React.CSSProperties,
  checklistTabs: {
    display: 'flex',
    gap: '4px',
    backgroundColor: 'var(--bg-primary)',
    padding: '4px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  } as React.CSSProperties,
  checkTabBtn: {
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
  activeCheckTabBtn: {
    backgroundColor: 'var(--bg-card)',
    color: 'var(--accent)',
  } as React.CSSProperties,
  infoBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '10px 14px',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
  } as React.CSSProperties,
  signedBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid var(--success)',
    padding: '10px 14px',
    borderRadius: '8px',
    color: 'var(--success)',
    fontSize: '0.8rem',
    fontWeight: '600',
    marginTop: '10px',
  } as React.CSSProperties,
  taskList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  } as React.CSSProperties,
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '12px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  taskCompleted: {
    borderColor: 'rgba(245, 158, 11, 0.15)',
    backgroundColor: 'rgba(245, 158, 11, 0.02)',
  } as React.CSSProperties,
  checkbox: {
    width: '18px',
    height: '18px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  checkboxActive: {
    backgroundColor: 'var(--accent)',
    borderColor: 'var(--accent)',
  } as React.CSSProperties,
  firmarBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,

  // Frmularios
  formLayout: {
    maxWidth: '600px',
    margin: '0 auto',
  } as React.CSSProperties,
  bentoCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '30px',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  } as React.CSSProperties,
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  } as React.CSSProperties,
  label: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  input: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px 14px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px 14px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    resize: 'vertical',
  } as React.CSSProperties,
  select: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px 14px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,
  submitBtn: {
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontWeight: '600',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    marginTop: '10px',
  } as React.CSSProperties,

  // Config list
  configList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  } as React.CSSProperties,
  configItem: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '0.85rem',
  } as React.CSSProperties,
  optGroup: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  optBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
  } as React.CSSProperties,
  activeOptEntrada: {
    borderColor: 'var(--accent)',
    backgroundColor: 'var(--accent-glow)',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  activeOptSalida: {
    borderColor: 'var(--accent)',
    backgroundColor: 'var(--accent-glow)',
    color: 'var(--text-primary)',
  } as React.CSSProperties,

  // Modales
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  } as React.CSSProperties,
  modalCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '460px',
    padding: '30px',
    boxShadow: 'var(--shadow-lg)',
  } as React.CSSProperties,
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  } as React.CSSProperties,
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
  } as React.CSSProperties,
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  } as React.CSSProperties,
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as React.CSSProperties,
  helpText: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
  } as React.CSSProperties,
  saveBtn: {
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    marginTop: '10px',
  } as React.CSSProperties,
  emptyBox: {
    padding: '40px',
    border: '1px dashed var(--border-color)',
    borderRadius: '12px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  } as React.CSSProperties,
};

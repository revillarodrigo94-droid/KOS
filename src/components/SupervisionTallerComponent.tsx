import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { SupervisionTaller, Usuario, Grupo } from '../types/database.types';
import { 
  GraduationCap, 
  Star, 
  Send, 
  Clock, 
  Check, 
  Loader2, 
  AlertCircle, 
  Award, 
  BarChart3, 
  ShieldAlert,
  Flame,
  FileSpreadsheet
} from 'lucide-react';

export const SupervisionTallerComponent: React.FC = () => {
  const { profile } = useAuth();
  const isAlumno = profile?.rol === 'alumno';
  const isProfesor = profile?.rol === 'profesor';
  const isAdmin = profile?.rol === 'admin';

  // Datos
  const [alumnos, setAlumnos] = useState<Usuario[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<(SupervisionTaller & { alumno_nombre?: string; profesor_nombre?: string })[]>([]);

  // Estados de Carga
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Formulario Evaluación (Profesor)
  const [alumnoSel, setAlumnoSel] = useState('');
  const [grupoSel, setGrupoSel] = useState('');
  const [fechaEval, setFechaEval] = useState(new Date().toISOString().split('T')[0]);
  const [uniformidad, setUniformidad] = useState(5);
  const [higiene, setHigiene] = useState(5);
  const [tecnica, setTecnica] = useState(5);
  const [actitud, setActitud] = useState(5);
  const [observaciones, setObservaciones] = useState('');

  // Notificaciones
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtros de búsqueda (Profesor)
  const [alumnoFiltro, setAlumnoFiltro] = useState('');

  const fetchDatos = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Cargar alumnos aprobados
      const { data: alms } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'alumno')
        .eq('estado_aprobacion', true)
        .order('nombre', { ascending: true });
      setAlumnos(alms || []);

      // 2. Cargar grupos activos
      const { data: grps } = await supabase
        .from('grupos')
        .select('*')
        .eq('activo', true);
      setGrupos(grps || []);

      // 3. Cargar evaluaciones de taller
      let query = supabase.from('supervision_taller').select(`
        *,
        alumno:usuarios!supervision_taller_alumno_id_fkey(nombre, apellidos),
        profesor:usuarios!supervision_taller_profesor_id_fkey(nombre, apellidos)
      `);

      if (isAlumno && profile) {
        // Alumnos solo ven sus propias evaluaciones
        query = query.eq('alumno_id', profile.id);
      }

      const { data: evs, error } = await query.order('creado_en', { ascending: false });
      if (error) throw error;

      const formatted = (evs || []).map((e: any) => ({
        ...e,
        alumno_nombre: e.alumno ? `${e.alumno.nombre} ${e.alumno.apellidos}` : 'Alumno desconocido',
        profesor_nombre: e.profesor ? `${e.profesor.nombre} ${e.profesor.apellidos}` : 'Profesor'
      }));
      setEvaluaciones(formatted);

    } catch (err: any) {
      setErrorMsg('Error al cargar datos de supervisión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, [profile]);

  // Enviar Evaluación
  const handleGuardarEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumnoSel) {
      alert('Debes seleccionar un alumno.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('supervision_taller')
        .insert([{
          alumno_id: alumnoSel,
          profesor_id: profile?.id,
          fecha: fechaEval,
          uniformidad,
          higiene,
          tecnica,
          actitud,
          observaciones: observaciones.trim() || null
        }]);

      if (error) throw error;

      setSuccessMsg('Calificación de taller registrada con éxito.');
      setAlumnoSel('');
      setObservaciones('');
      setUniformidad(5);
      setHigiene(5);
      setTecnica(5);
      setActitud(5);
      fetchDatos();
    } catch (err: any) {
      setErrorMsg('Error al registrar evaluación: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarsSelector = (val: number, setVal: (v: number) => void) => {
    return (
      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setVal(star)}
            style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}
          >
            <Star 
              size={24} 
              color={star <= val ? 'var(--accent)' : 'var(--border-color)'}
              fill={star <= val ? 'var(--accent)' : 'transparent'} 
            />
          </button>
        ))}
      </div>
    );
  };

  const renderStars = (count: number) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star}
            size={14} 
            color={star <= count ? 'var(--accent)' : 'var(--border-color)'}
            fill={star <= count ? 'var(--accent)' : 'transparent'} 
          />
        ))}
      </div>
    );
  };

  // Calcular promedios para el Alumno
  const getPromedio = (aspecto: 'uniformidad' | 'higiene' | 'tecnica' | 'actitud') => {
    if (evaluaciones.length === 0) return 0;
    const suma = evaluaciones.reduce((acc, curr) => acc + curr[aspecto], 0);
    return (suma / evaluaciones.length).toFixed(1);
  };

  const promedioGlobal = evaluaciones.length > 0 
    ? ((evaluaciones.reduce((acc, curr) => acc + curr.uniformidad + curr.higiene + curr.tecnica + curr.actitud, 0) / (evaluaciones.length * 4))).toFixed(1)
    : '0';

  return (
    <div style={styles.container}>
      {/* CABECERA */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <GraduationCap size={24} color="var(--accent)" />
          <h2 style={styles.title}>Evaluación Técnica y de Taller</h2>
        </div>
      </div>

      {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
      {successMsg && <div style={styles.successAlert}>{successMsg}</div>}

      {/* VISTA ALUMNO (Bento Grid de su Rendimiento) */}
      {isAlumno && (
        <div style={styles.alumnoLayout}>
          {/* Bento Global Score */}
          <div style={{...styles.bentoCard, ...styles.col4}}>
            <div style={styles.bentoHeader}>
              <Award size={18} color="var(--accent)" />
              <span style={styles.bentoTitle}>Nota Media Taller</span>
            </div>
            <div style={styles.scoreContainer}>
              <div style={styles.scoreValue}>{promedioGlobal}</div>
              <div style={styles.scoreScale}>/ 5.0</div>
            </div>
            <p style={styles.scoreDesc}>Cálculo acumulativo basado en {evaluaciones.length} evaluaciones docentes registradas.</p>
          </div>

          {/* Bento Desglose Aspectos */}
          <div style={{...styles.bentoCard, ...styles.col8}}>
            <div style={styles.bentoHeader}>
              <BarChart3 size={18} color="var(--accent)" />
              <span style={styles.bentoTitle}>Desglose de Competencias</span>
            </div>
            <div style={styles.competenceGrid}>
              <div style={styles.competenceItem}>
                <span style={styles.compLabel}>Uniformidad y EPIs</span>
                <div style={styles.compValueBlock}>
                  <span style={styles.compNumber}>{getPromedio('uniformidad')}</span>
                  {renderStars(Math.round(parseFloat(getPromedio('uniformidad'))))}
                </div>
              </div>

              <div style={styles.competenceItem}>
                <span style={styles.compLabel}>Higiene y Desinfección</span>
                <div style={styles.compValueBlock}>
                  <span style={styles.compNumber}>{getPromedio('higiene')}</span>
                  {renderStars(Math.round(parseFloat(getPromedio('higiene'))))}
                </div>
              </div>

              <div style={styles.competenceItem}>
                <span style={styles.compLabel}>Destreza Técnica</span>
                <div style={styles.compValueBlock}>
                  <span style={styles.compNumber}>{getPromedio('tecnica')}</span>
                  {renderStars(Math.round(parseFloat(getPromedio('tecnica'))))}
                </div>
              </div>

              <div style={styles.competenceItem}>
                <span style={styles.compLabel}>Actitud y Colaboración</span>
                <div style={styles.compValueBlock}>
                  <span style={styles.compNumber}>{getPromedio('actitud')}</span>
                  {renderStars(Math.round(parseFloat(getPromedio('actitud'))))}
                </div>
              </div>
            </div>
          </div>

          {/* Bento Historial Feedback (12 col) */}
          <div style={{...styles.bentoCard, ...styles.col12}}>
            <div style={styles.bentoHeader}>
              <Clock size={18} color="var(--accent)" />
              <span style={styles.bentoTitle}>Feedback Docente y Calificaciones Recientes</span>
            </div>
            
            {evaluaciones.length === 0 ? (
              <div style={styles.emptyBox}>Aún no se han registrado calificaciones de taller para tu cuenta.</div>
            ) : (
              <div style={styles.evalList}>
                {evaluaciones.map(ev => (
                  <div key={ev.id} style={styles.evalRow}>
                    <div style={styles.evalHeader}>
                      <span style={styles.evalDate}>{new Date(ev.fecha).toLocaleDateString('es-ES')}</span>
                      <span style={styles.evalProfesor}>Evaluado por: {ev.profesor_nombre}</span>
                    </div>

                    <div style={styles.evalScores}>
                      <div style={styles.miniScore}>👕 Uniforme: {ev.uniformidad}/5</div>
                      <div style={styles.miniScore}>🧼 Higiene: {ev.higiene}/5</div>
                      <div style={styles.miniScore}>🔪 Técnica: {ev.tecnica}/5</div>
                      <div style={styles.miniScore}>🤝 Actitud: {ev.actitud}/5</div>
                    </div>

                    {ev.observaciones && (
                      <p style={styles.evalObs}>
                        💬 <strong>Feedback del Chef:</strong> "{ev.observaciones}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA PROFESOR / ADMIN (Formulario de Evaluación + Histórico) */}
      {!isAlumno && (
        <div style={styles.profesorLayout}>
          {/* Panel Izquierdo: Formulario de Evaluación */}
          <div style={styles.leftBento}>
            <div style={styles.panelTitle}>Registrar Calificación de Taller</div>
            <form onSubmit={handleGuardarEvaluacion} style={styles.form}>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Seleccionar Alumno</label>
                <select
                  value={alumnoSel}
                  onChange={(e) => setAlumnoSel(e.target.value)}
                  style={styles.select}
                  required
                  disabled={submitting}
                >
                  <option value="">Selecciona un alumno...</option>
                  {alumnos.map(alm => (
                    <option key={alm.id} value={alm.id}>{alm.nombre} {alm.apellidos}</option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Fecha del Taller</label>
                <input 
                  type="date"
                  value={fechaEval}
                  onChange={(e) => setFechaEval(e.target.value)}
                  style={styles.input}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Parámetros de calificación */}
              <div style={styles.starFormGroup}>
                <div>
                  <label style={styles.label}>👕 Uniformidad y EPIs (1-5)</label>
                  {renderStarsSelector(uniformidad, setUniformidad)}
                </div>
                <div>
                  <label style={styles.label}>🧼 Higiene y Desinfección (1-5)</label>
                  {renderStarsSelector(higiene, setHigiene)}
                </div>
                <div>
                  <label style={styles.label}>🔪 Destreza Técnica (1-5)</label>
                  {renderStarsSelector(tecnica, setTecnica)}
                </div>
                <div>
                  <label style={styles.label}>🤝 Actitud y Colaboración (1-5)</label>
                  {renderStarsSelector(actitud, setActitud)}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Observaciones y Feedback constructivo</label>
                <textarea 
                  placeholder="Detalla fortalezas, áreas de mejora o incidencias de actitud en el taller..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  style={styles.textarea}
                  rows={3}
                  disabled={submitting}
                />
              </div>

              <button type="submit" disabled={submitting || !alumnoSel} style={styles.submitBtn}>
                {submitting ? 'Guardando Calificación...' : 'Registrar Calificación'}
              </button>

            </form>
          </div>

          {/* Panel Derecho: Histórico de Notas */}
          <div style={styles.rightBento}>
            <div style={styles.panelTitle}>Calificaciones y Evaluaciones Registradas</div>
            
            {loading ? (
              <div style={styles.loaderWrapper}>
                <Loader2 size={24} className="spin-animation" color="var(--accent)" />
                <p style={{ fontSize: '0.85rem' }}>Cargando histórico...</p>
              </div>
            ) : evaluaciones.length === 0 ? (
              <div style={styles.emptyBox}>No se han registrado evaluaciones de taller aún.</div>
            ) : (
              <div style={styles.recetarioScroll}>
                {evaluaciones.map(ev => (
                  <div key={ev.id} style={styles.evalBlogCard}>
                    <div style={styles.evalBlogHeader}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ev.alumno_nombre}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Eval: {new Date(ev.fecha).toLocaleDateString('es-ES')} | Profesor: {ev.profesor_nombre}
                        </div>
                      </div>
                      <div style={styles.scoreTag}>
                        {((ev.uniformidad + ev.higiene + ev.tecnica + ev.actitud) / 4).toFixed(1)} ⭐
                      </div>
                    </div>

                    <div style={styles.evalScores}>
                      <div style={styles.miniScore}>👕 Uniforme: {ev.uniformidad}/5</div>
                      <div style={styles.miniScore}>🧼 Higiene: {ev.higiene}/5</div>
                      <div style={styles.miniScore}>🔪 Técnica: {ev.tecnica}/5</div>
                      <div style={styles.miniScore}>🤝 Actitud: {ev.actitud}/5</div>
                    </div>

                    {ev.observaciones && (
                      <p style={{...styles.evalObs, borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px'}}>
                        <strong>Observaciones:</strong> "{ev.observaciones}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
    marginBottom: '30px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
  } as React.CSSProperties,
  title: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
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
  
  // Alumno Layout (Bento Grid)
  alumnoLayout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '20px',
  } as React.CSSProperties,
  bentoCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '24px',
  } as React.CSSProperties,
  col4: {
    gridColumn: 'span 4',
  } as React.CSSProperties,
  col8: {
    gridColumn: 'span 8',
  } as React.CSSProperties,
  col12: {
    gridColumn: 'span 12',
  } as React.CSSProperties,
  bentoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--accent)',
    marginBottom: '16px',
  } as React.CSSProperties,
  bentoTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  } as React.CSSProperties,
  scoreContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    margin: '16px 0',
  } as React.CSSProperties,
  scoreValue: {
    fontSize: '3rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    lineHeight: '1',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  scoreScale: {
    fontSize: '1rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
  } as React.CSSProperties,
  scoreDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
  } as React.CSSProperties,
  competenceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  } as React.CSSProperties,
  competenceItem: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '16px',
    borderRadius: '10px',
  } as React.CSSProperties,
  compLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    display: 'block',
    marginBottom: '8px',
  } as React.CSSProperties,
  compValueBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  compNumber: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,

  // Listado Alumno
  evalList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '380px',
    overflowY: 'auto',
    paddingRight: '6px',
  } as React.CSSProperties,
  evalRow: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '16px',
  } as React.CSSProperties,
  evalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: '10px',
  } as React.CSSProperties,
  evalDate: {
    fontWeight: '600',
  } as React.CSSProperties,
  evalProfesor: {},
  evalScores: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '10px',
  } as React.CSSProperties,
  miniScore: {
    fontSize: '0.75rem',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    padding: '4px 10px',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  } as React.CSSProperties,
  evalObs: {
    fontSize: '0.8rem',
    color: 'var(--text-primary)',
    lineHeight: '1.4',
    fontStyle: 'italic',
  } as React.CSSProperties,

  // Profesor Layout
  profesorLayout: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  leftBento: {
    flex: '1 1 380px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '24px',
  } as React.CSSProperties,
  rightBento: {
    flex: '2 1 500px',
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
    marginBottom: '20px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as React.CSSProperties,
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  } as React.CSSProperties,
  starFormGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  } as React.CSSProperties,
  label: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
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
  submitBtn: {
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    marginTop: '10px',
  } as React.CSSProperties,
  loaderWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  emptyBox: {
    padding: '40px',
    border: '1px dashed var(--border-color)',
    borderRadius: '12px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  } as React.CSSProperties,
  recetarioScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    maxHeight: '520px',
    paddingRight: '6px',
  } as React.CSSProperties,
  evalBlogCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '16px',
  } as React.CSSProperties,
  evalBlogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  } as React.CSSProperties,
  scoreTag: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--accent)',
    backgroundColor: 'var(--accent-glow)',
    border: '1px solid rgba(224, 169, 109, 0.15)',
    padding: '4px 10px',
    borderRadius: '6px',
  } as React.CSSProperties,
};

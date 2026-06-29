import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Incidencia, IncidenciaTipo, IncidenciaEstado, IncidenciaPrioridad, RespuestaIncidencia } from '../types/database.types';
import { 
  AlertTriangle, 
  Plus, 
  Check, 
  Loader2, 
  Send, 
  Clock, 
  Wrench, 
  Eye, 
  CheckCircle,
  XCircle,
  HelpCircle,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Flame,
  ShieldAlert
} from 'lucide-react';

// Inyectar animación CSS de parpadeo para prioridad crítica
const blinkStyleId = 'kos-blink-critica';
if (typeof document !== 'undefined' && !document.getElementById(blinkStyleId)) {
  const styleTag = document.createElement('style');
  styleTag.id = blinkStyleId;
  styleTag.textContent = `
    @keyframes kos-blink-critica {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `;
  document.head.appendChild(styleTag);
}

// Componente de hilo de respuestas para cada incidencia
const HiloRespuestas: React.FC<{ incidenciaId: string }> = ({ incidenciaId }) => {
  const { profile } = useAuth();
  const [respuestas, setRespuestas] = useState<(RespuestaIncidencia & { autor_nombre?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchRespuestas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('respuestas_incidencias')
        .select(`
          *,
          usuarios(nombre, apellidos)
        `)
        .eq('incidencia_id', incidenciaId)
        .order('creado_en', { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map((r: any) => ({
        ...r,
        autor_nombre: r.usuarios ? `${r.usuarios.nombre} ${r.usuarios.apellidos}` : 'Usuario desconocido'
      }));
      setRespuestas(formatted);
    } catch (err: any) {
      console.error('Error cargando respuestas:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRespuestas();
  }, [incidenciaId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [respuestas]);

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim() || !profile?.id) return;
    setEnviando(true);
    try {
      const { error } = await supabase
        .from('respuestas_incidencias')
        .insert([{
          incidencia_id: incidenciaId,
          usuario_id: profile.id,
          mensaje: mensaje.trim()
        }]);
      if (error) throw error;
      setMensaje('');
      fetchRespuestas();
    } catch (err: any) {
      console.error('Error al enviar respuesta:', err.message);
    } finally {
      setEnviando(false);
    }
  };

  const fechaRelativa = (fechaStr: string) => {
    const ahora = new Date();
    const fecha = new Date(fechaStr);
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora mismo';
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `hace ${diffD}d`;
    return fecha.toLocaleDateString('es-ES');
  };

  return (
    <div style={hiloStyles.container}>
      {loading ? (
        <div style={hiloStyles.loadingRow}>
          <Loader2 size={14} className="spin-animation" color="var(--accent)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cargando hilo...</span>
        </div>
      ) : (
        <>
          {/* Lista de respuestas */}
          <div ref={scrollRef} style={hiloStyles.respuestasList}>
            {respuestas.length === 0 ? (
              <div style={hiloStyles.emptyHilo}>No hay respuestas aún. Sé el primero en comentar.</div>
            ) : (
              respuestas.map(r => (
                <div key={r.id} style={hiloStyles.respuestaCard}>
                  <div style={hiloStyles.respuestaHeader}>
                    <span style={hiloStyles.autorNombre}>{r.autor_nombre}</span>
                    <span style={hiloStyles.respuestaFecha}>{fechaRelativa(r.creado_en)}</span>
                  </div>
                  <p style={hiloStyles.respuestaMensaje}>{r.mensaje}</p>
                </div>
              ))
            )}
          </div>

          {/* Mini-formulario de respuesta */}
          <form onSubmit={handleEnviar} style={hiloStyles.replyForm}>
            <input
              type="text"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe una respuesta..."
              style={hiloStyles.replyInput}
              disabled={enviando}
              maxLength={300}
            />
            <button
              type="submit"
              disabled={enviando || !mensaje.trim()}
              style={{
                ...hiloStyles.replyBtn,
                opacity: enviando || !mensaje.trim() ? 0.5 : 1
              }}
            >
              <Send size={14} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export const GestionIncidencias: React.FC = () => {
  const { profile } = useAuth();
  const isAlumno = profile?.rol === 'alumno';
  const isProfesor = profile?.rol === 'profesor';
  const isAdmin = profile?.rol === 'admin';

  // Datos
  const [incidencias, setIncidencias] = useState<(Incidencia & { usuario_nombre?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Formulario
  const [tipo, setTipo] = useState<IncidenciaTipo>('averia');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<IncidenciaPrioridad>('media');
  
  // Notificaciones
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtro de prioridad
  const [filtroPrioridad, setFiltroPrioridad] = useState<IncidenciaPrioridad | 'todas'>('todas');

  // Hilos abiertos (acordeones)
  const [hilosAbiertos, setHilosAbiertos] = useState<Record<string, boolean>>({});
  // Contadores de respuestas
  const [contadorRespuestas, setContadorRespuestas] = useState<Record<string, number>>({});

  const toggleHilo = (id: string) => {
    setHilosAbiertos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchIncidencias = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Cargar todas las incidencias de Supabase
      const { data, error } = await supabase
        .from('incidencias')
        .select(`
          *,
          usuarios(nombre, apellidos)
        `)
        .order('fecha', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((inc: any) => ({
        ...inc,
        usuario_nombre: inc.usuarios ? `${inc.usuarios.nombre} ${inc.usuarios.apellidos}` : 'Usuario desconocido'
      }));

      // Si es alumno, opcionalmente mostramos sólo las del aula o generales (aquí las listamos todas para transparencia en taller)
      setIncidencias(formatted);

      // Cargar contadores de respuestas para todas las incidencias
      fetchContadores(formatted.map((i: any) => i.id));
    } catch (err: any) {
      setErrorMsg('Error al cargar incidencias: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchContadores = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      // Traemos las respuestas agrupadas por incidencia contando manualmente
      const { data, error } = await supabase
        .from('respuestas_incidencias')
        .select('incidencia_id')
        .in('incidencia_id', ids);

      if (error) throw error;

      const conteo: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        conteo[r.incidencia_id] = (conteo[r.incidencia_id] || 0) + 1;
      });
      setContadorRespuestas(conteo);
    } catch (err) {
      // Silenciar error de contadores, no es crítico
    }
  };

  useEffect(() => {
    fetchIncidencias();
  }, [profile]);

  // Crear Incidencia (Microblog de 140 caracteres max)
  const handleCrearIncidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) return;
    if (descripcion.length > 140) {
      alert('La descripción de la incidencia no puede superar los 140 caracteres.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('incidencias')
        .insert([{
          usuario_id: profile?.id,
          tipo,
          descripcion: descripcion.trim(),
          estado: 'pendiente',
          prioridad,
          fecha: new Date().toISOString()
        }]);

      if (error) throw error;

      setSuccessMsg('Incidencia reportada al taller con éxito.');
      setDescripcion('');
      setPrioridad('media');
      fetchIncidencias();
    } catch (err: any) {
      setErrorMsg('Error al reportar incidencia: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Cambiar estado de la incidencia (Profesores / Admin)
  const handleChangeEstado = async (id: string, nuevoEstado: IncidenciaEstado) => {
    if (isAlumno) return;
    try {
      const { error } = await supabase
        .from('incidencias')
        .update({ estado: nuevoEstado })
        .eq('id', id);

      if (error) throw error;
      fetchIncidencias();
    } catch (err: any) {
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  const getTipoBadge = (tipoInc: IncidenciaTipo) => {
    const labels: Record<IncidenciaTipo, string> = {
      averia: '🔧 Avería Máquina',
      rotura: '💥 Rotura Vajilla',
      extravio: '🔍 Extravío Utensilio',
      peligro: '⚠️ Peligro / Riesgo',
      otro: '❓ Otro'
    };
    return labels[tipoInc] || tipoInc;
  };

  const getEstadoBadgeStyle = (est: IncidenciaEstado) => {
    const stylesMap: Record<IncidenciaEstado, React.CSSProperties> = {
      pendiente: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' },
      notificado_centro: { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent)', border: '1px solid rgba(245, 158, 11, 0.2)' },
      resuelto: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }
    };
    return stylesMap[est] || {};
  };

  const getEstadoText = (est: IncidenciaEstado) => {
    const textMap: Record<IncidenciaEstado, string> = {
      pendiente: 'Pendiente',
      notificado_centro: 'Notificado a Centro / Mantenimiento',
      resuelto: 'Resuelto'
    };
    return textMap[est] || est;
  };

  const getPrioridadBadge = (prio: IncidenciaPrioridad): React.CSSProperties => {
    switch (prio) {
      case 'baja':
        return {
          backgroundColor: 'rgba(148, 163, 184, 0.15)',
          color: '#94a3b8',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          fontSize: '0.6rem',
          fontWeight: '700',
          padding: '2px 7px',
          borderRadius: '20px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        };
      case 'media':
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          fontSize: '0.6rem',
          fontWeight: '700',
          padding: '2px 7px',
          borderRadius: '20px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        };
      case 'critica':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          fontSize: '0.6rem',
          fontWeight: '800',
          padding: '2px 7px',
          borderRadius: '20px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          animation: 'kos-blink-critica 1.2s ease-in-out infinite',
        };
      default:
        return {};
    }
  };

  const getPrioridadText = (prio: IncidenciaPrioridad) => {
    switch (prio) {
      case 'baja': return 'Baja';
      case 'media': return 'Media';
      case 'critica': return 'CRÍTICA';
      default: return prio;
    }
  };

  // Filtrar incidencias por prioridad
  const incidenciasFiltradas = filtroPrioridad === 'todas'
    ? incidencias
    : incidencias.filter(i => i.prioridad === filtroPrioridad);

  // Estadísticas rápidas
  const total = incidencias.length;
  const pendientes = incidencias.filter(i => i.estado === 'pendiente').length;
  const notificadas = incidencias.filter(i => i.estado === 'notificado_centro').length;
  const resueltas = incidencias.filter(i => i.estado === 'resuelto').length;

  const prioridadOptions: { value: IncidenciaPrioridad; label: string; icon: React.ReactNode }[] = [
    { value: 'baja', label: 'Baja', icon: <ShieldAlert size={14} /> },
    { value: 'media', label: 'Media', icon: <AlertTriangle size={14} /> },
    { value: 'critica', label: 'Crítica', icon: <Flame size={14} /> },
  ];

  const filtroOptions: { value: IncidenciaPrioridad | 'todas'; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'baja', label: 'Baja' },
    { value: 'media', label: 'Media' },
    { value: 'critica', label: 'Crítica' },
  ];

  return (
    <div style={styles.container}>
      {/* CABECERA */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={24} color="var(--accent)" />
          <h2 style={styles.title}>Microblog de Incidencias del Taller</h2>
        </div>
      </div>

      {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
      {successMsg && <div style={styles.successAlert}>{successMsg}</div>}

      {/* Grid Bento de Estadísticas */}
      <div style={styles.statsGrid}>
        <div style={styles.statsCard}>
          <div style={styles.statsLabel}>Total Reportadas</div>
          <div style={styles.statsValue}>{total}</div>
        </div>
        <div style={{...styles.statsCard, borderColor: 'var(--danger)'}}>
          <div style={{...styles.statsLabel, color: 'var(--danger)'}}>Pendientes de Revisar</div>
          <div style={{...styles.statsValue, color: 'var(--danger)'}}>{pendientes}</div>
        </div>
        <div style={{...styles.statsCard, borderColor: 'var(--accent)'}}>
          <div style={{...styles.statsLabel, color: 'var(--accent)'}}>En Curso / Mantenimiento</div>
          <div style={{...styles.statsValue, color: 'var(--accent)'}}>{notificadas}</div>
        </div>
        <div style={{...styles.statsCard, borderColor: 'var(--success)'}}>
          <div style={{...styles.statsLabel, color: 'var(--success)'}}>Resueltas</div>
          <div style={{...styles.statsValue, color: 'var(--success)'}}>{resueltas}</div>
        </div>
      </div>

      <div style={styles.layout}>
        {/* Panel Izquierdo: Formulario de Reporte */}
        <div style={styles.leftBento}>
          <div style={styles.panelTitle}>Reportar Nueva Incidencia</div>
          <form onSubmit={handleCrearIncidencia} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Categoría de Incidencia</label>
              <select 
                value={tipo}
                onChange={(e) => setTipo(e.target.value as IncidenciaTipo)}
                style={styles.select}
                disabled={submitting}
              >
                <option value="averia">🔧 Avería de Maquinaria</option>
                <option value="rotura">💥 Rotura de Utensilio / Vajilla</option>
                <option value="extravio">🔍 Extravío de Herramienta</option>
                <option value="peligro">⚠️ Condición de Peligro (Higiene/Seguridad)</option>
                <option value="otro">❓ Otro tipo de Incidencia</option>
              </select>
            </div>

            {/* SELECTOR DE PRIORIDAD - Botones Toggle */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nivel de Prioridad</label>
              <div style={styles.prioridadToggleGroup}>
                {prioridadOptions.map(opt => {
                  const isActive = prioridad === opt.value;
                  const colorMap: Record<IncidenciaPrioridad, string> = {
                    baja: '#94a3b8',
                    media: '#f59e0b',
                    critica: '#ef4444',
                  };
                  const activeColor = colorMap[opt.value];
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPrioridad(opt.value)}
                      disabled={submitting}
                      style={{
                        ...styles.prioridadToggleBtn,
                        backgroundColor: isActive ? `${activeColor}20` : 'var(--bg-primary)',
                        borderColor: isActive ? activeColor : 'var(--border-color)',
                        color: isActive ? activeColor : 'var(--text-muted)',
                        boxShadow: isActive ? `0 0 12px ${activeColor}30` : 'none',
                      }}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.inputGroup}>
              <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', marginBottom: '4px' }}>
                <label style={styles.label}>Descripción de la Incidencia</label>
                <span style={{
                  fontSize: '0.7rem',
                  color: descripcion.length > 140 ? 'var(--danger)' : 'var(--text-muted)'
                }}>
                  {descripcion.length} / 140 caracteres
                </span>
              </div>
              <textarea 
                placeholder="Escribe brevemente qué ha ocurrido. Ej. El grifo de la estación 3 tiene fuga de agua fría..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                style={{
                  ...styles.textarea,
                  borderColor: descripcion.length > 140 ? 'var(--danger)' : 'var(--border-color)'
                }}
                rows={4}
                maxLength={150}
                required
                disabled={submitting}
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting || !descripcion.trim() || descripcion.length > 140}
              style={styles.submitBtn}
            >
              {submitting ? 'Enviando Reporte...' : 'Reportar al Taller'}
            </button>
          </form>
        </div>

        {/* Panel Derecho: Microblog de Incidencias */}
        <div style={styles.rightBento}>
          <div style={styles.panelTitle}>Historial de Alertas de Taller</div>

          {/* FILTRO RÁPIDO POR PRIORIDAD */}
          <div style={styles.filtroBar}>
            <span style={styles.filtroLabel}>Filtrar por prioridad:</span>
            <div style={styles.filtroGroup}>
              {filtroOptions.map(opt => {
                const isActive = filtroPrioridad === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFiltroPrioridad(opt.value)}
                    style={{
                      ...styles.filtroBtn,
                      backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-primary)',
                      color: isActive ? 'var(--accent-text)' : 'var(--text-muted)',
                      borderColor: isActive ? 'var(--accent)' : 'var(--border-color)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {loading ? (
            <div style={styles.loaderWrapper}>
              <Loader2 size={24} className="spin-animation" color="var(--accent)" />
              <p style={{ fontSize: '0.85rem' }}>Cargando alertas...</p>
            </div>
          ) : incidenciasFiltradas.length === 0 ? (
            <div style={styles.emptyBox}>
              {filtroPrioridad !== 'todas'
                ? `No hay incidencias con prioridad "${filtroPrioridad}" actualmente.`
                : 'No hay alertas o incidencias reportadas en el taller actualmente.'}
            </div>
          ) : (
            <div style={styles.blogScroll}>
              {incidenciasFiltradas.map(inc => (
                <div key={inc.id} style={styles.blogCard}>
                  <div style={styles.blogHeader}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={styles.typeBadge}>{getTipoBadge(inc.tipo)}</span>
                      <span style={{...styles.stateBadge, ...getEstadoBadgeStyle(inc.estado)}}>
                        {getEstadoText(inc.estado)}
                      </span>
                      {/* Badge de prioridad */}
                      <span style={getPrioridadBadge(inc.prioridad || 'media')}>
                        {inc.prioridad === 'critica' && <Flame size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />}
                        {getPrioridadText(inc.prioridad || 'media')}
                      </span>
                    </div>
                    <span style={styles.blogDate}>
                      {new Date(inc.fecha).toLocaleDateString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p style={styles.blogDesc}>"{inc.descripcion}"</p>

                  <div style={styles.blogFooter}>
                    <span style={{ color: 'var(--text-muted)' }}>Reportado por: <strong>{inc.usuario_nombre}</strong></span>
                    
                    {/* Controles para Profesores / Admin */}
                    {!isAlumno && (
                      <div style={styles.actionGroup}>
                        {inc.estado !== 'resuelto' && (
                          <>
                            {inc.estado === 'pendiente' && (
                              <button 
                                onClick={() => handleChangeEstado(inc.id, 'notificado_centro')}
                                style={{...styles.actionBtn, color: 'var(--accent)'}}
                                title="Notificar a mantenimiento"
                              >
                                <Wrench size={12} /> Notificar
                              </button>
                            )}
                            <button 
                              onClick={() => handleChangeEstado(inc.id, 'resuelto')}
                              style={{...styles.actionBtn, color: 'var(--success)'}}
                              title="Marcar como resuelto"
                            >
                              <CheckCircle size={12} /> Resolver
                            </button>
                          </>
                        )}
                        {inc.estado === 'resuelto' && (
                          <button 
                            onClick={() => handleChangeEstado(inc.id, 'pendiente')}
                            style={{...styles.actionBtn, color: 'var(--danger)'}}
                            title="Reabrir incidencia"
                          >
                            Reabrir
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* BOTÓN HILO DE RESPUESTAS */}
                  <div style={styles.hiloToggleRow}>
                    <button
                      type="button"
                      onClick={() => toggleHilo(inc.id)}
                      style={styles.hiloToggleBtn}
                    >
                      <MessageCircle size={14} />
                      <span>
                        {hilosAbiertos[inc.id] ? 'Ocultar hilo' : 'Ver respuestas / Responder'}
                      </span>
                      {(contadorRespuestas[inc.id] || 0) > 0 && (
                        <span style={styles.contadorBadge}>
                          {contadorRespuestas[inc.id]} {contadorRespuestas[inc.id] === 1 ? 'respuesta' : 'respuestas'}
                        </span>
                      )}
                      {hilosAbiertos[inc.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* ACORDEÓN DE HILO */}
                  {hilosAbiertos[inc.id] && (
                    <HiloRespuestas incidenciaId={inc.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Estilos del hilo de respuestas ───────────────────────────
const hiloStyles = {
  container: {
    marginTop: '12px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '12px',
  } as React.CSSProperties,
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 0',
  } as React.CSSProperties,
  respuestasList: {
    maxHeight: '220px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '10px',
    paddingRight: '4px',
  } as React.CSSProperties,
  emptyHilo: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '8px 0',
  } as React.CSSProperties,
  respuestaCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '10px 12px',
  } as React.CSSProperties,
  respuestaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  } as React.CSSProperties,
  autorNombre: {
    fontSize: '0.72rem',
    fontWeight: '600',
    color: 'var(--accent)',
  } as React.CSSProperties,
  respuestaFecha: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  respuestaMensaje: {
    fontSize: '0.8rem',
    color: 'var(--text-primary)',
    lineHeight: '1.35',
    margin: 0,
  } as React.CSSProperties,
  replyForm: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  } as React.CSSProperties,
  replyInput: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '0.8rem',
    outline: 'none',
  } as React.CSSProperties,
  replyBtn: {
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
};

// ─── Estilos principales ──────────────────────────────────────
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '30px',
  } as React.CSSProperties,
  statsCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px 20px',
  } as React.CSSProperties,
  statsLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  statsValue: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginTop: '6px',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  layout: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  leftBento: {
    flex: '1 1 350px',
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
  textarea: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px 14px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    resize: 'none',
    lineHeight: '1.4',
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
  // Selector de prioridad toggle
  prioridadToggleGroup: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  prioridadToggleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 8px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  // Filtro bar
  filtroBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  filtroLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  filtroGroup: {
    display: 'flex',
    gap: '6px',
  } as React.CSSProperties,
  filtroBtn: {
    padding: '4px 12px',
    borderRadius: '20px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-muted)',
    fontSize: '0.7rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
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
  blogScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    maxHeight: '580px',
    paddingRight: '6px',
  } as React.CSSProperties,
  blogCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '16px',
  } as React.CSSProperties,
  blogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '10px',
  } as React.CSSProperties,
  typeBadge: {
    fontSize: '0.7rem',
    fontWeight: '700',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    padding: '3px 8px',
    borderRadius: '4px',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  stateBadge: {
    fontSize: '0.65rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '20px',
  } as React.CSSProperties,
  blogDate: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  blogDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    lineHeight: '1.4',
    fontStyle: 'italic',
    marginBottom: '12px',
  } as React.CSSProperties,
  blogFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.75rem',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '10px',
  } as React.CSSProperties,
  actionGroup: {
    display: 'flex',
    gap: '6px',
  } as React.CSSProperties,
  actionBtn: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    padding: '3px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.7rem',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: '500',
  } as React.CSSProperties,
  // Hilo toggle
  hiloToggleRow: {
    marginTop: '10px',
    borderTop: '1px dashed var(--border-color)',
    paddingTop: '8px',
  } as React.CSSProperties,
  hiloToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '0.72rem',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '4px 0',
    transition: 'color var(--transition-fast)',
    width: '100%',
  } as React.CSSProperties,
  contadorBadge: {
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    fontSize: '0.6rem',
    fontWeight: '700',
    padding: '1px 8px',
    borderRadius: '10px',
    marginLeft: '4px',
  } as React.CSSProperties,
};

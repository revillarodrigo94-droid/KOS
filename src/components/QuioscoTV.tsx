import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { 
  Tv, 
  Maximize2, 
  Minimize2, 
  Calendar, 
  Thermometer, 
  AlertTriangle, 
  UserCheck, 
  BookOpen, 
  Clock, 
  Loader2,
  X
} from 'lucide-react';
import type { Camara, RegistroTemperatura, Elaboracion, JefeCocina, Incidencia } from '../types/database.types';

export const QuioscoTV: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Datos
  const [elaboraciones, setElaboraciones] = useState<Elaboracion[]>([]);
  const [camaras, setCamaras] = useState<Camara[]>([]);
  const [temperaturas, setTemperaturas] = useState<RegistroTemperatura[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [jefaturaHoy, setJefaturaHoy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Rotador de vista activa (para carrusel opcional o vista general)
  const [activePanel, setActivePanel] = useState<'all' | 'briefing' | 'temperaturas' | 'incidencias'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const hoyString = new Date().toISOString().split('T')[0];

      // 1. Obtener cámaras
      const { data: cams } = await supabase.from('camaras').select('*').eq('activa', true);
      setCamaras(cams || []);

      // 2. Obtener temperaturas de hoy
      const { data: temps } = await supabase
        .from('registro_temperaturas')
        .select('*')
        .eq('fecha', hoyString);
      setTemperaturas(temps || []);

      // 3. Obtener la carta de hoy
      const { data: cartas } = await supabase
        .from('cartas_semanales')
        .select('*')
        .eq('fecha', hoyString);
      
      if (cartas && cartas.length > 0 && cartas[0].elaboraciones) {
        const { data: elabs } = await supabase
          .from('elaboraciones')
          .select('*')
          .in('id', cartas[0].elaboraciones);
        setElaboraciones(elabs || []);
      } else {
        setElaboraciones([]);
      }

      // 4. Obtener incidencias activas (pendientes)
      const { data: incs } = await supabase
        .from('incidencias')
        .select('*')
        .eq('estado', 'pendiente')
        .order('fecha', { ascending: false });
      setIncidencias(incs || []);

      // 5. Obtener roles asignados hoy
      const { data: jefs } = await supabase
        .from('jefes_cocina')
        .select('*')
        .eq('fecha', hoyString);
      
      if (jefs && jefs.length > 0) {
        const jef = jefs[0];
        // Cargar nombres de alumnos de forma asíncrona local
        const { data: alumnos } = await supabase
          .from('usuarios')
          .select('id, nombre, apellidos')
          .in('id', [jef.jefe_id, jef.limpieza_id]);
        
        const jefeObj = alumnos?.find(a => a.id === jef.jefe_id);
        const limpObj = alumnos?.find(a => a.id === jef.limpieza_id);

        setJefaturaHoy({
          ...jef,
          jefe_nombre: jefeObj ? `${jefeObj.nombre} ${jefeObj.apellidos}` : 'No asignado',
          limpieza_nombre: limpObj ? `${limpObj.nombre} ${limpObj.apellidos}` : 'No asignado'
        });
      } else {
        setJefaturaHoy(null);
      }

    } catch (err) {
      console.error('Error cargando datos del Modo TV:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Recarga en vivo cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Rotador automático de paneles si no está en modo "Vista General"
  useEffect(() => {
    if (activePanel === 'all') return;
    const rotateInterval = setInterval(() => {
      setActivePanel(prev => {
        if (prev === 'briefing') return 'temperaturas';
        if (prev === 'temperaturas') return 'incidencias';
        return 'briefing';
      });
    }, 10000); // 10s por panel
    return () => clearInterval(rotateInterval);
  }, [activePanel]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.error(err));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{
        ...tvStyles.container,
        backgroundColor: '#0a0a0c',
        color: '#f3f4f6',
        padding: isFullscreen ? '40px' : '24px',
        height: isFullscreen ? '100vh' : 'calc(100vh - 120px)',
        overflowY: 'auto'
      }}
    >
      {/* Barra superior de control */}
      <div style={tvStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Tv size={28} color="var(--accent)" />
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>PANTALLA DE PROYECCIÓN DE TALLER</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KitchenOS Dashboard en Vivo</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActivePanel('all')} 
            style={{...tvStyles.controlBtn, ...(activePanel === 'all' ? tvStyles.activeControlBtn : {})}}
          >
            Vista General
          </button>
          <button 
            onClick={() => setActivePanel('briefing')} 
            style={{...tvStyles.controlBtn, ...(activePanel !== 'all' ? tvStyles.activeControlBtn : {})}}
          >
            Rotar Carrusel (10s)
          </button>
          <button onClick={toggleFullscreen} style={tvStyles.fullscreenBtn}>
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span>{isFullscreen ? 'Salir Pantalla Completa' : 'Pantalla Completa'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%' }}>
          <Loader2 size={40} className="spin-animation" color="var(--accent)" />
          <p style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Sincronizando con el taller en vivo...</p>
        </div>
      ) : (
        <div style={tvStyles.grid}>
          
          {/* PANEL 1: CARTA DEL DÍA / BRIEFING */}
          {(activePanel === 'all' || activePanel === 'briefing') && (
            <div style={{...tvStyles.card, gridColumn: activePanel === 'all' ? 'span 8' : 'span 12'}}>
              <div style={tvStyles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={20} color="var(--accent)" />
                  <span style={tvStyles.cardTitle}>MENÚ DEL SERVICIO DE HOY</span>
                </div>
                <span style={tvStyles.cardBadge}>Ficha Técnica</span>
              </div>

              {elaboraciones.length === 0 ? (
                <div style={tvStyles.emptyState}>No hay platos programados en el menú de hoy.</div>
              ) : (
                <div style={tvStyles.menuList}>
                  {elaboraciones.map((plato, index) => (
                    <div key={plato.id} style={tvStyles.menuItem}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {index + 1}. {plato.nombre}
                        </h4>
                        <span style={{
                          fontSize: '0.65rem',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--accent)',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontWeight: '800',
                          textTransform: 'uppercase'
                        }}>{plato.partida || 'General'}</span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                        {plato.descripcion || 'Sin ficha técnica.'}
                      </p>
                      {plato.alergenos && plato.alergenos.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {plato.alergenos.map(al => (
                            <span key={al} style={{ fontSize: '0.7rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                              ⚠️ {al.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PANEL 2: ROLES ASIGNADOS HOY */}
          {activePanel === 'all' && (
            <div style={{...tvStyles.card, gridColumn: 'span 4'}}>
              <div style={tvStyles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={20} color="var(--accent)" />
                  <span style={tvStyles.cardTitle}>ROLES DE LA SESIÓN</span>
                </div>
                <span style={tvStyles.cardBadge}>Hoy</span>
              </div>

              {jefaturaHoy ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center', height: '80%' }}>
                  <div style={tvStyles.roleBox}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>👨‍🍳 Jefe de Cocina (Producción)</span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--accent)', display: 'block', marginTop: '4px' }}>
                      {jefaturaHoy.jefe_nombre}
                    </strong>
                  </div>
                  <div style={tvStyles.roleBox}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🧼 Encargado de Limpieza (Protocolo)</span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>
                      {jefaturaHoy.limpieza_nombre}
                    </strong>
                  </div>
                </div>
              ) : (
                <div style={tvStyles.emptyState}>Ningún alumno ha sido asignado a los roles diarios de hoy aún.</div>
              )}
            </div>
          )}

          {/* PANEL 3: TEMPERATURAS APPCC CÁMARAS */}
          {(activePanel === 'all' || activePanel === 'temperaturas') && (
            <div style={{...tvStyles.card, gridColumn: activePanel === 'all' ? 'span 6' : 'span 12'}}>
              <div style={tvStyles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Thermometer size={20} color="var(--accent)" />
                  <span style={tvStyles.cardTitle}>MONITORIZACIÓN TÉRMICA (APPCC)</span>
                </div>
                <span style={tvStyles.cardBadge}>Cámaras</span>
              </div>

              {camaras.length === 0 ? (
                <div style={tvStyles.emptyState}>No hay cámaras registradas.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '10px' }}>
                  {camaras.map(cam => {
                    const ultimaLectura = temperaturas.find(t => t.camara_id === cam.id);
                    const tempVal = ultimaLectura ? Number(ultimaLectura.temperatura) : null;
                    const isAlerta = tempVal !== null && tempVal > cam.temperatura_limite;

                    return (
                      <div 
                        key={cam.id} 
                        style={{
                          ...tvStyles.tempBox,
                          borderLeft: `4px solid ${tempVal === null ? 'var(--border-color)' : isAlerta ? '#ef4444' : 'var(--success)'}`,
                          backgroundColor: isAlerta ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-primary)'
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>{cam.nombre}</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '8px 0' }}>
                          <span style={{ fontSize: '2rem', fontWeight: 800, color: tempVal === null ? 'var(--text-muted)' : isAlerta ? '#ef4444' : 'var(--text-primary)' }}>
                            {tempVal !== null ? `${tempVal.toFixed(1)}°` : '—'}
                          </span>
                          {tempVal !== null && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>C</span>}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          Límite: {cam.temperatura_limite}°C | {tempVal === null ? 'Sin lectura hoy' : isAlerta ? '⚠️ ALERTA' : '✓ OK'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PANEL 4: ÚLTIMAS ALERTAS / INCIDENCIAS DE TALLER */}
          {(activePanel === 'all' || activePanel === 'incidencias') && (
            <div style={{...tvStyles.card, gridColumn: activePanel === 'all' ? 'span 6' : 'span 12'}}>
              <div style={tvStyles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} color="#ef4444" />
                  <span style={tvStyles.cardTitle}>ALERTAS DE SEGURIDAD / INCIDENCIAS</span>
                </div>
                <span style={{...tvStyles.cardBadge, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444'}}>En Vivo</span>
              </div>

              {incidencias.length === 0 ? (
                <div style={{ ...tvStyles.emptyState, color: 'var(--success)' }}>✓ Cero avisos de averías. Todos los sistemas del taller funcionan correctamente.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '200px' }}>
                  {incidencias.map(inc => (
                    <div 
                      key={inc.id} 
                      style={{
                        ...tvStyles.incidenciaRow,
                        borderLeft: `4px solid ${inc.prioridad === 'critica' ? '#ef4444' : inc.prioridad === 'media' ? 'var(--accent)' : 'var(--text-muted)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: inc.prioridad === 'critica' ? '#ef4444' : 'var(--text-primary)' }}>
                          {inc.tipo.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {new Date(inc.fecha).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{inc.descripcion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

const tvStyles = {
  container: {
    borderRadius: '20px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  } as React.CSSProperties,
  controlBtn: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '8px 16px',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  } as React.CSSProperties,
  activeControlBtn: {
    backgroundColor: 'var(--accent)',
    color: '#000',
    borderColor: 'var(--accent)'
  } as React.CSSProperties,
  fullscreenBtn: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '8px 16px',
    color: 'var(--text-primary)',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '20px',
    flex: 1
  } as React.CSSProperties,
  card: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '0.88rem',
    fontWeight: '800',
    letterSpacing: '0.06em',
    color: 'var(--text-secondary)'
  } as React.CSSProperties,
  cardBadge: {
    fontSize: '0.65rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    padding: '2px 8px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase'
  } as React.CSSProperties,
  emptyState: {
    padding: '30px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    border: '1px dashed var(--border-color)',
    borderRadius: '8px'
  } as React.CSSProperties,
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  } as React.CSSProperties,
  menuItem: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px'
  } as React.CSSProperties,
  roleBox: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '16px'
  } as React.CSSProperties,
  tempBox: {
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid var(--border-color)'
  } as React.CSSProperties,
  incidenciaRow: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '10px 12px'
  } as React.CSSProperties
};

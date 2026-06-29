import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Star, 
  ClipboardCheck, 
  AlertTriangle, 
  TrendingUp, 
  Sparkles, 
  Clock,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface AlumnoEval {
  id: string;
  nombre: string;
  iniciales: string;
  estacion: string;
  uniforme: boolean;
  higiene: boolean;
  estrellas: number;
}

export const ProfesorDashboard: React.FC = () => {
  const { profile } = useAuth();
  
  // Alumnos activos del taller maquetados (se integrará en la Fase 7)
  const [alumnos, setAlumnos] = useState<AlumnoEval[]>([
    { id: '1', nombre: 'Marc S.', iniciales: 'MS', estacion: 'Estación 1', uniforme: true, higiene: true, estrellas: 4 },
    { id: '2', nombre: 'Lucia M.', iniciales: 'LM', estacion: 'Estación 2', uniforme: true, higiene: false, estrellas: 3 },
    { id: '3', nombre: 'Javier R.', iniciales: 'JR', estacion: 'Estación 3', uniforme: true, higiene: true, estrellas: 0 },
    { id: '4', nombre: 'Elena G.', iniciales: 'EG', estacion: 'Estación 4', uniforme: false, higiene: true, estrellas: 5 },
  ]);

  // Alertas de cámaras en base de datos real
  const [alertasCmaras, setAlertasCmaras] = useState<{ camara: string; temp: number; limite: string }[]>([]);

  useEffect(() => {
    // Comprobar si hay temperaturas fuera de rango en la base de datos hoy
    const checkAlertas = async () => {
      try {
        const { data: camaras } = await supabase
          .from('camaras')
          .select('id, nombre, temperatura_max, temperatura_min')
          .eq('activa', true);

        if (camaras && camaras.length > 0) {
          const alertasDetected: { camara: string; temp: number; limite: string }[] = [];
          
          for (const cam of camaras) {
            const { data: lecturas } = await supabase
              .from('registros_temperatura')
              .select('temperatura')
              .eq('camara_id', cam.id)
              .order('creado_en', { ascending: false })
              .limit(1);

            if (lecturas && lecturas.length > 0) {
              const temp = parseFloat(lecturas[0].temperatura as any);
              if (temp > cam.temperatura_max || temp < cam.temperatura_min) {
                alertasDetected.push({
                  camara: cam.nombre,
                  temp,
                  limite: `Fuera del rango (${cam.temperatura_min}-${cam.temperatura_max}°C)`
                });
              }
            }
          }
          setAlertasCmaras(alertasDetected);
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkAlertas();
  }, []);

  const handleToggleUniforme = (id: string) => {
    setAlumnos(prev => prev.map(al => al.id === id ? { ...al, uniforme: !al.uniforme } : al));
  };

  const handleToggleHigiene = (id: string) => {
    setAlumnos(prev => prev.map(al => al.id === id ? { ...al, higiene: !al.higiene } : al));
  };

  const handleSetEstrellas = (id: string, count: number) => {
    setAlumnos(prev => prev.map(al => al.id === id ? { ...al, estrellas: count } : al));
  };

  return (
    <div style={styles.container}>
      {/* Encabezado */}
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Panel de Supervisión Docente</h2>
          <p style={styles.subtitle}>Profesor: {profile?.nombre} {profile?.apellidos} • Sesión de Taller Activa</p>
        </div>
      </div>

      {/* Grid Bento Principal */}
      <div style={styles.bentoGrid}>
        
        {/* 1. Alertas Rápidas (12 col en móvil/escritorio si existen alertas) */}
        {(alertasCmaras.length > 0 || alumnos.some(al => !al.higiene || !al.uniforme)) && (
          <section style={{...styles.bentoCard, ...styles.col12, borderColor: 'var(--danger)', backgroundColor: 'var(--danger-glow)'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)', marginBottom: '12px' }}>
              <AlertTriangle size={20} />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alertas de Taller Activas</h3>
            </div>
            <ul style={styles.alertList}>
              {alertasCmaras.map((al, idx) => (
                <li key={idx} style={styles.alertItem}>
                  ⚠️ Cámara fuera de rango: <strong>{al.camara}</strong> está a <strong>{al.temp}°C</strong> ({al.limite}).
                </li>
              ))}
              {alumnos.filter(al => !al.uniforme).map(al => (
                <li key={`u-${al.id}`} style={styles.alertItem}>
                  👕 Incidencia Uniforme: <strong>{al.nombre}</strong> ({al.estacion}) no viste el uniforme completo.
                </li>
              ))}
              {alumnos.filter(al => !al.higiene).map(al => (
                <li key={`h-${al.id}`} style={styles.alertItem}>
                  🧼 Incidencia Higiene: <strong>{al.nombre}</strong> ({al.estacion}) requiere lavado de manos / desinfección de estación.
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 2. Supervisión de Alumnos en Taller (6 col en escritorio) */}
        <section style={{...styles.bentoCard, ...styles.col6, height: '480px', display: 'flex', flexDirection: 'column'}}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTag}>Supervisión en Taller</span>
            <span style={styles.cardMeta}>{alumnos.length} Alumnos</span>
          </div>

          <div style={styles.scrollContainer}>
            {alumnos.map(al => (
              <div key={al.id} style={styles.studentRow}>
                {/* Info Alumno */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={styles.avatar}>{al.iniciales}</div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{al.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{al.estacion}</div>
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Uniforme & Higiene Checks */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => handleToggleUniforme(al.id)}
                      style={{
                        ...styles.iconCheckBtn,
                        color: al.uniforme ? 'var(--success)' : 'var(--danger)'
                      }}
                      title={al.uniforme ? 'Uniforme Correcto' : 'Falta Uniforme'}
                    >
                      {al.uniforme ? <ShieldCheck size={18} /> : <XCircle size={18} />}
                    </button>
                    <button 
                      onClick={() => handleToggleHigiene(al.id)}
                      style={{
                        ...styles.iconCheckBtn,
                        color: al.higiene ? 'var(--success)' : 'var(--danger)'
                      }}
                      title={al.higiene ? 'Higiene Correcta' : 'Incidencia Higiene'}
                    >
                      <CheckCircle size={18} />
                    </button>
                  </div>

                  {/* Estrellas */}
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(starNum => (
                      <button 
                        key={starNum}
                        onClick={() => handleSetEstrellas(al.id, starNum)}
                        style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}
                      >
                        <Star 
                          size={15} 
                          color={starNum <= al.estrellas ? 'var(--accent)' : 'var(--border-color)'}
                          fill={starNum <= al.estrellas ? 'var(--accent)' : 'transparent'} 
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Control de Checklists de Cocina & Limpieza (6 col en escritorio) */}
        <section style={{...styles.bentoCard, ...styles.col6, height: '480px', display: 'flex', flexDirection: 'column'}}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTag}>Control de Checklists del Día</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Fase 6</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
            {/* Checklist Producción */}
            <div style={styles.checklistControlBlock}>
              <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'flex-end', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Checklist Producción (Jefe de Cocina)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>75%</span>
              </div>
              <div style={styles.progressBarBg}>
                <div style={{...styles.progressBarFill, width: '75%'}}></div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <span style={styles.chipSigned}>✓ Firmado: MS</span>
                <span style={styles.chipPending}>⏲ Pendiente Validar Prof.</span>
              </div>
            </div>

            {/* Checklist Limpieza */}
            <div style={styles.checklistControlBlock}>
              <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'flex-end', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Protocolo Limpieza Aulas / Talleres</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>10%</span>
              </div>
              <div style={styles.progressBarBg}>
                <div style={{...styles.progressBarFill, width: '10%', backgroundColor: 'var(--border-color)'}}></div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <span style={styles.chipPending}>⏲ Pendiente Firma Alumno</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Menú Briefing Diario (12 col en escritorio) */}
        <section style={{...styles.bentoCard, ...styles.col12}}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTag}>Briefing Planificado de Hoy</span>
            <span style={styles.cardMeta}>Fase 5</span>
          </div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Plato Programado</div>
              <h4 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Risotto de Setas Silvestres</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Preparación técnica de arroz Arborio, salteado de hongos (boletus, portobello), emulsionado con mantequilla fría y Parmesano Reggiano.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={styles.allergenBadge}>Lácteos</div>
              <div style={styles.allergenBadge}>Vegetariano</div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px 0',
  } as React.CSSProperties,
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '24px',
  } as React.CSSProperties,
  title: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  } as React.CSSProperties,
  bentoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '16px',
    width: '100%',
  } as React.CSSProperties,
  bentoCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '24px',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  col12: {
    gridColumn: 'span 12',
  } as React.CSSProperties,
  col6: {
    gridColumn: 'span 6',
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  } as React.CSSProperties,
  cardTag: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  } as React.CSSProperties,
  cardMeta: {
    fontSize: '0.7rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '3px 8px',
    borderRadius: '4px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  alertList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  } as React.CSSProperties,
  alertItem: {
    fontSize: '0.8rem',
    color: 'var(--danger)',
  } as React.CSSProperties,
  scrollContainer: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '6px',
  } as React.CSSProperties,
  studentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '12px 16px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  iconCheckBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s ease',
  } as React.CSSProperties,
  checklistControlBlock: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '16px',
    borderRadius: '12px',
  } as React.CSSProperties,
  progressBarBg: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '3px',
    overflow: 'hidden',
  } as React.CSSProperties,
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--accent)',
    borderRadius: '3px',
  } as React.CSSProperties,
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
  allergenBadge: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
};

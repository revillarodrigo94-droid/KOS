import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { InventarioActivo, InventarioMaestro } from '../types/database.types';
import { 
  CheckCircle, 
  HelpCircle, 
  Search, 
  Thermometer, 
  ClipboardList, 
  AlertTriangle, 
  Loader2, 
  TrendingDown, 
  Check, 
  Utensils, 
  ShieldAlert, 
  Send 
} from 'lucide-react';

export const AlumnoDashboard: React.FC = () => {
  const { profile } = useAuth();
  
  // Estados para inventario express
  const [inventario, setInventario] = useState<(InventarioActivo & { ingrediente_nombre?: string; ingrediente_categoria?: string; ingrediente_unidad?: string })[]>([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para temperaturas express
  const [tempData, setTempData] = useState<{ nombre: string; temp: number; estado: 'ok' | 'alerta'; rango: string } | null>(null);
  const [loadingTemp, setLoadingTemp] = useState(true);

  // Estados de checklists maquetados de alta fidelidad (se conectarán en la Fase 6)
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Desinfectar estación y tablas de corte', completed: true },
    { id: 2, text: 'Preparar fondo oscuro de ave', completed: true },
    { id: 3, text: 'Limpiar y picar setas silvestres (Brunoise)', completed: false },
    { id: 4, text: 'Rallar Parmesano Reggiano (Mise en Place)', completed: false },
    { id: 5, text: 'Verificar mise en place de la estación', completed: false }
  ]);

  // Incidencia rápida (Microblog - Fase 7)
  const [incidenciaText, setIncidenciaText] = useState('');
  const [sendingIncidencia, setSendingIncidencia] = useState(false);
  const [incidenciaSuccess, setIncidenciaSuccess] = useState(false);

  useEffect(() => {
    // 1. Cargar stock activo del Economato para el buscador rápido
    const fetchExpressStock = async () => {
      setLoadingInv(true);
      try {
        const { data, error } = await supabase
          .from('inventario_activo')
          .select(`
            *,
            inventario_maestro(nombre, categoria, unidad_medida)
          `)
          .limit(8);

        if (error) {
          console.error(error);
        } else {
          const formatted = (data as any[]).map(item => ({
            ...item,
            ingrediente_nombre: item.inventario_maestro?.nombre || 'Desconocido',
            ingrediente_categoria: item.inventario_maestro?.categoria || 'Otros',
            ingrediente_unidad: item.inventario_maestro?.unidad_medida || 'ud'
          }));
          setInventario(formatted);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInv(false);
      }
    };

    // 2. Obtener estado de una cámara activa para el estado express
    const fetchExpressTemp = async () => {
      setLoadingTemp(true);
      try {
        const { data: camaras, error } = await supabase
          .from('camaras')
          .select('*')
          .eq('activa', true)
          .limit(1);

        if (error) {
          console.error(error);
        } else if (camaras && camaras.length > 0) {
          const camara = camaras[0];
          // Obtener última lectura de hoy
          const { data: lecturas } = await supabase
            .from('registros_temperatura')
            .select('temperatura')
            .eq('camara_id', camara.id)
            .order('creado_en', { ascending: false })
            .limit(1);

          const tempLectura = lecturas && lecturas.length > 0 ? parseFloat(lecturas[0].temperatura as any) : 3.2;
          const isAlerta = tempLectura > camara.temperatura_max || tempLectura < camara.temperatura_min;

          setTempData({
            nombre: camara.nombre,
            temp: tempLectura,
            estado: isAlerta ? 'alerta' : 'ok',
            rango: `Rango: ${camara.temperatura_min}-${camara.temperatura_max}°C`
          });
        } else {
          // Mock si no hay cámaras cargadas
          setTempData({
            nombre: 'Cámara Principal',
            temp: 3.2,
            estado: 'ok',
            rango: 'Rango OK (2-4°C)'
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTemp(false);
      }
    };

    fetchExpressStock();
    fetchExpressTemp();
  }, []);

  const handleToggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleSendIncidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidenciaText.trim()) return;
    setSendingIncidencia(true);
    setIncidenciaSuccess(false);

    try {
      // Registrar incidencia en base de datos
      const { error } = await supabase
        .from('incidencias')
        .insert([{
          aula: 'Taller de Tarde',
          descripcion: incidenciaText.trim().substring(0, 140),
          estado: 'pendiente',
          creado_por: profile?.id
        }]);

      setIncidenciaSuccess(true);
      setIncidenciaText('');
      setTimeout(() => setIncidenciaSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingIncidencia(false);
    }
  };

  const completedTasksCount = tasks.filter(t => t.completed).length;
  const progressPercent = Math.round((completedTasksCount / tasks.length) * 100);

  const filteredInventario = inventario.filter(item => 
    item.ingrediente_nombre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Fila de Encabezado */}
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Estación de Trabajo: Taller Central</h2>
          <p style={styles.subtitle}>Alumno: {profile?.nombre} {profile?.apellidos} (Jefe de Cocina hoy)</p>
        </div>
      </div>

      {/* Grid Bento Principal */}
      <div style={styles.bentoGrid}>
        
        {/* 1. Briefing / Carta del Día (8 col en escritorio) */}
        <section style={{...styles.bentoCard, ...styles.col8, position: 'relative', overflow: 'hidden'}}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTag}>Briefing del Servicio</span>
            <span style={styles.cardMeta}>HOY, 18:00h</span>
          </div>
          <div style={styles.briefingContent}>
            <span style={styles.briefingType}>Plato Principal Elaborado</span>
            <h3 style={styles.briefingName}>Risotto de Setas Silvestres con Crujiente de Parmesano</h3>
            
            <div style={styles.allergensContainer}>
              <div style={styles.allergenChip} title="Contiene Lácteos">
                <Utensils size={14} color="var(--accent)" />
                <span>Lácteos (Parmesano)</span>
              </div>
              <div style={styles.allergenChip} title="Apto para Vegetarianos">
                <CheckCircle size={14} color="var(--success)" />
                <span>Vegetariano</span>
              </div>
            </div>
          </div>
          {/* Orbe decorativo */}
          <div style={styles.cardOrbe}></div>
        </section>

        {/* 2. Estado de Temperatura (4 col en escritorio) */}
        <section style={{...styles.bentoCard, ...styles.col4, justifyContent: 'space-between', display: 'flex', flexDirection: 'column'}}>
          <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center' }}>
            <span style={styles.cardTag}>Nevera Asignada</span>
            {tempData?.estado === 'ok' ? (
              <div style={styles.pulseGreen}></div>
            ) : (
              <div style={styles.pulseRed}></div>
            )}
          </div>

          {loadingTemp ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
              <Loader2 className="spin-animation" size={24} color="var(--accent)" />
            </div>
          ) : (
            <div style={{ margin: '15px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={styles.tempValue}>{tempData?.temp}</span>
                <span style={styles.tempUnit}>°C</span>
              </div>
              <p style={{ 
                fontSize: '0.8rem', 
                color: tempData?.estado === 'ok' ? 'var(--success)' : 'var(--danger)', 
                fontWeight: 600,
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {tempData?.estado === 'ok' ? '✓ Rango Correcto' : '⚠️ ALERTA: FUERA DE RANGO'}
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tempData?.rango}</span>
            </div>
          )}

          <div style={styles.cardFooter}>
            <span style={styles.footerText}>Nevera Taller 1</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent)' }}>
              <Thermometer size={14} />
              <span>APPCC Activo</span>
            </div>
          </div>
        </section>

        {/* 3. Mis Checklists / Mise en Place (6 col en escritorio) */}
        <section style={{...styles.bentoCard, ...styles.col6}}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTag}>Mise en Place / Limpieza</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>{completedTasksCount}/{tasks.length} Tareas</span>
          </div>

          {/* Barra de progreso */}
          <div style={styles.progressBarBg}>
            <div style={{...styles.progressBarFill, width: `${progressPercent}%`}}></div>
          </div>

          <ul style={styles.taskList}>
            {tasks.map(task => (
              <li 
                key={task.id} 
                onClick={() => handleToggleTask(task.id)}
                style={{
                  ...styles.taskItem, 
                  ...(task.completed ? styles.taskCompleted : {})
                }}
              >
                <div style={{
                  ...styles.checkbox,
                  ...(task.completed ? styles.checkboxActive : {})
                }}>
                  {task.completed && <Check size={12} strokeWidth={3} color="#000" />}
                </div>
                <span style={{
                  fontSize: '0.85rem',
                  textDecoration: task.completed ? 'line-through' : 'none',
                  color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                  transition: 'all 0.2s ease'
                }}>
                  {task.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. Inventario Express (6 col en escritorio) */}
        <section style={{...styles.bentoCard, ...styles.col6}}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTag}>Inventario Express</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fase 4</span>
          </div>

          <div style={styles.searchWrapper}>
            <Search size={14} style={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Buscar ingrediente en economato..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {loadingInv ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Loader2 className="spin-animation" size={24} color="var(--accent)" />
            </div>
          ) : filteredInventario.length === 0 ? (
            <div style={styles.emptyBox}>No hay ingredientes en stock.</div>
          ) : (
            <div style={styles.invList}>
              {filteredInventario.map(item => {
                const isCritico = item.cantidad < 2.0; // Mock de regla crítica
                return (
                  <div 
                    key={item.id} 
                    style={{
                      ...styles.invItem,
                      ...(isCritico ? styles.invCritico : {})
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isCritico ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {item.ingrediente_nombre}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: isCritico ? 'rgba(239, 68, 68, 0.7)' : 'var(--text-muted)' }}>
                        {item.ingrediente_categoria} {isCritico && '— Crítico'}
                      </span>
                    </div>
                    <span style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '0.85rem', 
                      fontWeight: 600,
                      color: isCritico ? 'var(--danger)' : 'var(--text-primary)'
                    }}>
                      {item.cantidad} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>{item.ingrediente_unidad}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 5. Reporte Rápido de Incidencias (Microblog - 12 col en escritorio) */}
        <section style={{...styles.bentoCard, ...styles.col12}}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTag}>Reporte de Incidencia Rápida (Taller)</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max 140 caracteres</span>
          </div>

          <form onSubmit={handleSendIncidencia} style={styles.incidenciaForm}>
            <input 
              type="text" 
              placeholder="Ej. El fuego central del horno 3 no enciende. Válvula de gas atascada." 
              value={incidenciaText}
              onChange={(e) => setIncidenciaText(e.target.value.substring(0, 140))}
              style={styles.incidenciaInput}
              disabled={sendingIncidencia}
              required
            />
            
            <button 
              type="submit" 
              style={{
                ...styles.sendBtn,
                ...(incidenciaText.trim() ? styles.sendBtnActive : {})
              }}
              disabled={sendingIncidencia || !incidenciaText.trim()}
            >
              {sendingIncidencia ? (
                <Loader2 size={16} className="spin-animation" />
              ) : (
                <>
                  <Send size={16} />
                  <span>Reportar</span>
                </>
              )}
            </button>
          </form>

          {incidenciaSuccess && (
            <div style={styles.successMsg}>
              ✓ Incidencia guardada e informada al profesor.
            </div>
          )}
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
  col8: {
    gridColumn: 'span 8',
  } as React.CSSProperties,
  col6: {
    gridColumn: 'span 6',
  } as React.CSSProperties,
  col4: {
    gridColumn: 'span 4',
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
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
  briefingContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
    padding: '8px 0',
  } as React.CSSProperties,
  briefingType: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  } as React.CSSProperties,
  briefingName: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: '1.25',
    letterSpacing: '-0.02em',
    maxWidth: '90%',
  } as React.CSSProperties,
  allergensContainer: {
    display: 'flex',
    gap: '8px',
    marginTop: '20px',
  } as React.CSSProperties,
  allergenChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  cardOrbe: {
    position: 'absolute',
    bottom: '-80px',
    right: '-80px',
    width: '240px',
    height: '240px',
    backgroundColor: 'rgba(245, 158, 11, 0.03)',
    borderRadius: 'var(--radius-full)',
    filter: 'blur(40px)',
    pointerEvents: 'none',
  } as React.CSSProperties,
  pulseGreen: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--success)',
    boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)',
    animation: 'pulse 2s infinite',
  } as React.CSSProperties,
  pulseRed: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--danger)',
    boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)',
    animation: 'pulse 2s infinite',
  } as React.CSSProperties,
  tempValue: {
    fontSize: '2.5rem',
    fontWeight: '700',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
  } as React.CSSProperties,
  tempUnit: {
    fontSize: '1.25rem',
    color: 'var(--text-secondary)',
    marginLeft: '2px',
  } as React.CSSProperties,
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '12px',
    marginTop: '12px',
  } as React.CSSProperties,
  footerText: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  progressBarBg: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '16px',
  } as React.CSSProperties,
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--accent)',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  } as React.CSSProperties,
  taskList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
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
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
  } as React.CSSProperties,
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  searchInput: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '10px 14px 10px 34px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
  } as React.CSSProperties,
  emptyBox: {
    padding: '24px',
    border: '1px dashed var(--border-color)',
    borderRadius: '8px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  } as React.CSSProperties,
  invList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '180px',
    overflowY: 'auto',
  } as React.CSSProperties,
  invItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '6px',
  } as React.CSSProperties,
  invCritico: {
    borderLeft: '3px solid var(--danger)',
    backgroundColor: 'var(--danger-glow)',
  } as React.CSSProperties,
  incidenciaForm: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  } as React.CSSProperties,
  incidenciaInput: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
  } as React.CSSProperties,
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.85rem',
    cursor: 'not-allowed',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  sendBtnActive: {
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    borderColor: 'var(--accent)',
    cursor: 'pointer',
  } as React.CSSProperties,
  successMsg: {
    marginTop: '10px',
    fontSize: '0.8rem',
    color: 'var(--success)',
    fontWeight: 600,
  } as React.CSSProperties,
};

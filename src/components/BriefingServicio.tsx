import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Elaboracion, CartaSemanal, Grupo } from '../types/database.types';
import { 
  Utensils, 
  Plus, 
  Calendar, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  Check, 
  BookOpen, 
  FileText,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

export const BriefingServicio: React.FC = () => {
  const { profile } = useAuth();
  const isAlumno = profile?.rol === 'alumno';
  const isProfesor = profile?.rol === 'profesor';
  const isAdmin = profile?.rol === 'admin';

  // Datos de base de datos
  const [elaboraciones, setElaboraciones] = useState<Elaboracion[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cartas, setCartas] = useState<(CartaSemanal & { grupo_nombre?: string })[]>([]);

  // Estados de carga
  const [loading, setLoading] = useState(true);
  const [savingElab, setSavingElab] = useState(false);
  const [savingCarta, setSavingCarta] = useState(false);

  // Selector de pestañas
  const [activeTab, setActiveTab] = useState<'visualizar' | 'crear_elab' | 'programar'>('visualizar');

  // Formulario de Elaboración
  const [nombrePlato, setNombrePlato] = useState('');
  const [descripcionPlato, setDescripcionPlato] = useState('');
  const [alergenosSeleccionados, setAlergenosSeleccionados] = useState<string[]>([]);

  // Formulario de Programación de Menú/Carta
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [fechaCarta, setFechaCarta] = useState(new Date().toISOString().split('T')[0]);
  const [elaboracionesSeleccionadas, setElaboracionesSeleccionadas] = useState<string[]>([]);

  // Notificaciones
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Carta de hoy para Alumnos (o del grupo del profesor)
  const [cartaHoy, setCartaHoy] = useState<{ elaboracionesList: Elaboracion[] } | null>(null);

  // Lista oficial de los 14 alérgenos de la UE
  const listaAlergenos = [
    { id: 'gluten', nombre: 'Gluten', desc: 'Trigo, centeno, cebada, avena' },
    { id: 'crustaceos', nombre: 'Crustáceos', desc: 'Cangrejos, langostinos, gambas' },
    { id: 'huevos', nombre: 'Huevos', desc: 'Huevo y derivados' },
    { id: 'pescado', nombre: 'Pescado', desc: 'Pescado y derivados' },
    { id: 'cacahuetes', nombre: 'Cacahuetes', desc: 'Maní y trazas' },
    { id: 'soja', nombre: 'Soja', desc: 'Salsa de soja, lecitina' },
    { id: 'lacteos', nombre: 'Lácteos', desc: 'Leche, queso, mantequilla' },
    { id: 'frutos_cascara', nombre: 'Frutos de Cáscara', desc: 'Almendras, nueces, pistachos' },
    { id: 'apio', nombre: 'Apio', desc: 'Tallos, hojas, semillas' },
    { id: 'mostaza', nombre: 'Mostaza', desc: 'Salsas, semillas, polvo' },
    { id: 'sesamo', nombre: 'Sésamo', desc: 'Semillas, aceites' },
    { id: 'sulfitos', nombre: 'Sulfitos', desc: 'Conservantes, vino' },
    { id: 'altramuces', nombre: 'Altramuces', desc: 'Altramuz y derivados' },
    { id: 'moluscos', nombre: 'Moluscos', desc: 'Mejillones, calamares, pulpo' }
  ];

  // Cargar datos iniciales
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Cargar elaboraciones creadas
      const { data: elabs, error: errElab } = await supabase
        .from('elaboraciones')
        .select('*')
        .order('nombre', { ascending: true });

      if (errElab) throw errElab;
      setElaboraciones(elabs || []);

      // 2. Cargar grupos (sólo para programar, docentes/admin)
      if (!isAlumno) {
        const { data: grps, error: errGrps } = await supabase
          .from('grupos')
          .select('*')
          .eq('activo', true);
        if (errGrps) throw errGrps;
        setGrupos(grps || []);
      }

      // 3. Cargar la carta del día asignada al grupo del alumno o general
      let query = supabase.from('cartas_semanales').select(`
        *,
        grupos(nombre)
      `);
      
      const { data: cartasData, error: errCartas } = await query.order('fecha', { ascending: false });
      if (errCartas) throw errCartas;

      const formattedCartas = (cartasData || []).map((c: any) => ({
        ...c,
        grupo_nombre: c.grupos?.nombre || 'General'
      }));
      setCartas(formattedCartas);

      // Obtener carta de hoy
      const hoyString = new Date().toISOString().split('T')[0];
      const cartaHoyData = formattedCartas.find(c => c.fecha === hoyString);
      
      if (cartaHoyData && elabs) {
        // Filtrar las elaboraciones asociadas al menú de hoy
        const filteredElabs = elabs.filter(e => cartaHoyData.elaboraciones.includes(e.id));
        setCartaHoy({
          elaboracionesList: filteredElabs
        });
      } else {
        // Datos maquetados de alta fidelidad si no se ha planificado menú aún
        setCartaHoy({
          elaboracionesList: [
            {
              id: 'mock-1',
              nombre: 'Risotto de Setas Silvestres',
              descripcion: 'Arroz Arborio cocinado a fuego lento con caldo oscuro de ave y boletus frescos. Emulsionado final con mantequilla fría y Parmesano Reggiano curado de 24 meses.',
              alergenos: ['lacteos', 'sulfitos'],
              creado_by: null
            }
          ]
        });
      }

    } catch (err: any) {
      setErrorMsg('Error al cargar datos del briefing: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  // Alérgenos checkbox handler
  const handleToggleAlergeno = (id: string) => {
    setAlergenosSeleccionados(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // Crear Elaboración
  const handleCrearElaboracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombrePlato.trim()) return;
    setSavingElab(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('elaboraciones')
        .insert([{
          nombre: nombrePlato.trim(),
          descripcion: descripcionPlato.trim(),
          alergenos: alergenosSeleccionados,
          creado_by: profile?.id
        }]);

      if (error) throw error;

      setSuccessMsg(`"${nombrePlato}" guardado correctamente en el recetario.`);
      setNombrePlato('');
      setDescripcionPlato('');
      setAlergenosSeleccionados([]);
      setActiveTab('visualizar');
      fetchData();
    } catch (err: any) {
      setErrorMsg('Error al guardar plato: ' + err.message);
    } finally {
      setSavingElab(false);
    }
  };

  // Programar Menú Diario
  const handleProgramarCarta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grupoSeleccionado || elaboracionesSeleccionadas.length === 0) {
      alert('Debes seleccionar un grupo y al menos una elaboración.');
      return;
    }
    setSavingCarta(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Comprobar si ya existe menú programado para ese grupo y fecha
      const { data: existing } = await supabase
        .from('cartas_semanales')
        .select('id')
        .eq('grupo_id', grupoSeleccionado)
        .eq('fecha', fechaCarta)
        .maybeSingle();

      if (existing) {
        // Actualizar el menú existente
        const { error } = await supabase
          .from('cartas_semanales')
          .update({
            elaboraciones: elaboracionesSeleccionadas,
            creado_por: profile?.id
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insertar nuevo menú diario
        const { error } = await supabase
          .from('cartas_semanales')
          .insert([{
            grupo_id: grupoSeleccionado,
            fecha: fechaCarta,
            elaboraciones: elaboracionesSeleccionadas,
            creado_por: profile?.id
          }]);
        if (error) throw error;
      }

      setSuccessMsg(`Menú programado con éxito para el día ${fechaCarta}`);
      setElaboracionesSeleccionadas([]);
      setActiveTab('visualizar');
      fetchData();
    } catch (err: any) {
      setErrorMsg('Error al programar el menú: ' + err.message);
    } finally {
      setSavingCarta(false);
    }
  };

  const handleToggleElabSelect = (id: string) => {
    setElaboracionesSeleccionadas(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  return (
    <div style={styles.container}>
      {/* CABECERA Y SECTOR DE PESTAÑAS */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Utensils size={24} color="var(--accent)" />
          <h2 style={styles.title}>Briefing de Servicio y Cartas</h2>
        </div>

        <div style={styles.tabContainer}>
          <button 
            style={{...styles.tabBtn, ...(activeTab === 'visualizar' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('visualizar')}
          >
            Carta del Día
          </button>
          
          {(isProfesor || isAdmin) && (
            <>
              <button 
                style={{...styles.tabBtn, ...(activeTab === 'crear_elab' ? styles.activeTab : {})}}
                onClick={() => setActiveTab('crear_elab')}
              >
                Crear Elaboración
              </button>
              <button 
                style={{...styles.tabBtn, ...(activeTab === 'programar' ? styles.activeTab : {})}}
                onClick={() => setActiveTab('programar')}
              >
                Planificar Menú
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
      {successMsg && <div style={styles.successAlert}>{successMsg}</div>}

      {/* Carga general */}
      {loading ? (
        <div style={styles.loaderWrapper}>
          <Loader2 size={32} className="spin-animation" color="var(--accent)" />
          <p>Cargando información del briefing...</p>
        </div>
      ) : (
        <>
          {/* PESTAÑA 1: VISUALIZACIÓN CARTA DEL DÍA */}
          {activeTab === 'visualizar' && (
            <div style={styles.viewLayout}>
              {/* Carta del día (Bento Card Grande) */}
              <div style={styles.mainBento}>
                <div style={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={18} color="var(--accent)" />
                    <span style={styles.cardTag}>Servicio de Taller Activo</span>
                  </div>
                  <span style={styles.dateBadge}>
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>

                {cartaHoy && cartaHoy.elaboracionesList.length > 0 ? (
                  <div style={styles.platosList}>
                    {cartaHoy.elaboracionesList.map((plato, idx) => (
                      <div key={plato.id} style={styles.platoDetailCard}>
                        <div style={styles.platoHeader}>
                          <span style={styles.platoIndex}>Plato {idx + 1}</span>
                          <h3 style={styles.platoTitle}>{plato.nombre}</h3>
                        </div>
                        <p style={styles.platoDesc}>{plato.descripcion || 'Sin descripción técnica asignada.'}</p>
                        
                        {/* Alérgenos oficiales de este plato */}
                        <div style={{ marginTop: '20px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Alérgenos Declarados (Regulación UE)
                          </span>
                          <div style={styles.allergensGrid}>
                            {plato.alergenos.length === 0 ? (
                              <div style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Check size={14} /> Libre de alérgenos declarados.
                              </div>
                            ) : (
                              plato.alergenos.map(alId => {
                                const elAl = listaAlergenos.find(a => a.id === alId);
                                return (
                                  <div key={alId} style={styles.allergenLabel} title={elAl?.desc}>
                                    <div style={styles.allergenPoint}></div>
                                    <span style={{ fontWeight: 600 }}>{elAl?.nombre}</span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.emptyBox}>No hay platos programados en la carta para el servicio de hoy.</div>
                )}
              </div>

              {/* Recetario Master (Panel Derecho) */}
              <div style={styles.sideBento}>
                <div style={styles.panelTitle}>Recetario de Elaboraciones ({elaboraciones.length})</div>
                <div style={styles.recetarioScroll}>
                  {elaboraciones.length === 0 ? (
                    <div style={styles.emptyBox}>No hay elaboraciones registradas.</div>
                  ) : (
                    elaboraciones.map(elab => (
                      <div key={elab.id} style={styles.recetarioItem}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{elab.nombre}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.3' }}>
                            {elab.descripcion ? elab.descripcion.substring(0, 80) + '...' : 'Sin descripción.'}
                          </div>
                        </div>
                        {elab.alergenos.length > 0 && (
                          <div style={styles.badgeCount}>
                            {elab.alergenos.length} alérgenos
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: CREAR ELABORACIÓN (DOCENTES / ADMIN) */}
          {activeTab === 'crear_elab' && (isProfesor || isAdmin) && (
            <div style={styles.formLayout}>
              <div style={styles.bentoCard}>
                <div style={styles.panelTitle}>Ficha Técnica de Elaboración</div>
                <form onSubmit={handleCrearElaboracion} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre del Plato / Elaboración</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Tataki de Atún con Sésamo y Salsa Ponzu" 
                      value={nombrePlato}
                      onChange={(e) => setNombrePlato(e.target.value)}
                      style={styles.input}
                      required
                      disabled={savingElab}
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Descripción y Ficha Técnica (Ingredientes clave y proceso)</label>
                    <textarea 
                      placeholder="Describe la elaboración paso a paso o los puntos críticos del servicio..." 
                      value={descripcionPlato}
                      onChange={(e) => setDescripcionPlato(e.target.value)}
                      style={styles.textarea}
                      rows={4}
                      disabled={savingElab}
                    />
                  </div>

                  {/* Selector de alérgenos interactivo */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Declaración de Alérgenos (Pulsa los correspondientes)</label>
                    <div style={styles.alergenoGridSelector}>
                      {listaAlergenos.map(al => {
                        const seleccionado = alergenosSeleccionados.includes(al.id);
                        return (
                          <button
                            key={al.id}
                            type="button"
                            onClick={() => handleToggleAlergeno(al.id)}
                            style={{
                              ...styles.alergenoBtn,
                              ...(seleccionado ? styles.alergenoBtnActive : {})
                            }}
                            title={al.desc}
                          >
                            <span style={{ fontWeight: 600 }}>{al.nombre}</span>
                            <span style={{ fontSize: '0.65rem', color: seleccionado ? 'var(--accent-text)' : 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                              {al.desc.split(',')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button type="submit" disabled={savingElab || !nombrePlato.trim()} style={styles.submitBtn}>
                    {savingElab ? 'Guardando Elaboración...' : 'Guardar Ficha Técnica'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: PLANIFICAR CARTA / MENÚ SEMANAl (DOCENTES / ADMIN) */}
          {activeTab === 'programar' && (isProfesor || isAdmin) && (
            <div style={styles.programarLayout}>
              {/* Formulario de asignación */}
              <div style={styles.sideBento}>
                <div style={styles.panelTitle}>Planificar Menú de Taller</div>
                <form onSubmit={handleProgramarCarta} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Grupo / Aula Asignada</label>
                    <select
                      value={grupoSeleccionado}
                      onChange={(e) => setGrupoSeleccionado(e.target.value)}
                      style={styles.select}
                      required
                    >
                      <option value="">Selecciona un grupo activo...</option>
                      {grupos.map(g => (
                        <option key={g.id} value={g.id}>{g.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Fecha del Servicio</label>
                    <input 
                      type="date" 
                      value={fechaCarta}
                      onChange={(e) => setFechaCarta(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={{...styles.label, marginBottom: '2px'}}>Platos Seleccionados ({elaboracionesSeleccionadas.length})</label>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Elige las elaboraciones del recetario de la derecha pulsando sobre ellas.</p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={savingCarta || !grupoSeleccionado || elaboracionesSeleccionadas.length === 0} 
                    style={styles.submitBtn}
                  >
                    {savingCarta ? 'Publicando Carta...' : 'Publicar Carta de Servicio'}
                  </button>
                </form>
              </div>

              {/* Panel de Elaboraciones para seleccionar */}
              <div style={styles.mainBento}>
                <div style={styles.panelTitle}>Selecciona Elaboraciones del Recetario</div>
                {elaboraciones.length === 0 ? (
                  <div style={styles.emptyBox}>No hay elaboraciones disponibles para programar. Crea una primero en la pestaña correspondiente.</div>
                ) : (
                  <div style={styles.selectableGrid}>
                    {elaboraciones.map(elab => {
                      const selected = elaboracionesSeleccionadas.includes(elab.id);
                      return (
                        <div 
                          key={elab.id} 
                          onClick={() => handleToggleElabSelect(elab.id)}
                          style={{
                            ...styles.selectableCard,
                            ...(selected ? styles.selectableCardActive : {})
                          }}
                        >
                          <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>{elab.nombre}</div>
                            {selected && <div style={styles.checkMark}>✓</div>}
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                            {elab.descripcion || 'Sin descripción.'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
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
  viewLayout: {
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
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  } as React.CSSProperties,
  cardTag: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  } as React.CSSProperties,
  dateBadge: {
    fontSize: '0.75rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '4px 10px',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  } as React.CSSProperties,
  platosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  } as React.CSSProperties,
  platoDetailCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '24px',
  } as React.CSSProperties,
  platoHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginBottom: '10px',
  } as React.CSSProperties,
  platoIndex: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--accent)',
    textTransform: 'uppercase',
  } as React.CSSProperties,
  platoTitle: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,
  platoDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  } as React.CSSProperties,
  allergensGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  allergenLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  allergenPoint: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent)',
  } as React.CSSProperties,
  emptyBox: {
    padding: '40px',
    border: '1px dashed var(--border-color)',
    borderRadius: '12px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
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
    maxHeight: '400px',
  } as React.CSSProperties,
  recetarioItem: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '12px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  } as React.CSSProperties,
  badgeCount: {
    fontSize: '0.65rem',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    padding: '2px 6px',
    borderRadius: '4px',
    color: 'var(--accent)',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  
  // Ficha de elaboración (Pestaña 2)
  formLayout: {
    maxWidth: '800px',
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
  alergenoGridSelector: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '10px',
    marginTop: '6px',
  } as React.CSSProperties,
  alergenoBtn: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'var(--text-secondary)',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  alergenoBtnActive: {
    borderColor: 'var(--accent)',
    backgroundColor: 'var(--accent-glow)',
    color: 'var(--text-primary)',
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
  
  // Planificar Menú (Pestaña 3)
  programarLayout: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  selectableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
    maxHeight: '440px',
    overflowY: 'auto',
    paddingRight: '6px',
  } as React.CSSProperties,
  selectableCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '14px',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  selectableCardActive: {
    borderColor: 'var(--accent)',
    backgroundColor: 'var(--accent-glow)',
  } as React.CSSProperties,
  checkMark: {
    marginLeft: 'auto',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: 'bold',
  } as React.CSSProperties,
};

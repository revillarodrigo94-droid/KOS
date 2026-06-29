import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Camara, RegistroTemperatura, CamaraTipo, MomentoRegistro } from '../types/database.types';
import { 
  Thermometer, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  FileDown, 
  Calendar,
  Layers,
  Settings,
  X,
  Loader2,
  Edit2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const TemperaturasAPPCC: React.FC = () => {
  const { profile } = useAuth();
  const isAlumno = profile?.rol === 'alumno';
  const isProfesor = profile?.rol === 'profesor';
  const isAdmin = profile?.rol === 'admin';

  const [camaras, setCamaras] = useState<Camara[]>([]);
  const [registros, setRegistros] = useState<(RegistroTemperatura & { camara_nombre?: string; usuario_nombre?: string })[]>([]);
  const [loadingCamaras, setLoadingCamaras] = useState(true);
  const [loadingRegistros, setLoadingRegistros] = useState(false);

  // Estados para Registro (Flujo Alumno)
  const [momentoSelected, setMomentoSelected] = useState<MomentoRegistro>('inicio');
  const [temperaturasInput, setTemperaturasInput] = useState<{ [camaraId: string]: string }>({});
  
  // Estados para Gestión de Cámaras (Flujo Profesor/Admin)
  const [showCamaraModal, setShowCamaraModal] = useState(false);
  const [camaraNombre, setCamaraNombre] = useState('');
  const [camaraTipo, setCamaraTipo] = useState<CamaraTipo>('refrigeracion');
  const [camaraLimite, setCamaraLimite] = useState('4.0');
  const [savingCamara, setSavingCamara] = useState(false);
  
  // Filtros de Histórico
  const [fechaInicio, setFechaInicio] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);

  // Mensajes de Alerta/Éxito
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Cargar Cámaras Activas
  const fetchCamaras = async () => {
    setLoadingCamaras(true);
    try {
      const { data, error } = await supabase
        .from('camaras')
        .select('*')
        .eq('activa', true)
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error fetching camaras:', error.message);
      } else {
        setCamaras(data as Camara[]);
        // Inicializar inputs vacíos
        const initialInputs: { [id: string]: string } = {};
        (data as Camara[]).forEach(c => {
          initialInputs[c.id] = '';
        });
        setTemperaturasInput(initialInputs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCamaras(false);
    }
  };

  // 2. Cargar Histórico de Registros (Solo Profesores/Admin)
  const fetchRegistros = async () => {
    if (isAlumno) return;
    setLoadingRegistros(true);
    try {
      // Hacemos un join manual trayendo la cámara y el usuario que registró
      const { data, error } = await supabase
        .from('registro_temperaturas')
        .select(`
          *,
          camaras(nombre, tipo, temperatura_limite),
          usuarios(nombre, apellidos)
        `)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: false })
        .order('momento', { ascending: true });

      if (error) {
        console.error('Error fetching registros:', error.message);
      } else {
        // Mapear los datos para aplanar el objeto
        const formatted = (data as any[]).map(reg => ({
          ...reg,
          camara_nombre: reg.camaras?.nombre || 'Cámara Eliminada',
          usuario_nombre: reg.usuarios ? `${reg.usuarios.nombre} ${reg.usuarios.apellidos}` : 'Usuario Desconocido'
        }));
        setRegistros(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRegistros(false);
    }
  };

  useEffect(() => {
    fetchCamaras();
  }, []);

  useEffect(() => {
    fetchRegistros();
  }, [fechaInicio, fechaFin]);

  // 3. Crear Nueva Cámara (Profesor/Admin)
  const handleCreateCamara = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!camaraNombre || !camaraLimite) return;
    setSavingCamara(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('camaras')
        .insert([{
          nombre: camaraNombre,
          tipo: camaraTipo,
          temperatura_limite: parseFloat(camaraLimite),
          profesor_id: profile?.id,
          activa: true
        }]);

      if (error) {
        setErrorMsg('Error al crear cámara: ' + error.message);
      } else {
        setSuccessMsg('Cámara creada correctamente.');
        setShowCamaraModal(false);
        setCamaraNombre('');
        // Recargar cámaras
        fetchCamaras();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSavingCamara(false);
    }
  };

  // 4. Eliminar Cámara (Desactivar)
  const handleDeleteCamara = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la cámara "${nombre}"? Los registros históricos se conservarán pero no aparecerá para nuevas lecturas.`)) return;
    try {
      const { error } = await supabase
        .from('camaras')
        .update({ activa: false })
        .eq('id', id);

      if (error) {
        alert('Error al desactivar cámara: ' + error.message);
      } else {
        setCamaras(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Guardar Registros de Alumno
  const handleSaveTemperaturas = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validar que se hayan introducido todas las temperaturas
    const camarasSinRegistro = camaras.filter(c => !temperaturasInput[c.id]);
    if (camarasSinRegistro.length > 0) {
      setErrorMsg('Por favor, introduce la temperatura para todas las cámaras.');
      return;
    }

    try {
      // Mapear los registros para insertarlos
      const inserts = camaras.map(c => ({
        camara_id: c.id,
        momento: momentoSelected,
        temperatura: parseFloat(temperaturasInput[c.id]),
        usuario_id: profile?.id,
        fecha: new Date().toISOString().split('T')[0] // Fecha de hoy en formato local YYYY-MM-DD
      }));

      const { error } = await supabase
        .from('registro_temperaturas')
        .insert(inserts);

      if (error) {
        setErrorMsg('Error al guardar registros: ' + error.message);
      } else {
        setSuccessMsg('Temperaturas guardadas correctamente.');
        // Limpiar inputs
        const cleared: { [id: string]: string } = {};
        camaras.forEach(c => { cleared[c.id] = ''; });
        setTemperaturasInput(cleared);
      }
    } catch (err: any) {
      setErrorMsg('Error inesperado: ' + err.message);
    }
  };

  // 6. Exportar Reporte APPCC a PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Encabezado
    doc.setFillColor(18, 18, 20); // Gris oscuro
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTES DE TEMPERATURAS APPCC', 15, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 15, 26);
    doc.text(`Rango de Fechas: ${fechaInicio} al ${fechaFin}`, 130, 26);
    
    // Tabla de Datos
    const tableHeaders = [['Fecha', 'Cámara', 'Momento', 'Temp. Registrada', 'Límite', 'Alerta', 'Registrado Por']];
    const tableRows = registros.map(reg => {
      const limite = reg.camaras?.temperatura_limite ?? (reg.camara_nombre?.toLowerCase().includes('congelacion') ? -18 : 4);
      return [
        reg.fecha,
        reg.camara_nombre || '',
        reg.momento === 'inicio' ? 'Inicio Clase' : 'Fin Clase',
        `${reg.temperatura} ºC`,
        `${limite} ºC`,
        reg.alerta ? '⚠️ EXCESO' : 'OK',
        reg.usuario_nombre || ''
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: tableHeaders,
      body: tableRows,
      headStyles: { fillColor: [224, 169, 109], textColor: [24, 24, 27], fontStyle: 'bold' }, // Acento dorado / texto oscuro
      alternateRowStyles: { fillColor: [244, 244, 245] },
      margin: { horizontal: 15 },
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        // Poner celda de alerta en rojo si hay alarma
        if (data.column.index === 5 && data.cell.text[0] === '⚠️ EXCESO') {
          data.cell.styles.textColor = [239, 68, 68];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Pie de página de firmas
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setTextColor(24, 24, 27);
    doc.line(15, finalY, 80, finalY);
    doc.line(130, finalY, 195, finalY);
    
    doc.setFontSize(9);
    doc.text('Firma Alumno Encargado', 15, finalY + 5);
    doc.text('Firma Profesor / Auditor', 130, finalY + 5);

    doc.save(`Reporte_APPCC_${fechaInicio}_${fechaFin}.pdf`);
  };

  const handleInputChange = (camaraId: string, val: string) => {
    // Permitir solo números y decimales
    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
      setTemperaturasInput(prev => ({
        ...prev,
        [camaraId]: val
      }));
    }
  };

  const autoFillLimits = (tipo: CamaraTipo) => {
    setCamaraTipo(tipo);
    setCamaraLimite(tipo === 'refrigeracion' ? '4.0' : '-18.0');
  };

  return (
    <div style={styles.container}>
      {/* SECCIÓN REGISTRO DIARIO (ALUMNOS / TODOS) */}
      <div style={styles.sectionHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Thermometer size={24} color="var(--accent)" />
          <h2 style={styles.title}>Registro Diario de Cámaras</h2>
        </div>
        
        {(isProfesor || isAdmin) && (
          <button onClick={() => setShowCamaraModal(true)} style={styles.addBtn}>
            <Plus size={16} />
            Nueva Cámara
          </button>
        )}
      </div>

      {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
      {successMsg && <div style={styles.successAlert}>{successMsg}</div>}

      {loadingCamaras ? (
        <div style={styles.loadingWrapper}>
          <Loader2 size={32} className="spin-animation" color="var(--accent)" />
          <p>Cargando cámaras...</p>
        </div>
      ) : camaras.length === 0 ? (
        <div style={styles.emptyBox}>
          No hay cámaras de conservación configuradas en el sistema.
        </div>
      ) : (
        <form onSubmit={handleSaveTemperaturas} style={styles.formContainer}>
          <div style={styles.momentSelector}>
            <label style={styles.momentLabel}>Momento de la toma:</label>
            <div style={styles.momentBtnGroup}>
              <button
                type="button"
                style={{...styles.momentBtn, ...(momentoSelected === 'inicio' ? styles.activeMomentBtn : {})}}
                onClick={() => setMomentoSelected('inicio')}
              >
                Inicio de Clase
              </button>
              <button
                type="button"
                style={{...styles.momentBtn, ...(momentoSelected === 'fin' ? styles.activeMomentBtn : {})}}
                onClick={() => setMomentoSelected('fin')}
              >
                Fin de Clase
              </button>
            </div>
          </div>

          <div style={styles.grid}>
            {camaras.map(camara => {
              const valor = temperaturasInput[camara.id] || '';
              const tempNum = parseFloat(valor);
              const isOverLimit = !isNaN(tempNum) && (
                (camara.type === 'refrigeracion' && tempNum > camara.temperatura_limite) ||
                (camara.type === 'congelacion' && tempNum > camara.temperatura_limite)
              );

              return (
                <div 
                  key={camara.id} 
                  className={`bento-card ${isOverLimit ? 'danger-alert' : 'active-accent'}`}
                  style={styles.card}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.cardTitleBox}>
                      <span style={styles.cardTitle}>{camara.nombre}</span>
                      <span style={styles.cardSubtitle}>
                        {camara.tipo === 'refrigeracion' ? 'Refrigeración' : 'Congelación'} (Límite: {camara.temperatura_limite}ºC)
                      </span>
                    </div>
                    {(isProfesor || isAdmin) && (
                      <button 
                        type="button" 
                        onClick={() => handleDeleteCamara(camara.id, camara.nombre)}
                        style={styles.deleteBtn}
                        title="Eliminar cámara"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div style={styles.cardInputWrapper}>
                    <input
                      type="text"
                      placeholder="Temp. ºC"
                      value={valor}
                      onChange={(e) => handleInputChange(camara.id, e.target.value)}
                      style={styles.cardInput}
                    />
                    {isOverLimit && (
                      <div style={styles.alertIndicator} title="Temperatura fuera de rango de seguridad">
                        <AlertTriangle size={20} color="var(--danger)" />
                        <span style={styles.alertText}>Alerta</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button type="submit" style={styles.submitBtn}>
            <CheckCircle size={18} />
            Guardar Lecturas Diarias
          </button>
        </form>
      )}

      {/* SECCIÓN HISTÓRICO Y AUDITORÍA (PROFESORES Y ADMIN) */}
      {(isProfesor || isAdmin) && (
        <div style={styles.historicalSection}>
          <div style={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={24} color="var(--accent)" />
              <h2 style={styles.title}>Histórico y Reportes (APPCC)</h2>
            </div>
            <button onClick={handleExportPDF} disabled={registros.length === 0} style={styles.pdfBtn}>
              <FileDown size={16} />
              Exportar PDF Oficial
            </button>
          </div>

          {/* Filtros de Fecha */}
          <div style={styles.filtersWrapper}>
            <div style={styles.filterInputGroup}>
              <label style={styles.filterLabel}>Desde:</label>
              <input 
                type="date" 
                value={fechaInicio} 
                onChange={(e) => setFechaInicio(e.target.value)} 
                style={styles.filterInput}
              />
            </div>
            <div style={styles.filterInputGroup}>
              <label style={styles.filterLabel}>Hasta:</label>
              <input 
                type="date" 
                value={fechaFin} 
                onChange={(e) => setFechaFin(e.target.value)} 
                style={styles.filterInput}
              />
            </div>
          </div>

          {loadingRegistros ? (
            <div style={styles.loadingWrapper}>
              <Loader2 size={32} className="spin-animation" color="var(--accent)" />
              <p>Cargando registros históricos...</p>
            </div>
          ) : registros.length === 0 ? (
            <div style={styles.emptyBox}>
              No se han encontrado registros en este rango de fechas.
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Fecha</th>
                    <th style={styles.th}>Cámara</th>
                    <th style={styles.th}>Momento</th>
                    <th style={styles.th}>Temperatura</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Registrado Por</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map(reg => (
                    <tr key={reg.id} style={styles.tr}>
                      <td style={styles.td}>{reg.fecha}</td>
                      <td style={styles.td}>{reg.camara_nombre}</td>
                      <td style={styles.td}>{reg.momento === 'inicio' ? 'Inicio Clase' : 'Fin Clase'}</td>
                      <td style={{...styles.td, fontWeight: 600}}>{reg.temperatura} ºC</td>
                      <td style={styles.td}>
                        {reg.alerta ? (
                          <span style={styles.alertBadge}>⚠️ ALERTA</span>
                        ) : (
                          <span style={styles.okBadge}>OK</span>
                        )}
                      </td>
                      <td style={styles.td}>{reg.usuario_nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL NUEVA CÁMARA (PROFESOR/ADMIN) */}
      {showCamaraModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Nueva Cámara de Conservación</h3>
              <button onClick={() => setShowCamaraModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCamara} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre de la Cámara</label>
                <input 
                  type="text" 
                  placeholder="Ej. Cámara Cuarto Frío A" 
                  value={camaraNombre} 
                  onChange={(e) => setCamaraNombre(e.target.value)} 
                  style={styles.modalInput}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Función / Tipo</label>
                <div style={styles.typeSelector}>
                  <button
                    type="button"
                    style={{...styles.typeBtn, ...(camaraTipo === 'refrigeracion' ? styles.activeTypeBtn : {})}}
                    onClick={() => autoFillLimits('refrigeracion')}
                  >
                    Refrigeración (4ºC)
                  </button>
                  <button
                    type="button"
                    style={{...styles.typeBtn, ...(camaraTipo === 'congelacion' ? styles.activeTypeBtn : {})}}
                    onClick={() => autoFillLimits('congelacion')}
                  >
                    Congelación (-18ºC)
                  </button>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Temperatura Límite (ºC)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={camaraLimite} 
                  onChange={(e) => setCamaraLimite(e.target.value)} 
                  style={styles.modalInput}
                  required
                />
                <p style={styles.helpText}>Si la lectura del alumno supera este límite, se activará la alarma APPCC.</p>
              </div>

              <button type="submit" disabled={savingCamara} style={styles.saveBtn}>
                {savingCamara ? 'Guardando...' : 'Crear Cámara'}
              </button>
            </form>
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
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '14px',
  } as React.CSSProperties,
  title: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 14px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  pdfBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    color: 'var(--accent)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 14px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
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
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  emptyBox: {
    padding: '30px',
    border: '1px dashed var(--border-color)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  } as React.CSSProperties,
  momentSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    padding: '12px 20px',
    borderRadius: 'var(--radius-md)',
  } as React.CSSProperties,
  momentLabel: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  momentBtnGroup: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  momentBtn: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '6px 14px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  activeMomentBtn: {
    borderColor: 'var(--accent)',
    backgroundColor: 'var(--accent-glow)',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,
  card: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '16px',
    minHeight: '140px',
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  } as React.CSSProperties,
  cardTitleBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  cardSubtitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  deleteBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'color var(--transition-fast)',
  } as React.CSSProperties,
  cardInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  cardInput: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    fontWeight: '600',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
    textAlign: 'center',
  } as React.CSSProperties,
  alertIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--danger-glow)',
    border: '1px solid var(--danger)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
  } as React.CSSProperties,
  alertText: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--danger)',
    textTransform: 'uppercase',
  } as React.CSSProperties,
  submitBtn: {
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--success)',
    color: '#09090b',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 24px',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    boxShadow: 'var(--shadow-sm)',
  } as React.CSSProperties,
  historicalSection: {
    marginTop: '50px',
  } as React.CSSProperties,
  filtersWrapper: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    padding: '16px 20px',
    borderRadius: 'var(--radius-md)',
  } as React.CSSProperties,
  filterInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  filterLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  } as React.CSSProperties,
  filterInput: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
  } as React.CSSProperties,
  tableContainer: {
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
    backgroundColor: 'var(--bg-secondary)',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  } as React.CSSProperties,
  th: {
    backgroundColor: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-color)',
    padding: '14px 18px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  } as React.CSSProperties,
  tr: {
    borderBottom: '1px solid var(--border-color)',
    transition: 'background-color var(--transition-fast)',
  } as React.CSSProperties,
  td: {
    padding: '14px 18px',
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  alertBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
  } as React.CSSProperties,
  okBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
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
    borderRadius: 'var(--radius-lg)',
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
  modalInput: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
  } as React.CSSProperties,
  typeSelector: {
    display: 'flex',
    gap: '10px',
  } as React.CSSProperties,
  typeBtn: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  activeTypeBtn: {
    borderColor: 'var(--accent)',
    backgroundColor: 'var(--accent-glow)',
    color: 'var(--text-primary)',
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
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    marginTop: '10px',
  } as React.CSSProperties,
};

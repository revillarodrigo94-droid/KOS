import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  InventarioMaestro, 
  InventarioActivo as StockActivo, 
  HistorialInventario,
  ZonaAlmacen,
  InventarioOperacion
} from '../types/database.types';
import { 
  Package, 
  Plus, 
  Minus, 
  Search, 
  History, 
  Clipboard, 
  Trash2, 
  Sliders, 
  Loader2, 
  Layers, 
  CornerDownRight, 
  Check, 
  AlertCircle
} from 'lucide-react';

export const InventarioActivo: React.FC = () => {
  const { profile } = useAuth();
  const isAlumno = profile?.rol === 'alumno';
  const isProfesor = profile?.rol === 'profesor';
  const isAdmin = profile?.rol === 'admin';

  // Datos
  const [listaMaestra, setListaMaestra] = useState<InventarioMaestro[]>([]);
  const [stockActivo, setStockActivo] = useState<(StockActivo & { ingrediente_nombre?: string; ingrediente_categoria?: string; ingrediente_unidad?: string; usuario_nombre?: string })[]>([]);
  const [historial, setHistorial] = useState<(HistorialInventario & { ingrediente_nombre?: string; usuario_nombre?: string })[]>([]);
  
  // Estados de Carga
  const [loadingData, setLoadingData] = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [submittingMov, setSubmittingMov] = useState(false);

  // Selector de Vista y Zona
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'maestro' | 'historial'>('stock');
  const [zonaSelected, setZonaSelected] = useState<ZonaAlmacen>('economato');

  // Registrar Movimiento (Alumno y Profesor)
  const [searchQuery, setSearchQuery] = useState('');
  const [ingredienteSelected, setIngredienteSelected] = useState<InventarioMaestro | null>(null);
  const [cantidadInput, setCantidadInput] = useState('');
  const [tipoOperacion, setTipoOperacion] = useState<'entrada' | 'salida'>('entrada');
  const [showDropdown, setShowDropdown] = useState(false);

  // Crear Ingrediente Maestro (Profesor/Admin)
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('Verduras/Frutas');
  const [nuevaUnidad, setNuevaUnidad] = useState('kg');
  const [savingMaestro, setSavingMaestro] = useState(false);

  // Ajuste Directo de Stock (Solo Admin)
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [ajusteStockId, setAjusteStockId] = useState<string | null>(null);
  const [ajusteCantidad, setAjusteCantidad] = useState('');
  const [ajusteIngredienteNombre, setAjusteIngredienteNombre] = useState('');

  // Notificaciones
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Categorías de stock
  const categorias = ['Carnes', 'Pescados/Mariscos', 'Verduras/Frutas', 'Lácteos', 'Secos/Almacén', 'Especias/Condimentos', 'Bebidas', 'Congelados', 'Otros'];

  // Cargar lista maestra de ingredientes
  const fetchListaMaestra = async () => {
    try {
      const { data, error } = await supabase
        .from('inventario_maestro')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) console.error('Error fetching master inventory:', error.message);
      else setListaMaestra(data as InventarioMaestro[]);
    } catch (err) {
      console.error(err);
    }
  };

  // Cargar stock activo de la zona seleccionada
  const fetchStockActivo = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('inventario_activo')
        .select(`
          *,
          inventario_maestro(nombre, categoria, unidad_medida),
          usuarios(nombre, apellidos)
        `)
        .eq('zona', zonaSelected)
        .order('actualizado_en', { ascending: false });

      if (error) {
        console.error('Error fetching stock:', error.message);
      } else {
        const formatted = (data as any[]).map(item => ({
          ...item,
          ingrediente_nombre: item.inventario_maestro?.nombre || 'Desconocido',
          ingrediente_categoria: item.inventario_maestro?.categoria || 'Otros',
          ingrediente_unidad: item.inventario_maestro?.unidad_medida || 'ud',
          usuario_nombre: item.usuarios ? `${item.usuarios.nombre} ${item.usuarios.apellidos}` : 'Sistema'
        }));
        setStockActivo(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  // Cargar historial de auditoría (Profesores/Admin)
  const fetchHistorial = async () => {
    if (isAlumno) return;
    setLoadingHistorial(true);
    try {
      const { data, error } = await supabase
        .from('historial_inventario')
        .select(`
          *,
          inventario_maestro(nombre),
          usuarios(nombre, apellidos)
        `)
        .order('fecha', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching history:', error.message);
      } else {
        const formatted = (data as any[]).map(h => ({
          ...h,
          ingrediente_nombre: h.inventario_maestro?.nombre || 'Ingrediente Eliminado',
          usuario_nombre: h.usuarios ? `${h.usuarios.nombre} ${h.usuarios.apellidos}` : 'Usuario Desconocido'
        }));
        setHistorial(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    fetchListaMaestra();
  }, []);

  useEffect(() => {
    fetchStockActivo();
  }, [zonaSelected]);

  useEffect(() => {
    if (activeSubTab === 'historial') {
      fetchHistorial();
    }
  }, [activeSubTab]);

  // Crear ingrediente en la lista maestra (Profesor/Admin)
  const handleCreateMaestro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setSavingMaestro(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('inventario_maestro')
        .insert([{
          nombre: nuevoNombre.trim(),
          categoria: nuevaCategoria,
          unidad_medida: nuevaUnidad,
          creado_por: profile?.id
        }]);

      if (error) {
        setErrorMsg(error.message.includes('unique') 
          ? 'Este ingrediente ya existe en la lista maestra.' 
          : 'Error: ' + error.message
        );
      } else {
        setSuccessMsg(`"${nuevoNombre}" añadido correctamente.`);
        setNuevoNombre('');
        fetchListaMaestra();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSavingMaestro(false);
    }
  };

  // Eliminar ingrediente de la lista maestra
  const handleDeleteMaestro = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${nombre}" de la lista maestra? Esto fallará si el ingrediente está actualmente en stock activo.`)) return;
    try {
      const { error } = await supabase
        .from('inventario_maestro')
        .delete()
        .eq('id', id);

      if (error) {
        alert('No se puede eliminar: el ingrediente tiene existencias activas en stock.');
      } else {
        setListaMaestra(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Registrar Movimiento de stock (Alumno/Profesor)
  const handleRegisterMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredienteSelected || !cantidadInput) return;
    setSubmittingMov(true);
    setErrorMsg('');
    setSuccessMsg('');

    const cantidad = parseFloat(cantidadInput);
    if (isNaN(cantidad) || cantidad <= 0) {
      setErrorMsg('La cantidad debe ser un número positivo.');
      setSubmittingMov(false);
      return;
    }

    try {
      // 1. Obtener la cantidad actual (si existe)
      const { data: currentStock, error: stockFetchError } = await supabase
        .from('inventario_activo')
        .select('id, cantidad')
        .eq('ingrediente_id', ingredienteSelected.id)
        .eq('zona', zonaSelected)
        .maybeSingle();

      if (stockFetchError) throw stockFetchError;

      const cantidadActual = currentStock ? parseFloat(currentStock.cantidad as any) : 0.0;
      let cantidadNueva = cantidadActual;

      if (tipoOperacion === 'entrada') {
        cantidadNueva += cantidad;
      } else {
        if (cantidadActual < cantidad) {
          setErrorMsg(`Stock insuficiente en ${zonaSelected}. Stock disponible: ${cantidadActual} ${ingredienteSelected.unidad_medida}`);
          setSubmittingMov(false);
          return;
        }
        cantidadNueva -= cantidad;
      }

      // 2. Guardar o actualizar en Supabase
      if (currentStock) {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from('inventario_activo')
          .update({
            cantidad: cantidadNueva,
            ultima_modificacion_por: profile?.id,
            actualizado_en: new Date().toISOString()
          })
          .eq('id', currentStock.id);

        if (updateError) throw updateError;
      } else {
        // Insertar nuevo registro en la zona
        const { error: insertError } = await supabase
          .from('inventario_activo')
          .insert([{
            ingrediente_id: ingredienteSelected.id,
            zona: zonaSelected,
            cantidad: cantidadNueva,
            ultima_modificacion_por: profile?.id
          }]);

        if (insertError) throw insertError;
      }

      setSuccessMsg(`Movimiento registrado: ${tipoOperacion === 'entrada' ? '+' : '-'}${cantidad} ${ingredienteSelected.unidad_medida} de ${ingredienteSelected.nombre}`);
      
      // Limpiar inputs
      setCantidadInput('');
      setIngredienteSelected(null);
      setSearchQuery('');
      
      // Recargar stock de la zona
      fetchStockActivo();
    } catch (err: any) {
      setErrorMsg('Error al procesar movimiento: ' + err.message);
    } finally {
      setSubmittingMov(false);
    }
  };

  // Ajuste directo del administrador
  const handleAjusteDirecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajusteStockId || !ajusteCantidad) return;
    setErrorMsg('');
    setSuccessMsg('');

    const nuevaCant = parseFloat(ajusteCantidad);
    if (isNaN(nuevaCant) || nuevaCant < 0) {
      alert('La cantidad debe ser un número igual o mayor a cero.');
      return;
    }

    try {
      const { error } = await supabase
        .from('inventario_activo')
        .update({
          cantidad: nuevaCant,
          ultima_modificacion_por: profile?.id,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', ajusteStockId);

      if (error) {
        alert('Error al ajustar: ' + error.message);
      } else {
        setSuccessMsg(`Stock de ${ajusteIngredienteNombre} ajustado directamente a ${nuevaCant}`);
        setShowAjusteModal(false);
        setAjusteCantidad('');
        fetchStockActivo();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtrado de ingredientes en buscador
  const filteredIngredientes = listaMaestra.filter(item => 
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.categoria.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* CABECERA Y SECTOR DE PESTAÑAS */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Package size={24} color="var(--accent)" />
          <h2 style={styles.title}>Inventario Activo de Almacén</h2>
        </div>

        <div style={styles.tabContainer}>
          <button 
            style={{...styles.tabBtn, ...(activeSubTab === 'stock' ? styles.activeTab : {})}}
            onClick={() => setActiveSubTab('stock')}
          >
            Existencias
          </button>
          
          {(isProfesor || isAdmin) && (
            <button 
              style={{...styles.tabBtn, ...(activeSubTab === 'maestro' ? styles.activeTab : {})}}
              onClick={() => setActiveSubTab('maestro')}
            >
              Lista Maestra (Ingredientes)
            </button>
          )}

          {!isAlumno && (
            <button 
              style={{...styles.tabBtn, ...(activeSubTab === 'historial' ? styles.activeTab : {})}}
              onClick={() => setActiveSubTab('historial')}
            >
              Historial / Auditoría
            </button>
          )}
        </div>
      </div>

      {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}
      {successMsg && <div style={styles.successAlert}>{successMsg}</div>}

      {/* 1. SECCIÓN DE STOCK (EXISTENCIAS EN TIEMPO REAL) */}
      {activeSubTab === 'stock' && (
        <div style={styles.stockLayout}>
          {/* Panel Izquierdo: Zonas y Filtro */}
          <div style={styles.sidebarPanel}>
            <div style={styles.panelTitle}>Zonas de Almacenamiento</div>
            <div style={styles.zoneList}>
              <button 
                style={{...styles.zoneBtn, ...(zonaSelected === 'economato' ? styles.activeZoneBtn : {})}}
                onClick={() => setZonaSelected('economato')}
              >
                Economato (Secos y Almacén)
              </button>
              <button 
                style={{...styles.zoneBtn, ...(zonaSelected === 'bodega' ? styles.activeZoneBtn : {})}}
                onClick={() => setZonaSelected('bodega')}
              >
                Bodega (Líquidos y Vinos)
              </button>
              <button 
                style={{...styles.zoneBtn, ...(zonaSelected === 'camaras' ? styles.activeZoneBtn : {})}}
                onClick={() => setZonaSelected('camaras')}
              >
                Cámaras (Fresco / Frío)
              </button>
            </div>

            {/* Formulario Registro de Movimientos */}
            <div style={styles.movimientoCard}>
              <div style={styles.panelTitle}>Registrar Movimiento</div>
              <form onSubmit={handleRegisterMovimiento} style={styles.movForm}>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Ingrediente (Lista Maestra)</label>
                  <div style={{ position: 'relative' }}>
                    <div style={styles.searchWrapper}>
                      <Search size={16} style={styles.searchIcon} />
                      <input 
                        type="text"
                        placeholder="Buscar ingrediente..."
                        value={ingredienteSelected ? ingredienteSelected.nombre : searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIngredienteSelected(null);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        style={styles.searchInput}
                        disabled={submittingMov}
                      />
                      {ingredienteSelected && (
                        <button 
                          type="button" 
                          onClick={() => { setIngredienteSelected(null); setSearchQuery(''); }}
                          style={styles.clearBtn}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {/* Desplegable de autocompletado */}
                    {showDropdown && searchQuery && !ingredienteSelected && (
                      <div style={styles.dropdown}>
                        {filteredIngredientes.slice(0, 5).map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setIngredienteSelected(item);
                              setShowDropdown(false);
                            }}
                            style={styles.dropdownItem}
                          >
                            <span>{item.nombre}</span>
                            <span style={styles.dropdownCategory}>{item.categoria} ({item.unidad_medida})</span>
                          </button>
                        ))}
                        {filteredIngredientes.length === 0 && (
                          <div style={styles.dropdownEmpty}>No se encontraron resultados</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Cantidad {ingredienteSelected && `(${ingredienteSelected.unidad_medida})`}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ej. 2.5"
                    value={cantidadInput}
                    onChange={(e) => setCantidadInput(e.target.value)}
                    style={styles.qtyInput}
                    required
                    disabled={submittingMov}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Tipo de Movimiento</label>
                  <div style={styles.optGroup}>
                    <button
                      type="button"
                      style={{...styles.optBtn, ...(tipoOperacion === 'entrada' ? styles.activeOptEntrada : {})}}
                      onClick={() => setTipoOperacion('entrada')}
                    >
                      <Plus size={16} /> Entrada (+)
                    </button>
                    <button
                      type="button"
                      style={{...styles.optBtn, ...(tipoOperacion === 'salida' ? styles.activeOptSalida : {})}}
                      onClick={() => setTipoOperacion('salida')}
                    >
                      <Minus size={16} /> Salida (-)
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={submittingMov || !ingredienteSelected} style={styles.submitMovBtn}>
                  {submittingMov ? 'Registrando...' : 'Registrar'}
                </button>
              </form>
            </div>
          </div>

          {/* Panel Derecho: Tabla de existencias */}
          <div style={styles.mainPanel}>
            <div style={styles.panelTitle}>Existencias en {zonaSelected.toUpperCase()}</div>

            {loadingData ? (
              <div style={styles.loaderWrapper}>
                <Loader2 size={32} className="spin-animation" color="var(--accent)" />
                <p>Cargando inventario...</p>
              </div>
            ) : stockActivo.length === 0 ? (
              <div style={styles.emptyBox}>
                No hay stock registrado en esta zona. Utiliza el formulario de la izquierda para registrar entradas.
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Ingrediente</th>
                      <th style={styles.th}>Categoría</th>
                      <th style={styles.th}>Cantidad</th>
                      <th style={styles.th}>Última Modificación</th>
                      {isAdmin && <th style={styles.th}>Ajustes</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {stockActivo.map(item => (
                      <tr key={item.id} style={styles.tr}>
                        <td style={{...styles.td, fontWeight: 600}}>{item.ingrediente_nombre}</td>
                        <td style={styles.td}>
                          <span style={styles.categoryBadge}>{item.ingrediente_categoria}</span>
                        </td>
                        <td style={{...styles.td, fontFamily: 'var(--font-mono)', fontWeight: 600}}>
                          {item.cantidad} <span style={{color: 'var(--text-secondary)', fontWeight: 400}}>{item.ingrediente_unidad}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.tdMeta}>
                            <span>Por: {item.usuario_nombre}</span>
                            <span style={styles.timeLabel}>
                              {new Date(item.actualizado_en).toLocaleDateString('es-ES')} a las {new Date(item.actualizado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        {isAdmin && (
                          <td style={styles.td}>
                            <button 
                              onClick={() => {
                                setAjusteStockId(item.id);
                                setAjusteIngredienteNombre(item.ingrediente_nombre || '');
                                setAjusteCantidad(String(item.cantidad));
                                setShowAjusteModal(true);
                              }}
                              style={styles.adjustBtn}
                              title="Ajuste de inventario del administrador"
                            >
                              <Sliders size={14} />
                              Ajustar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. SECCIÓN LISTA MAESTRA (AÑADIR / ELIMINAR INGREDIENTES BASE) */}
      {activeSubTab === 'maestro' && (isProfesor || isAdmin) && (
        <div style={styles.maestroLayout}>
          {/* Panel Izquierdo: Crear ingrediente */}
          <div style={styles.sidebarPanel}>
            <div style={styles.panelTitle}>Añadir Ingrediente Base</div>
            <form onSubmit={handleCreateMaestro} style={styles.movForm}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Nombre del Ingrediente</label>
                <input 
                  type="text" 
                  placeholder="Ej. Harina de trigo media fuerza" 
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  style={styles.qtyInput}
                  required
                  disabled={savingMaestro}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Categoría</label>
                <select 
                  value={nuevaCategoria} 
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  style={styles.selectInput}
                  disabled={savingMaestro}
                >
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Unidad de Medida Estándar</label>
                <select 
                  value={nuevaUnidad} 
                  onChange={(e) => setNuevaUnidad(e.target.value)}
                  style={styles.selectInput}
                  disabled={savingMaestro}
                >
                  <option value="kg">kg (Kilogramo)</option>
                  <option value="l">l (Litro)</option>
                  <option value="ud">ud (Unidades)</option>
                  <option value="bandeja">bandeja</option>
                  <option value="lata">lata</option>
                </select>
              </div>

              <button type="submit" disabled={savingMaestro || !nuevoNombre.trim()} style={styles.submitMovBtn}>
                {savingMaestro ? 'Guardando...' : 'Guardar Ingrediente'}
              </button>
            </form>
          </div>

          {/* Panel Derecho: Listado de ingredientes maestros */}
          <div style={styles.mainPanel}>
            <div style={styles.panelTitle}>Ingredientes Registrados ({listaMaestra.length})</div>
            {listaMaestra.length === 0 ? (
              <div style={styles.emptyBox}>No hay ingredientes creados en la lista maestra.</div>
            ) : (
              <div style={styles.maestroGrid}>
                {listaMaestra.map(item => (
                  <div key={item.id} style={styles.maestroCard}>
                    <div>
                      <div style={styles.maestroCardName}>{item.nombre}</div>
                      <div style={styles.maestroCardMeta}>{item.categoria} • Unidad: {item.unidad_medida}</div>
                    </div>
                    <button 
                      onClick={() => handleDeleteMaestro(item.id, item.nombre)}
                      style={styles.deleteMaestroBtn}
                      title="Eliminar ingrediente base"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SECCIÓN HISTORIAL DE MOVIMIENTOS / AUDITORÍA */}
      {activeSubTab === 'historial' && !isAlumno && (
        <div style={styles.historyLayout}>
          <div style={{ display: 'flex', justifyBetween: 'center', alignItems: 'center', marginBottom: '16px' }}>
            <div style={styles.panelTitle}>Historial de Movimientos de Almacén (Últimos 100)</div>
          </div>

          {loadingHistorial ? (
            <div style={styles.loaderWrapper}>
              <Loader2 size={32} className="spin-animation" color="var(--accent)" />
              <p>Cargando historial de auditoría...</p>
            </div>
          ) : historial.length === 0 ? (
            <div style={styles.emptyBox}>No hay registros de movimientos en el historial.</div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Fecha / Hora</th>
                    <th style={styles.th}>Ingrediente</th>
                    <th style={styles.th}>Zona</th>
                    <th style={styles.th}>Acción</th>
                    <th style={styles.th}>Cant. Anterior</th>
                    <th style={styles.th}>Cant. Nueva</th>
                    <th style={styles.th}>Operario</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(h => {
                    const diff = h.cantidad_nueva - h.cantidad_anterior;
                    return (
                      <tr key={h.id} style={styles.tr}>
                        <td style={styles.td}>
                          {new Date(h.fecha).toLocaleDateString('es-ES')} {new Date(h.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{...styles.td, fontWeight: 600}}>{h.ingrediente_nombre}</td>
                        <td style={{...styles.td, textTransform: 'uppercase', fontSize: '0.75rem'}}>{h.zona}</td>
                        <td style={styles.td}>
                          {h.tipo_operacion === 'entrada' ? (
                            <span style={styles.entryBadge}><Plus size={12} /> ENTRADA</span>
                          ) : h.tipo_operacion === 'salida' ? (
                            <span style={styles.outBadge}><Minus size={12} /> SALIDA</span>
                          ) : (
                            <span style={styles.adjustBadge}><Sliders size={12} /> AJUSTE</span>
                          )}
                        </td>
                        <td style={{...styles.td, fontFamily: 'var(--font-mono)'}}>{h.cantidad_anterior}</td>
                        <td style={{...styles.td, fontFamily: 'var(--font-mono)', fontWeight: 600}}>
                          {h.cantidad_nueva}
                          <span style={{
                            marginLeft: '8px', 
                            fontSize: '0.75rem', 
                            color: diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--text-muted)'
                          }}>
                            ({diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)})
                          </span>
                        </td>
                        <td style={styles.td}>{h.usuario_nombre}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE AJUSTE DIRECTO (SÓLO ADMIN) */}
      {showAjusteModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Ajuste Físico de Stock (Admin)</h3>
              <button onClick={() => setShowAjusteModal(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAjusteDirecto} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Ingrediente</label>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--accent)', marginTop: '4px' }}>
                  {ajusteIngredienteNombre}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nueva Cantidad Física en Stock</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={ajusteCantidad} 
                  onChange={(e) => setAjusteCantidad(e.target.value)} 
                  style={styles.modalInput}
                  required
                />
                <p style={styles.helpText}>Este ajuste modificará directamente la cantidad real en almacén, registrándose en el log de auditoría como un ajuste directo del administrador.</p>
              </div>

              <button type="submit" style={styles.saveBtn}>
                Aplicar Ajuste Físico
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
  stockLayout: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  sidebarPanel: {
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  } as React.CSSProperties,
  mainPanel: {
    flex: '2 1 600px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
  } as React.CSSProperties,
  panelTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '14px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
  } as React.CSSProperties,
  zoneList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  } as React.CSSProperties,
  zoneBtn: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '14px 18px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  activeZoneBtn: {
    borderColor: 'var(--accent)',
    backgroundColor: 'var(--accent-glow)',
    color: 'var(--text-primary)',
    fontWeight: '600',
  } as React.CSSProperties,
  movimientoCard: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
  } as React.CSSProperties,
  movForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as React.CSSProperties,
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  } as React.CSSProperties,
  inputLabel: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  } as React.CSSProperties,
  searchInput: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 36px 10px 36px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
  } as React.CSSProperties,
  clearBtn: {
    position: 'absolute',
    right: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  } as React.CSSProperties,
  dropdown: {
    position: 'absolute',
    top: '42px',
    left: 0,
    right: 0,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 10,
    maxHeight: '200px',
    overflowY: 'auto',
  } as React.CSSProperties,
  dropdownItem: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    borderBottom: '1px solid var(--border-color)',
    transition: 'background var(--transition-fast)',
  } as React.CSSProperties,
  dropdownCategory: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
  } as React.CSSProperties,
  dropdownEmpty: {
    padding: '12px',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    textAlign: 'center',
  } as React.CSSProperties,
  qtyInput: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
  } as React.CSSProperties,
  selectInput: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,
  optGroup: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  optBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  activeOptEntrada: {
    borderColor: 'var(--success)',
    backgroundColor: 'var(--success-glow)',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  activeOptSalida: {
    borderColor: 'var(--accent)',
    backgroundColor: 'var(--accent-glow)',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  submitMovBtn: {
    marginTop: '6px',
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    fontWeight: '600',
    fontSize: '0.9rem',
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
    padding: '30px',
    border: '1px dashed var(--border-color)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  tableContainer: {
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-primary)',
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
  tdMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  } as React.CSSProperties,
  timeLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  categoryBadge: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  } as React.CSSProperties,
  adjustBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  
  // Maestro Layout
  maestroLayout: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  maestroGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
  } as React.CSSProperties,
  maestroCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'border-color var(--transition-fast)',
  } as React.CSSProperties,
  maestroCardName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  maestroCardMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  } as React.CSSProperties,
  deleteMaestroBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '4px',
    transition: 'color var(--transition-fast)',
  } as React.CSSProperties,

  // History Layout
  historyLayout: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
  } as React.CSSProperties,
  entryBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    color: '#34d399',
    border: '1px solid rgba(52, 211, 153, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,
  outBadge: {
    backgroundColor: 'rgba(224, 169, 109, 0.1)',
    color: '#e0a96d',
    border: '1px solid rgba(224, 169, 109, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,
  adjustBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    color: '#60a5fa',
    border: '1px solid rgba(96, 165, 250, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
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

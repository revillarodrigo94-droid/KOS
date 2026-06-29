import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { Usuario, UserRole } from '../types/database.types';
import { UserCheck, UserX, ShieldAlert, Award, Shield, User, Loader2 } from 'lucide-react';

export const AdminUserApproval: React.FC = () => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error.message);
      } else {
        setUsers(data as Usuario[]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (id: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ estado_aprobacion: true })
        .eq('id', id);

      if (error) {
        alert('Error al aprobar usuario: ' + error.message);
      } else {
        // Actualizar lista local
        setUsers(prev => prev.map(u => u.id === id ? { ...u, estado_aprobacion: true } : u));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDenyOrDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario del sistema?')) return;
    setUpdatingId(id);
    try {
      // Al eliminar el registro de la tabla 'usuarios', si tenemos ON DELETE CASCADE,
      // se gestiona la limpieza. Pero para Supabase Auth, lo ideal es que el admin 
      // elimine al usuario. Si no tenemos una función RPC de admin (que requiere service_role),
      // al menos podemos borrar el registro de 'usuarios'.
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Error al eliminar registro: ' + error.message);
      } else {
        setUsers(prev => prev.filter(u => u.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleChangeRole = async (id: string, currentRole: UserRole) => {
    let nextRole: UserRole;
    if (currentRole === 'alumno') nextRole = 'profesor';
    else if (currentRole === 'profesor') nextRole = 'admin';
    else nextRole = 'alumno';

    const confirmChange = window.confirm(`¿Quieres cambiar el rol de este usuario de '${currentRole}' a '${nextRole}'?`);
    if (!confirmChange) return;

    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ rol: nextRole })
        .eq('id', id);

      if (error) {
        alert('Error al actualizar el rol: ' + error.message);
      } else {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, rol: nextRole } : u));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    if (filter === 'pending') return !u.estado_aprobacion;
    if (filter === 'approved') return u.estado_aprobacion;
    return true;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Panel de Aprobación de Usuarios</h2>
          <p style={styles.subtitle}>Gestiona el acceso, aprueba registros y asigna roles en KitchenOS.</p>
        </div>
        
        <div style={styles.filterGroup}>
          <button 
            style={{...styles.filterBtn, ...(filter === 'pending' ? styles.activeFilter : {})}}
            onClick={() => setFilter('pending')}
          >
            Pendientes ({users.filter(u => !u.estado_aprobacion).length})
          </button>
          <button 
            style={{...styles.filterBtn, ...(filter === 'approved' ? styles.activeFilter : {})}}
            onClick={() => setFilter('approved')}
          >
            Aprobados ({users.filter(u => u.estado_aprobacion).length})
          </button>
          <button 
            style={{...styles.filterBtn, ...(filter === 'all' ? styles.activeFilter : {})}}
            onClick={() => setFilter('all')}
          >
            Todos ({users.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.loaderContainer}>
          <Loader2 size={32} className="spin-animation" color="var(--accent)" />
          <p style={{ color: 'var(--text-secondary)' }}>Cargando usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={styles.emptyContainer}>
          <p style={styles.emptyText}>No hay usuarios en esta categoría.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredUsers.map(user => (
            <div key={user.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.userInfo}>
                  <div style={styles.avatar}>
                    {user.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={styles.userName}>{user.nombre} {user.apellidos}</h3>
                    <p style={styles.userEmail}>{user.email}</p>
                  </div>
                </div>
                
                {/* Badge de Rol */}
                <div style={styles.badgeWrapper}>
                  <span style={{
                    ...styles.roleBadge,
                    ...(user.rol === 'admin' ? styles.badgeAdmin : 
                       user.rol === 'profesor' ? styles.badgeProfesor : styles.badgeAlumno)
                  }}>
                    {user.rol === 'admin' ? <Shield size={12} /> : 
                     user.rol === 'profesor' ? <Award size={12} /> : <User size={12} />}
                    {user.rol}
                  </span>
                </div>
              </div>

              <div style={styles.cardMeta}>
                <span style={styles.metaLabel}>Registro:</span>
                <span style={styles.metaValue}>
                  {new Date(user.creado_en).toLocaleDateString('es-ES', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>

              <div style={styles.cardActions}>
                {updatingId === user.id ? (
                  <div style={styles.loaderSmall}>
                    <Loader2 size={18} className="spin-animation" color="var(--accent)" />
                    <span>Actualizando...</span>
                  </div>
                ) : (
                  <>
                    {/* Botón cambiar rol */}
                    <button 
                      onClick={() => handleChangeRole(user.id, user.rol)} 
                      style={styles.actionBtnChangeRole}
                      title="Cambiar rol"
                    >
                      Editar Rol
                    </button>

                    <div style={styles.rightActions}>
                      {/* Botón Aprobar si está pendiente */}
                      {!user.estado_aprobacion && (
                        <button 
                          onClick={() => handleApprove(user.id)} 
                          style={styles.actionBtnApprove}
                          title="Aprobar acceso"
                        >
                          <UserCheck size={16} />
                          Aprobar
                        </button>
                      )}

                      {/* Botón Rechazar / Eliminar */}
                      <button 
                        onClick={() => handleDenyOrDelete(user.id)} 
                        style={styles.actionBtnDeny}
                        title="Eliminar usuario"
                      >
                        <UserX size={16} />
                        {user.estado_aprobacion ? 'Eliminar' : 'Rechazar'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    backgroundColor: 'var(--bg-primary)',
    minHeight: '80vh',
    width: '100%',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '30px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '20px',
  } as React.CSSProperties,
  title: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '6px',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  filterGroup: {
    display: 'flex',
    gap: '6px',
    backgroundColor: 'var(--bg-secondary)',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
  } as React.CSSProperties,
  filterBtn: {
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
  activeFilter: {
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-sm)',
  } as React.CSSProperties,
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    height: '200px',
  } as React.CSSProperties,
  emptyContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '150px',
    border: '1px dashed var(--border-color)',
    borderRadius: 'var(--radius-md)',
  } as React.CSSProperties,
  emptyText: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,
  card: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '16px',
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  } as React.CSSProperties,
  userInfo: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  } as React.CSSProperties,
  avatar: {
    backgroundColor: 'var(--accent-glow)',
    border: '1px solid rgba(224, 169, 109, 0.2)',
    color: 'var(--accent)',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '1.1rem',
  } as React.CSSProperties,
  userName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  userEmail: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  badgeWrapper: {
    marginLeft: '8px',
  } as React.CSSProperties,
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  } as React.CSSProperties,
  badgeAdmin: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    color: '#f87171',
    border: '1px solid rgba(248, 113, 113, 0.2)',
  } as React.CSSProperties,
  badgeProfesor: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    color: '#60a5fa',
    border: '1px solid rgba(96, 165, 250, 0.2)',
  } as React.CSSProperties,
  badgeAlumno: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    color: '#34d399',
    border: '1px solid rgba(52, 211, 153, 0.2)',
  } as React.CSSProperties,
  cardMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '0.8rem',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '12px',
  } as React.CSSProperties,
  metaLabel: {
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  metaValue: {
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  cardActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    marginTop: '6px',
  } as React.CSSProperties,
  loaderSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  actionBtnChangeRole: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  rightActions: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  actionBtnApprove: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--success-glow)',
    border: '1px solid var(--success)',
    color: 'var(--success)',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  actionBtnDeny: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--danger-glow)',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
};

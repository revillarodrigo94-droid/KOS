import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, RefreshCw, GraduationCap, User } from 'lucide-react';

export const WaitingApproval: React.FC = () => {
  const { profile, signOut, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    await refreshProfile();
    // Simulamos un pequeño retraso para la animación
    setTimeout(() => setChecking(false), 800);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <ShieldCheck size={36} color="var(--accent)" />
        </div>
        
        <h1 style={styles.title}>Cuenta bajo revisión</h1>
        
        <p style={styles.description}>
          Hola <strong style={{ color: 'var(--text-primary)' }}>{profile?.nombre} {profile?.apellidos}</strong>. 
          Tu solicitud de acceso con el rol de <span style={styles.roleBadge}>
            {profile?.rol === 'alumno' ? <GraduationCap size={14} /> : <User size={14} />}
            {profile?.rol}
          </span> está pendiente de aprobación por parte de un administrador de **KitchenOS**.
        </p>

        <div style={styles.infoBox}>
          <p>
            Una vez aprobado, tendrás acceso completo a las funciones de tu aula correspondiente. Puedes presionar el botón de abajo para verificar si tu estado ha cambiado.
          </p>
        </div>

        <div style={styles.btnGroup}>
          <button 
            onClick={handleRefresh} 
            disabled={checking} 
            style={styles.refreshBtn}
          >
            <RefreshCw size={16} className={checking ? 'spin-animation' : ''} />
            {checking ? 'Comprobando...' : 'Comprobar Estado'}
          </button>
          
          <button 
            onClick={signOut} 
            style={styles.signOutBtn}
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </div>

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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
    padding: '20px',
  } as React.CSSProperties,
  card: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: 'var(--shadow-lg)',
    textAlign: 'center',
  } as React.CSSProperties,
  iconContainer: {
    backgroundColor: 'var(--accent-glow)',
    padding: '16px',
    borderRadius: '50%',
    width: 'fit-content',
    margin: '0 auto 24px auto',
    border: '1px solid rgba(224, 169, 109, 0.2)',
  } as React.CSSProperties,
  title: {
    fontSize: '1.6rem',
    fontWeight: '700',
    marginBottom: '14px',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,
  description: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '24px',
  } as React.CSSProperties,
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--accent)',
    textTransform: 'uppercase',
    verticalAlign: 'middle',
    marginLeft: '4px',
  } as React.CSSProperties,
  infoBox: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    padding: '16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    textAlign: 'left',
    marginBottom: '30px',
  } as React.CSSProperties,
  btnGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  } as React.CSSProperties,
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    padding: '12px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  signOutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '500',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
};

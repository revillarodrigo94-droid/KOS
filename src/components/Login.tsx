import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, ShieldAlert, KeyRound, Mail, UserPlus, LogIn, User } from 'lucide-react';

export const Login: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [rol, setRol] = useState<'alumno' | 'profesor'>('alumno');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (!email || !password) {
      setError('Por favor, completa todos los campos.');
      setSubmitting(false);
      return;
    }

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message === 'Invalid login credentials' 
            ? 'Credenciales incorrectas. Inténtalo de nuevo.' 
            : signInError.message
          );
        }
      } else {
        if (!nombre || !apellidos) {
          setError('Nombre y apellidos son requeridos.');
          setSubmitting(false);
          return;
        }
        
        const { error: signUpError } = await signUp(email, password, nombre, apellidos, rol);
        if (signUpError) {
          setError(signUpError.message);
        } else {
          setSuccess('Registro solicitado con éxito. Tu cuenta debe ser aprobada por el administrador antes de poder iniciar sesión.');
          setIsLogin(true);
          // Limpiar campos de registro
          setNombre('');
          setApellidos('');
        }
      }
    } catch (err: any) {
      setError('Ha ocurrido un error inesperado. Inténtalo más tarde.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        {/* Encabezado del Logo */}
        <div style={styles.logoHeader}>
          <img src="/logo.png" alt="KitchenOS Logo" style={styles.logoImg} />
          <h1 style={styles.logoText}>Kitchen<span style={{ color: 'var(--accent)' }}>OS</span></h1>
          <p style={styles.logoSub}>Gestión Inteligente de Aulas de Hostelería</p>
        </div>

        {/* Pestanas Login / Registro */}
        <div style={styles.tabContainer}>
          <button 
            style={{...styles.tabButton, ...(isLogin ? styles.activeTab : {})}} 
            onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
            disabled={submitting}
          >
            <LogIn size={16} />
            Iniciar Sesión
          </button>
          <button 
            style={{...styles.tabButton, ...(!isLogin ? styles.activeTab : {})}} 
            onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
            disabled={submitting}
          >
            <UserPlus size={16} />
            Registrarse
          </button>
        </div>

        {/* Alertas */}
        {error && (
          <div style={styles.errorAlert}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={styles.successAlert}>
            <span>{success}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div style={styles.row}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre</label>
                <div style={styles.inputWrapper}>
                  <User size={16} style={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="Ej. Juan" 
                    value={nombre} 
                    onChange={(e) => setNombre(e.target.value)} 
                    style={styles.input}
                    required={!isLogin}
                  />
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Apellidos</label>
                <div style={styles.inputWrapper}>
                  <User size={16} style={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="Ej. Pérez" 
                    value={apellidos} 
                    onChange={(e) => setApellidos(e.target.value)} 
                    style={styles.input}
                    required={!isLogin}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo Electrónico</label>
            <div style={styles.inputWrapper}>
              <Mail size={16} style={styles.inputIcon} />
              <input 
                type="email" 
                placeholder="nombre@centro.edu" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <div style={styles.inputWrapper}>
              <KeyRound size={16} style={styles.inputIcon} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                style={styles.input}
                required
              />
            </div>
          </div>

          {/* Selector de Rol en Registro */}
          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Rol Solicitado</label>
              <div style={styles.roleSelector}>
                <button
                  type="button"
                  style={{
                    ...styles.roleButton, 
                    ...(rol === 'alumno' ? styles.activeRoleAlumno : {})
                  }}
                  onClick={() => setRol('alumno')}
                >
                  <GraduationCap size={18} />
                  <div>
                    <div style={styles.roleName}>Alumno</div>
                    <div style={styles.roleDesc}>Registrar temperaturas, inventario, checklists.</div>
                  </div>
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.roleButton, 
                    ...(rol === 'profesor' ? styles.activeRoleProfesor : {})
                  }}
                  onClick={() => setRol('profesor')}
                >
                  <User size={18} />
                  <div>
                    <div style={styles.roleName}>Profesor</div>
                    <div style={styles.roleDesc}>Gestionar grupos, checklists, evaluación taller.</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting} style={styles.submitBtn}>
            {submitting ? 'Procesando...' : isLogin ? 'Entrar a KitchenOS' : 'Solicitar Registro'}
          </button>
        </form>
      </div>
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
    backgroundColor: '#09090b',
    backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.08) 0%, rgba(0, 0, 0, 0) 60%), radial-gradient(circle at 20% 80%, rgba(245, 158, 11, 0.03) 0%, rgba(0, 0, 0, 0) 50%)',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  } as React.CSSProperties,
  loginCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0px rgba(255, 255, 255, 0.1)',
  } as React.CSSProperties,
  logoHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
    textAlign: 'center',
  } as React.CSSProperties,
  logoImg: {
    height: '120px',
    width: 'auto',
    objectFit: 'contain',
    marginBottom: '14px',
    filter: 'drop-shadow(0 4px 20px rgba(245, 158, 11, 0.25))',
  } as React.CSSProperties,
  logoText: {
    fontSize: '2rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    marginBottom: '4px',
  } as React.CSSProperties,
  logoSub: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  tabContainer: {
    display: 'flex',
    gap: '6px',
    backgroundColor: 'var(--bg-primary)',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    marginBottom: '24px',
  } as React.CSSProperties,
  tabButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    fontSize: '0.85rem',
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
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-sm)',
  } as React.CSSProperties,
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'var(--danger-glow)',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    marginBottom: '20px',
  } as React.CSSProperties,
  successAlert: {
    backgroundColor: 'var(--success-glow)',
    border: '1px solid var(--success)',
    color: 'var(--success)',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    marginBottom: '20px',
    lineHeight: '1.4',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    gap: '12px',
  } as React.CSSProperties,
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
  } as React.CSSProperties,
  label: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  } as React.CSSProperties,
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  } as React.CSSProperties,
  input: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px 12px 42px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
    boxShadow: 'var(--shadow-inner)',
  } as React.CSSProperties,
  roleSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '4px',
  } as React.CSSProperties,
  roleButton: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  activeRoleAlumno: {
    borderColor: 'var(--success)',
    backgroundColor: 'var(--success-glow)',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  activeRoleProfesor: {
    borderColor: 'var(--accent)',
    backgroundColor: 'var(--accent-glow)',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  roleName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    marginBottom: '2px',
  } as React.CSSProperties,
  roleDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  submitBtn: {
    marginTop: '10px',
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-text)',
    padding: '14px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '600',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    boxShadow: 'var(--shadow-sm)',
  } as React.CSSProperties,
};

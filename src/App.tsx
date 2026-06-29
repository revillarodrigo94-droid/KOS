import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { WaitingApproval } from './components/WaitingApproval';
import { AdminUserApproval } from './components/AdminUserApproval';
import { TemperaturasAPPCC } from './components/TemperaturasAPPCC';
import { 
  LogOut, 
  GraduationCap, 
  User, 
  Shield, 
  LayoutDashboard, 
  Users, 
  Thermometer, 
  Package, 
  FileText, 
  CheckSquare, 
  AlertOctagon, 
  TrendingUp,
  Menu,
  X
} from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  // Barra de navegación según rol
  const renderSidebarLinks = () => {
    const isAlumno = profile?.rol === 'alumno';
    const isProfesor = profile?.rol === 'profesor';
    const isAdmin = profile?.rol === 'admin';

    return (
      <>
        <button 
          style={{...styles.navBtn, ...(activeTab === 'dashboard' ? styles.activeNavBtn : {})}}
          onClick={() => { setActiveTab('dashboard'); setMenuOpen(false); }}
        >
          <LayoutDashboard size={18} />
          Dashboard Principal
        </button>

        {/* Módulos comunes / Alumno */}
        {(isAlumno || isProfesor || isAdmin) && (
          <>
            <button 
              style={{...styles.navBtn, ...(activeTab === 'temperaturas' ? styles.activeNavBtn : {})}}
              onClick={() => { setActiveTab('temperaturas'); setMenuOpen(false); }}
            >
              <Thermometer size={18} />
              Registro APPCC
            </button>
            <button 
              style={{...styles.navBtn, ...(activeTab === 'inventario' ? styles.activeNavBtn : {})}}
              onClick={() => { setActiveTab('inventario'); setMenuOpen(false); }}
            >
              <Package size={18} />
              Inventario Activo
            </button>
            <button 
              style={{...styles.navBtn, ...(activeTab === 'briefing' ? styles.activeNavBtn : {})}}
              onClick={() => { setActiveTab('briefing'); setMenuOpen(false); }}
            >
              <FileText size={18} />
              Briefing Servicio
            </button>
            <button 
              style={{...styles.navBtn, ...(activeTab === 'checklists' ? styles.activeNavBtn : {})}}
              onClick={() => { setActiveTab('checklists'); setMenuOpen(false); }}
            >
              <CheckSquare size={18} />
              Checklists Diarios
            </button>
            <button 
              style={{...styles.navBtn, ...(activeTab === 'incidencias' ? styles.activeNavBtn : {})}}
              onClick={() => { setActiveTab('incidencias'); setMenuOpen(false); }}
            >
              <AlertOctagon size={18} />
              Incidencias
            </button>
          </>
        )}

        {/* Módulos de Profesores y Admin */}
        {(isProfesor || isAdmin) && (
          <>
            <button 
              style={{...styles.navBtn, ...(activeTab === 'supervision' ? styles.activeNavBtn : {})}}
              onClick={() => { setActiveTab('supervision'); setMenuOpen(false); }}
            >
              <TrendingUp size={18} />
              Supervisión Taller
            </button>
          </>
        )}

        {/* Solo Admin */}
        {isAdmin && (
          <button 
            style={{...styles.navBtn, ...(activeTab === 'usuarios' ? styles.activeNavBtn : {})}}
            onClick={() => { setActiveTab('usuarios'); setMenuOpen(false); }}
          >
            <Users size={18} />
            Aprobación Usuarios
          </button>
        )}
      </>
    );
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div style={styles.dashboardPlaceholder}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Bienvenido a KitchenOS</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
              Has iniciado sesión como <strong style={{ color: 'var(--text-primary)' }}>{profile?.nombre} {profile?.apellidos}</strong> ({profile?.rol}).
            </p>
            <div className="bento-grid">
              <div className="bento-card active-accent" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Panel en Construcción</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  El Bento Grid Dashboard dinámico para el rol {profile?.rol} se integrará en las próximas fases del plan de desarrollo.
                </p>
              </div>
            </div>
          </div>
        );
      case 'usuarios':
        return <AdminUserApproval />;
      case 'temperaturas':
        return <TemperaturasAPPCC />;
      case 'inventario':
        return <div style={styles.tabPlaceholder}><h2>Inventario Activo y Stock</h2><p>Próximamente en Fase 4.</p></div>;
      case 'briefing':
        return <div style={styles.tabPlaceholder}><h2>Briefing de Elaboraciones y Menú</h2><p>Próximamente en Fase 5.</p></div>;
      case 'checklists':
        return <div style={styles.tabPlaceholder}><h2>Checklists de Jefatura y Limpieza</h2><p>Próximamente en Fase 6.</p></div>;
      case 'incidencias':
        return <div style={styles.tabPlaceholder}><h2>Reporte y Gestión de Incidencias</h2><p>Próximamente en Fase 7.</p></div>;
      case 'supervision':
        return <div style={styles.tabPlaceholder}><h2>Supervisión y Evaluación de Alumnos</h2><p>Próximamente en Fase 7.</p></div>;
      default:
        return <div>Sección no encontrada</div>;
    }
  };

  return (
    <div style={styles.dashboardContainer}>
      {/* HEADER GLOBAL */}
      <header style={styles.header}>
        {/* LOGO IZQUIERDO: Junta de Castilla y León (Consejería de Educación) */}
        <div style={styles.cylLogoContainer}>
          <div style={styles.cylIcon}>JCyL</div>
          <div style={styles.cylText}>
            <div style={{ fontWeight: 700, fontSize: '0.7rem' }}>Junta de</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Castilla y León</div>
          </div>
        </div>

        {/* LOGO CENTRAL: KitchenOS */}
        <div style={styles.appTitle}>
          <span style={styles.appLogoText}>Kitchen<span style={{ color: 'var(--accent)' }}>OS</span></span>
        </div>

        {/* LOGO DERECHO: Centro Educativo & Perfil */}
        <div style={styles.profileContainer}>
          <div style={styles.schoolLogo}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>I.E.S. HOSTELERÍA</span>
          </div>
          
          <div style={styles.userProfile}>
            <div style={styles.userAvatar}>
              {profile?.rol === 'admin' ? <Shield size={16} /> : 
               profile?.rol === 'profesor' ? <User size={16} /> : <GraduationCap size={16} />}
            </div>
            <div style={styles.userInfoText}>
              <div style={styles.userNameText}>{profile?.nombre}</div>
              <div style={styles.userRolText}>{profile?.rol}</div>
            </div>
            <button onClick={signOut} style={styles.logoutBtn} title="Cerrar Sesión">
              <LogOut size={16} />
            </button>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} style={styles.menuMobileBtn}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <div style={styles.mainLayout}>
        {/* SIDEBAR */}
        <aside style={{...styles.sidebar, ...(menuOpen ? styles.sidebarOpen : {})}}>
          <div style={styles.sidebarNav}>
            {renderSidebarLinks()}
          </div>
          <div style={styles.sidebarFooter}>
            Versión 1.0.0 (Beta)
          </div>
        </aside>

        {/* CONTENEDOR DE CONTENIDO */}
        <main style={styles.contentContainer}>
          {renderActiveTabContent()}
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Iniciando KitchenOS...</p>
      </div>
    );
  }

  // 1. Si no está logueado, mostrar pantalla de Login/Registro
  if (!user) {
    return <Login />;
  }

  // 2. Si está logueado pero su cuenta aún no está aprobada por el admin, mostrar pantalla de espera
  if (profile && !profile.estado_aprobacion) {
    return <WaitingApproval />;
  }

  // 3. Si está aprobado, mostrar el Dashboard de KitchenOS
  return <DashboardContent />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = {
  loadingScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
  } as React.CSSProperties,
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--border-color)',
    borderTop: '3px solid var(--accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  } as React.CSSProperties,
  dashboardContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
  } as React.CSSProperties,
  header: {
    height: '64px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  } as React.CSSProperties,
  cylLogoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  cylIcon: {
    backgroundColor: '#b91c1c', // Color corporativo CyL rojo oscuro
    color: '#ffffff',
    fontSize: '0.65rem',
    fontWeight: '800',
    padding: '6px 8px',
    borderRadius: '4px',
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  cylText: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: '1.2',
  } as React.CSSProperties,
  appTitle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  appLogoText: {
    fontSize: '1.3rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
  } as React.CSSProperties,
  profileContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  } as React.CSSProperties,
  schoolLogo: {
    borderRight: '1px solid var(--border-color)',
    paddingRight: '16px',
    display: 'none', // Se muestra en pantallas más grandes
  } as React.CSSProperties,
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  } as React.CSSProperties,
  userAvatar: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    color: 'var(--accent)',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  userInfoText: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: '1.2',
  } as React.CSSProperties,
  userNameText: {
    fontSize: '0.85rem',
    fontWeight: '600',
  } as React.CSSProperties,
  userRolText: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '700',
  } as React.CSSProperties,
  logoutBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all var(--transition-fast)',
  } as React.CSSProperties,
  menuMobileBtn: {
    display: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  } as React.CSSProperties,
  mainLayout: {
    display: 'flex',
    flex: 1,
    height: 'calc(100vh - 64px)',
    overflow: 'hidden',
  } as React.CSSProperties,
  sidebar: {
    width: '260px',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '24px 16px',
    transition: 'transform var(--transition-normal)',
  } as React.CSSProperties,
  sidebarOpen: {
    transform: 'translateX(0)',
  } as React.CSSProperties,
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  } as React.CSSProperties,
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    fontSize: '0.85rem',
    fontWeight: '500',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all var(--transition-fast)',
    width: '100%',
  } as React.CSSProperties,
  activeNavBtn: {
    backgroundColor: 'var(--bg-card)',
    color: 'var(--accent)',
    borderLeft: '2px solid var(--accent)',
    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
  } as React.CSSProperties,
  sidebarFooter: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
  } as React.CSSProperties,
  contentContainer: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: 'var(--bg-primary)',
  } as React.CSSProperties,
  dashboardPlaceholder: {
    padding: '30px',
  } as React.CSSProperties,
  tabPlaceholder: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60%',
  } as React.CSSProperties,
};

// Inyectar animación global de spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    header, aside, main {
      box-sizing: border-box;
    }
    @media (max-width: 768px) {
      /* Estilos responsivos basicos */
      aside {
        position: fixed;
        left: 0;
        bottom: 0;
        top: 64px;
        transform: translateX(-100%);
        z-index: 99;
      }
      .mobile-menu-open aside {
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);
}

import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate         = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-inner">
          <Link to="/dashboard" className="navbar-brand">
            <span className="brand-mark" aria-hidden="true">c</span><span className="brand-word">cifra</span>
          </Link>

          <div className="navbar-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/expenses">Despesas</Link>
            <span className="navbar-divider" aria-hidden="true" />
            <span className="navbar-user">{user?.name}</span>
            <button type="button" className="icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>{theme === 'dark' ? '☀' : '☾'}</button>
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

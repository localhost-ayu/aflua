import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
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
            <span style={{ color: '#d1d5db' }}>|</span>
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>
              {user?.name}
            </span>
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

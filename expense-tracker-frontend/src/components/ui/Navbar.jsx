import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useI18n } from '../../i18n/I18nContext'
import LanguageSelect from './LanguageSelect'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return <nav className="navbar"><div className="container"><div className="navbar-inner">
    <Link to="/dashboard" className="navbar-brand"><span className="brand-mark" aria-hidden="true">a</span><span className="brand-word">aflua</span></Link>
    <div className="navbar-links"><NavLink to="/dashboard">{t('dashboard')}</NavLink><NavLink to="/expenses">{t('expenses')}</NavLink></div>
    <div className="navbar-actions"><span className="navbar-user">{user?.name}</span><LanguageSelect /><button type="button" className="icon-button" onClick={toggleTheme} aria-label={t(theme === 'dark' ? 'lightMode' : 'darkMode')} title={t(theme === 'dark' ? 'lightMode' : 'darkMode')}>{theme === 'dark' ? '☀' : '☾'}</button><button onClick={handleLogout} className="btn btn-secondary btn-sm">{t('logout')}</button></div>
  </div></div></nav>
}

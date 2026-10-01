import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../i18n/I18nContext'
import { useFormErrors } from '../hooks/useFormErrors'
import LanguageSelect from '../components/ui/LanguageSelect'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const { errors, globalError, handleApiError } = useFormErrors()
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    try { await register(name, email, password, passwordConfirmation); navigate('/dashboard') }
    catch (error) { handleApiError(error) }
    finally { setLoading(false) }
  }

  return <div className="auth-wrapper"><div className="auth-card">
    <div className="auth-brand"><span className="brand-mark" aria-hidden="true">a</span><span className="brand-word">aflua</span></div>
    <div className="auth-tools"><LanguageSelect /><button type="button" className="icon-button" onClick={toggleTheme} aria-label={t(theme === 'dark' ? 'lightMode' : 'darkMode')}>{theme === 'dark' ? '☀' : '☾'}</button></div>
    <h1>{t('createAccount')}</h1><p>{t('createSubtitle')}</p>
    {globalError && <div className="alert alert-error" role="alert">{globalError}</div>}
    <form onSubmit={handleSubmit}>
      <div className="form-group"><label htmlFor="name">{t('name')}</label><input id="name" type="text" value={name} onChange={event => setName(event.target.value)} placeholder={t('yourName')} autoComplete="name" required />{errors.name && <span className="error">{errors.name}</span>}</div>
      <div className="form-group"><label htmlFor="email">{t('email')}</label><input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="seu@email.com" autoComplete="email" required />{errors.email && <span className="error">{errors.email}</span>}</div>
      <div className="form-group"><label htmlFor="password">{t('password')}</label><input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={t('minPassword')} autoComplete="new-password" minLength={8} required />{errors.password && <span className="error">{errors.password}</span>}</div>
      <div className="form-group"><label htmlFor="password_confirmation">{t('confirmPassword')}</label><input id="password_confirmation" type="password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} placeholder={t('repeatPassword')} autoComplete="new-password" required />{errors.password_confirmation && <span className="error">{errors.password_confirmation}</span>}</div>
      <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? t('creatingAccount') : t('createAccount')}</button>
    </form>
    <p className="auth-footer">{t('haveAccount')} <Link to="/login">{t('signIn')}</Link></p>
  </div></div>
}

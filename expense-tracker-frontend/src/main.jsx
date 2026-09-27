import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { I18nProvider } from './i18n/I18nContext'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider><ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider></I18nProvider>
    </BrowserRouter>
  </StrictMode>
)

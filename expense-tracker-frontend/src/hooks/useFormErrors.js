import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'

export function useFormErrors() {
  const { t } = useI18n()
  const [errors, setErrors]         = useState({})
  const [globalError, setGlobalError] = useState('')

  function handleApiError(error) {
    // Erro 422 = erros de validação do Laravel (campo a campo)
    if (error.response?.status === 422) {
      const laravelErrors = error.response.data.errors
      // Laravel retorna: { email: ["mensagem"], password: ["mensagem"] }
      // Pegamos só a primeira mensagem de cada campo
      const formatted = Object.fromEntries(
        Object.keys(laravelErrors || {}).map(field => [field, field === 'email' && /credenciais inv.lidas/i.test(laravelErrors[field]?.[0] || '') ? t('invalidCredentials') : t('invalidField')])
      )
      setErrors(formatted)
      setGlobalError('')
    } else {
      // Qualquer outro erro (500, 403, etc.) vira uma mensagem geral
      setGlobalError(
        t('genericError')
      )
      setErrors({})
    }
  }

  function clearErrors() {
    setErrors({})
    setGlobalError('')
  }

  return { errors, globalError, handleApiError, clearErrors }
}

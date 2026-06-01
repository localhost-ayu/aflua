import { useState } from 'react'

export function useFormErrors() {
  const [errors, setErrors]         = useState({})
  const [globalError, setGlobalError] = useState('')

  function handleApiError(error) {
    // Erro 422 = erros de validação do Laravel (campo a campo)
    if (error.response?.status === 422) {
      const laravelErrors = error.response.data.errors
      // Laravel retorna: { email: ["mensagem"], password: ["mensagem"] }
      // Pegamos só a primeira mensagem de cada campo
      const formatted = Object.fromEntries(
        Object.entries(laravelErrors).map(([field, messages]) => [
          field,
          messages[0],
        ])
      )
      setErrors(formatted)
      setGlobalError('')
    } else {
      // Qualquer outro erro (500, 403, etc.) vira uma mensagem geral
      setGlobalError(
        error.response?.data?.message || 'Ocorreu um erro. Tente novamente.'
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
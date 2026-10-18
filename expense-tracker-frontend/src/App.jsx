import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ui/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ExpensesPage from './pages/expenses/ExpensesPage'
import DemoWelcome from './demo/DemoWelcome'

// build de demonstração (VITE_DEMO=true): sem cadastro nem senha, entra-se direto
const DEMO = import.meta.env.VITE_DEMO === 'true'

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={DEMO ? <DemoWelcome /> : <LoginPage />} />
      <Route path="/register" element={DEMO ? <Navigate to="/login" replace /> : <RegisterPage />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />

      <Route path="/expenses" element={
        <ProtectedRoute>
          <ExpensesPage />
        </ProtectedRoute>
      } />

      {/* Redireciona a raiz para o dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
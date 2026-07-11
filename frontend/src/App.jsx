import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import DocumentsPage from './pages/DocumentsPage'
import ChatPage from './pages/ChatPage'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [page, setPage] = useState('chat')

  useEffect(() => {
    function onForcedLogout() {
      setToken(null)
      setPage('chat')
    }
    window.addEventListener('auth:logout', onForcedLogout)
    return () => window.removeEventListener('auth:logout', onForcedLogout)
  }, [])

  function handleLogin(t) {
    localStorage.setItem('token', t)
    setToken(t)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken(null)
    setPage('chat')
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (page === 'documents') {
    return <DocumentsPage onGoToChat={() => setPage('chat')} />
  }

  return <ChatPage onGoToDocuments={() => setPage('documents')} onLogout={handleLogout} />
}

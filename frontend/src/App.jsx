import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import DocumentsPage from './pages/DocumentsPage'
import ChatPage from './pages/ChatPage'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [page, setPage] = useState('chat')

  if (!token) {
    return <LoginPage onLogin={setToken} />
  }

  if (page === 'documents') {
    return <DocumentsPage token={token} onGoToChat={() => setPage('chat')} />
  }

  return <ChatPage token={token} onGoToDocuments={() => setPage('documents')} />
}

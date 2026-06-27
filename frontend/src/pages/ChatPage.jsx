import { useState, useEffect, useRef } from 'react'
import { createSession, sendMessage, getMessages } from '../api/chat'

export default function ChatPage({ token, onGoToDocuments }) {
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    initSession()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function initSession() {
    try {
      const session = await createSession(token)
      setSessionId(session.id)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || !sessionId || loading) return

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await sendMessage(sessionId, input, token)
      const assistantMsg = {
        role: 'assistant',
        content: res.answer,
        sources: res.sources
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error getting response.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>🔧 Maintenance Copilot</h2>
        <button onClick={onGoToDocuments} style={btnStyle}>📄 Documents</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {messages.length === 0 && (
          <p style={{ color: '#666', textAlign: 'center', marginTop: 60 }}>
            Ask a question about your uploaded manuals.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 16
          }}>
            <div style={{
              maxWidth: '75%', padding: '12px 16px', borderRadius: 12,
              backgroundColor: msg.role === 'user' ? '#1a1a1a' : '#f5f5f5',
              color: msg.role === 'user' ? 'white' : '#1a1a1a'
            }}>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <p style={{ margin: '8px 0 0', fontSize: 11, opacity: 0.6 }}>
                  Sources: {msg.sources.map(s => `Page ${s.page_number}`).join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: '#f5f5f5', color: '#666' }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', gap: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question about your manuals..."
          style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15 }}
        />
        <button type="submit" disabled={loading} style={btnStyle}>Send</button>
      </form>
    </div>
  )
}

const btnStyle = {
  padding: '10px 20px', backgroundColor: '#1a1a1a', color: 'white',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14
}

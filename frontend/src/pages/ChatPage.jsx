import { useState, useEffect, useRef } from 'react'
import { createSession, sendMessage, getMessages, getSessions } from '../api/chat'
import { listDocuments } from '../api/documents'

function groupSessionsByDate(sessions) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today - 86400000)
  const sevenDaysAgo = new Date(today - 7 * 86400000)
  const groups = { Today: [], Yesterday: [], 'Previous 7 days': [], Older: [] }
  for (const s of sessions) {
    const d = new Date(s.created_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day >= today) groups.Today.push(s)
    else if (day >= yesterday) groups.Yesterday.push(s)
    else if (day >= sevenDaysAgo) groups['Previous 7 days'].push(s)
    else groups.Older.push(s)
  }
  return groups
}

export default function ChatPage({ token, onGoToDocuments, onLogout }) {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => { init(); loadDocuments() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function init() {
    try {
      const list = await getSessions(token)
      setSessions(list)
      if (list.length > 0) {
        const latest = list[0]
        setSessionId(latest.id)
        const msgs = await getMessages(latest.id, token)
        setMessages(msgs)
      } else {
        const session = await createSession(token)
        setSessions([session])
        setSessionId(session.id)
      }
    } catch (err) { console.error(err) }
  }

  async function loadDocuments() {
    try {
      const docs = await listDocuments(token)
      setDocuments(docs)
    } catch (err) { console.error(err) }
  }

  async function handleNewChat() {
    try {
      const session = await createSession(token)
      setSessions(prev => [session, ...prev])
      setSessionId(session.id)
      setMessages([])
    } catch (err) { console.error(err) }
  }

  async function handleSelectSession(id) {
    if (id === sessionId) return
    setSessionId(id)
    setMessages([])
    try {
      const msgs = await getMessages(id, token)
      setMessages(msgs)
    } catch (err) { console.error(err) }
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
      setMessages(prev => [...prev, { role: 'assistant', content: res.answer, sources: res.sources }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error getting response.' }])
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
  }

  const groupedSessions = groupSessionsByDate(sessions)

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">⚙</span>
          <div className="sidebar-logo-title">Maintenance Copilot</div>
        </div>

        <button className="new-chat-btn" onClick={handleNewChat}>
          <span className="new-chat-icon">+</span>
          New conversation
        </button>

        <div className="session-list">
          {Object.entries(groupedSessions).map(([group, items]) =>
            items.length > 0 && (
              <div key={group} className="session-group">
                <div className="session-group-label">{group}</div>
                {items.map(s => (
                  <button
                    key={s.id}
                    className={`session-item${s.id === sessionId ? ' active' : ''}`}
                    onClick={() => handleSelectSession(s.id)}
                  >
                    <span className="session-title">{s.title}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        <div style={{ flex: 1 }} />

        <div className="sidebar-docs">
          <div className="sidebar-section-label">Documents</div>
          {documents.length === 0 ? (
            <div className="doc-empty">No documents uploaded</div>
          ) : (
            documents.slice(0, 3).map(doc => (
              <div key={doc.id} className="doc-item">
                <span className={`doc-status-dot${doc.status === 'ready' ? ' ready' : ' processing'}`} />
                <span className="doc-title">{doc.title}</span>
              </div>
            ))
          )}
          <button className="upload-btn" onClick={onGoToDocuments}>
            + Upload document
          </button>
        </div>

        <button className="signout-btn" onClick={onLogout}>
          Sign out
        </button>
      </aside>

      {/* Chat area */}
      <main className="chat-main">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚙</div>
              <div className="empty-title">Maintenance Copilot</div>
              <div className="empty-subtitle">
                Upload a maintenance manual and ask questions about it. I'll find the relevant information and cite the exact page.
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="message-row">
                {msg.role === 'user' ? (
                  <div className="message-user-wrap">
                    <div className="message-user">{msg.content}</div>
                  </div>
                ) : (
                  <div className="message-assistant-wrap">
                    <div className="assistant-avatar">⚙</div>
                    <div className="message-assistant-body">
                      <div className="message-assistant">{msg.content}</div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="sources">
                          {[...new Set(msg.sources.map(s => s.page_number))].map(page => (
                            <span key={page} className="source-chip">Page {page}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="message-row">
              <div className="message-assistant-wrap">
                <div className="assistant-avatar">⚙</div>
                <div className="loading-dots">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="dot" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <div className="input-wrap">
            <textarea
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your manuals..."
              rows={1}
            />
            <button
              className={`send-btn${input.trim() ? ' active' : ''}`}
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              ↑
            </button>
          </div>
          <div className="input-hint">Enter to send · Shift+Enter for new line</div>
        </div>
      </main>
    </div>
  )
}

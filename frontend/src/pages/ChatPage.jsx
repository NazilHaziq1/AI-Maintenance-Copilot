import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { createSession, sendMessage, getMessages, getSessions } from '../api/chat'
import { listDocuments } from '../api/documents'

const SUGGESTIONS = [
  { icon: '🔧', text: 'What are the routine maintenance steps?' },
  { icon: '⚠️', text: 'List the safety precautions in the manual' },
  { icon: '🔍', text: 'How do I troubleshoot a common fault?' },
  { icon: '📋', text: 'Summarize the key specifications' },
]

function groupSessionsByDate(sessions) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today - 86400000)
  const sevenDaysAgo = new Date(today - 7 * 86400000)
  const groups = { Today: [], Yesterday: [], 'Previous 7 days': [], Older: [] }
  for (const s of sessions) {
    const d = new Date(s.created_at)
    if (isNaN(d)) { groups.Today.push(s); continue }
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day >= today) groups.Today.push(s)
    else if (day >= yesterday) groups.Yesterday.push(s)
    else if (day >= sevenDaysAgo) groups['Previous 7 days'].push(s)
    else groups.Older.push(s)
  }
  return groups
}

function sessionLabel(session) {
  if (session.title && session.title !== 'New Chat') return session.title
  return session.firstMessage || 'New conversation'
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }
  return (
    <button className="msg-action-btn" onClick={copy} title="Copy message">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

export default function ChatPage({ onGoToDocuments, onLogout }) {
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [backendDown, setBackendDown] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const activeSessionRef = useRef(null)
  const initRan = useRef(false)

  useEffect(() => {
    if (initRan.current) return
    initRan.current = true
    init()
    loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Keep the composer height in sync with its content
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [])

  useEffect(() => { resizeTextarea() }, [input, resizeTextarea])

  async function init() {
    try {
      const list = await getSessions()
      setSessions(list)
      setBackendDown(false)
      if (list.length > 0) {
        selectSession(list[0].id)
      }
    } catch (err) {
      if (!err.response) setBackendDown(true)
      console.error(err)
    }
  }

  async function loadDocuments() {
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch (err) { console.error(err) }
  }

  function handleNewChat() {
    // A session is only created on the backend when the first message is sent,
    // so empty "New Chat" rows never pile up.
    setSessionId(null)
    activeSessionRef.current = null
    setMessages([])
    setSidebarOpen(false)
    textareaRef.current?.focus()
  }

  async function selectSession(id) {
    if (id === activeSessionRef.current) return
    activeSessionRef.current = id
    setSessionId(id)
    setMessages([])
    setSidebarOpen(false)
    try {
      const msgs = await getMessages(id)
      if (activeSessionRef.current === id) setMessages(msgs)
    } catch (err) { console.error(err) }
  }

  async function submitMessage(text) {
    const content = text.trim()
    if (!content || loading) return

    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content }])

    try {
      let id = sessionId
      if (!id) {
        const session = await createSession()
        id = session.id
        activeSessionRef.current = id
        setSessionId(id)
        setSessions(prev => [{ ...session, firstMessage: content }, ...prev])
      } else {
        setSessions(prev => prev.map(s =>
          s.id === id && !s.firstMessage && (!s.title || s.title === 'New Chat')
            ? { ...s, firstMessage: content }
            : s
        ))
      }
      const res = await sendMessage(id, content)
      setBackendDown(false)
      if (activeSessionRef.current === id || activeSessionRef.current === null) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.answer, sources: res.sources }])
      }
    } catch (err) {
      console.error(err)
      const detail = err.response?.data?.detail
      if (!err.response) setBackendDown(true)
      setMessages(prev => [...prev, {
        role: 'assistant',
        error: true,
        content: detail || (err.response
          ? 'Something went wrong while generating a response. Please try again.'
          : 'Could not reach the server. Make sure the backend is running, then try again.'),
        retryText: content,
      }])
    }
    setLoading(false)
  }

  function handleSend(e) {
    e?.preventDefault()
    submitMessage(input)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submitMessage(input)
    }
  }

  function handleRetry(msg) {
    setMessages(prev => prev.filter(m => m !== msg))
    submitMessage(msg.retryText)
  }

  const groupedSessions = groupSessionsByDate(sessions)
  const hasReadyDocs = documents.some(d => d.status === 'ready')

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">⚙</span>
          <div className="sidebar-logo-title">Maintenance Copilot</div>
        </div>

        <button className="new-chat-btn" onClick={handleNewChat}>
          <span className="new-chat-icon">+</span>
          New conversation
        </button>

        <div className="session-list">
          {sessions.length === 0 && (
            <div className="doc-empty">No conversations yet</div>
          )}
          {Object.entries(groupedSessions).map(([group, items]) =>
            items.length > 0 && (
              <div key={group} className="session-group">
                <div className="session-group-label">{group}</div>
                {items.map(s => (
                  <button
                    key={s.id}
                    className={`session-item${s.id === sessionId ? ' active' : ''}`}
                    onClick={() => selectSession(s.id)}
                  >
                    <span className="session-title">{sessionLabel(s)}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        <div className="sidebar-docs">
          <div className="sidebar-section-label">Documents</div>
          {documents.length === 0 ? (
            <div className="doc-empty">No documents uploaded</div>
          ) : (
            documents.slice(0, 3).map(doc => (
              <div key={doc.id} className="doc-item" title={doc.title}>
                <span className={`doc-status-dot${doc.status === 'ready' ? ' ready' : ' processing'}`} />
                <span className="doc-title">{doc.title}</span>
              </div>
            ))
          )}
          <button className="upload-btn" onClick={onGoToDocuments}>
            + Manage documents
          </button>
        </div>

        <button className="signout-btn" onClick={onLogout}>
          Sign out
        </button>
      </aside>

      {/* Chat area */}
      <main className="chat-main">
        <header className="chat-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
          <span className="chat-header-title">Maintenance Copilot</span>
        </header>

        {backendDown && (
          <div className="banner-warning">
            ⚠ Can’t reach the backend server. Start it locally, then refresh.
          </div>
        )}

        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚙</div>
              <div className="empty-title">How can I help with your equipment?</div>
              <div className="empty-subtitle">
                {hasReadyDocs
                  ? 'Ask anything about your uploaded manuals. Answers include page citations.'
                  : 'Upload a maintenance manual first, then ask questions about it — I’ll cite the exact pages.'}
              </div>
              {!hasReadyDocs && (
                <button className="empty-upload-btn" onClick={onGoToDocuments}>
                  Upload a manual
                </button>
              )}
              {hasReadyDocs && (
                <div className="suggestions">
                  {SUGGESTIONS.map(s => (
                    <button key={s.text} className="suggestion-card" onClick={() => submitMessage(s.text)}>
                      <span className="suggestion-icon">{s.icon}</span>
                      <span>{s.text}</span>
                    </button>
                  ))}
                </div>
              )}
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
                      {msg.error ? (
                        <div className="message-error">
                          <div>{msg.content}</div>
                          {msg.retryText && (
                            <button className="retry-btn" onClick={() => handleRetry(msg)}>
                              ↻ Retry
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="message-assistant markdown-body">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="sources">
                              <span className="sources-label">Sources:</span>
                              {[...new Set(msg.sources.map(s => s.page_number))].map(page => (
                                <span key={page} className="source-chip">Page {page}</span>
                              ))}
                            </div>
                          )}
                          <div className="msg-actions">
                            <CopyButton text={msg.content} />
                          </div>
                        </>
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
                <div className="message-assistant-body">
                  <div className="thinking-label">Searching your manuals…</div>
                  <div className="loading-dots">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="dot" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <form className="input-wrap" onSubmit={handleSend}>
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your manuals…"
              rows={1}
            />
            <button
              type="submit"
              className={`send-btn${input.trim() && !loading ? ' active' : ''}`}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              ↑
            </button>
          </form>
          <div className="input-hint">Enter to send · Shift+Enter for new line · Answers cite manual pages</div>
        </div>
      </main>
    </div>
  )
}

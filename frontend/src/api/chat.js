import client from './client'

export async function getSessions() {
  const res = await client.get('/chat/sessions')
  return res.data
}

export async function createSession(title = 'New Chat') {
  const res = await client.post('/chat/sessions', { title })
  return res.data
}

export async function sendMessage(sessionId, content) {
  const res = await client.post(`/chat/sessions/${sessionId}/messages`, { content })
  return res.data
}

export async function getMessages(sessionId) {
  const res = await client.get(`/chat/sessions/${sessionId}/messages`)
  return res.data
}

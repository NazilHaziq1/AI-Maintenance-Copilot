import client from './client'

export async function uploadDocument(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await client.post('/documents/upload', form)
  return res.data
}

export async function listDocuments() {
  const res = await client.get('/documents')
  return res.data
}

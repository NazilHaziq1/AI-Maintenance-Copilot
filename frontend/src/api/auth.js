import client from './client'

export async function login(email, password) {
  const form = new FormData()
  form.append('username', email)
  form.append('password', password)
  const res = await client.post('/auth/login', form)
  return res.data.access_token
}

export async function register(email, name, password) {
  const res = await client.post('/auth/register', { email, name, password })
  return res.data
}

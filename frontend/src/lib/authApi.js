const API_PREFIX = '/api'

async function getJson(path) {
  const res = await fetch(`${API_PREFIX}${path}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data.detail || data.message || `Request failed (${res.status})`
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
  return data
}

async function postJson(path, body) {
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data.detail || data.message || `Request failed (${res.status})`
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
  return data
}

export function login(payload) {
  return postJson('/auth/login', payload)
}

export function signup(payload) {
  return postJson('/auth/signup', payload)
}

export function forgotPassword(payload) {
  return postJson('/auth/forgot-password', payload)
}

export function getUsers() {
  return getJson('/auth/users')
}

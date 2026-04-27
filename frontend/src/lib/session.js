const SESSION_KEY = 'sfms_session'
const SESSION_EVENT = 'sfms-session-changed'

function notifySessionChanged() {
  window.dispatchEvent(new Event(SESSION_EVENT))
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function getToken() {
  const session = getSession()
  return session?.token || null
}

export function saveSession(user, token) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }))
  notifySessionChanged()
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  notifySessionChanged()
}

export function onSessionChange(listener) {
  window.addEventListener(SESSION_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(SESSION_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}

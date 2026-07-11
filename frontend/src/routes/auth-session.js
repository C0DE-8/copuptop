const clearAuthTokens = () => {
  localStorage.removeItem('copup_access_token')
  localStorage.removeItem('copup_refresh_token')
}

const isTokenExpired = (token) => {
  try {
    const payloadSegment = token.split('.')[1]
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(window.atob(padded))
    const expiresAt = Number(payload.exp || 0) * 1000

    return !expiresAt || expiresAt <= Date.now()
  } catch {
    return true
  }
}

export const isAuthenticated = () => {
  const token = localStorage.getItem('copup_access_token')

  if (!token || isTokenExpired(token)) {
    clearAuthTokens()
    return false
  }

  return true
}

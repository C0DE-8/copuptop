import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:1159/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('copup_access_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      localStorage.removeItem('copup_access_token')
      localStorage.removeItem('copup_refresh_token')
      localStorage.removeItem('copup_user')
    }

    return Promise.reject(error)
  },
)

export default apiClient

import apiClient from './axios'

export const getWallet = async () => {
  const response = await apiClient.get('/wallet')
  return response.data
}

export const getBalance = async () => {
  const response = await apiClient.get('/wallet')
  return response.data
}

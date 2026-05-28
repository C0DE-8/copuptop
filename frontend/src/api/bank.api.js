import apiClient from './axios'

export const transferToUser = async (payload) => {
  const response = await apiClient.post('/wallet/transfer', payload)
  return response.data
}

export const transferToBank = async (payload) => {
  const response = await apiClient.post('/bank/transfer', payload)
  return response.data
}

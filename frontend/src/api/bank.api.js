import apiClient from './axios'

export const transferToUser = async (payload) => {
  const response = await apiClient.post('/wallet/transfer', payload)
  return response.data
}

export const getBanks = async (country = 'NG') => {
  const response = await apiClient.get('/bank/banks', { params: { country } })
  return response.data
}

export const resolveBankAccount = async (payload) => {
  const response = await apiClient.post('/bank/resolve-account', payload)
  return response.data
}

export const transferToBank = async (payload) => {
  const response = await apiClient.post('/bank/transfer', payload)
  return response.data
}

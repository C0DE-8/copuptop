import apiClient from './axios'

export const getTransactions = async () => {
  const response = await apiClient.get('/wallet/ledger')
  return response.data
}

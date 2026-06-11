import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

const api = axios.create({ 
  baseURL: BASE_URL, 
  withCredentials:true, 
   
})
console.log("Through interceptor")
api.interceptors.response.use(
  
  
 response => {
    
    return response
  },

  async error => {
  const original = error.config


  if (error.response?.status === 401 &&
      error.response?.data?.expired === true &&
      !original._retry) {

    original._retry = true

    try {
      //const refreshResult = await api.post('/auth/refresh')
      return api(original)

    } catch (refreshError) {
      window.location.href = '/login'
      return Promise.reject(refreshError)   // reject with refresh error, not original
    }
  }

  console.warn("⚠️ 401 but NOT retrying — expired flag?", error.response?.data?.expired)
  return Promise.reject(error)
}
)

const authAPI = {
    login: (credentials: { email: string; password: string }) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
}

export {authAPI}
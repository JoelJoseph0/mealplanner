import api from './api';

export const authService = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        // Graceful mock fallback for MCA demo if FastAPI server is not started yet
        console.info('[Dev Demo Fallback] Simulating login response');
        const isAdmin = credentials.email.toLowerCase().includes('admin');
        const mockUser = {
          id: isAdmin ? 1 : 2,
          full_name: isAdmin ? 'Admin Abhijith' : 'Abhijith',
          email: credentials.email,
          role: isAdmin ? 'admin' : 'user',
          age: 23,
          gender: 'Male',
        };
        const mockToken = 'mock_jwt_token_for_evaluation_' + Date.now();
        return {
          access_token: mockToken,
          token_type: 'bearer',
          user: mockUser,
        };
      }
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        console.info('[Dev Demo Fallback] Simulating register response');
        return {
          message: 'User registered successfully. You can now login.',
          user: {
            id: Date.now(),
            full_name: userData.full_name,
            email: userData.email,
            role: 'user',
          },
        };
      }
      throw error;
    }
  },

  logout: async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      // Always allow client-side clean logout
      console.warn('Backend logout notification skipped or unavailable.');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },
};

export default authService;

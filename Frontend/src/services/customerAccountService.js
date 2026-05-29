import axiosClient from '../api/axiosClient';
import useAuthStore from '../store/useAuthStore';

const updateStoredUser = (userData) => {
  useAuthStore.getState().setUser(userData);
};

export const customerAccountService = {
  getMe: async () => {
    return await axiosClient.get('/users/me');
  },

  updateMe: async (payload) => {
    const response = await axiosClient.put('/users/me', payload);
    const updatedUser = response?.data || response;
    updateStoredUser(updatedUser);
    return updatedUser;
  },

  changePassword: async (currentPassword, newPassword) => {
    return await axiosClient.put('/users/me/change-password', {
      currentPassword,
      newPassword,
    });
  },
};

import axiosClient from '../api/axiosClient';

const apiClient = {
  get: (...args) => axiosClient.get(...args),
  post: (...args) => axiosClient.post(...args),
  put: (...args) => axiosClient.put(...args),
  delete: (...args) => axiosClient.delete(...args),
};

export default apiClient;

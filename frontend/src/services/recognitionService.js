import api from './api';

export const recognitionService = {
  predictFood: async (file, onUploadProgress, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('add_to_pantry', options.addToPantry ? 'true' : 'false');

    const response = await api.post('/recognition/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
      timeout: 60000,
    });
    return response.data?.data ?? response.data;
  },
};

export default recognitionService;

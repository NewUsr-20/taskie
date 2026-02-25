import axios from 'axios';

// Point this to your api-gateway URL
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_GATEWAY_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add interceptors here later for JWT authentication tokens

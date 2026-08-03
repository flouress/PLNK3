import axios from 'axios';
import { getToken } from './auth.js';

// Base URL - di development pakai proxy Vite, di production pakai env variable
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

/**
 * Login ke sistem
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{success: boolean, message: string, username: string}>}
 */
export async function login(username, password) {
  const response = await api.post('/api/auth/login', { username, password });
  return response.data;
}

/**
 * Ambil data PSA dengan optional filter
 * @param {object} filters - { startDate, endDate, month }
 */
export async function fetchPsa(filters = {}) {
  const params = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.month) params.month = filters.month;
  if (filters.year) params.year = filters.year;

  const response = await api.get('/api/psa', { params });
  return response.data;
}

/**
 * Ambil data CVV dengan optional filter
 * @param {object} filters - { startDate, endDate, month }
 */
export async function fetchCvv(filters = {}) {
  const params = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.month) params.month = filters.month;
  if (filters.year) params.year = filters.year;

  const response = await api.get('/api/cvv', { params });
  return response.data;
}

/**
 * Ambil data Brosur
 */
export async function fetchBrosur(filters = {}) {
  const params = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.month) params.month = filters.month;
  if (filters.year) params.year = filters.year;

  const response = await api.get('/api/brosur', { params });
  return response.data;
}

/**
 * Ambil data Ranking
 */
export async function fetchRanking(filters = {}) {
  const params = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.month) params.month = filters.month;
  if (filters.year) params.year = filters.year;

  const response = await api.get('/api/ranking', { params });
  return response.data;
}

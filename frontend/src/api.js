import axios from 'axios';

// Base URL - di development pakai proxy Vite, di production pakai env variable
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

  const response = await api.get('/api/cvv', { params });
  return response.data;
}

/**
 * Ambil data Brosur
 */
export async function fetchBrosur() {
  const response = await api.get('/api/brosur');
  return response.data;
}

/**
 * Ambil data Ranking
 */
export async function fetchRanking() {
  const response = await api.get('/api/ranking');
  return response.data;
}

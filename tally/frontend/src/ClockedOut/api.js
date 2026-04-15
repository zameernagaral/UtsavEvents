import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
const BASE = `${API_URL}/api/clockedout`;

export const login = (username, password) =>
  axios.post(`${BASE}/login`, { username, password });

export const getScores = (round) =>
  axios.get(`${BASE}/scores/${round}`);

export const addScore = (team, round, score) =>
  axios.post(`${BASE}/scores`, { team, round, score });

export const deleteScore = (round, team) =>
  axios.delete(`${BASE}/scores/${round}/${encodeURIComponent(team)}`);

export const getTop15 = () =>
  axios.get(`${BASE}/scores/finals/top15`);
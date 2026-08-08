import axios from 'axios';
import { env } from '@/env.mjs';

/**
 * Client HTTP pour l'API Bible (lecture seule, externe).
 * Pas d'authentification ni de cookies — l'API est publique.
 * TODO(spec 22): ajouter un intercepteur 401 quand le compte-sync lands.
 */
const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  // Pas de withCredentials : API publique en lecture seule.
});

export default apiClient;
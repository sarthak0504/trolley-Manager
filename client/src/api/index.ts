import axios from 'axios';
import { getAuth } from 'firebase/auth';

// Change this to your server URL when deploying
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000';

export const api = axios.create({ baseURL: SERVER_URL });

// Attach the Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = getAuth().currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

import axios from "axios";
import { useAuth } from "../store/auth";

// Single axios instance for the whole app. Keeping this here (separate from the
// UI) means a changed endpoint or header only ever needs editing in one place.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
  headers: { "Content-Type": "application/json" },
});

// Attach the JWT to every outgoing request, if we have one.
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the server says the token is invalid/expired, clear the session.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) useAuth.getState().logout();
    return Promise.reject(error);
  }
);

// Turn any thrown request error into a clean, user-facing message.
// Reads the backend's { error } body when present; otherwise a sensible default.
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const serverMsg = (err.response?.data as { error?: string } | undefined)?.error;
    if (serverMsg) return serverMsg;
    if (err.code === "ERR_NETWORK") {
      return "Can't reach the server. Is the backend running on port 4000?";
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

import { create } from "zustand";
import { authAPI } from "@/features/auth/services/authAPI";

// Función auxiliar para leer desde localStorage en la inicialización
const getInitialState = () => {
  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");
  
  if (token && savedUser) {
    try {
      return { user: JSON.parse(savedUser), isAuthenticated: true };
    } catch (e) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }
  return { user: null, isAuthenticated: false };
};

const initialState = getInitialState();

export const useAuthStore = create((set, get) => ({
  user: initialState.user,
  isAuthenticated: initialState.isAuthenticated,
  loading: false, // Empezamos en false porque Zustand se inicializa síncronamente

  login: async (email, password) => {
    try {
      set({ loading: true });
      const response = await authAPI.login({ email, password });
      const { access_token, refresh_token, user: userData } = response.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("user", JSON.stringify(userData));
      
      set({ user: userData, isAuthenticated: true, loading: false });
      return userData;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    set({ user: null, isAuthenticated: false });
  },

  isAdmin: () => {
    return get().user?.role === "admin";
  },
}));

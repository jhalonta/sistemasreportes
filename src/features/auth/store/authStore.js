import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const userProfile = ref(null);
  const loading = ref(true);
  const error = ref(null);
  
  // Initialize auth state listener
  authService.onAuthStateChanged(async (currentUser) => {
    user.value = currentUser;
    if (currentUser) {
      try {
        userProfile.value = await userService.getUserProfile(currentUser.uid);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    } else {
      userProfile.value = null;
    }
    loading.value = false;
  });

  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      await authService.login(email, password);
    } catch (err) {
      console.error('Error logging in:', err);
      // User friendly error messages
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        error.value = 'Correo electrónico o contraseña incorrectos.';
      } else {
        error.value = 'Ocurrió un error al intentar iniciar sesión. Por favor, intente de nuevo.';
      }
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    loading.value = true;
    error.value = null;
    try {
      await authService.logout();
    } catch (err) {
      console.error('Error logging out:', err);
      error.value = 'Error al cerrar sesión.';
    } finally {
      loading.value = false;
    }
  };

  return {
    user,
    userProfile,
    loading,
    error,
    login,
    logout
  };
});

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const userProfile = ref(null);
  const loading = ref(true);
  const error = ref(null);
  
  // Promise to wait for initialization
  let resolveInit;
  const initialized = new Promise((resolve) => {
    resolveInit = resolve;
  });

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
    resolveInit();
  });

  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await authService.login(email, password);
      const currentUser = response.user;
      
      // Explicitly load profile to ensure it's available before returning
      const profile = await userService.getUserProfile(currentUser.uid);
      
      if (!profile) {
        // If the user exists in Auth but not in Firestore, we should NOT let them in
        // as they would be "Invitado"
        await authService.logout();
        user.value = null;
        userProfile.value = null;
        error.value = 'Su usuario no tiene un perfil configurado en el sistema. Contacte al administrador.';
        throw new Error('Sin perfil configurado');
      }

      user.value = currentUser;
      userProfile.value = profile;
      return profile;
    } catch (err) {
      if (err.message === 'Sin perfil configurado') throw err;

      console.error('Error logging in:', err);
      // User friendly error messages
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        error.value = 'Correo electrónico o contraseña incorrectos.';
      } else if (err.code === 'auth/too-many-requests') {
        error.value = 'Demasiados intentos fallidos. Intente más tarde.';
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
    initialized,
    error,
    login,
    logout
  };
});

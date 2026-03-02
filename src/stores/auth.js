import { defineStore } from 'pinia';
import { ref } from 'vue';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const loading = ref(true);
  const error = ref(null);
  
  // Let the app know we are checking state immediately
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser;
    loading.value = false;
  });

  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // user stat is updated by onAuthStateChanged automatically
    } catch (err) {
      console.error('Error logging in:', err);
      // Provide user friendly error messages
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
      await signOut(auth);
    } catch (err) {
      console.error('Error logging out:', err);
      error.value = 'Error al cerrar sesión.';
    } finally {
      loading.value = false;
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout
  };
});

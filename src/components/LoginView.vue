<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const email = ref('');
const password = ref('');
const authStore = useAuthStore();

const handleLogin = async () => {
  if (!email.value || !password.value) return;
  try {
    await authStore.login(email.value, password.value);
  } catch (err) {
    // Errors handled internally by authStore
  }
};
</script>

<template>
  <div class="login-container">
    <div class="login-card glass">
      <div class="login-header">
        <div class="logo-wrapper">
          <span class="logo-icon">📊</span>
        </div>
        <h2 class="title">Bienvenido</h2>
        <p class="subtitle">Sistemas & Reportes</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="authStore.error" class="error-msg">
          {{ authStore.error }}
        </div>

        <div class="input-group">
          <label for="email">Correo Electrónico</label>
          <input 
            id="email" 
            type="email" 
            v-model="email" 
            placeholder="admin@admin.com" 
            required
            :disabled="authStore.loading"
          />
        </div>

        <div class="input-group">
          <label for="password">Contraseña</label>
          <input 
            id="password" 
            type="password" 
            v-model="password" 
            placeholder="••••••••" 
            required
            :disabled="authStore.loading"
          />
        </div>

        <button type="submit" class="btn-login" :disabled="authStore.loading">
          <span v-if="authStore.loading" class="spinner"></span>
          <span v-else>Ingresar al Sistema</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-main);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2.5rem 2rem;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.login-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.logo-wrapper {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
}

.title {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

.subtitle {
  color: var(--text-sub);
  font-size: 0.95rem;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.input-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-sub);
  margin-left: 2px;
}

.input-group input {
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
  font-size: 1rem;
  transition: all 0.2s ease;
  outline: none;
}

.input-group input:focus {
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.btn-login {
  margin-top: 0.5rem;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  border: none;
  padding: 0.9rem;
  border-radius: var(--radius-md);
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.25);
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
}

.btn-login:active:not(:disabled) {
  transform: translateY(0);
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-msg {
  background: var(--danger-bg);
  color: var(--danger-fg);
  padding: 0.8rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  text-align: center;
  font-weight: 500;
  animation: fadeIn 0.3s ease;
}

/* Spinner */
.spinner {
  width: 22px;
  height: 22px;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

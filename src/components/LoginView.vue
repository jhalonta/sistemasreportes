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
    <div class="login-split-card">
      
      <!-- Left Side: Branding & Info -->
      <div class="brand-side relative overflow-hidden">
        <div class="brand-content-top z-10">
          <div class="logo-row">
            <div class="logo-box">
              <span>📊</span>
            </div>
            <span class="brand-name">Sistemas & Reportes</span>
          </div>
          <h1 class="brand-headline">
            Optimiza tus <br>decisiones con <br>datos reales.
          </h1>
          <p class="brand-sub">
            Accede a la plataforma de reportes más avanzada para gestionar tus indicadores clave en tiempo real.
          </p>
        </div>

        <!-- Abstract Decorations -->
        <div class="blob top-blob"></div>
        <div class="blob bottom-blob"></div>
      </div>

      <!-- Right Side: Login Form -->
      <div class="form-side">
        <div class="form-wrapper">
          
          <div class="form-header">
            <h2>Bienvenido de nuevo</h2>
            <p>Ingresa tus credenciales para acceder al Sistema de Reportes.</p>
          </div>

          <form @submit.prevent="handleLogin" class="login-form">
            <div v-if="authStore.error" class="error-msg">
              {{ authStore.error }}
            </div>

            <div class="input-group">
              <label for="email">Correo electrónico</label>
              <div class="input-with-icon">
                <span class="icon material">✉️</span>
                <input 
                  id="email" 
                  type="email" 
                  v-model="email" 
                  placeholder="ejemplo@empresa.com" 
                  required
                  :disabled="authStore.loading"
                />
              </div>
            </div>

            <div class="input-group pt-2">
              <div class="label-row">
                <label for="password">Contraseña</label>
                <a href="#" class="forgot-link">¿Olvidaste tu contraseña?</a>
              </div>
              <div class="input-with-icon">
                <span class="icon material">🔒</span>
                <input 
                  id="password" 
                  type="password" 
                  v-model="password" 
                  placeholder="••••••••" 
                  required
                  :disabled="authStore.loading"
                />
              </div>
            </div>

            <div class="remember-row">
              <input type="checkbox" id="remember" />
              <label for="remember">Recordarme en este equipo</label>
            </div>

            <button type="submit" class="btn-login" :disabled="authStore.loading">
              <span v-if="authStore.loading" class="spinner"></span>
              <span v-else>Iniciar Sesión</span>
            </button>
          </form>

          <p class="footer-text">
            ¿No tienes una cuenta? 
            <a href="#">Contacta con soporte</a>
          </p>

        </div>
      </div>
      
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
  padding: 1.5rem;
  
  /* Mesh Background */
  background-color: var(--bg-main);
  background-image: 
    radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.1) 0px, transparent 50%);
}

.login-split-card {
  width: 100%;
  max-width: 1100px;
  min-height: 650px;
  display: grid;
  grid-template-columns: 1fr;
  background: var(--bg-card);
  border-radius: 1.25rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (min-width: 1024px) {
  .login-split-card {
    grid-template-columns: 1fr 1fr;
  }
}

/* ── Brand Side (Left) ── */
.brand-side {
  background: linear-gradient(145deg, #4f46e5, #4338ca);
  padding: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

@media (max-width: 1023px) {
  .brand-side { display: none; }
}

.brand-content-top {
  position: relative;
  z-index: 10;
}

.logo-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 3.5rem;
}

.logo-box {
  width: 2.75rem;
  height: 2.75rem;
  background: white;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.brand-name {
  color: white;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.brand-headline {
  color: white;
  font-size: 3.25rem;
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
}

.brand-sub {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.15rem;
  font-weight: 500;
  line-height: 1.6;
  max-width: 90%;
}

/* Blob decorations */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
}
.top-blob {
  top: -10%;
  right: -10%;
  width: 18rem;
  height: 18rem;
  background: rgba(255, 255, 255, 0.15);
}
.bottom-blob {
  bottom: -5%;
  left: -5%;
  width: 14rem;
  height: 14rem;
  background: rgba(99, 102, 241, 0.4);
}

/* ── Form Side (Right) ── */
.form-side {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 3rem;
  background: var(--bg-card); /* White in light mode, dark in dark mode */
}

@media (min-width: 1024px) {
  .form-side { padding: 4rem; }
}

.form-wrapper {
  max-width: 420px;
  width: 100%;
  margin: 0 auto;
}

.form-header {
  margin-bottom: 2.5rem;
}

.form-header h2 {
  font-size: 2rem;
  font-weight: 900;
  color: var(--text-main);
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.form-header p {
  color: var(--text-sub);
  font-size: 1rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.5rem;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.label-row label {
  margin-bottom: 0;
}

.forgot-link {
  font-size: 0.75rem;
  font-weight: 700;
  color: #4f46e5;
  text-decoration: none;
}
.forgot-link:hover { text-decoration: underline; }

.input-with-icon {
  position: relative;
}

.input-with-icon .icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.1rem;
  color: var(--text-muted);
  filter: grayscale(100%);
  opacity: 0.6;
}

.input-with-icon input {
  width: 100%;
  padding: 0.85rem 1rem 0.85rem 2.8rem;
  background: var(--bg-input);
  border: 1.5px solid var(--border-2);
  border-radius: 0.6rem;
  font-size: 1rem;
  color: var(--text-main);
  transition: all 0.2s;
  outline: none;
}

.input-with-icon input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}

.remember-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.remember-row input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: #4f46e5;
  cursor: pointer;
}

.remember-row label {
  font-size: 0.875rem;
  color: var(--text-sub);
  cursor: pointer;
}

.btn-login {
  width: 100%;
  background: #4f46e5;
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 0.6rem;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
  margin-top: 0.5rem;
}

.btn-login:hover:not(:disabled) {
  background: #4338ca;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
}

.btn-login:active:not(:disabled) {
  transform: translateY(1px);
  scale: 0.98;
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-msg {
  background: var(--danger-bg);
  color: var(--danger-fg);
  padding: 0.85rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
}

.footer-text {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-sub);
}

.footer-text a {
  font-weight: 700;
  color: #4f46e5;
  text-decoration: none;
}
.footer-text a:hover { text-decoration: underline; }

/* SPINNER */
.spinner {
  width: 22px;
  height: 22px;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s ease-in-out infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
</style>

<script setup>
import { useNotifications } from '../composables/useNotifications';

const { notifications } = useNotifications();
</script>

<template>
  <div class="notifications-container">
    <TransitionGroup name="toast">
      <div 
        v-for="note in notifications" 
        :key="note.id" 
        class="toast-card"
        :class="note.type"
      >
        <span class="icon" v-if="note.type === 'success'">✅</span>
        <span class="icon" v-else-if="note.type === 'error'">❌</span>
        <span class="icon" v-else>ℹ️</span>
        <span class="message">{{ note.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.notifications-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none; /* Allow clicking through container */
}

.toast-card {
  pointer-events: auto;
  min-width: 300px;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: #1e293b;
}

.toast-card.success { border-left: 4px solid #10b981; }
.toast-card.error { border-left: 4px solid #ef4444; }
.toast-card.info { border-left: 4px solid #3b82f6; }

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>

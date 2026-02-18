<script setup>
import { useNotifications } from '../composables/useNotifications';

const { notifications, removeNotification: remove } = useNotifications();
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
        <div class="icon-wrapper">
            <span v-if="note.type === 'success'" class="material-icon">check_circle</span>
            <span v-else-if="note.type === 'error'" class="material-icon">error</span>
            <span v-else class="material-icon">info</span>
        </div>
        <div class="content">
            <span class="title">{{ note.type === 'success' ? '¡Éxito!' : (note.type === 'error' ? 'Atención' : 'Información') }}</span>
            <span class="message">{{ note.message }}</span>
        </div>
        <button class="close-btn" @click="remove(note.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.notifications-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none; 
}

.toast-card {
  pointer-events: auto;
  min-width: 320px;
  max-width: 400px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
  border: 1px solid rgba(255,255,255,0.6);
  display: flex;
  align-items: flex-start;
  gap: 14px;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
  position: relative;
}

/* Status Colors & Accents */
.toast-card.success {
    border-left: none;
    background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
    border: 1px solid #bbf7d0;
}
.toast-card.success .icon-wrapper {
    color: #16a34a;
    background: #dcfce7;
}
.toast-card.success::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 6px;
    background: #22c55e;
}

.toast-card.error {
    background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
    border: 1px solid #fecaca;
}
.toast-card.error .icon-wrapper {
    color: #dc2626;
    background: #fee2e2;
}
.toast-card.error::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 6px;
    background: #ef4444;
}

.toast-card.info {
    background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
    border: 1px solid #bfdbfe;
}
.toast-card.info .icon-wrapper {
    color: #2563eb;
    background: #dbeafe;
}
.toast-card.info::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 6px;
    background: #3b82f6;
}

/* Icon */
.icon-wrapper {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.material-icon {
    font-family: 'Material Symbols Outlined', sans-serif; /* Assuming imported or fallback to emoji if needed */
    font-size: 20px;
    font-weight: bold;
    /* Emoji fallback if font not loaded */
    font-style: normal;
}

/* Content */
.content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
}

.title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #1e293b;
}

.message {
    font-size: 0.85rem;
    color: #64748b;
    line-height: 1.4;
}

.close-btn {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.2rem;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    margin-top: 2px;
    transition: color 0.2s;
}
.close-btn:hover {
    color: #475569;
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}
</style>

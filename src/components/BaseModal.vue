<script setup>
import { onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean,
  title: String,
  subtitle: String,
  icon: [Object, Function], // Lucide icon component
  maxWidth: {
    type: String,
    default: '600px'
  }
});

const emit = defineEmits(['close']);

// Handle ESC key to close
const handleEsc = (e) => {
  if (e.key === 'Escape' && props.show) {
    emit('close');
  }
};

onMounted(() => window.addEventListener('keydown', handleEsc));
onUnmounted(() => window.removeEventListener('keydown', handleEsc));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-container glass-panel" :style="{ maxWidth: maxWidth }">
          <div class="modal-header">
            <div class="header-info">
              <div v-if="icon" class="header-icon">
                <component :is="icon" :size="24" />
              </div>
              <div class="header-text">
                <h3 v-if="title">{{ title }}</h3>
                <p v-if="subtitle">{{ subtitle }}</p>
              </div>
            </div>
            <button type="button" class="btn-close" @click="emit('close')" title="Cerrar">
              <X :size="20" />
            </button>
          </div>
          
          <div class="modal-body">
            <slot></slot>
          </div>
          
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal-container {
  width: 100%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: 20px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-header {
  padding: 1.5rem 2rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-2);
}

.header-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.header-icon {
  width: 44px;
  height: 44px;
  background: var(--nav-active-bg);
  color: #6366f1;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
}

.header-text p {
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.btn-close {
  background: var(--bg-input);
  border: 1px solid var(--border-2);
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: var(--danger);
  transform: rotate(90deg);
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 1.25rem 2rem;
  background: rgba(0, 0, 0, 0.02);
  border-top: 1px solid var(--border-2);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* Animations */
@keyframes modal-pop {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

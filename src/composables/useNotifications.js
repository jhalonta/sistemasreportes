import { ref } from 'vue';

const notifications = ref([]);

export function useNotifications() {
  const showNotification = (message, type = 'success') => {
    const id = Date.now();
    notifications.value.push({ id, message, type });

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 3000);
  };

  const removeNotification = (id) => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  };

  return {
    notifications,
    showNotification,
    removeNotification
  };
}

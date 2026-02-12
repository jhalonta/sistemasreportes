import { ref } from 'vue';

const STORAGE_KEY = 'activity_logs';

// Singleton State (Strictly outside the function)
const activities = ref([]);
const loaded = ref(false);

export function useActivities() {
  
  const saveToStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities.value));
  };

  const loadActivities = () => {
    if (loaded.value) return; 

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          activities.value = parsed;
        } else {
            console.error('Invalid activities data format, resetting.');
            activities.value = [];
        }
      }
    } catch (e) {
      console.error('Error loading activities:', e);
      activities.value = [];
    }
    loaded.value = true;
  };

  const addActivity = (activity) => {
    const newActivity = {
      id: crypto.randomUUID(),
      timestamp: activity.timestamp || new Date().toISOString(),
      ...activity
    };
    
    activities.value.unshift(newActivity);
    saveToStorage();
    
    return { success: true, message: 'Actividad registrada correctamente' };
  };

  const updateActivity = (id, updates) => {
    const index = activities.value.findIndex(a => a.id === id);
    if (index !== -1) {
      const updatedActivity = { ...activities.value[index], ...updates };
      // New array assignment for reactivity
      activities.value = [
        ...activities.value.slice(0, index),
        updatedActivity,
        ...activities.value.slice(index + 1)
      ];
      saveToStorage();
      return { success: true, message: 'Actividad actualizada' };
    }
    return { success: false, message: 'Actividad no encontrada' };
  };

  const deleteActivity = (id) => {
      const initialLength = activities.value.length;
      activities.value = activities.value.filter(a => a.id !== id);
      
      if (activities.value.length < initialLength) {
          saveToStorage();
          return { success: true, message: 'Eliminado correctamente' };
      }
      return { success: false, message: 'No se pudo eliminar (ID no encontrado)' };
  };

  const getActivitiesByDate = (dateString) => {
    return activities.value.filter(a => a.timestamp.startsWith(dateString));
  };

  // Initial load
  loadActivities();

  return {
    activities,
    addActivity,
    updateActivity,
    deleteActivity,
    getActivitiesByDate
  };
}

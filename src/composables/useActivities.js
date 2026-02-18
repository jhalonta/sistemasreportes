import { ref } from 'vue';
import { db } from '../firebase';
import { ref as dbRef, push, onValue, update, remove } from 'firebase/database';

// Singleton State
const activities = ref([]);
const loaded = ref(false);

export function useActivities() {
  
  // Listen for real-time updates
  const loadActivities = () => {
    if (loaded.value) return;

    const activitiesRef = dbRef(db, 'activities');
    
    onValue(activitiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object of objects to array
        const eventsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Sort by timestamp desc (newest first)
        activities.value = eventsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      } else {
        activities.value = [];
      }
      loaded.value = true;
    }, (error) => {
      console.error("Error reading activities:", error);
    });
  };

  const addActivity = async (activity) => {
    try {
      const activitiesRef = dbRef(db, 'activities');
      await push(activitiesRef, {
        timestamp: activity.timestamp || new Date().toISOString(),
        ...activity
      });
      return { success: true, message: 'Actividad registrada correctamente' };
    } catch (e) {
      console.error("Error adding activity:", e);
      return { success: false, message: 'Error al guardar en Firebase' };
    }
  };

  const updateActivity = async (id, updates) => {
    try {
      const activityRef = dbRef(db, `activities/${id}`);
      await update(activityRef, updates);
      return { success: true, message: 'Actividad actualizada' };
    } catch (e) {
      console.error("Error updating activity:", e);
      return { success: false, message: 'Error al actualizar' };
    }
  };

  const deleteActivity = async (id) => {
    try {
      const activityRef = dbRef(db, `activities/${id}`);
      await remove(activityRef);
      return { success: true, message: 'Eliminado correctamente' };
    } catch (e) {
      console.error("Error deleting activity:", e);
      return { success: false, message: 'Error al eliminar' };
    }
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

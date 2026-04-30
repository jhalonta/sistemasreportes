import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { personalService } from '../services/personalService';

export const usePersonalStore = defineStore('personal', () => {
  const technicians = ref([]);

  const sortedTechnicians = computed(() => {
    return [...technicians.value].sort((a, b) => {
      const roleA = a.role || '';
      const roleB = b.role || '';
      const nameA = a.fullName.toUpperCase();
      const nameB = b.fullName.toUpperCase();

      const isAdminA = roleA === 'Asistente Administrativo';
      const isAdminB = roleB === 'Asistente Administrativo';

      if (isAdminA && !isAdminB) return -1;
      if (!isAdminA && isAdminB) return 1;

      if (isAdminA && isAdminB) {
        // Specific order: JHON, NORIN, BRILLITH
        const getAdminWeight = (name) => {
          if (name.includes('JHON')) return 1;
          if (name.includes('NORIN')) return 2;
          if (name.includes('MANUELA') || name.includes('BRILLITH')) return 3;
          return 4;
        };
        return getAdminWeight(nameA) - getAdminWeight(nameB);
      }
      return nameA.localeCompare(nameB);
    });
  });

  const loading = ref(false);
  const error = ref(null);

  const fetchTechnicians = async () => {
    loading.value = true;
    error.value = null;
    try {
      technicians.value = await personalService.getAll();
    } catch (err) {
      console.error('Error fetching personnel:', err);
      error.value = 'Error al cargar el personal.';
    } finally {
      loading.value = false;
    }
  };

  const addTechnician = async (technician) => {
    loading.value = true;
    error.value = null;
    try {
      await personalService.add(technician);
      await fetchTechnicians();
    } catch (err) {
      console.error('Error adding personnel:', err);
      error.value = 'Error al agregar el personal.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateTechnician = async (id, technician) => {
    loading.value = true;
    error.value = null;
    try {
      await personalService.update(id, technician);
      await fetchTechnicians();
    } catch (err) {
      console.error('Error updating personnel:', err);
      error.value = 'Error al actualizar el personal.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteTechnician = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await personalService.delete(id);
      await fetchTechnicians();
    } catch (err) {
      console.error('Error deleting personnel:', err);
      error.value = 'Error al eliminar el personal.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    technicians,
    sortedTechnicians,
    loading,
    error,
    fetchTechnicians,
    addTechnician,
    updateTechnician,
    deleteTechnician
  };
});

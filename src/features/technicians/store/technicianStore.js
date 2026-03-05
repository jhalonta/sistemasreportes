import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { technicianService } from '../services/technicianService';

export const useTechnicianStore = defineStore('technicians', () => {
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
      technicians.value = await technicianService.getAll();
    } catch (err) {
      console.error('Error fetching technicians:', err);
      error.value = 'Error al cargar los técnicos.';
    } finally {
      loading.value = false;
    }
  };

  const addTechnician = async (technician) => {
    loading.value = true;
    error.value = null;
    try {
      await technicianService.add(technician);
      await fetchTechnicians();
    } catch (err) {
      console.error('Error adding technician:', err);
      error.value = 'Error al agregar el técnico.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateTechnician = async (id, technician) => {
    loading.value = true;
    error.value = null;
    try {
      await technicianService.update(id, technician);
      await fetchTechnicians();
    } catch (err) {
      console.error('Error updating technician:', err);
      error.value = 'Error al actualizar el técnico.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteTechnician = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await technicianService.delete(id);
      await fetchTechnicians();
    } catch (err) {
      console.error('Error deleting technician:', err);
      error.value = 'Error al eliminar el técnico.';
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

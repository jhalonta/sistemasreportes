import { defineStore } from 'pinia';
import { ref } from 'vue';
import { locationService } from '../services/locationService';

export const useLocationStore = defineStore('locations', () => {
  const locations = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchLocations = async () => {
    loading.value = true;
    error.value = null;
    try {
      locations.value = await locationService.getAll();
    } catch (err) {
      console.error('Error fetching locations:', err);
      error.value = 'Error al cargar las sedes.';
    } finally {
      loading.value = false;
    }
  };

  const addLocation = async (locationData) => {
    loading.value = true;
    error.value = null;
    try {
      await locationService.add(locationData);
      await fetchLocations();
    } catch (err) {
      console.error('Error adding location:', err);
      error.value = 'Error al agregar la sede.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateLocation = async (id, locationData) => {
    loading.value = true;
    error.value = null;
    try {
      await locationService.update(id, locationData);
      await fetchLocations();
    } catch (err) {
      console.error('Error updating location:', err);
      error.value = 'Error al actualizar la sede.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteLocation = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      await locationService.delete(id);
      await fetchLocations();
    } catch (err) {
      console.error('Error deleting location:', err);
      error.value = 'Error al eliminar la sede.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    locations,
    loading,
    error,
    fetchLocations,
    addLocation,
    updateLocation,
    deleteLocation
  };
});

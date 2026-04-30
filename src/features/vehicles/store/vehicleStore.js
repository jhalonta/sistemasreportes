import { defineStore } from 'pinia';
import { vehicleService } from '../services/vehicleService';

export const useVehicleStore = defineStore('vehicles', {
  state: () => ({
    vehicles: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchVehicles() {
      this.loading = true;
      try {
        this.vehicles = await vehicleService.getAllVehicles();
      } catch (err) {
        this.error = 'Error al cargar los vehículos.';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    isPlacaDuplicate(placa, excludeId = null) {
      const normalized = placa.trim().toUpperCase();
      return this.vehicles.some(v =>
        v.placa.trim().toUpperCase() === normalized && v.id !== excludeId
      );
    },

    async addVehicle(vehicleData) {
      if (this.isPlacaDuplicate(vehicleData.placa)) {
        throw new Error('PLACA_DUPLICADA');
      }
      this.loading = true;
      try {
        const id = await vehicleService.addVehicle(vehicleData);
        this.vehicles.push({
          id,
          ...vehicleData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return id;
      } catch (err) {
        this.error = 'Error al agregar el vehículo.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateVehicle(id, updates) {
      if (updates.placa && this.isPlacaDuplicate(updates.placa, id)) {
        throw new Error('PLACA_DUPLICADA');
      }
      this.loading = true;
      try {
        await vehicleService.updateVehicle(id, updates);
        const index = this.vehicles.findIndex(v => v.id === id);
        if (index !== -1) {
          this.vehicles[index] = { ...this.vehicles[index], ...updates, updatedAt: new Date() };
        }
      } catch (err) {
        if (err.code === 'not-found' || (err.message && err.message.includes('No document to update'))) {
          console.warn(`Vehículo ${id} no encontrado en Firestore. Limpiando estado local.`);
          this.vehicles = this.vehicles.filter(v => v.id !== id);
          return;
        }
        this.error = 'Error al actualizar el vehículo.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteVehicle(id) {
      this.loading = true;
      try {
        await vehicleService.deleteVehicle(id);
        this.vehicles = this.vehicles.filter(v => v.id !== id);
      } catch (err) {
        this.error = 'Error al eliminar el vehículo.';
        throw err;
      } finally {
        this.loading = false;
      }
    }
  }
});

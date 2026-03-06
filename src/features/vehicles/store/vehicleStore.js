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

    async addVehicle(vehicleData) {
      this.loading = true;
      try {
        const id = await vehicleService.addVehicle(vehicleData);
        this.vehicles.push({
          ...vehicleData,
          id,
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
      this.loading = true;
      try {
        await vehicleService.updateVehicle(id, updates);
        const index = this.vehicles.findIndex(v => v.id === id);
        if (index !== -1) {
          this.vehicles[index] = { ...this.vehicles[index], ...updates, updatedAt: new Date() };
        }
      } catch (err) {
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

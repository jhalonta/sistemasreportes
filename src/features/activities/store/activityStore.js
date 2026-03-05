import { defineStore } from 'pinia';
import { activityService } from '../services/activityService';

export const useActivityStore = defineStore('activities', {
  state: () => ({
    activities: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchActivities() {
      this.loading = true;
      try {
        this.activities = await activityService.getAllActivities();
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    async addActivity(activityData) {
      this.loading = true;
      try {
        // Extract date from timestamp or use current
        const date = activityData.timestamp ? activityData.timestamp.split('T')[0] : new Date().toISOString().split('T')[0];
        
        const newId = await activityService.addActivity({
          ...activityData,
          date // Add explicit date field for queries
        });

        // Optimistic update or refetch
        this.activities.unshift({
          id: newId,
          ...activityData,
          date,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        return { success: true };
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateActivity(id, updates) {
      this.loading = true;
      try {
        await activityService.updateActivity(id, updates);
        
        const index = this.activities.findIndex(a => a.id === id);
        if (index !== -1) {
          this.activities[index] = { ...this.activities[index], ...updates };
        }
        
        return { success: true };
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteActivity(id) {
      this.loading = true;
      try {
        await activityService.deleteActivity(id);
        this.activities = this.activities.filter(a => a.id !== id);
        return { success: true };
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    }
  }
});

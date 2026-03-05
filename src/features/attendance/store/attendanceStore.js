import { defineStore } from 'pinia';
import { attendanceService } from '../services/attendanceService';
import { useTechnicianStore } from '../../technicians/store/technicianStore';

export const useAttendanceStore = defineStore('attendance', {
  state: () => ({
    records: {}, // Keyed by technicianId for current selected date
    monthlyRecords: {}, // Keyed by date -> technicianId
    loading: false,
    error: null,
    selectedDate: new Date().toISOString().split('T')[0]
  }),

  getters: {
    selectedMonthYear: (state) => state.selectedDate.substring(0, 7)
  },

  actions: {
    async fetchAttendance(date) {
      this.loading = true;
      this.error = null;
      try {
        const dateToFetch = date || this.selectedDate;
        this.records = await attendanceService.getAttendanceByDate(dateToFetch);
        
        // Also ensure monthlyRecords has this date if not already there
        if (!this.monthlyRecords[dateToFetch]) {
          this.monthlyRecords[dateToFetch] = this.records;
        }
      } catch (err) {
        this.error = err.message;
        console.error('Error fetching attendance:', err);
      } finally {
        this.loading = false;
      }
    },

    async fetchMonthlyAttendance(yearMonth) {
      this.loading = true;
      try {
        const ym = yearMonth || this.selectedMonthYear;
        const startDate = `${ym}-01`;
        const endDate = `${ym}-31`; // Query will handle it
        const records = await attendanceService.getAttendanceByDateRange(startDate, endDate);
        this.monthlyRecords = { ...this.monthlyRecords, ...records };
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async setAttendanceStatus(technicianId, status, extraData = {}) {
      this.loading = true;
      try {
        const existingRecord = this.records[technicianId];
        const data = {
          id: existingRecord?.id,
          technicianId,
          date: this.selectedDate,
          status,
          ...extraData
        };

        if (status === 'present' && !existingRecord?.checkIn) {
          data.checkIn = new Date(); // Or let service use serverTimestamp
        }

        const id = await attendanceService.saveAttendance(data);
        
        // Optimistic/Local update
        this.records[technicianId] = {
          ...data,
          id
        };
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async removeAttendance(technicianId) {
      const record = this.records[technicianId];
      if (!record?.id) return;

      this.loading = true;
      try {
        await attendanceService.deleteAttendance(record.id);
        delete this.records[technicianId];
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async markAllPresent() {
      const techStore = useTechnicianStore();
      const techIdsToMark = techStore.technicians
        .filter(t => t.active && !this.records[t.id])
        .map(t => t.id);

      if (techIdsToMark.length === 0) return;

      this.loading = true;
      try {
        await attendanceService.markBulkAttendance(this.selectedDate, techIdsToMark);
        await this.fetchAttendance(this.selectedDate); // Refresh to get all data
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    }
  }
});

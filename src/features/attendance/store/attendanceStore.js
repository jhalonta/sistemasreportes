import { defineStore } from 'pinia';
import { attendanceService } from '../services/attendanceService';
import { usePersonalStore } from '../../personal/store/personalStore';

export const useAttendanceStore = defineStore('attendance', {
  state: () => {
    const d = new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return {
      records: {}, // Keyed by technicianId for current selected date
      monthlyRecords: {}, // Keyed by date -> technicianId
      loading: false,
      error: null,
      selectedDate: localDate
    };
  },

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
        // Removing strict validation so users can edit past attendance

        const existingRecord = this.records[technicianId];
        const data = {
          id: existingRecord?.id,
          technicianId,
          date: this.selectedDate,
          status,
          ...extraData
        };

        if (status === 'present') {
          const [year, month, day] = this.selectedDate.split('-').map(Number);
          const d = new Date(year, month - 1, day);
          const dayOfWeek = d.getDay();
          
          const autoCheckIn = new Date(d);
          autoCheckIn.setHours(8, 0, 0, 0);
          
          const autoCheckOut = new Date(d);
          if (dayOfWeek === 6) {
            autoCheckOut.setHours(13, 0, 0, 0);
          } else {
            autoCheckOut.setHours(18, 0, 0, 0);
          }
          
          if (!existingRecord?.checkIn) {
            data.checkIn = autoCheckIn;
          }
          if (!existingRecord?.checkOut) {
            data.checkOut = autoCheckOut;
          }
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
        // Allow deletion of past attendance

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
      const techStore = usePersonalStore();
      const techIdsToMark = techStore.technicians
        .filter(t => t.active && !this.records[t.id])
        .map(t => t.id);

      await this.markBulkAttendance(this.selectedDate, techIdsToMark);
    },

    async markBulkAttendance(date, technicianIds) {
      if (technicianIds.length === 0) return;

      this.loading = true;
      try {
        // Allow bulk attendance on past days

        await attendanceService.markBulkAttendance(date, technicianIds);
        await this.fetchAttendance(date); // Refresh to get all data
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    }
  }
});

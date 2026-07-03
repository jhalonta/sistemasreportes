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
      selectedDate: localDate,
      unsubscribe: null
    };
  },

  getters: {
    selectedMonthYear: (state) => state.selectedDate.substring(0, 7)
  },

  actions: {
    subscribeAttendance(date) {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }

      this.loading = true;
      this.error = null;

      const dateToFetch = date || this.selectedDate;

      try {
        this.unsubscribe = attendanceService.subscribeAttendanceByDate(dateToFetch, (records) => {
          this.records = records;
          
          if (!this.monthlyRecords[dateToFetch]) {
            this.monthlyRecords[dateToFetch] = this.records;
          } else {
            this.monthlyRecords[dateToFetch] = {
              ...this.monthlyRecords[dateToFetch],
              ...records
            };
          }
          this.loading = false;
        }, (err) => {
          this.error = err.message;
          console.error('Error subscribing to attendance:', err);
          this.loading = false;
        });
      } catch (err) {
        this.error = err.message;
        this.loading = false;
      }
    },

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

    async saveManualAttendance(technicianId, date, status, { checkIn, checkOut, notes } = {}) {
      this.loading = true;
      try {
        const recordsForDate = await attendanceService.getAttendanceByDate(date);
        const existingRecord = recordsForDate[technicianId];

        const data = {
          id: existingRecord?.id,
          technicianId,
          date,
          status,
          notes: notes !== undefined ? notes : (existingRecord?.notes || '')
        };

        if (checkIn !== undefined) {
          data.checkIn = checkIn;
        } else if (existingRecord?.checkIn) {
          data.checkIn = existingRecord.checkIn;
        }

        if (checkOut !== undefined) {
          data.checkOut = checkOut;
        } else if (existingRecord?.checkOut) {
          data.checkOut = existingRecord.checkOut;
        }

        // Default times if status is present/late but checkIn/checkOut is not set
        if (['present', 'late', 'justified'].includes(status)) {
          const [year, month, day] = date.split('-').map(Number);
          const d = new Date(year, month - 1, day);
          const dayOfWeek = d.getDay();

          if (!data.checkIn) {
            const autoCheckIn = new Date(d);
            autoCheckIn.setHours(8, 0, 0, 0);
            data.checkIn = autoCheckIn;
          }

          // Auto-adjust status between 'present' and 'late' if status is one of those two and we have checkIn time
          if (status === 'present' || status === 'late') {
            const checkInDate = data.checkIn.toDate ? data.checkIn.toDate() : new Date(data.checkIn);
            const hours = checkInDate.getHours();
            const minutes = checkInDate.getMinutes();
            if (hours > 8 || (hours === 8 && minutes > 0)) {
              data.status = 'late';
            } else {
              data.status = 'present';
            }
          }
        } else {
          // If status is absent/dm/permiso, clear check-in and check-out
          if (status === 'absent' || status === 'dm' || status === 'permiso') {
            data.checkIn = null;
            data.checkOut = null;
          }
        }

        const id = await attendanceService.saveAttendance(data);

        if (date === this.selectedDate) {
          this.records[technicianId] = {
            ...data,
            id
          };
        }

        if (!this.monthlyRecords[date]) {
          this.monthlyRecords[date] = {};
        }
        this.monthlyRecords[date][technicianId] = {
          ...data,
          id
        };

        return id;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async registerSelfAttendance(technicianId, type) {
      this.loading = true;
      try {
        const d = new Date();
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        const recordsToday = await attendanceService.getAttendanceByDate(localDate);
        const existingRecord = recordsToday[technicianId];

        const data = {
          id: existingRecord?.id,
          technicianId,
          date: localDate,
          status: existingRecord?.status || 'present'
        };

        if (type === 'checkIn') {
          if (existingRecord?.checkIn) {
            throw new Error('Ya registraste tu entrada hoy.');
          }
          const now = new Date();
          data.checkIn = now;
          
          const hours = now.getHours();
          const minutes = now.getMinutes();
          if (hours > 8 || (hours === 8 && minutes > 0)) {
            data.status = 'late';
          } else {
            data.status = 'present';
          }
        } else if (type === 'checkOut') {
          if (existingRecord?.checkOut) {
            throw new Error('Ya registraste tu salida hoy.');
          }
          data.checkOut = new Date();
          data.checkIn = existingRecord?.checkIn || new Date();
        }

        const id = await attendanceService.saveAttendance(data);

        if (localDate === this.selectedDate) {
          this.records[technicianId] = {
            ...data,
            id
          };
        }

        if (!this.monthlyRecords[localDate]) {
          this.monthlyRecords[localDate] = {};
        }
        this.monthlyRecords[localDate][technicianId] = {
          ...data,
          id
        };

        return { id, data };
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

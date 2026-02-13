import { ref, computed } from 'vue';
import { db } from '../firebase';
import { ref as dbRef, onValue, set, update } from 'firebase/database';

export function useAttendance() {
  const currentTime = ref(new Date());
  
  // Update time every second
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);

  const isWithinSchedule = computed(() => {
    // FOR TESTING: Always return true
    return true; 
  });

  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const records = ref({});
  const loaded = ref(false);

  // Load real-time data from Firebase
  const loadRecords = () => {
    if (loaded.value) return;

    const attendanceRef = dbRef(db, 'attendance');
    onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      records.value = data || {};
      loaded.value = true;
    }, (error) => {
      console.error("Error reading attendance:", error);
    });
  };

  // Save changes
  const checkIn = async (personId, date = null) => {
    // Check schedule if it's TODAY
    const targetDate = date || getTodayDateString();
    const isToday = targetDate === getTodayDateString();

    if (isToday && !isWithinSchedule.value) {
        console.warn("CheckIn blocked: Outside schedule");
        return { success: false, message: 'Fuera de horario laboral' };
    }

    if (records.value[targetDate] && records.value[targetDate][personId]) {
        return { success: false, message: 'Ya tiene asistencia marcada' };
    }

    // Use fixed time 08:00:00 as requested
    const timestamp = '08:00:00';
    
    const record = { 
        checkIn: timestamp,
        status: 'Presente'
    };

    try {
        const recordRef = dbRef(db, `attendance/${targetDate}/${personId}`);
        await set(recordRef, record);
        return { success: true, message: 'Asistencia registrada correctamente' };
    } catch (e) {
        console.error("Firebase Error in checkIn:", e);
        return { success: false, message: 'Error al guardar: ' + e.message };
    }
  };

  const removeCheckIn = async (personId, date = null) => {
      const targetDate = date || getTodayDateString();
      try {
          const recordRef = dbRef(db, `attendance/${targetDate}/${personId}`);
          await set(recordRef, null); // Delete by setting to null
          return { success: true, message: 'Asistencia eliminada correctamente' };
      } catch (e) {
          console.error("Firebase Error in removeCheckIn:", e);
          return { success: false, message: 'Error al eliminar: ' + e.message };
      }
  };

  const markAbsent = async (personId, date = null) => {
      const targetDate = date || getTodayDateString();
      if (records.value[targetDate] && records.value[targetDate][personId]) {
          return { success: false, message: 'Ya tiene registro (debe desmarcar primero)' };
      }

      const record = { 
          checkIn: '-',
          status: 'Falta'
      };

      try {
          const recordRef = dbRef(db, `attendance/${targetDate}/${personId}`);
          await set(recordRef, record);
          return { success: true, message: 'Marcado como Falta' };
      } catch (e) {
          console.error("Firebase Error in markAbsent:", e);
          return { success: false, message: 'Error al guardar: ' + e.message };
      }
  };

  const markAll = async (personnelList, date = null) => {
      const targetDate = date || getTodayDateString();
      const updates = {};
      let count = 0;
      
      const timestamp = '08:00:00';

      personnelList.forEach(person => {
          // Only mark if not already registered
          if (!records.value[targetDate] || !records.value[targetDate][person.id]) {
               updates[`attendance/${targetDate}/${person.id}`] = {
                   checkIn: timestamp,
                   status: 'Presente'
               };
               count++;
          }
      });

      if (count === 0) return { success: true, message: 'Todos ya estaban registrados' };

      try {
          // We can't use 'update' on root easily without full path, so we loop set or use update on root
          // Better: use update() on root db reference with paths
          await update(dbRef(db), updates);
          return { success: true, message: `Se marcaron ${count} colaboradores` };
      } catch (e) {
           console.error("Firebase Error in markAll:", e);
           return { success: false, message: 'Error al guardar masivo: ' + e.message };
      }
  };

  const getStatus = (personId, date = null) => {
    const targetDate = date || getTodayDateString();
    if (records.value[targetDate] && records.value[targetDate][personId]) {
      return records.value[targetDate][personId]; // Returns object { checkIn, status }
    }
    return null;
  };

  loadRecords();

  return {
    currentTime,
    isWithinSchedule,
    checkIn,
    removeCheckIn,
    markAbsent,
    markAll,
    getStatus,
    records // Export records so useReports can use it
  };
}

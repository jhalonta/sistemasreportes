import { ref, computed } from 'vue';
import { db } from '../firebase';
import { ref as dbRef, onValue, set } from 'firebase/database';

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
        return { success: false, message: 'Fuera de horario laboral' };
    }

    if (records.value[targetDate] && records.value[targetDate][personId]) {
        return { success: false, message: 'Ya tiene asistencia marcada en esa fecha' };
    }

    // Use current time if today, else default to 08:00:00 for past dates
    const timestamp = isToday ? new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '08:00:00';
    
    const record = { 
        checkIn: timestamp,
        status: 'Presente'
    };

    try {
        const recordRef = dbRef(db, `attendance/${targetDate}/${personId}`);
        await set(recordRef, record);
        return { success: true, message: `Asistencia marcada (${targetDate})` };
    } catch (e) {
        console.error("Error saving attendance:", e);
        return { success: false, message: 'Error al guardar en Firebase' };
    }
  };

  const getStatus = (personId, date = null) => {
    const targetDate = date || getTodayDateString();
    if (records.value[targetDate] && records.value[targetDate][personId]) {
      return records.value[targetDate][personId];
    }
    return null;
  };

  loadRecords();

  return {
    currentTime,
    isWithinSchedule,
    checkIn,
    getStatus,
    records // Export records so useReports can use it
  };
}

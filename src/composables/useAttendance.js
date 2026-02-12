import { ref, computed, watchEffect } from 'vue';

const STORAGE_KEY = 'attendance_records';

export function useAttendance() {
  const currentTime = ref(new Date());
  
  // Update time every second
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);

  const isWithinSchedule = computed(() => {
    const now = currentTime.value;
    const day = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const hour = now.getHours();
    
    // FOR TESTING: Always return true
    return true; 

    /*
    // Check if Sunday (0)
    if (day === 0) return false;

    // Monday to Friday (1-5)
    if (day >= 1 && day <= 5) {
      return hour >= 8 && hour < 19; // 8:00 to 18:59 (allows up to 19:00)
    }

    // Saturday (6)
    if (day === 6) {
      return hour >= 8 && hour < 13; // 8:00 to 12:59
    }

    return false;
    */
  });

  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const records = ref({});

  // Load initial data
  const loadRecords = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      records.value = JSON.parse(saved);
    }
  };

  // Save changes
  const checkIn = (personId, date = null) => {
    // Only check schedule if it's TODAY
    const targetDate = date || getTodayDateString();
    const isToday = targetDate === getTodayDateString();

    if (isToday && !isWithinSchedule.value) {
        return { success: false, message: 'Fuera de horario laboral' };
    }

    if (!records.value[targetDate]) {
        records.value[targetDate] = {};
    }

    if (records.value[targetDate][personId]) {
        return { success: false, message: 'Ya tiene asistencia marcada en esa fecha' };
    }

    // Use current time if today, else default to 08:00:00 for past dates
    const timestamp = isToday ? new Date().toLocaleTimeString() : '08:00:00';
    
    records.value[targetDate][personId] = { 
        checkIn: timestamp,
        status: 'Presente'
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value));
    return { success: true, message: `Asistencia marcada (${targetDate})` };
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
    getStatus
  };
}

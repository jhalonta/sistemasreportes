import { ref, computed } from 'vue';
import { personnel } from '../data/personnel';
import { useAttendance } from './useAttendance'; // We need access to raw records, might need to expose them
import { useActivities } from './useActivities';

export function useReports() {
  const { activities } = useActivities();
  const { records: attendanceRecords } = useAttendance();
  
  const generateDailyReport = (dateString) => {
    // dateString: YYYY-MM-DD
    const dayRecords = attendanceRecords.value[dateString] || {};
    
    // Filter activities for this day
    const dayActivities = activities.value.filter(a => a.timestamp.startsWith(dateString));

    return personnel.map((person, index) => {
      const attendance = dayRecords[person.id];
      
      // Find activity where this person is main or partner
      // We'll take the first one found, or join descriptions if multiple
      const personActivities = dayActivities.filter(a => 
        a.mainTechId === person.id || a.partnerTechId === person.id
      );

      const activityDetails = personActivities.map(a => ({
          description: a.rateCode, // User requested codes only to save space
          assigned: a.assigned,
          completed: a.completed,
          projectedValue: a.projectedValue || 0,
          realizedValue: a.realizedValue || 0
      }));

      const activityDesc = personActivities.length > 0 
        ? personActivities.map(a => {
            const qtyInfo = (a.assigned || a.completed) ? ` (${a.completed}/${a.assigned})` : '';
            return `${a.description}${qtyInfo}`;
        }).join('; ') 
        : '';

      // Format checkIn to HH:MM (remove seconds if present)
      let formattedCheckIn = '';
      let formattedCheckOut = '';

      if (attendance) {
          if (attendance.status === 'Falta') {
              formattedCheckIn = 'NO ASISTIÓ';
              formattedCheckOut = 'NO ASISTIÓ';
          } else if (attendance.checkIn) {
              // Assuming format is HH:MM:SS or H:MM:SS or similar
              // split by ':' and take first two parts
              const parts = attendance.checkIn.split(':');
              if (parts.length >= 2) {
                  formattedCheckIn = `${parts[0]}:${parts[1]}`;
              } else {
                  formattedCheckIn = attendance.checkIn;
              }
              formattedCheckOut = '18:00';
          }
      }

      return {
        item: index + 1,
        name: person.name,
        dni: person.dni,
        role: person.role,
        checkIn: formattedCheckIn, 
        checkOut: formattedCheckOut, 
        activity: activityDesc,
        activitiesList: activityDetails,
        signature: '' // Placeholder for print
      };
    });
  };

  return {
    generateDailyReport
  };
}

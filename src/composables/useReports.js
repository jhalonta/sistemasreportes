import { ref, computed } from 'vue';
import { personnel } from '../data/personnel';
import { useAttendance } from './useAttendance'; // We need access to raw records, might need to expose them
import { useActivities } from './useActivities';

export function useReports() {
  const { activities } = useActivities();
  
  // We need to access attendance records directly. 
  // Since useAttendance exposes methods but not the raw ref securely for external use easily without refactoring,
  // we will grab them from localStorage directly for the report to ensure fresh data.
  const getAttendanceRecords = () => {
      const saved = localStorage.getItem('attendance_records');
      return saved ? JSON.parse(saved) : {};
  };

  const generateDailyReport = (dateString) => {
    // dateString: YYYY-MM-DD
    const attendanceData = getAttendanceRecords();
    const dayRecords = attendanceData[dateString] || {};
    
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

      return {
        item: index + 1,
        name: person.name,
        dni: person.dni,
        role: person.role,
        checkIn: attendance ? '08:00' : '',
        checkOut: attendance ? '18:00' : '', 
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

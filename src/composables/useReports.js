import { ref, computed } from 'vue';
import { personnel } from '../data/personnel';
import { useAttendance } from './useAttendance';
import { useActivities } from './useActivities';
import { useNotifications } from './useNotifications';
import { utils, writeFile } from 'xlsx';

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
            const personActivities = dayActivities.filter(a =>
                a.mainTechId === person.id || a.partnerTechId === person.id
            );

            const activityDetails = personActivities.map(a => ({
                description: a.rateCode,
                assigned: a.assigned,
                completed: a.completed,
                projectedValue: parseFloat(a.projectedValue) || 0,
                realizedValue: parseFloat(a.realizedValue) || 0
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
                signature: ''
            };
        });
    };

    const getWeekRange = (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        const day = date.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const monday = new Date(date.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: monday, end: sunday };
    };

    const getMonthRange = (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        return { start, end };
    };

    const generateExcelReport = async (type, selectedDate) => {
        const { showNotification } = useNotifications();

        // Para reporte diario usamos el backend Python
        if (type === 'Diario') {
            if (!selectedDate) {
                showNotification('Seleccione una fecha', 'warning');
                return;
            }

            try {
                showNotification('Generando Excel con Python...', 'info');

                // Llamada al Backend Python
                const response = await fetch(`http://localhost:8000/api/export/excel?date=${selectedDate}`);

                if (!response.ok) {
                    throw new Error('Error en el servidor Python');
                }

                // Descargar archivo
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Reporte_Diario_${selectedDate}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                showNotification('Reporte descargado exitosamente', 'success');
                return; // Terminar aquí para Diario
            } catch (e) {
                console.error("Error Python:", e);
                showNotification('Error al conectar con Python. Verifique que el backend esté corriendo.', 'error');
                // Fallback a lógica antigua (opcional) o retornar
                return;
            }
        }

        // ... Resto de la lógica original para Semanal/Mensual (si quieres mantenerla en JS por ahora)
        if (!selectedDate) return;

        try {
            showNotification('Generando Excel (JS)...', 'info');
            let data = [];
            let fileName = `Reporte_${type}_${selectedDate}.xlsx`;

            // Weekly or Monthly
            let startDate, endDate;
            if (type === 'Semanal') {
                const range = getWeekRange(selectedDate);
                startDate = range.start;
                endDate = range.end;
            } else {
                const range = getMonthRange(selectedDate);
                startDate = range.start;
                endDate = range.end;
            }

            // Filter activities in range
            const rangeActivities = activities.value.filter(a => {
                const aDate = new Date(a.timestamp);
                return aDate >= startDate && aDate <= endDate;
            });

            // Aggregate by Personnel
            data = personnel.map((person, index) => {
                // Find activities for this person
                const personActivities = rangeActivities.filter(a =>
                    a.mainTechId === person.id || a.partnerTechId === person.id
                );

                const totalAssigned = personActivities.reduce((sum, a) => sum + (parseFloat(a.projectedValue) || 0), 0);
                const totalRealized = personActivities.reduce((sum, a) => sum + (parseFloat(a.realizedValue) || 0), 0);

                // Count days with attendance (optional, but good)
                const uniqueDays = new Set(personActivities.map(a => a.timestamp.split('T')[0])).size;

                return {
                    "ITEM": index + 1,
                    "PERSONAL": person.name,
                    "CARGO": person.role,
                    "DÍAS CON ACTIVIDAD": uniqueDays,
                    "TOTAL ASIGNADA (S/.)": totalAssigned.toFixed(2),
                    "TOTAL REALIZADA (S/.)": totalRealized.toFixed(2),
                    "EFICIENCIA (%)": totalAssigned > 0 ? ((totalRealized / totalAssigned) * 100).toFixed(1) + '%' : '0%'
                };
            });

            fileName = `Reporte_${type}_${startDate.toISOString().split('T')[0]}_al_${endDate.toISOString().split('T')[0]}.xlsx`;

            // Generate Sheet
            const ws = utils.json_to_sheet(data);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Reporte");

            // Auto-width cols (simple estimation)
            const wscols = Object.keys(data[0] || {}).map(k => ({ wch: 20 }));
            ws['!cols'] = wscols;

            writeFile(wb, fileName);
            showNotification('Reporte generado exitosamente', 'success');
        } catch (e) {
            console.error(e);
            showNotification('Error al generar el reporte', 'error');
        }
    };

    return {
        generateDailyReport,
        generateExcelReport
    };
}

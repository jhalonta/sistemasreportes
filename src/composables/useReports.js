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

        const rows = personnel.map((person, index) => {
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
                    // Saturdays finish at 13:00
                    const dayOfWeek = new Date(dateString + 'T00:00:00').getDay();
                    if (dayOfWeek === 6) {
                        formattedCheckOut = '13:00';
                    }
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
                signature: '',
                personId: person.id
            };
        });

        // --- Group partners: place each partner right after their main tech ---
        const pairsSeen = new Set();
        const pairs = [];
        dayActivities.forEach(a => {
            if (a.partnerTechId) {
                const key = `${a.mainTechId}|${a.partnerTechId}`;
                if (!pairsSeen.has(key)) {
                    pairsSeen.add(key);
                    pairs.push({ mainId: a.mainTechId, partnerId: a.partnerTechId });
                }
            }
        });

        if (pairs.length === 0) {
            // No pairs today — return as-is, renumbered
            return rows.map((r, i) => ({ ...r, item: i + 1 }));
        }

        // Collect ALL personIds that are partners — they must NOT be placed in natural order
        const partnerIds = new Set(pairs.map(p => p.partnerId));

        const ordered = [];

        rows.forEach(row => {
            // Skip partners — they will be inserted right after their main tech
            if (partnerIds.has(row.personId)) return;

            ordered.push(row);

            // If this person is a mainTech, insert their partner(s) immediately after
            const myPairs = pairs.filter(p => p.mainId === row.personId);
            myPairs.forEach(pair => {
                const partnerRow = rows.find(r => r.personId === pair.partnerId);
                if (partnerRow) ordered.push(partnerRow);
            });
        });

        // Renumber items sequentially
        return ordered.map((r, i) => ({ ...r, item: i + 1 }));
    };

    const generateMonthlyDailyReports = (yearMonth) => {
        // yearMonth format: 'YYYY-MM'
        if (!yearMonth) return [];
        
        // Find all unique dates that match the yearMonth
        const datesSet = new Set();
        
        // Check attendance records
        Object.keys(attendanceRecords.value).forEach(date => {
            if (date.startsWith(yearMonth)) {
                datesSet.add(date);
            }
        });
        
        // Check activities
        activities.value.forEach(act => {
            const date = act.timestamp.split('T')[0];
            if (date.startsWith(yearMonth)) {
                datesSet.add(date);
            }
        });
        
        // Sort dates chronologically
        const sortedDates = Array.from(datesSet).sort();
        
        // Generate daily reports for each date
        return sortedDates.map(date => {
            return {
                date: date,
                data: generateDailyReport(date)
            };
        });
    };

    const getWeekRange = (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
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

        if (type === 'Diario') {
            if (!selectedDate) {
                showNotification('Seleccione una fecha', 'warning');
                return;
            }

            try {
                showNotification('Generando Excel con Python...', 'info');

                const response = await fetch(`http://localhost:8000/api/export/excel?date=${selectedDate}`);

                if (!response.ok) {
                    throw new Error('Error en el servidor Python');
                }

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
                return;
            } catch (e) {
                console.error("Error Python:", e);
                showNotification('Error al conectar con Python. Verifique que el backend esté corriendo.', 'error');
                return;
            }
        }

        if (!selectedDate) return;

        try {
            showNotification('Generando Excel (JS)...', 'info');
            let data = [];
            let fileName = `Reporte_${type}_${selectedDate}.xlsx`;

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

            const rangeActivities = activities.value.filter(a => {
                const aDate = new Date(a.timestamp);
                return aDate >= startDate && aDate <= endDate;
            });

            data = personnel.map((person, index) => {
                const personActivities = rangeActivities.filter(a =>
                    a.mainTechId === person.id || a.partnerTechId === person.id
                );

                const totalAssigned = personActivities.reduce((sum, a) => {
                    const value = parseFloat(a.projectedValue) || 0;
                    return sum + (a.partnerTechId ? value / 2 : value);
                }, 0);
                const totalRealized = personActivities.reduce((sum, a) => {
                    const value = parseFloat(a.realizedValue) || 0;
                    return sum + (a.partnerTechId ? value / 2 : value);
                }, 0);
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

            const ws = utils.json_to_sheet(data);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Reporte");

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
        generateMonthlyDailyReports,
        generateExcelReport
    };
}

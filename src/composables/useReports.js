import { ref, computed } from 'vue';
import { useAttendanceStore } from '../features/attendance/store/attendanceStore';
import { usePersonalStore } from '../features/personal/store/personalStore';
import { useActivityStore } from '../features/activities/store/activityStore';
import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNotifications } from './useNotifications';
import { useAuthStore } from '../features/auth/store/authStore';

export function useReports() {
    const activityStore = useActivityStore();
    const attendanceStore = useAttendanceStore();
    const techStore = usePersonalStore();
    const authStore = useAuthStore();

    const getAuthorizedTechnicians = () => {
        const profile = authStore.userProfile;
        return techStore.sortedTechnicians.filter(t => {
            if (!t.active) return false;
            if (profile?.role === 'sede' && t.locationId !== profile.locationId) {
                return false;
            }
            return true;
        });
    };

    const generateDailyReport = (dateString) => {
        const dayRecords = attendanceStore.monthlyRecords[dateString] || {};
        const dayActivities = activityStore.activities.filter(a => a.timestamp.startsWith(dateString));

        const authorizedTechs = getAuthorizedTechnicians();

        const rows = authorizedTechs.map((person, index) => {
            const attendance = dayRecords[person.id];
            const personActivities = dayActivities.filter(a =>
                a.mainTechId === person.id || a.partnerTechId === person.id
            );

            const activityDetails = personActivities.map(a => ({
                description: a.rateCode || a.description,
                assigned: a.assigned,
                completed: a.completed,
                projectedValue: parseFloat(a.projectedValue) || 0,
                realizedValue: parseFloat(a.realizedValue) || 0
            }));

            const activityDesc = personActivities.length > 0
                ? personActivities.map(a => {
                    const label = a.description || a.rateCode;
                    const qtyInfo = (a.assigned || a.completed) ? ` (${a.completed}/${a.assigned})` : '';
                    return `${label}${qtyInfo}`;
                }).join('; ')
                : '';

            let formattedCheckIn = '';
            let formattedCheckOut = '';

            if (attendance) {
                if (attendance.status === 'absent') {
                    formattedCheckIn = 'NO ASISTIÓ';
                    formattedCheckOut = 'NO ASISTIÓ';
                } else if (attendance.checkIn) {
                    // CheckIn might be Date or string
                    const checkInDate = attendance.checkIn.toDate ? attendance.checkIn.toDate() : new Date(attendance.checkIn);
                    if (!isNaN(checkInDate)) {
                        formattedCheckIn = checkInDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                    } else {
                        formattedCheckIn = String(attendance.checkIn).substring(0, 5);
                    }

                    formattedCheckOut = '18:00';
                    const dayOfWeek = new Date(dateString + 'T00:00:00').getDay();
                    if (dayOfWeek === 6) formattedCheckOut = '13:00';
                }
            }

            return {
                item: index + 1,
                name: person.fullName,
                dni: person.dni || '-',
                role: person.role || '-',
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

    const drawReportHeader = (doc, title, dateStr) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 14;

        // ---- Company Name (large, like the original) ----
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');

        const title1 = 'CONSORCIO ';
        const title2 = 'GALCAS';
        const title3 = ' INGENIEROS';
        const totalW = doc.getTextWidth(title1 + title2 + title3);
        let tx = (pageWidth - totalW) / 2;

        doc.setTextColor(0, 158, 96);   // green
        doc.text(title1, tx, y);
        tx += doc.getTextWidth(title1);

        doc.setTextColor(41, 98, 200);  // lighter blue
        doc.text(title2, tx, y);
        tx += doc.getTextWidth(title2);

        // --- Yellow 4-pointed compass star between GALCAS and INGENIEROS ---
        const starCx = tx + 7;
        const starCy = y - 4;
        const starR = 3.5;
        const starR2 = starR * 0.28;

        const starPts = [];
        for (let i = 0; i < 8; i++) {
            const angle = (i * 45 - 90) * (Math.PI / 180);
            const r = (i % 2 === 0) ? starR : starR2;
            starPts.push([starCx + r * Math.cos(angle), starCy + r * Math.sin(angle)]);
        }
        const starLines = starPts.slice(1).map((pt, idx) => [
            pt[0] - starPts[idx][0],
            pt[1] - starPts[idx][1]
        ]);

        doc.setFillColor(255, 200, 0);   // bright yellow
        doc.setDrawColor(255, 180, 0);   // slightly darker yellow border
        doc.setLineWidth(0.1);
        doc.lines(starLines, starPts[0][0], starPts[0][1], [1, 1], 'FD', true);

        // Reset draw color and continue with INGENIEROS
        doc.setDrawColor(0, 0, 0);
        tx += 14;
        doc.setTextColor(0, 158, 96);   // green
        doc.text(title3, tx, y);

        // ---- RUC and Address (left side, small) ----
        y += 5;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text('RUC: 20612913766', 14, y);
        y += 4;
        doc.text('DIRECCIÓN: AV. SALAVERRY N° 2415 INT. 202 - SAN ISIDRO - LIMA', 14, y);

        // ---- Report Title (center) + FECHA (right) ----
        y += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(title, pageWidth / 2, y, { align: 'center' });

        // underline
        doc.setLineWidth(0.3);
        const titleW = doc.getTextWidth(title);
        doc.line((pageWidth - titleW) / 2, y + 0.6, (pageWidth + titleW) / 2, y + 0.6);

        // DATE on the RIGHT
        doc.setFontSize(8);
        doc.text(`FECHA: ${dateStr}`, pageWidth - 14, y, { align: 'right' });

        return y + 6;
    };

    const downloadDailyReportPdf = (dayReports, filename) => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        dayReports.forEach((report, idx) => {
            if (idx > 0) doc.addPage();

            const formattedDate = new Date(report.date + 'T00:00:00').toLocaleDateString('es-PE', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }).toUpperCase();

            const nextY = drawReportHeader(doc, 'REGISTRO DE ASISTENCIA DIARIA DEL PERSONAL OPERATIVO', formattedDate);
            let y = nextY;

            // ---- PERSONAL OPERATIVO ----
            doc.setFontSize(8);
            doc.text('PERSONAL OPERATIVO:', 14, y);
            y += 4;

            // ---- Table ----
            const rows = report.rows;
            const tableBody = rows.map(row => [
                row.item,
                row.name,
                row.dni || '',
                row.role || '',
                row.checkIn || '',
                row.checkOut || '',
                row.activitiesList.map(a => a.description || '').join('\n'),
                row.activitiesList.map(a => a.assigned || '').join('\n'),
                row.activitiesList.map(a => a.completed || '').join('\n'),
                '' // Firma
            ]);

            autoTable(doc, {
                startY: y,
                margin: { left: 14, right: 14 },
                head: [
                    [
                        { content: 'ITEM', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                        { content: 'NOMBRES Y APELLIDOS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                        { content: 'DNI', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                        { content: 'CARGO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                        { content: 'HORARIO LABORAL', colSpan: 2, styles: { halign: 'center' } },
                        { content: 'PRODUCCIÓN / ACTIVIDAD', colSpan: 3, styles: { halign: 'center' } },
                        { content: 'FIRMA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                    ],
                    [
                        { content: 'ING.', styles: { halign: 'center' } },
                        { content: 'SAL.', styles: { halign: 'center' } },
                        { content: 'CÓDIGO', styles: { halign: 'center' } },
                        { content: 'ASIGNADA', styles: { halign: 'center' } },
                        { content: 'REALIZADA', styles: { halign: 'center' } },
                    ]
                ],
                body: tableBody,
                headStyles: {
                    fillColor: [229, 231, 235],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    fontSize: 7,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.2,
                },
                bodyStyles: {
                    fontSize: 6.5,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.2,
                    valign: 'middle',
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { halign: 'left', cellWidth: 65 },
                    2: { halign: 'center', cellWidth: 20 },
                    3: { halign: 'left', cellWidth: 30 },
                    4: { halign: 'center', cellWidth: 12 },
                    5: { halign: 'center', cellWidth: 12 },
                    6: { halign: 'center', cellWidth: 28 },
                    7: { halign: 'center', cellWidth: 22 },
                    8: { halign: 'center', cellWidth: 22 },
                    9: { halign: 'center', cellWidth: 32 },
                },
                didParseCell: (data) => {
                    const rowData = rows[data.row.index];
                    if (data.section === 'body' && rowData && rowData.checkIn === 'NO ASISTIÓ') {
                        data.cell.styles.fillColor = [254, 226, 226];
                    }
                },
            });
        });

        doc.save(filename);
    };

    const downloadMonthlyAttendancePdf = async (yearMonth) => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const [year, month] = yearMonth.split('-');
        const dateObj = new Date(year, month - 1);
        const monthYearStr = dateObj.toLocaleDateString('es-PE', { month: '2-digit', year: 'numeric' });

        const nextY = drawReportHeader(doc, `REPORTE GENERAL DE ASISTENCIA MENSUAL - ${monthYearStr}`, monthYearStr);

        const daysInMonth = new Date(year, month, 0).getDate();
        const dayColumns = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());

        const technicians = getAuthorizedTechnicians();

        const tableBody = technicians.map((tech, index) => {
            const row = [index + 1, tech.fullName, tech.role || '-'];
            let presentCount = 0;
            let absentCount = 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${yearMonth}-${d.toString().padStart(2, '0')}`;
                const dayRecord = attendanceStore.monthlyRecords[dateStr]?.[tech.id];

                if (dayRecord) {
                    if (dayRecord.status === 'present' || dayRecord.status === 'late' || dayRecord.status === 'justified') {
                        row.push('P');
                        presentCount++;
                    } else if (dayRecord.status === 'absent') {
                        row.push('F');
                        absentCount++;
                    } else if (dayRecord.status === 'dm') {
                        row.push('DM');
                    } else {
                        row.push('');
                    }
                } else {
                    row.push('');
                }
            }

            row.push(presentCount);
            row.push(absentCount);
            return row;
        });

        const head = [
            [
                { content: 'N°', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: 'NOMBRES Y APELLIDOS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: 'CARGO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                { content: 'DÍAS DEL MES', colSpan: daysInMonth, styles: { halign: 'center' } },
                { content: 'TOTAL', colSpan: 2, styles: { halign: 'center' } },
            ],
            [
                ...dayColumns.map(d => ({ content: d })),
                { content: 'P', styles: { halign: 'center' } },
                { content: 'F', styles: { halign: 'center' } }
            ]
        ];

        autoTable(doc, {
            startY: nextY,
            head: head,
            body: tableBody,
            margin: { left: 14, right: 14 },
            theme: 'grid',
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 6,
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
            },
            bodyStyles: {
                fontSize: 5.5,
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                valign: 'middle',
                cellPadding: 0.5
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 7 },
                1: { halign: 'left', cellWidth: 50 },
                2: { halign: 'left', cellWidth: 32 },
                // Day columns: available 269 - (7+50+32+7+7) = 166. 166/31 = 5.35
            },
            didParseCell: (data) => {
                if (data.section === 'head' && data.row.index === 1 && data.column.index >= 3 && data.column.index < 3 + daysInMonth) {
                    data.cell.styles.halign = 'center';
                    data.cell.styles.cellWidth = 5.2;
                }
                if (data.section === 'body' && data.column.index >= 3 && data.column.index < 3 + daysInMonth) {
                    data.cell.styles.halign = 'center';
                    if (data.cell.text[0] === 'P') {
                        data.cell.styles.textColor = [0, 120, 0];
                    } else if (data.cell.text[0] === 'F') {
                        data.cell.styles.textColor = [200, 0, 0];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.text[0] === 'DM') {
                        data.cell.styles.textColor = [0, 100, 200]; // Blueish
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
                if (data.section === 'body' && data.column.index >= 3 + daysInMonth) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.halign = 'center';
                    data.cell.styles.fillColor = [245, 245, 245];
                }
            }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('LEYENDA: P = Presente | F = Falta | DM = Descanso Médico', 14, finalY);

        doc.save(`Reporte_Asistencia_Mensual_${yearMonth}.pdf`);
    };

    const generateMonthlyDailyReports = (yearMonth) => {
        if (!yearMonth) return [];

        const datesSet = new Set();
        Object.keys(attendanceStore.monthlyRecords).forEach(date => {
            if (date.startsWith(yearMonth)) datesSet.add(date);
        });

        activityStore.activities.forEach(act => {
            if (!act.timestamp) {
                console.warn('Actividad sin timestamp:', act);
                return;
            }
            const date = act.timestamp.split('T')[0];
            if (date.startsWith(yearMonth)) datesSet.add(date);
        });

        const sortedDates = Array.from(datesSet).sort();

        return sortedDates.map(date => ({
            date: date,
            data: generateDailyReport(date)
        }));
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

            const rangeActivities = activityStore.activities.filter(a => {
                const aDate = new Date(a.timestamp);
                return aDate >= startDate && aDate <= endDate;
            });

            const authorizedTechs = getAuthorizedTechnicians();

            data = authorizedTechs.map((person, index) => {
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
                    "PERSONAL": person.fullName,
                    "CARGO": person.role,
                    "DÍAS CON ACTIVIDAD": uniqueDays,
                    "TOTAL ASIGNADA (S/.)": totalAssigned.toFixed(2),
                    "TOTAL REALIZADA (S/.)": totalRealized.toFixed(2),
                    "EFICIENCIA (%)": totalAssigned > 0 ? ((totalRealized / totalAssigned) * 100).toFixed(1) + '%' : '0%'
                };
            });

            const formatDateLocal = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            fileName = `Reporte_${type}_${formatDateLocal(startDate)}_al_${formatDateLocal(endDate)}.xlsx`;

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
        generateExcelReport,
        downloadDailyReportPdf,
        downloadMonthlyAttendancePdf
    };
}

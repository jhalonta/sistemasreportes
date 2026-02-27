<script setup>
import { ref, computed } from 'vue';
import { useReports } from '../composables/useReports';
import { useGlobalStore } from '../stores/global';
import { storeToRefs } from 'pinia';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js';
import { Bar } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const { generateDailyReport, generateMonthlyDailyReports, generateExcelReport } = useReports();

const globalStore = useGlobalStore();
const { selectedDate } = storeToRefs(globalStore);

const printMode = ref(null); // kept for v-if template compatibility
const isGeneratingPdf = ref(false);

const reportData = computed(() => generateDailyReport(selectedDate.value));

const formattedDateHeader = computed(() => {
    if (!selectedDate.value) return '';
    const date = new Date(selectedDate.value + 'T00:00:00'); // Fix TZ issue
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase();
});

const formatHeaderDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase();
};

// Chart Data Logic
// Chart Data Logic
import { useActivities } from '../composables/useActivities';
import { personnel } from '../data/personnel';

const { activities } = useActivities();

const chartData = computed(() => {
  // Filter activities for the selected date
  // We use the raw activities store instead of reportData to avoid per-person duplication
  if (!selectedDate.value) return { labels: [], datasets: [] };
  
  const dayActivities = activities.value.filter(a => a.timestamp.startsWith(selectedDate.value));
  
  // Group activities by "Squad" (Main Tech + Partner)
  const squads = {};

  dayActivities.forEach(act => {
      const realized = parseFloat(act.realizedValue) || 0;
      const assigned = parseFloat(act.projectedValue) || 0;
      
      // Included if either is > 0
      if (realized > 0 || assigned > 0) {
          // Create a unique key for the squad
          const mainId = act.mainTechId;
          const partnerId = act.partnerTechId;
          const key = partnerId ? `${mainId}|${partnerId}` : `${mainId}`;

          if (!squads[key]) {
              squads[key] = {
                  realized: 0,
                  assigned: 0,
                  mainId: mainId,
                  partnerId: partnerId
              };
          }
          squads[key].realized += realized;
          squads[key].assigned += assigned;
      }
  });

  const labels = Object.values(squads).map(squad => {
      const main = personnel.find(p => p.id === squad.mainId)?.name || 'Desconocido';
      // Try to use shorter name: First Last
      const shortName = (fullName) => {
          const parts = fullName.split(' ');
          return parts.length > 2 ? `${parts[0]} ${parts[2] || parts[1]}` : fullName;
      };

      const partner = squad.partnerId ? personnel.find(p => p.id === squad.partnerId)?.name : null;
      
      if (partner) {
          return `${shortName(main)} & ${shortName(partner)}`;
      }
      return shortName(main);
  });

  const realizedValues = Object.values(squads).map(s => s.realized);
  const assignedValues = Object.values(squads).map(s => s.assigned);

  return {
    labels,
    datasets: [
      {
        label: 'Meta (Asignada)',
        backgroundColor: '#cbd5e1', // Grey for target
        data: assignedValues,
        barPercentage: 0.7,
        categoryPercentage: 0.8
      },
      {
        label: 'Realizada (Ejecutada)',
        backgroundColor: '#4f46e5', // Indigo for actual
        data: realizedValues,
        barPercentage: 0.7,
        categoryPercentage: 0.8
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' }, // Show legend now
    title: { display: true, text: 'Producción: Asignada vs Realizada (S/.)', font: { size: 16 } }
  },
  scales: {
      x: {
          ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45,
              font: { size: 11 }
          }
      },
      y: {
          beginAtZero: true
      }
  }
};

// --- jsPDF Direct Download ---

const buildPdfForDays = (dayReports, filename) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    dayReports.forEach((report, idx) => {
        if (idx > 0) doc.addPage();

        const formattedDate = new Date(report.date + 'T00:00:00').toLocaleDateString('es-PE', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }).toUpperCase();

        // ---- Header ----
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
        const starCx = tx + 7;  // horizontal center: more space after GALCAS
        const starCy = y - 4;     // vertical center: align with text cap height
        const starR  = 3.5;       // outer radius (mm)
        const starR2 = starR * 0.28; // inner radius (sharp points)

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
        tx += 14; // more space around the star
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

        // ---- Report Title (center) + FECHA (right), same row ----
        y += 7;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('REGISTRO DE ASISTENCIA DIARIA DEL PERSONAL OPERATIVO', pageWidth / 2, y, { align: 'center' });

        // underline
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        const titleW = doc.getTextWidth('REGISTRO DE ASISTENCIA DIARIA DEL PERSONAL OPERATIVO');
        doc.line((pageWidth - titleW) / 2, y + 0.6, (pageWidth + titleW) / 2, y + 0.6);

        // FECHA on the RIGHT of the same row as the title
        doc.setFontSize(8);
        doc.text(`FECHA: ${formattedDate}`, pageWidth - 14, y, { align: 'right' });

        // ---- PERSONAL OPERATIVO ----
        y += 6;
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
                    { content: 'APELLIDOS Y NOMBRES', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
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
                0: { halign: 'center', cellWidth: 8 },   // ITEM
                1: { halign: 'left',   cellWidth: 65 },  // NOMBRE (ampliado para nombres largos)
                2: { halign: 'center', cellWidth: 20 },  // DNI
                3: { halign: 'left',   cellWidth: 30 },  // CARGO
                4: { halign: 'center', cellWidth: 12 },  // ING
                5: { halign: 'center', cellWidth: 12 },  // SAL
                6: { halign: 'center', cellWidth: 28 },  // CODIGO (corto como AC01)
                7: { halign: 'center', cellWidth: 22 },  // ASIGNADA
                8: { halign: 'center', cellWidth: 22 },  // REALIZADA
                9: { halign: 'center', cellWidth: 32 },  // FIRMA (ampliada)
            },
            didParseCell: (data) => {
                // Highlight absent rows in light red
                const rowData = rows[data.row.index];
                if (data.section === 'body' && rowData && rowData.checkIn === 'NO ASISTIÓ') {
                    data.cell.styles.fillColor = [254, 226, 226];
                }
            },
        });
    });

    doc.save(filename);
};

const printDailyReport = () => {
    if (!selectedDate.value) return;
    isGeneratingPdf.value = true;
    const rows = generateDailyReport(selectedDate.value);
    buildPdfForDays([{ date: selectedDate.value, rows }], `Reporte_Diario_${selectedDate.value}.pdf`);
    isGeneratingPdf.value = false;
};

const printMonthlyReports = () => {
    if (!selectedDate.value) return;
    isGeneratingPdf.value = true;
    const yearMonth = selectedDate.value.substring(0, 7);
    const monthlyReports = generateMonthlyDailyReports(yearMonth);

    if (monthlyReports.length === 0) {
        alert('No hay datos registrados para este mes.');
        isGeneratingPdf.value = false;
        return;
    }

    // generateMonthlyDailyReports returns { date, data } but we need { date, rows }
    const dayReports = monthlyReports.map(r => ({ date: r.date, rows: r.data }));
    const [year, month] = selectedDate.value.split('-');
    buildPdfForDays(dayReports, `Reporte_Mensual_${year}_${month}.pdf`);
    isGeneratingPdf.value = false;
};

</script>

<template>
  <div class="reports-container">
    <div class="controls no-print glass-panel">
      <h2>Generar Reportes</h2>
      <div class="control-group">
        <label>Fecha del Reporte:</label>
        <input type="date" v-model="selectedDate" />
      </div>
      
      <div class="control-group actions-group">
          <button @click="printDailyReport" :disabled="isGeneratingPdf" class="btn-print">
              {{ isGeneratingPdf && printMode === 'daily' ? 'Generando...' : 'Descargar Día (PDF)' }}
          </button>
          <button @click="printMonthlyReports" :disabled="isGeneratingPdf" class="btn-print btn-print-monthly">
               {{ isGeneratingPdf && printMode === 'monthly' ? 'Generando...' : 'Descargar Todo el Mes (PDF)' }}
          </button>
      </div>
      
      <div class="control-group excel-group">
          <button @click="generateExcelReport('Diario', selectedDate)" class="btn-excel">📊 Excel Diario</button>
          <button @click="generateExcelReport('Semanal', selectedDate)" class="btn-excel">📅 Excel Semanal</button>
          <button @click="generateExcelReport('Mensual', selectedDate)" class="btn-excel">📆 Excel Mensual</button>
      </div>
    </div>

    <!-- Dashboard View (Screen Only) -->
    <div class="dashboard-view no-print">
        <div class="chart-container glass-panel">
            <h3>Rendimiento del Día</h3>
            <div class="canvas-wrapper">
                <Bar v-if="chartData.labels.length > 0" :data="chartData" :options="chartOptions" />
                <div v-else class="empty-chart">
                    <p>No hay producción registrada para esta fecha.</p>
                </div>
            </div>
        </div>
    </div>

  </div>
</template>

<style scoped>
/* Screen styles */
.reports-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  font-family: Arial, sans-serif;
  color: #000;
  width: 100%;
}

.controls {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 800px;
}

.control-group {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: center;
}

input[type="date"] {
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid #ccc;
}

.actions-group {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 1rem;
}

.btn-print {
    background: #4ade80;
    color: #14532d;
    padding: 0.6rem 1.25rem;
    border-radius: 6px;
    border: none;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgba(74, 222, 128, 0.3);
    transition: all 0.2s;
}

.btn-print:hover:not(:disabled) {
    background: #22c55e;
    transform: translateY(-2px);
}

.btn-print-monthly {
    background: #3b82f6;
    color: white;
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
}

.btn-print-monthly:hover:not(:disabled) {
    background: #2563eb;
}

.btn-print:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

/* Glass panel for controls only */
.glass-panel {
  background: rgba(255,255,255,0.7);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  backdrop-filter: blur(10px);
}

.dashboard-view {
    width: 100%;
    display: flex;
    justify-content: center;
}

.chart-container {
    width: 100%;
    max-width: 100%; /* Full width */
    padding: 2rem;
    margin: 0 auto;
}

.canvas-wrapper {
    height: 600px; /* Taller chart */
    position: relative;
}

.empty-chart {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-style: italic;
}

/* Print Sheet Setup (now used for html2pdf styling as well) */
.screen-hidden {
    display: none;
}

.pdf-export-container {
    width: 297mm; /* Force A4 Landscape width for rendering */
    background: white;
    /* We ensure it renders quietly off-screen if we don't want to flash it */
    position: absolute;
    left: -9999px;
    top: 0;
}

.print-sheet {
  background: white;
  width: 100%;
  min-height: 210mm; /* A4 Landscape height approx */
  padding: 10mm;
  box-sizing: border-box;
}

/* Header Styles */
.company-name {
  color: #009e60; /* Greenish matching logo */
  font-size: 24pt;
  font-weight: 900;
  text-align: center;
  margin: 0;
  text-transform: uppercase;
}

.blue-text {
  color: #1e3a8a;
  font-weight: 900;
}

.company-info {
  font-size: 9pt;
  margin-top: 5px;
}

.report-title {
  text-align: center;
  font-size: 14pt;
  margin: 15px 0;
  text-decoration: underline;
}

.report-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 10pt;
}

/* Table Styles */
.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
}

.report-table th, .report-table td {
  border: 1px solid black;
  padding: 4px;
}

.report-table th {
  background-color: #e5e7eb;
  font-weight: bold;
  text-align: center;
  vertical-align: middle;
}

.text-center { text-align: center; }
.text-left { text-align: left; }
.font-sm { font-size: 9pt; }
.font-xs { font-size: 8pt; }

/* Column Widths */
.w-item { width: 30px; }
.w-name { width: 250px; }
.w-dni { width: 80px; }
.w-role { width: 140px; }
.w-time-col { width: 35px; font-size: 8pt; padding: 2px; }
.w-desc { width: 80px; }
.w-meta { width: 40px; }
.w-real { width: 40px; }
.w-sign { width: 100px; }

.act-line {
    padding: 2px 0;
    border-bottom: 1px dashed #eee;
}
.act-line:last-child {
    border-bottom: none;
}

/* We keep media print just in case someone hits Ctrl+P natively, 
   but our main export is via html2pdf now */
@media print {
  @page {
    size: landscape;
    margin: 1cm;
  }

  body {
    background: white;
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Hide everything on screen */
  .reports-container > .controls,
  .reports-container > .dashboard-view,
  nav, button, .app-layout > *:not(.content-area) {
    display: none !important;
  }
  
  /* Overrides for dev tools just in case */
  body > div:not(#app),
  [id*="vite-plugin-vue-devtools"] {
      display: none !important;
  }

  .reports-container {
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .pdf-export-container, .screen-hidden {
      display: block !important;
      position: relative;
      left: 0;
  }

  .print-sheet {
    display: block !important;
    width: 100%;
    margin: 0;
    padding: 0;
    box-shadow: none;
  }
  
  .multi-page {
      page-break-before: always;
  }
}

.excel-group {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
}

.btn-excel {
    background: #10b981;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: none;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: background 0.2s;
}

.btn-excel:hover {
    background: #059669;
}
</style>

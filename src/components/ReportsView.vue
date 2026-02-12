<script setup>
import { ref, computed } from 'vue';
import { useReports } from '../composables/useReports';
import { useGlobalStore } from '../stores/global';
import { storeToRefs } from 'pinia';

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

const { generateDailyReport } = useReports();

const globalStore = useGlobalStore();
const { selectedDate } = storeToRefs(globalStore);

const reportData = computed(() => generateDailyReport(selectedDate.value));

const formattedDateHeader = computed(() => {
    if (!selectedDate.value) return '';
    const date = new Date(selectedDate.value + 'T00:00:00'); // Fix TZ issue
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase();
});

// Chart Data Logic
const chartData = computed(() => {
  const data = reportData.value;
  const squads = {};

  data.forEach(row => {
    // Only process rows that have activities (production)
    const totalRealized = row.activitiesList.reduce((sum, act) => sum + (parseFloat(act.realizedValue) || 0), 0);
    
    if (totalRealized > 0) {
        // Group by Name (Assuming name is unique enough for this view, or we could use ID)
        // Since the report is already per person, and partners are listed in the activity description or logic?
        // Wait, the report currently lists EACH ADMISSION. 
        // If it's a squad (Main + Partner), the report logic puts the record under the Main tech?
        // Let's look at `generateDailyReport` output. It returns a flat list of personnel with their activities.
        // If Main Tech A worked with Partner B, the activity is logged under Main Tech A? 
        // Logic check: Activities store `mainTechId` and `partnerTechId`.
        // `generateDailyReport` likely maps personnel to their activities where they are Main.
        
        // We will graph by "row.name" (Main Tech) and label it with Partner if possible, 
        // but row.name is just the person.
        
        squads[row.name] = (squads[row.name] || 0) + totalRealized;
    }
  });

  const labels = Object.keys(squads);
  const values = Object.values(squads);

  return {
    labels,
    datasets: [
      {
        label: 'Producción Realizada (S/.)',
        backgroundColor: '#4f46e5',
        data: values
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: true, text: 'Producción por Técnico/Cuadrilla (S/.)' }
  }
};

const printReport = () => {
  window.print();
};

</script>

<template>
  <div class="reports-container">
    <div class="controls no-print glass-panel">
      <h2>Generar Reportes</h2>
      <div class="control-group">
        <label>Fecha del Reporte:</label>
        <input type="date" v-model="selectedDate" />
        <button @click="printReport" class="btn-print">Imprimir / Guardar PDF</button>
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

    <!-- Printable Area (Hidden on Screen) -->
    <div class="print-sheet screen-hidden">
      <header class="report-header">
        <h1 class="company-name">CONSORCIO GALCAS INGENIEROS</h1>
        <div class="company-info">
          <p><strong>RUC:</strong> 20612913766</p>
          <p><strong>DIRECCIÓN:</strong> AV. SALAVERRY N° 2415 INT. 202 - SAN ISIDRO - LIMA</p>
        </div>
        <h2 class="report-title">REGISTRO DE ASISTENCIA DIARIA DEL PERSONAL OPERATIVO</h2>
        <div class="report-meta">
            <span><strong>PERSONAL OPERATIVO:</strong></span>
            <span class="meta-date"><strong>FECHA:</strong> {{ formattedDateHeader }}</span>
        </div>
      </header>

      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2" class="w-item">ITEM</th>
            <th rowspan="2" class="w-name">APELLIDOS Y NOMBRES</th>
            <th rowspan="2" class="w-dni">DNI</th>
            <th rowspan="2" class="w-role">CARGO</th>
            <th colspan="2" class="w-time">HORARIO LABORAL</th>
            <th colspan="3" class="w-prod">PRODUCCIÓN / ACTIVIDAD</th>
            <th rowspan="2" class="w-sign">FIRMA</th>
          </tr>
          <tr>
            <th class="w-time-col">ING.</th>
            <th class="w-time-col">SAL.</th>
            <th class="w-desc">CÓDIGO</th>
            <th class="w-meta">META</th>
            <th class="w-real">REAL</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in reportData" :key="row.item">
            <td class="text-center">{{ row.item }}</td>
            <td class="text-left font-sm">{{ row.name }}</td>
            <td class="text-center">{{ row.dni }}</td>
            <td class="text-left font-xs">{{ row.role }}</td>
            <td class="text-center">{{ row.checkIn }}</td>
            <td class="text-center">{{ row.checkOut }}</td>
            
            <!-- Activity Description (Now just Code) -->
            <td class="text-center font-xs">
                <div v-for="(act, i) in row.activitiesList" :key="i" class="act-line">
                    {{ act.description }}
                </div>
            </td>
            
            <!-- Meta (Assigned) -->
            <td class="text-center font-xs">
                <div v-for="(act, i) in row.activitiesList" :key="i" class="act-line">
                    {{ act.assigned }}
                </div>
            </td>

            <!-- Real (Completed) -->
            <td class="text-center font-xs">
                <div v-for="(act, i) in row.activitiesList" :key="i" class="act-line">
                    {{ act.completed }}
                </div>
            </td>

            <td></td> <!-- Firma -->
          </tr>
        </tbody>
      </table>
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
}

.controls {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 600px;
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

.btn-print {
    background: #4ade80;
    color: #14532d;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: none;
    font-weight: bold;
    cursor: pointer;
}



/* Glass panel for controls only */
.glass-panel {
  background: rgba(255,255,255,0.7);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  backdrop-filter: blur(10px);
}

.chart-container {
    width: 100%;
    max-width: 800px;
    padding: 2rem;
    margin: 0 auto;
}

.canvas-wrapper {
    height: 400px;
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

/* Print Sheet Visualization on Screen - HIDDEN BY DEFAULT */
.screen-hidden {
    display: none;
}
.print-sheet {
  background: white;
  width: 297mm; /* A4 Landscape width approx */
  min-height: 210mm;
  padding: 10mm;
  box-shadow: 0 0 10px rgba(0,0,0,0.2);
  margin-bottom: 2rem;
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

/* Print Media Query */
@media print {
  @page {
    size: landscape;
    margin: 10mm;
  }

  body {
    background: white;
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Hide everything that's not the print sheet */
  .no-print, .main-nav, .app-layout > *:not(.content-area) {
    display: none !important;
  }
  
  /* Ensure print sheet takes full width without margins/shadows */
  .reports-container {
    width: 100%;
    margin: 0;
    padding: 0;
    align-items: flex-start;
  }
  
  .print-sheet {
    display: block !important; /* Force show on print */
    width: 100%;
    height: auto;
    box-shadow: none;
    margin: 0;
    padding: 0;
  }

  .screen-hidden {
      display: block !important;
  }
  
  /* Navigation hiding might need to be higher up in App.vue styles or global */
  nav, button {
      display: none !important;
  }
}
</style>

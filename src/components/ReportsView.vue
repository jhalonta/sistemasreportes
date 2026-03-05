<script setup>
import { ref, computed } from 'vue';
import { Table, CalendarDays, Calendar, FileText, FileDown, Download, Sheet, BarChart3, Search } from 'lucide-vue-next';
import { useReports } from '../composables/useReports';
import { useGlobalStore } from '../stores/global';
import { useAttendanceStore } from '../features/attendance/store/attendanceStore';
import { useTechnicianStore } from '../features/technicians/store/technicianStore';
import { useActivityStore } from '../features/activities/store/activityStore';
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

const { 
  generateDailyReport, 
  generateMonthlyDailyReports, 
  generateExcelReport,
  downloadDailyReportPdf,
  downloadMonthlyAttendancePdf
} = useReports();

const globalStore = useGlobalStore();
const { selectedDate } = storeToRefs(globalStore);
const attendanceStore = useAttendanceStore();
const techStore = useTechnicianStore();
const activityStore = useActivityStore();

import { onMounted, watch } from 'vue';

onMounted(async () => {
  await Promise.all([
    techStore.fetchTechnicians(),
    attendanceStore.fetchMonthlyAttendance(),
    activityStore.fetchActivities()
  ]);
});

watch(selectedDate, async (newDate) => {
  if (newDate) {
    const ym = newDate.substring(0, 7);
    await attendanceStore.fetchMonthlyAttendance(ym);
  }
});

const printMode = ref(null); 
const isGeneratingPdf = ref(false);

const reportData = computed(() => {
  if (techStore.technicians.length === 0) return [];
  return generateDailyReport(selectedDate.value);
});

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
// Removed: import { useActivities } from '../composables/useActivities';
// Removed: import { personnel } from '../data/personnel';

// Removed: const { activities } = useActivities();

const chartData = computed(() => {
  // Filter activities for the selected date
  // We use the raw activities store instead of reportData to avoid per-person duplication
  if (!selectedDate.value) return { labels: [], datasets: [] };
  
  const dayActivities = activityStore.activities.filter(a => a.timestamp.startsWith(selectedDate.value));
  
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
      const main = techStore.technicians.find(p => p.id === squad.mainId)?.fullName || 'Desconocido';
      // Try to use shorter name: First Last
      const shortName = (fullName) => {
          const parts = fullName.split(' ');
          return parts.length > 1 ? `${parts[0]} ${parts[parts.length-1]}` : fullName;
      };

      const partner = squad.partnerId ? techStore.technicians.find(p => p.id === squad.partnerId)?.fullName : null;
      
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

const printDailyReport = () => {
    if (!selectedDate.value) return;
    isGeneratingPdf.value = true;
    const rows = generateDailyReport(selectedDate.value);
    downloadDailyReportPdf([{ date: selectedDate.value, rows }], `Reporte_Diario_${selectedDate.value}.pdf`);
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

    const dayReports = monthlyReports.map(r => ({ date: r.date, rows: r.data }));
    const [year, month] = selectedDate.value.split('-');
    downloadDailyReportPdf(dayReports, `Reporte_Mensual_${year}_${month}.pdf`);
    isGeneratingPdf.value = false;
};

const printAttendanceGrid = async () => {
    if (!selectedDate.value) return;
    isGeneratingPdf.value = true;
    const yearMonth = selectedDate.value.substring(0, 7);
    
    try {
        await attendanceStore.fetchMonthlyAttendance(yearMonth);
        await downloadMonthlyAttendancePdf(yearMonth);
    } catch (e) {
        console.error(e);
    } finally {
        isGeneratingPdf.value = false;
    }
};

</script>

<template>
  <div class="reports-container">

    <!-- Page Header -->
    <div class="reports-header">
      <div class="header-info">
        <h2 class="reports-title">
          <FileText :size="28" class="title-icon" /> Generar Reportes
        </h2>
        <p class="reports-subtitle">Descarga reportes en PDF o Excel para compartir con tu equipo.</p>
      </div>
      <div class="date-picker-wrap">
        <label>Fecha del Reporte</label>
        <input type="date" v-model="selectedDate" class="date-input" />
      </div>
    </div>

    <!-- Export Cards Row -->
    <div class="export-row">

      <!-- PDF Card -->
      <div class="export-card glass-panel">
        <div class="card-header">
          <div class="card-icon pdf-icon"><FileDown :size="24" /></div>
          <h3>Exportar PDF</h3>
        </div>
        <p class="card-desc">Genera reportes con formato oficial listos para imprimir y firmar.</p>
        <div class="card-actions">
          <button @click="printDailyReport" :disabled="isGeneratingPdf" class="btn-export btn-pdf">
            <Download :size="16" />
            {{ isGeneratingPdf ? 'Generando...' : 'Reporte Diario' }}
          </button>
          <button @click="printMonthlyReports" :disabled="isGeneratingPdf" class="btn-export btn-pdf-alt" title="Reportes diarios individuales agrupados">
            <Download :size="16" />
            {{ isGeneratingPdf ? 'Generando...' : 'Todo el Mes' }}
          </button>
          <button @click="printAttendanceGrid" :disabled="isGeneratingPdf" class="btn-export btn-pdf-grid">
            <Download :size="16" />
            {{ isGeneratingPdf ? 'Generando...' : 'Planilla Mensual' }}
          </button>
        </div>
      </div>

      <!-- Excel Card -->
      <div class="export-card glass-panel">
        <div class="card-header">
          <div class="card-icon excel-icon"><Sheet :size="24" /></div>
          <h3>Exportar Excel</h3>
        </div>
        <p class="card-desc">Exporta datos tabulares para análisis avanzado en hojas de cálculo.</p>
        <div class="card-actions">
          <button @click="generateExcelReport('Diario', selectedDate)" class="btn-export btn-excel">
            <Table :size="16" /> Diario
          </button>
          <button @click="generateExcelReport('Semanal', selectedDate)" class="btn-export btn-excel">
            <CalendarDays :size="16" /> Semanal
          </button>
          <button @click="generateExcelReport('Mensual', selectedDate)" class="btn-export btn-excel">
            <Calendar :size="16" /> Mensual
          </button>
        </div>
      </div>

    </div>

    <!-- Chart Section -->
    <div class="chart-section glass-panel no-print">
      <h3 class="chart-title">
        <BarChart3 :size="22" /> Rendimiento del Día
      </h3>
      <div class="canvas-wrapper">
        <Bar v-if="chartData.labels.length > 0" :data="chartData" :options="chartOptions" />
        <div v-else class="empty-chart">
          <Search :size="40" stroke-width="1.5" />
          <p>No hay producción registrada para esta fecha.</p>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Layout ── */
.reports-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: var(--text-main);
}

/* ── Header ── */
.reports-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.reports-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.title-icon {
  color: #6366f1;
  -webkit-text-fill-color: initial;
}

.reports-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-muted, #64748b);
}

.date-picker-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.date-picker-wrap label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, #64748b);
}

.date-input {
  padding: 0.6rem 1rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-2, #cbd5e1);
  background: var(--bg-input, white);
  color: var(--text-main);
  font-size: 0.95rem;
  transition: all 0.2s;
}

.date-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

/* ── Export Cards ── */
.export-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.glass-panel {
  background: var(--glass-bg, rgba(255,255,255,0.7));
  border-radius: 16px;
  box-shadow: var(--glass-shadow, 0 4px 20px rgba(0,0,0,0.06));
  backdrop-filter: blur(12px);
}

.export-card {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.export-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.08);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-main);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pdf-icon {
  background: #fee2e2;
  color: #dc2626;
}

.excel-icon {
  background: #d1fae5;
  color: #059669;
}

.card-desc {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted, #64748b);
  line-height: 1.5;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: auto;
}

/* ── Buttons ── */
.btn-export {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn-pdf {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

.btn-pdf:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.35);
}

.btn-pdf-alt {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.btn-pdf-alt:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35);
}

.btn-pdf-grid {
  background: linear-gradient(135deg, #0f172a, #334155);
  color: white;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
}

.btn-pdf-grid:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.35);
}

.btn-excel {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

.btn-excel:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
}

/* ── Chart ── */
.chart-section {
  padding: 2rem;
}

.chart-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.canvas-wrapper {
  height: 500px;
  position: relative;
}

.empty-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #94a3b8;
}

.empty-chart p {
  margin: 0;
  font-size: 1rem;
  font-style: italic;
}

/* ── Print remnants (keeping for pdf compat) ── */
.screen-hidden { display: none; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .export-row {
    grid-template-columns: 1fr;
  }
  .reports-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .canvas-wrapper {
    height: 350px;
  }
}

@media print {
  @page { size: landscape; margin: 1cm; }
  body { background: white; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .reports-container > .reports-header, .export-row, .chart-section,
  nav, button, .app-container > *:not(.main-wrapper) { display: none !important; }
  body > div:not(#app), [id*="vite-plugin-vue-devtools"] { display: none !important; }
  .reports-container { width: 100%; margin: 0; padding: 0; }
  .screen-hidden { display: block !important; position: relative; left: 0; }
}
</style>

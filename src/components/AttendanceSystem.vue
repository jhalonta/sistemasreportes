<script setup>
import { ref, computed } from 'vue';
import { personnel } from '../data/personnel';
import { useAttendance } from '../composables/useAttendance';
import { useNotifications } from '../composables/useNotifications';
import { useGlobalStore } from '../stores/global';
import { storeToRefs } from 'pinia';

const { currentTime, isWithinSchedule, checkIn, removeCheckIn, markAbsent, markAll, getStatus, records } = useAttendance();
const { showNotification } = useNotifications();

const globalStore = useGlobalStore();
const { selectedDate } = storeToRefs(globalStore);

const daysInMonth = computed(() => {
    if (!selectedDate.value) return [];
    const [year, month, _] = selectedDate.value.split('-').map(Number);
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = 1; i <= lastDayOfMonth; i++) {
        days.push(i);
    }
    return days;
});

const monthlyAttendanceList = computed(() => {
    if (!selectedDate.value) return [];
    const [year, month, _] = selectedDate.value.split('-');
    
    return personnel.map(person => {
        const attendance = [];
        let totalPresent = 0;
        let totalAbsent = 0;
        
        for (let i = 1; i <= daysInMonth.value.length; i++) {
            const dateStr = `${year}-${month}-${String(i).padStart(2, '0')}`;
            const record = records.value[dateStr]?.[person.id];
            
            let statusChar = '';
            // If date is in the future, we don't count it yet
            if (record) {
                if (record.status === 'Presente') {
                    statusChar = 'P';
                    totalPresent++;
                } else if (record.status === 'Falta') {
                    statusChar = 'F';
                    totalAbsent++;
                }
            }
            attendance.push(statusChar);
        }
        
        return {
            name: person.name,
            role: person.role,
            attendance,
            totalPresent,
            totalAbsent
        };
    });
});

const printMonthlyReport = () => {
    window.print();
};

const isToday = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate.value === today;
});

const formattedTime = computed(() => {
  return currentTime.value.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
});

const formattedDate = computed(() => {
  return currentTime.value.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
});

const toggleAttendance = async (personId) => {
  const status = getStatus(personId, selectedDate.value);
  const isRegistered = !!status;
  let result;
  
  if (isRegistered) {
      // Unmark
      result = await removeCheckIn(personId, selectedDate.value);
  } else {
      // Mark checking
      result = await checkIn(personId, selectedDate.value); 
  }

  showNotification(result.message, result.success ? 'success' : 'error');
};

const handleMarkAbsent = async (personId) => {
    const result = await markAbsent(personId, selectedDate.value);
    showNotification(result.message, result.success ? 'success' : 'error');
};

const handleMarkAll = async () => {
    // Confirm? Maybe not needed for now, but good practice
    const result = await markAll(personnel, selectedDate.value);
    showNotification(result.message, result.success ? 'success' : 'error');
};
</script>

<template>
  <div class="attendance-container">
    <header class="header glass-panel">
      <h1 class="title">Registro de Asistencia</h1>
      
      <div class="clock-display">
        <div class="date-selector">
            <label>Fecha de Registro:</label>
            <div class="date-controls">
                <input type="date" v-model="selectedDate" class="date-input" />
                <button @click="printMonthlyReport" class="btn-print" title="Imprimir Reporte Mensual PDF">
                    🖨️ PDF Mensual
                </button>
            </div>
        </div>

        <div class="time-wrapper" v-if="isToday">
          <span class="time">{{ formattedTime }}</span>
          <span class="date">{{ formattedDate }}</span>
        </div>
        
        <div class="actions-wrapper">
             <div class="status-badge" :class="{ 'open': isWithinSchedule, 'closed': !isWithinSchedule }" v-if="isToday">
              <span class="status-dot"></span>
              {{ isWithinSchedule ? 'SISTEMA ABIERTO' : 'SISTEMA CERRADO' }}
            </div>
            <div class="status-badge manual" v-else>
                <span class="status-dot"></span>
                MODO HISTÓRICO
            </div>
            
            <button v-if="isToday && isWithinSchedule" @click="handleMarkAll" class="btn-mark-all">
                Marcar Todos (Presente)
            </button>
        </div>
      </div>
    </header>

    <main class="staff-list-container glass-panel">
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Colaborador</th>
              <th>Cargo</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="person in personnel" :key="person.id" class="staff-row">
              <td class="id-cell">#{{ person.id }}</td>
              <td class="name-cell">
                <div class="avatar-placeholder">{{ person.name.charAt(0) }}</div>
                <span class="name-text">{{ person.name }}</span>
              </td>
              <td class="role-cell">{{ person.role }}</td>
              <td>
                <div v-if="getStatus(person.id, selectedDate)?.status === 'Presente'" class="status-pill present">
                  Presente
                </div>
                <div v-else-if="getStatus(person.id, selectedDate)?.status === 'Falta'" class="status-pill absent">
                  Falta
                </div>
                <div v-else class="status-pill pending">
                  Pendiente
                </div>
              </td>
              <td class="actions-cell">
                <button 
                  @click="toggleAttendance(person.id)" 
                  :disabled="isToday && !isWithinSchedule"
                  class="btn-checkin"
                  :class="{ 'btn-danger': getStatus(person.id, selectedDate) }"
                >
                  {{ getStatus(person.id, selectedDate) ? 'Desmarcar' : 'Marcar' }}
                </button>
                
                <button 
                    v-if="!getStatus(person.id, selectedDate)"
                    @click="handleMarkAbsent(person.id)"
                    :disabled="isToday && !isWithinSchedule"
                    class="btn-absent"
                    title="Marcar como Falta"
                >
                    🚫
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Printable Area (Hidden on Screen) -->
    <div class="print-sheet screen-hidden">
        <header class="report-header">
            <h1 class="company-name">CONSORCIO <span class="blue-text">GALCAS</span> INGENIEROS</h1>
            <div class="company-info">
                <p><strong>RUC:</strong> 20612913766</p>
                <p><strong>DIRECCIÓN:</strong> AV. SALAVERRY N° 2415 INT. 202 - SAN ISIDRO - LIMA</p>
            </div>
            
            <h2 class="report-title">
                REPORTE GENERAL DE ASISTENCIA MENSUAL 
                - {{ selectedDate ? selectedDate.split('-')[1] + '/' + selectedDate.split('-')[0] : '' }}
            </h2>
        </header>

        <table class="report-table">
            <thead>
                <tr>
                    <th rowspan="2" class="w-item">N°</th>
                    <th rowspan="2" class="w-name">APELLIDOS Y NOMBRES</th>
                    <th rowspan="2" class="w-role">CARGO</th>
                    <th :colspan="daysInMonth.length" class="text-center bg-gray">DÍAS DEL MES</th>
                    <th colspan="2" class="text-center bg-gray">TOTAL</th>
                </tr>
                <tr>
                    <th v-for="day in daysInMonth" :key="day" class="w-day">{{ day }}</th>
                    <th class="w-total">P</th>
                    <th class="w-total">F</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(person, index) in monthlyAttendanceList" :key="index">
                    <td class="text-center">{{ index + 1 }}</td>
                    <td class="text-left font-sm">{{ person.name }}</td>
                    <td class="text-left font-xs">{{ person.role }}</td>
                    <td v-for="(status, i) in person.attendance" :key="i" class="text-center font-bold"
                        :class="{'text-green': status === 'P', 'text-red': status === 'F'}">
                        {{ status }}
                    </td>
                    <td class="text-center font-bold text-green">{{ person.totalPresent }}</td>
                    <td class="text-center font-bold text-red">{{ person.totalAbsent }}</td>
                </tr>
            </tbody>
        </table>

        <div class="leyenda mt-4">
            <p><strong>LEYENDA:</strong> <span class="text-green">P</span> = Presente | <span class="text-red">F</span> = Falta</p>
        </div>
    </div>
  </div>
</template>

<style scoped>
.attendance-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Glassmorphism Common */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  background: var(--primary-gradient);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.clock-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.time-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1;
  color: #334155;
  font-variant-numeric: tabular-nums;
}

.date {
  font-size: 1.1rem;
  color: var(--text-muted);
  text-transform: capitalize;
  margin-top: 0.5rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

.status-badge.open {
  background-color: var(--success-bg);
  color: #059669;
}

.status-badge.closed {
  background-color: var(--danger-bg);
  color: #dc2626;
}

.status-badge.manual {
    background-color: #fef3c7;
    color: #d97706;
}

.date-selector {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.date-selector label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
}

.date-input {
    background-color: white;
    padding: 0.5rem 1rem;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 1rem;
    color: #334155;
    outline: none;
    transition: all 0.2s;
}

.date-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Table Styles */
.staff-list-container {
  padding: 0; /* Let table fill */
  overflow: hidden;
}

.table-responsive {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

thead th {
  padding: 1.25rem 1.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  background-color: rgba(255,255,255,0.5);
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

tbody tr {
  transition: background-color 0.2s ease;
  border-bottom: 1px solid rgba(0,0,0,0.02);
}

tbody tr:last-child {
  border-bottom: none;
}

tbody tr:hover {
  background-color: rgba(255,255,255,0.4);
}

td {
  padding: 1.25rem 1.5rem;
  vertical-align: middle;
}

.id-cell {
  font-family: monospace;
  color: var(--text-muted);
  font-weight: 600;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.875rem;
}

.name-text {
  font-weight: 600;
  color: var(--text-main);
}

.role-cell {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-pill.present {
  background-color: var(--success-bg);
  color: #059669;
}

.status-pill.pending {
  background-color: #f1f5f9;
  color: #64748b;
}

.checkin-time {
  font-size: 0.75rem;
  opacity: 0.8;
  margin-left: 0.25rem;
}

.btn-checkin {
  background: var(--primary-gradient);
  color: white;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
}

.btn-checkin:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
}

/* Actions Wrapper in Header */
.actions-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.btn-mark-all {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 0.6rem 1.25rem;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    border: none;
    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-mark-all:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);
}

/* Actions Cell */
.actions-cell {
    display: flex;
    gap: 8px;
    align-items: center;
}

.btn-absent {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #64748b;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    transition: all 0.2s;
}

.btn-absent:hover {
    background: #fee2e2;
    color: #ef4444;
    border-color: #fecaca;
    transform: translateY(-2px);
}

/* Status Pill Absent */
.status-pill.absent {
  background-color: #fee2e2;
  color: #ef4444;
}

/* Red button for 'Desmarcar' */
.btn-checkin.btn-danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3);
}

.btn-checkin.btn-danger:hover:not(:disabled) {
    box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.4);
}

.btn-checkin:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

@media (max-width: 640px) {
  .header {
    padding: 1.5rem;
  }
  
  .title {
    font-size: 1.5rem;
  }
  
  .time {
    font-size: 2.5rem;
  }
  
  td, th {
    padding: 1rem;
  }
  
  .role-cell {
    display: none; /* Hide role on small screens if needed */
  }
}

/* Print Styles */
.screen-hidden {
    display: none;
}

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
  .attendance-container > .header,
  .attendance-container > .staff-list-container,
  nav, button, .app-layout > *:not(.content-area) {
    display: none !important;
  }
  
  /* Overrides for dev tools just in case */
  body > div:not(#app),
  [id*="vite-plugin-vue-devtools"] {
      display: none !important;
  }

  .attendance-container {
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .print-sheet {
    display: block !important;
    width: 100%;
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    color: black;
  }

  .report-header {
      margin-bottom: 20px;
  }

  .company-name {
    color: #009e60;
    font-size: 20pt;
    font-weight: 900;
    text-align: center;
    margin: 0;
  }

  .blue-text { color: #1e3a8a; }
  
  .company-info {
    font-size: 9pt;
    text-align: center;
    margin-top: 5px;
  }

  .report-title {
    text-align: center;
    font-size: 14pt;
    margin: 15px 0;
    text-decoration: underline;
  }

  .report-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
  }

  .report-table th, .report-table td {
    border: 1px solid #000;
    padding: 4px;
    vertical-align: middle;
  }

  .report-table th {
    background-color: #f3f4f6 !important;
    font-weight: bold;
  }

  .bg-gray {
      background-color: #e5e7eb !important;
  }

  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .font-bold { font-weight: bold; }
  .font-sm { font-size: 8pt; }
  .font-xs { font-size: 7pt; }
  
  .text-green { color: #059669 !important; }
  .text-red { color: #dc2626 !important; }

  .w-item { width: 20px; }
  .w-name { width: 220px; }
  .w-role { width: 100px; }
  .w-day { width: 20px; font-size: 7pt; padding: 2px !important; }
  .w-total { width: 25px; }
  
  .leyenda {
      font-size: 9pt;
      margin-top: 15px;
      page-break-inside: avoid;
  }
}
</style>

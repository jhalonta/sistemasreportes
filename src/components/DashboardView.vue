<script setup>
import { computed, ref } from 'vue';
import { useActivities } from '../composables/useActivities';
import { useGlobalStore } from '../stores/global';
import { storeToRefs } from 'pinia';
import { Bar, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS, Title, Tooltip, Legend,
  BarElement, ArcElement, CategoryScale, LinearScale
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const { activities } = useActivities();
const globalStore = useGlobalStore();
const { selectedDate } = storeToRefs(globalStore);

// ── Filter mode: 'day' | 'month' ──────────────────────────────────────
const filterMode = ref('day');

const filteredActivities = computed(() => {
  if (!selectedDate.value) return [];
  const key = filterMode.value === 'day'
    ? selectedDate.value                    // YYYY-MM-DD
    : selectedDate.value.substring(0, 7);  // YYYY-MM
  return activities.value.filter(a => a.timestamp.startsWith(key));
});

// ── KPI Totals ─────────────────────────────────────────────────────────
const totalEstimado = computed(() =>
  filteredActivities.value.reduce((s, a) => s + (parseFloat(a.projectedValue) || 0), 0)
);
const totalRealizado = computed(() =>
  filteredActivities.value.reduce((s, a) => s + (parseFloat(a.realizedValue) || 0), 0)
);
const diferencia = computed(() => totalRealizado.value - totalEstimado.value);
const eficiencia = computed(() =>
  totalEstimado.value > 0
    ? ((totalRealizado.value / totalEstimado.value) * 100).toFixed(1)
    : '0.0'
);

const fmt = (n) => `S/ ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

// ── Bar Chart: estimado vs realizado por técnico ───────────────────────
const barData = computed(() => {
  const map = {};
  filteredActivities.value.forEach(a => {
    const projected = parseFloat(a.projectedValue) || 0;
    const realized = parseFloat(a.realizedValue) || 0;
    const mainName = shortName(a.mainTechName || 'Desconocido');

    if (!map[mainName]) map[mainName] = { est: 0, real: 0 };

    if (a.partnerTechName) {
      const partnerName = shortName(a.partnerTechName);
      if (!map[partnerName]) map[partnerName] = { est: 0, real: 0 };
      
      map[mainName].est += projected / 2;
      map[mainName].real += realized / 2;
      map[partnerName].est += projected / 2;
      map[partnerName].real += realized / 2;
    } else {
      map[mainName].est += projected;
      map[mainName].real += realized;
    }
  });
  const labels = Object.keys(map);
  return {
    labels,
    datasets: [
      {
        label: 'Estimado (S/.)',
        data: labels.map(l => map[l].est),
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Realizado (S/.)',
        data: labels.map(l => map[l].real),
        backgroundColor: 'rgba(16,185,129,0.7)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };
});

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' },
    title: { display: true, text: 'Estimado vs Realizado por Técnico (S/.)', font: { size: 14 } },
  },
  scales: {
    x: { ticks: { maxRotation: 35, font: { size: 11 } } },
    y: { beginAtZero: true },
  },
};

// ── Doughnut Chart: distribución realizado por técnico ─────────────────
const donutData = computed(() => {
  const map = {};
  filteredActivities.value.forEach(a => {
    const realized = parseFloat(a.realizedValue) || 0;
    const mainName = shortName(a.mainTechName || 'Desconocido');
    
    if (a.partnerTechName) {
      const partnerName = shortName(a.partnerTechName);
      map[mainName] = (map[mainName] || 0) + (realized / 2);
      map[partnerName] = (map[partnerName] || 0) + (realized / 2);
    } else {
      map[mainName] = (map[mainName] || 0) + realized;
    }
  });
  const labels = Object.keys(map);
  const palette = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#a3e635'];
  return {
    labels,
    datasets: [{
      data: labels.map(l => map[l]),
      backgroundColor: palette,
      borderWidth: 2,
    }],
  };
});
const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' },
    title: { display: true, text: 'Distribución de Producción Real', font: { size: 14 } },
  },
};

// ── Daily breakdown (for month mode) ──────────────────────────────────
const dailyBreakdown = computed(() => {
  if (filterMode.value !== 'month') return [];
  const map = {};
  filteredActivities.value.forEach(a => {
    const day = a.timestamp.split('T')[0];
    if (!map[day]) map[day] = { est: 0, real: 0 };
    map[day].est  += parseFloat(a.projectedValue) || 0;
    map[day].real += parseFloat(a.realizedValue)  || 0;
  });
  return Object.keys(map).sort().map(day => ({
    day,
    label: new Date(day + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', weekday: 'short' }),
    est:  map[day].est,
    real: map[day].real,
    eff:  map[day].est > 0 ? ((map[day].real / map[day].est) * 100).toFixed(0) : '0',
  }));
});

// ── Helpers ────────────────────────────────────────────────────────────
function shortName(fullName) {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  return parts.length > 2 ? `${parts[0]} ${parts[2] || parts[1]}` : fullName;
}
</script>

<template>
  <div class="dash-wrap">

    <!-- ── Top Controls ── -->
    <div class="dash-controls glass">
      <div class="ctrl-left">
        <h2 class="dash-title">📊 Dashboard de Producción</h2>
      </div>
      <div class="ctrl-right">
        <div class="toggle-group">
          <button :class="['tog', filterMode === 'day' ? 'tog-active' : '']" @click="filterMode = 'day'">Día</button>
          <button :class="['tog', filterMode === 'month' ? 'tog-active' : '']" @click="filterMode = 'month'">Mes</button>
        </div>
        <input type="date" v-model="selectedDate" class="date-inp" />
      </div>
    </div>

    <!-- ── KPI Cards ── -->
    <div class="kpi-row">
      <div class="kpi-card kpi-est">
        <p class="kpi-label">💰 Estimado</p>
        <p class="kpi-value">{{ fmt(totalEstimado) }}</p>
        <p class="kpi-sub">{{ filteredActivities.length }} actividades</p>
      </div>
      <div class="kpi-card kpi-real">
        <p class="kpi-label">✅ Realizado</p>
        <p class="kpi-value">{{ fmt(totalRealizado) }}</p>
        <p class="kpi-sub">Producción efectiva</p>
      </div>
      <div :class="['kpi-card', diferencia >= 0 ? 'kpi-pos' : 'kpi-neg']">
        <p class="kpi-label">{{ diferencia >= 0 ? '📈' : '📉' }} Diferencia</p>
        <p class="kpi-value">{{ diferencia >= 0 ? '+' : '' }}{{ fmt(diferencia) }}</p>
        <p class="kpi-sub">Realizado − Estimado</p>
      </div>
      <div :class="['kpi-card', Number(eficiencia) >= 100 ? 'kpi-pos' : Number(eficiencia) >= 75 ? 'kpi-warn' : 'kpi-neg']">
        <p class="kpi-label">⚡ Eficiencia</p>
        <p class="kpi-value">{{ eficiencia }}%</p>
        <div class="progress-bar-wrap">
          <div class="progress-bar" :style="{ width: Math.min(Number(eficiencia), 100) + '%', background: Number(eficiencia) >= 100 ? '#10b981' : Number(eficiencia) >= 75 ? '#f59e0b' : '#ef4444' }"></div>
        </div>
      </div>
    </div>

    <!-- ── Charts ── -->
    <div class="charts-row" v-if="filteredActivities.length > 0">
      <div class="chart-box glass">
        <div class="chart-inner">
          <Bar :data="barData" :options="barOptions" />
        </div>
      </div>
      <div class="chart-box glass">
        <div class="chart-inner">
          <Doughnut :data="donutData" :options="donutOptions" />
        </div>
      </div>
    </div>

    <!-- ── Monthly daily table ── -->
    <div class="glass daily-table" v-if="filterMode === 'month' && dailyBreakdown.length > 0">
      <h3 class="tbl-title">Desglose Diario del Mes</h3>
      <table class="breakdown-tbl">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Estimado</th>
            <th>Realizado</th>
            <th>Diferencia</th>
            <th>Eficiencia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in dailyBreakdown" :key="d.day">
            <td>{{ d.label }}</td>
            <td class="num">{{ fmt(d.est) }}</td>
            <td :class="['num', d.real >= d.est ? 'txt-green' : 'txt-red']">{{ fmt(d.real) }}</td>
            <td :class="['num', d.real - d.est >= 0 ? 'txt-green' : 'txt-red']">
              {{ d.real - d.est >= 0 ? '+' : '' }}{{ fmt(d.real - d.est) }}
            </td>
            <td class="num">
              <span :class="['eff-badge', Number(d.eff) >= 100 ? 'eff-ok' : Number(d.eff) >= 75 ? 'eff-warn' : 'eff-bad']">
                {{ d.eff }}%
              </span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tbl-total">
            <td><strong>TOTAL</strong></td>
            <td class="num"><strong>{{ fmt(totalEstimado) }}</strong></td>
            <td class="num"><strong>{{ fmt(totalRealizado) }}</strong></td>
            <td class="num"><strong>{{ diferencia >= 0 ? '+' : '' }}{{ fmt(diferencia) }}</strong></td>
            <td class="num"><strong>{{ eficiencia }}%</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ── Empty state ── -->
    <div class="empty-dash glass" v-if="filteredActivities.length === 0">
      <p>🔍 No hay producción registrada para esta {{ filterMode === 'day' ? 'fecha' : 'mes' }}.</p>
    </div>

  </div>
</template>

<style scoped>
.dash-wrap {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 2rem;
  color: #1e293b;
}

/* Glass */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-lg);
}

/* Controls */
.dash-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.ctrl-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.dash-title {
  font-size: 1.4rem;
  font-weight: 800;
  background: linear-gradient(135deg,#4f46e5,#7c3aed);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}
.toggle-group { display: flex; border-radius: 8px; overflow: hidden; border: 1.5px solid #6366f1; }
.tog {
  padding: 0.4rem 1rem;
  border: none;
  background: transparent;
  color: #6366f1;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
}
.tog-active { background: #6366f1; color: white; }
.date-inp {
  padding: 0.4rem 0.75rem;
  border: 1.5px solid var(--border-2);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  color: var(--text-main);
  background: var(--bg-input);
}

/* KPI Row */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.kpi-card {
  border-radius: var(--radius-md);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: transform .2s;
}
.kpi-card:hover { transform: translateY(-3px); }
.kpi-est  { background: var(--card-gradient-1); }
.kpi-real { background: var(--card-gradient-2); }
.kpi-pos  { background: var(--card-gradient-2); }
.kpi-neg  { background: var(--card-gradient-3); }
.kpi-warn { background: var(--card-gradient-4); }
.kpi-label { font-size: .8rem; font-weight: 700; text-transform: uppercase; color: var(--text-sub); margin: 0; }
.kpi-value { font-size: 1.6rem; font-weight: 900; color: var(--text-main); margin: 0; }
.kpi-sub { font-size: .75rem; color: var(--text-muted); margin: 0; }

/* Progress bar */
.progress-bar-wrap {
  height: 6px;
  background: rgba(0,0,0,0.12);
  border-radius: 99px;
  overflow: hidden;
  margin-top: 4px;
}
.progress-bar {
  height: 100%;
  border-radius: 99px;
  transition: width .6s ease;
}

/* Charts */
.charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}
.chart-box { padding: 1.5rem; }
.chart-inner { height: 360px; position: relative; }

/* Table */
.daily-table { padding: 1.5rem; overflow-x: auto; }
.tbl-title { font-size: 1rem; font-weight: 700; color: var(--text-sub); margin: 0 0 1rem; }
.breakdown-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: .9rem;
  color: var(--text-main);
}
.breakdown-tbl th, .breakdown-tbl td {
  padding: .6rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-2);
}
.breakdown-tbl th {
  background: var(--bg-card-2);
  font-weight: 700;
  color: var(--text-sub);
  text-transform: uppercase;
  font-size: .75rem;
  letter-spacing: .04em;
}
.breakdown-tbl tbody tr:hover { background: var(--bg-card-2); }
.num { text-align: right; font-family: monospace; }
.txt-green { color: var(--success); font-weight: 700; }
.txt-red   { color: var(--danger); font-weight: 700; }
.tbl-total td { border-top: 2px solid var(--border-2); background: var(--bg-card-2); }
.tbl-total td, .tbl-total strong { color: var(--text-main); }

.eff-badge { display: inline-block; padding: .2rem .6rem; border-radius: 99px; font-size: .8rem; font-weight: 700; }
.eff-ok   { background: var(--success-bg); color: var(--success-fg); }
.eff-warn { background: var(--warning-bg); color: var(--warning-fg); }
.eff-bad  { background: var(--danger-bg);  color: var(--danger-fg); }

/* Empty */
.empty-dash {
  padding: 3rem;
  text-align: center;
  color: #94a3b8;
  font-size: 1rem;
}

@media (max-width: 768px) {
  .charts-row { grid-template-columns: 1fr; }
  .chart-inner { height: 280px; }
}

</style>

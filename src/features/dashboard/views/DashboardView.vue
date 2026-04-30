<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { LayoutDashboard, DollarSign, CheckCircle, TrendingUp, TrendingDown, Zap, Search, BarChart3, Table2, Calendar as CalendarIcon, Clock } from 'lucide-vue-next';
import { useActivityStore } from '@/features/activities/store/activityStore';
import { useGlobalStore } from '@/stores/global';
import { useAuthStore } from '@/features/auth/store/authStore';
import { usePersonalStore } from '@/features/personal/store/personalStore';
import { useLocationStore } from '@/features/locations/store/locationStore';
import { storeToRefs } from 'pinia';
import { cn } from '@/lib/utils';
import { DateFormatter, getLocalTimeZone, parseDate, today } from '@internationalized/date';

// Shadcn Components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Chart.js via vue-chartjs
import { Bar, Doughnut } from 'vue-chartjs';
import {
    Chart as ChartJS,
    Title, Tooltip, Legend,
    BarElement, CategoryScale, LinearScale,
    ArcElement
} from 'chart.js';
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

const activityStore = useActivityStore();
const globalStore = useGlobalStore();
const authStore = useAuthStore();
const techStore = usePersonalStore();
const locationStore = useLocationStore();
const { selectedDate } = storeToRefs(globalStore);

const df = new DateFormatter('es-PE', {
    dateStyle: 'long',
});

const dateValue = computed({
    get: () => {
        try {
            if (!selectedDate.value) return undefined;
            return parseDate(selectedDate.value);
        } catch (e) {
            return undefined;
        }
    },
    set: (val) => {
        if (val) {
            globalStore.setDate(val.toString());
        }
    }
});

const selectedLocationId = ref('all');

onMounted(async () => {
    await Promise.all([
        activityStore.fetchActivities(),
        techStore.fetchTechnicians(),
        locationStore.fetchLocations()
    ]);
});

watch(() => authStore.userProfile, (profile) => {
    if (profile?.role === 'sede') {
        selectedLocationId.value = profile.locationId;
    }
}, { immediate: true });

// ── Filter mode: 'day' | 'month' ──────────────────────────────────────
const filterMode = ref('day');

const filteredActivities = computed(() => {
    if (!selectedDate.value) return [];
    const key = filterMode.value === 'day'
        ? selectedDate.value
        : selectedDate.value.substring(0, 7);

    let filtered = activityStore.activities.filter(a => a.timestamp.startsWith(key));

    const profile = authStore.userProfile;

    // Apply Location Filter
    if (profile?.role === 'sede') {
        filtered = filtered.filter(a => a.locationId === profile.locationId);
    } else if (profile?.role === 'admin' && selectedLocationId.value !== 'all') {
        filtered = filtered.filter(a => a.locationId === selectedLocationId.value);
    }

    return filtered;
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
    totalEstimado.value > 0 ? (totalRealizado.value / totalEstimado.value) * 100 : 0
);

const fmt = (n) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Raw data maps ──────────────────────────────────────────────────────
function buildTechMap(activities) {
    const map = {};
    activities.forEach(a => {
        const projected = parseFloat(a.projectedValue) || 0;
        const realized = parseFloat(a.realizedValue) || 0;
        const mainId = a.mainTechId || 'Desconocido';

        if (!map[mainId]) map[mainId] = { est: 0, real: 0, name: a.mainTechName || 'Desconocido' };

        if (a.partnerTechId) {
            const partnerId = a.partnerTechId;
            if (!map[partnerId]) map[partnerId] = { est: 0, real: 0, name: a.partnerTechName || 'Desconocido' };
            map[mainId].est += projected / 2;
            map[mainId].real += realized / 2;
            map[partnerId].est += projected / 2;
            map[partnerId].real += realized / 2;
        } else {
            map[mainId].est += projected;
            map[mainId].real += realized;
        }
    });
    return map;
}

const PALETTE = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

// ── Bar Chart (Chart.js) ──────────────────────────────────────────────
const barChartData = computed(() => {
    const map = buildTechMap(filteredActivities.value);
    const sorted = Object.keys(map).sort((a, b) => map[b].real - map[a].real);
    const labels = sorted.map(id => shortName(map[id].name));

    return {
        labels,
        datasets: [
            {
                label: 'Estimado',
                data: sorted.map(id => parseFloat(map[id].est.toFixed(2))),
                backgroundColor: 'rgba(148, 163, 184, 0.7)',
                borderColor: 'rgba(148, 163, 184, 1)',
                borderWidth: 1,
                borderRadius: 5,
                borderSkipped: false,
            },
            {
                label: 'Realizado',
                data: sorted.map(id => parseFloat(map[id].real.toFixed(2))),
                backgroundColor: 'rgba(99, 102, 241, 0.85)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                borderRadius: 5,
                borderSkipped: false,
            }
        ]
    };
});

const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: {
            position: 'top',
            align: 'end',
            labels: {
                boxWidth: 10,
                boxHeight: 10,
                borderRadius: 3,
                useBorderRadius: true,
                font: { size: 11, weight: '600' },
                padding: 16,
                color: 'hsl(215 20.2% 65.1%)',
            }
        },
        tooltip: {
            backgroundColor: 'rgba(15,15,20,0.9)',
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.75)',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: S/ ${ctx.parsed.y.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
            }
        }
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: {
                font: { size: 10, weight: '600' },
                color: 'hsl(215 20.2% 65.1%)',
                autoSkip: false,
                maxRotation: 45,
                minRotation: 45,
            },
            border: { display: false },
        },
        y: {
            grid: {
                color: 'rgba(148,163,184,0.1)',
            },
            border: { display: false, dash: [4, 4] },
            ticks: {
                font: { size: 10 },
                color: 'hsl(215 20.2% 65.1%)',
                callback: (v) => `S/ ${v.toLocaleString('es-PE')}`
            }
        }
    }
};

// ── Doughnut Chart (Chart.js) ─────────────────────────────────────────
const doughnutChartData = computed(() => {
    const map = buildTechMap(filteredActivities.value);
    const sorted = Object.keys(map).sort((a, b) => map[b].real - map[a].real);

    return {
        labels: sorted.map(id => shortName(map[id].name)),
        datasets: [{
            data: sorted.map(id => parseFloat(map[id].real.toFixed(2))),
            backgroundColor: PALETTE.slice(0, sorted.length),
            hoverBackgroundColor: PALETTE.slice(0, sorted.length),
            borderColor: 'transparent',
            borderWidth: 3,
            hoverOffset: 8,
        }]
    };
});

const doughnutChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                boxWidth: 10,
                boxHeight: 10,
                borderRadius: 3,
                useBorderRadius: true,
                font: { size: 11, weight: '600' },
                padding: 12,
                color: 'hsl(215 20.2% 65.1%)',
            }
        },
        tooltip: {
            backgroundColor: 'rgba(15,15,20,0.9)',
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.75)',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
                label: (ctx) => {
                    const val = ctx.parsed;
                    const total = totalRealizado.value;
                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                    return ` S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2 })} (${pct}%)`;
                }
            }
        }
    }
}));

// ── Daily breakdown (for month mode) ──────────────────────────────────
const dailyBreakdown = computed(() => {
    if (filterMode.value !== 'month') return [];
    const map = {};
    filteredActivities.value.forEach(a => {
        const day = a.timestamp.split('T')[0];
        if (!map[day]) map[day] = { est: 0, real: 0 };
        map[day].est += parseFloat(a.projectedValue) || 0;
        map[day].real += parseFloat(a.realizedValue) || 0;
    });
    return Object.keys(map).sort().map(day => ({
        day,
        label: new Date(day + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', weekday: 'short' }),
        est: map[day].est,
        real: map[day].real,
        eff: map[day].est > 0 ? (map[day].real / map[day].est) * 100 : 0,
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
    <div class="flex flex-1 flex-col min-w-0 gap-3 p-4 pt-2 overflow-y-auto">

        <!-- Header -->
        <div class="flex items-center justify-between gap-3">
            <div class="space-y-0.5">
                <h1 class="text-base font-bold tracking-tight flex items-center gap-2">
                    <LayoutDashboard :size="18" class="text-primary shrink-0" />
                    Dashboard de Producción
                </h1>
                <p class="text-[11px] text-muted-foreground uppercase tracking-widest font-black">
                    Métricas de rendimiento y eficiencia
                </p>
            </div>

            <div class="flex items-center gap-2">
                <!-- Sede (admin only) -->
                <div v-if="authStore.userProfile?.role === 'admin'" class="w-48 shrink-0">
                    <Select v-model="selectedLocationId">
                        <SelectTrigger class="h-8 text-[11px] font-bold w-full overflow-hidden bg-background">
                            <SelectValue placeholder="Seleccionar Sede" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las Sedes</SelectItem>
                            <SelectItem v-for="loc in locationStore.locations" :key="loc.id" :value="loc.id">
                                {{ loc.nombre }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div class="flex rounded-md bg-muted/50 p-1 border">
                    <Button variant="ghost" size="sm"
                        :class="cn('h-7 text-[10px] font-bold px-3 transition-all', filterMode === 'day' ? 'bg-background shadow-sm' : 'text-muted-foreground')"
                        @click="filterMode = 'day'">
                        DIA
                    </Button>
                    <Button variant="ghost" size="sm"
                        :class="cn('h-7 text-[10px] font-bold px-3 transition-all', filterMode === 'month' ? 'bg-background shadow-sm' : 'text-muted-foreground')"
                        @click="filterMode = 'month'">
                        MES
                    </Button>
                </div>

                <!-- Shadcn DatePicker -->
                <Popover>
                    <PopoverTrigger as-child>
                        <Button variant="outline"
                            :class="cn('h-8 w-44 justify-start text-[11px] font-bold shrink-0 bg-background', !dateValue && 'text-muted-foreground')">
                            <CalendarIcon :size="13" class="mr-2 text-primary" />
                            {{ dateValue ? df.format(dateValue.toDate(getLocalTimeZone())) : 'Seleccionar fecha' }}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent class="w-auto p-0" align="end">
                        <Calendar v-model="dateValue" initial-focus />
                    </PopoverContent>
                </Popover>
            </div>
        </div>

        <!-- Info Bar (Activity Style) -->
        <Card class="border-dashed bg-muted/5">
            <CardContent class="p-2 flex items-center gap-3">
                <div v-if="selectedDate === today(getLocalTimeZone()).toString()"
                    class="flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-[10px] font-bold uppercase tracking-wider">Hoy</span>
                </div>
                <div v-else
                    class="flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    <Clock :size="13" />
                    <span class="text-[10px] font-bold uppercase tracking-wider">Histórico</span>
                </div>

                <div class="h-4 w-px bg-border mx-1"></div>

                <p class="text-[10px] text-muted-foreground italic flex-1">
                    Visualizando datos de <span class="font-bold text-foreground">{{ filterMode === 'day' ? 'un día' :
                        'un mes' }}</span>
                    {{authStore.userProfile?.role === 'admin' && selectedLocationId !== 'all' ? `en
                    ${locationStore.locations.find(l => l.id === selectedLocationId)?.nombre}` : '' }}
                </p>

                <div
                    class="flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                    <LayoutDashboard :size="12" />
                    <span class="text-[10px] font-bold uppercase tracking-wider">{{ filteredActivities.length }}
                        Registros</span>
                </div>
            </CardContent>
        </Card>

        <!-- KPI Cards Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

            <Card class="bg-indigo-50/10 border-indigo-500/20">
                <CardContent class="p-4 flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Estimado</span>
                        <DollarSign :size="14" class="text-indigo-500" />
                    </div>
                    <div class="text-lg font-black">{{ fmt(totalEstimado) }}</div>
                    <p class="text-[10px] text-muted-foreground">{{ filteredActivities.length }} actividades reportadas
                    </p>
                </CardContent>
            </Card>

            <Card class="bg-emerald-50/10 border-emerald-500/20">
                <CardContent class="p-4 flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Realizado</span>
                        <CheckCircle :size="14" class="text-emerald-500" />
                    </div>
                    <div class="text-lg font-black">{{ fmt(totalRealizado) }}</div>
                    <p class="text-[10px] text-muted-foreground">Producción efectiva real</p>
                </CardContent>
            </Card>

            <Card
                :class="cn(diferencia >= 0 ? 'bg-emerald-50/10 border-emerald-500/20' : 'bg-rose-50/10 border-rose-500/20')">
                <CardContent class="p-4 flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-wider"
                            :class="diferencia >= 0 ? 'text-emerald-500' : 'text-rose-500'">Diferencia</span>
                        <TrendingUp v-if="diferencia >= 0" :size="14" class="text-emerald-500" />
                        <TrendingDown v-else :size="14" class="text-rose-500" />
                    </div>
                    <div class="text-lg font-black">{{ diferencia >= 0 ? '+' : '' }}{{ fmt(diferencia) }}</div>
                    <p class="text-[10px] text-muted-foreground">Realizado vs Estimado</p>
                </CardContent>
            </Card>

            <Card
                :class="cn(eficiencia >= 100 ? 'bg-emerald-50/10 border-emerald-500/20' : eficiencia >= 75 ? 'bg-amber-50/10 border-amber-500/20' : 'bg-rose-50/10 border-rose-500/20')">
                <CardContent class="p-4 flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-wider"
                            :class="eficiencia >= 100 ? 'text-emerald-500' : eficiencia >= 75 ? 'text-amber-500' : 'text-rose-500'">Eficiencia</span>
                        <Zap :size="14"
                            :class="eficiencia >= 100 ? 'text-emerald-500' : eficiencia >= 75 ? 'text-amber-500' : 'text-rose-500'" />
                    </div>
                    <div class="space-y-1">
                        <div class="text-lg font-black">{{ eficiencia.toFixed(1) }}%</div>
                        <Progress :model-value="Math.min(eficiencia, 100)" class="h-1"
                            :class="eficiencia >= 100 ? '[&>div]:bg-emerald-500' : eficiencia >= 75 ? '[&>div]:bg-amber-500' : '[&>div]:bg-rose-500'" />
                    </div>
                </CardContent>
            </Card>

        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3" v-if="filteredActivities.length > 0">

            <!-- Bar Chart -->
            <Card class="lg:col-span-2 overflow-hidden">
                <div class="px-4 pt-3 pb-2 border-b bg-muted/20 flex items-center gap-2">
                    <BarChart3 :size="13" class="text-primary shrink-0" />
                    <h3 class="text-[10px] font-black uppercase tracking-wider">Diferencial por Técnico (S/.)</h3>
                </div>
                <CardContent class="p-4">
                    <div class="h-[260px]">
                        <Bar :data="barChartData" :options="barChartOptions" />
                    </div>
                </CardContent>
            </Card>

            <!-- Doughnut Chart -->
            <Card class="overflow-hidden">
                <div class="px-4 pt-3 pb-2 border-b bg-muted/20 flex items-center gap-2">
                    <TrendingUp :size="13" class="text-primary shrink-0" />
                    <h3 class="text-[10px] font-black uppercase tracking-wider">Distribución de Producción</h3>
                </div>
                <CardContent class="p-4">
                    <div class="h-[260px]">
                        <Doughnut :data="doughnutChartData" :options="doughnutChartOptions" />
                    </div>
                </CardContent>
            </Card>

        </div>

        <!-- Monthly Table -->
        <Card v-if="filterMode === 'month' && dailyBreakdown.length > 0" class="overflow-hidden">
            <div class="px-4 pt-3 pb-2 border-b bg-muted/20 flex items-center gap-2">
                <Table2 :size="13" class="text-primary shrink-0" />
                <h3 class="text-[10px] font-black uppercase tracking-wider">Desglose Diario del Mes</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow
                        class="bg-muted/10 text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">
                        <TableHead class="h-8">Fecha</TableHead>
                        <TableHead class="h-8 text-right">Estimado</TableHead>
                        <TableHead class="h-8 text-right">Realizado</TableHead>
                        <TableHead class="h-8 text-right">Diferencia</TableHead>
                        <TableHead class="h-8 text-center">Eficiencia</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-for="d in dailyBreakdown" :key="d.day" class="text-xs">
                        <TableCell class="font-medium h-9">{{ d.label }}</TableCell>
                        <TableCell class="text-right h-9">{{ fmt(d.est) }}</TableCell>
                        <TableCell class="text-right h-9 font-bold"
                            :class="d.real >= d.est ? 'text-emerald-500' : 'text-rose-500'">{{ fmt(d.real) }}
                        </TableCell>
                        <TableCell class="text-right h-9"
                            :class="d.real - d.est >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                            {{ d.real - d.est >= 0 ? '+' : '' }}{{ fmt(d.real - d.est) }}
                        </TableCell>
                        <TableCell class="text-center h-9">
                            <Badge variant="outline"
                                :class="cn('text-[10px] font-bold px-1.5 h-5 border-none', Number(d.eff) >= 100 ? 'bg-emerald-500/15 text-emerald-500' : Number(d.eff) >= 75 ? 'bg-amber-500/15 text-amber-500' : 'bg-rose-500/15 text-rose-500')">
                                {{ d.eff.toFixed(0) }}%
                            </Badge>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </Card>

        <!-- Empty State -->
        <div v-if="filteredActivities.length === 0"
            class="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed rounded-lg text-muted-foreground italic text-sm">
            <Search :size="32" class="opacity-20 mb-2" />
            No hay registros para este {{ filterMode === 'day' ? 'día' : 'mes' }}.
        </div>

    </div>
</template>

<style scoped>
/* No manual CSS — using Tailwind + Chart.js */
</style>

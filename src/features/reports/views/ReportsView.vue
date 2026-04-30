<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Table as TableIcon, CalendarDays, Calendar as CalendarIcon, FileText, FileDown, Download, Sheet, BarChart3, Search, Calendar as CalendarLucide, FileOutput } from 'lucide-vue-next';
import { useReports } from '../../../composables/useReports';
import { useGlobalStore } from '../../../stores/global';
import { useAttendanceStore } from '../../attendance/store/attendanceStore';
import { usePersonalStore } from '../../personal/store/personalStore';
import { useActivityStore } from '../../activities/store/activityStore';
import { storeToRefs } from 'pinia';
import { DateFormatter, getLocalTimeZone, parseDate, today } from '@internationalized/date';
import { cn } from '@/lib/utils';

// Shadcn Components
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';

// Chart.js via vue-chartjs
import { Bar } from 'vue-chartjs';
import {
    Chart as ChartJS,
    Title, Tooltip, Legend,
    BarElement, CategoryScale, LinearScale,
} from 'chart.js';
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

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
const techStore = usePersonalStore();
const activityStore = useActivityStore();

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

const subtitleText = computed(() => {
    return selectedDate.value ? df.format(parseDate(selectedDate.value).toDate(getLocalTimeZone())) : '';
});

onMounted(async () => {
    await Promise.all([
        techStore.fetchTechnicians(),
        activityStore.fetchActivities()
    ]);
});

watch(selectedDate, async (newDate) => {
    if (newDate) {
        const ym = newDate.substring(0, 7);
        await attendanceStore.fetchMonthlyAttendance(ym);
    }
}, { immediate: true });

const isGeneratingPdf = ref(false);

const shortName = (fullName) => {
    const parts = fullName.split(' ');
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : fullName;
};

const squadsData = computed(() => {
    if (!selectedDate.value) return [];

    const dayActivities = activityStore.activities.filter(a => a.timestamp.startsWith(selectedDate.value));
    const squads = {};

    dayActivities.forEach(act => {
        const realized = parseFloat(act.realizedValue) || 0;
        const assigned = parseFloat(act.projectedValue) || 0;
        if (realized === 0 && assigned === 0) return;

        const mainId = act.mainTechId;
        const partnerId = act.partnerTechId;
        const key = partnerId ? `${mainId}|${partnerId}` : `${mainId}`;

        if (!squads[key]) squads[key] = { realized: 0, assigned: 0, mainId, partnerId };
        squads[key].realized += realized;
        squads[key].assigned += assigned;
    });

    return Object.values(squads).map(squad => {
        const main = techStore.technicians.find(p => p.id === squad.mainId)?.fullName || 'Desconocido';
        const partner = squad.partnerId
            ? techStore.technicians.find(p => p.id === squad.partnerId)?.fullName
            : null;
        return {
            name: partner ? `${shortName(main)} & ${shortName(partner)}` : shortName(main),
            realized: parseFloat(squad.realized.toFixed(2)),
            assigned: parseFloat(squad.assigned.toFixed(2)),
        };
    });
});

const barChartData = computed(() => ({
    labels: squadsData.value.map(d => d.name),
    datasets: [
        {
            label: 'Asignado',
            data: squadsData.value.map(d => d.assigned),
            backgroundColor: 'rgba(148, 163, 184, 0.7)',
            borderColor: 'rgba(148, 163, 184, 1)',
            borderWidth: 1,
            borderRadius: 5,
            borderSkipped: false,
        },
        {
            label: 'Realizado',
            data: squadsData.value.map(d => d.realized),
            backgroundColor: 'rgba(99, 102, 241, 0.85)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1,
            borderRadius: 5,
            borderSkipped: false,
        }
    ]
}));

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
            ticks: { font: { size: 11, weight: '600' }, color: 'hsl(215 20.2% 65.1%)', maxRotation: 0 },
            border: { display: false },
        },
        y: {
            grid: { color: 'rgba(148,163,184,0.1)' },
            border: { display: false, dash: [4, 4] },
            ticks: {
                font: { size: 10 },
                color: 'hsl(215 20.2% 65.1%)',
                callback: (v) => `S/ ${v.toLocaleString('es-PE')}`
            }
        }
    }
};

const printDailyReport = () => {
    if (!selectedDate.value) return;
    isGeneratingPdf.value = true;
    try {
        const rows = generateDailyReport(selectedDate.value);
        downloadDailyReportPdf([{ date: selectedDate.value, rows }], `Reporte_Diario_${selectedDate.value}.pdf`);
    } catch (error) {
        console.error("Error en printDailyReport:", error);
        alert('Error al generar PDF Diario: ' + error.message);
    } finally {
        isGeneratingPdf.value = false;
    }
};

const printMonthlyReports = () => {
    if (!selectedDate.value) return;
    isGeneratingPdf.value = true;
    try {
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
    } catch (error) {
        console.error("Error en printMonthlyReports:", error);
        alert('Error al generar PDF Mensual: ' + error.message);
    } finally {
        isGeneratingPdf.value = false;
    }
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
    <div class="flex flex-1 flex-col min-w-0 gap-3 p-4 pt-2 overflow-y-auto">

        <!-- Page Header (Activity Style) -->
        <div class="flex items-center justify-between gap-3">
            <div class="space-y-0.5">
                <h1 class="text-base font-bold tracking-tight flex items-center gap-2">
                    <FileOutput :size="18" class="text-primary shrink-0" />
                    Generación de Reportes
                </h1>
                <p class="text-[11px] text-muted-foreground">{{ subtitleText }}</p>
            </div>

            <div class="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger as-child>
                        <Button variant="outline" :class="cn(
                            'h-8 w-full sm:w-48 justify-start text-[11px] font-normal shrink-0',
                            !dateValue && 'text-muted-foreground'
                        )">
                            <CalendarLucide :size="13" class="mr-2 text-primary" />
                            {{ dateValue ? df.format(dateValue.toDate(getLocalTimeZone())) : "Seleccionar fecha" }}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent class="w-auto p-0" align="end">
                        <Calendar v-model="dateValue" initial-focus />
                    </PopoverContent>
                </Popover>
            </div>
        </div>

        <!-- Filters Style Card (Information) -->
        <Card>
            <CardContent class="p-2 flex items-center gap-2">
                <div class="flex items-center gap-2 shrink-0 px-3 py-1 rounded-md bg-primary/10 text-primary">
                    <FileText :size="13" />
                    <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Opciones de
                        Exportación</span>
                </div>
                <div class="flex-1"></div>
                <p class="text-[10px] text-muted-foreground italic px-2">Selecciona un formato para descargar los datos
                    consolidados.</p>
            </CardContent>
        </Card>

        <!-- Cards Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">

            <!-- PDF Card -->
            <Card class="overflow-hidden">
                <div class="p-2 border-b bg-muted/30 flex items-center justify-between">
                    <h3 class="text-[10px] font-bold tracking-tight flex items-center gap-2 uppercase">
                        <FileDown :size="14" class="text-destructive" />
                        Exportar PDF
                    </h3>
                    <Badge variant="outline" class="text-[9px] font-medium px-1.5 py-0 bg-background">Oficial</Badge>
                </div>
                <CardContent class="p-3 flex flex-wrap gap-2">
                    <Button @click="printDailyReport" :disabled="isGeneratingPdf" variant="destructive" size="sm"
                        class="h-8 text-xs font-bold gap-1.5 flex-1 sm:flex-none">
                        <Download :size="13" />
                        {{ isGeneratingPdf ? '...' : 'Reporte Diario' }}
                    </Button>

                    <Button @click="printMonthlyReports" :disabled="isGeneratingPdf" variant="outline" size="sm"
                        class="h-8 text-xs font-bold gap-1.5 flex-1 sm:flex-none">
                        <Download :size="13" />
                        Todo el Mes
                    </Button>

                    <Button @click="printAttendanceGrid" :disabled="isGeneratingPdf" variant="secondary" size="sm"
                        class="h-8 text-xs font-bold gap-1.5 flex-1 sm:flex-none">
                        <Download :size="13" />
                        Asistencia
                    </Button>
                </CardContent>
            </Card>

            <!-- Excel Card -->
            <Card class="overflow-hidden">
                <div class="p-2 border-b bg-muted/30 flex items-center justify-between">
                    <h3 class="text-[10px] font-bold tracking-tight flex items-center gap-2 uppercase">
                        <Sheet :size="14" class="text-green-600" />
                        Exportar Excel
                    </h3>
                    <Badge variant="outline" class="text-[9px] font-medium px-1.5 py-0 bg-background">Editable</Badge>
                </div>
                <CardContent class="p-3 flex flex-wrap gap-2">
                    <Button @click="generateExcelReport('Diario', selectedDate)" variant="default" size="sm"
                        class="h-8 text-xs font-bold gap-1.5 flex-1 sm:flex-none bg-green-600 hover:bg-green-700">
                        <TableIcon :size="13" />
                        Diario
                    </Button>

                    <Button @click="generateExcelReport('Semanal', selectedDate)" variant="default" size="sm"
                        class="h-8 text-xs font-bold gap-1.5 flex-1 sm:flex-none bg-green-600 hover:bg-green-700">
                        <CalendarLucide :size="13" />
                        Semanal
                    </Button>

                    <Button @click="generateExcelReport('Mensual', selectedDate)" variant="default" size="sm"
                        class="h-8 text-xs font-bold gap-1.5 flex-1 sm:flex-none bg-green-600 hover:bg-green-700">
                        <CalendarIcon :size="13" />
                        Mensual
                    </Button>
                </CardContent>
            </Card>

        </div>

        <!-- Chart Section -->
        <Card class="no-print overflow-hidden">
            <div class="px-4 pt-3 pb-2 border-b bg-muted/20 flex items-center gap-2">
                <BarChart3 :size="13" class="text-primary shrink-0" />
                <h3 class="text-[10px] font-black uppercase tracking-wider">Visualización de Rendimiento</h3>
            </div>
            <CardContent class="p-4">
                <div class="h-[300px]">
                    <Bar v-if="squadsData.length > 0" :data="barChartData" :options="barChartOptions" />
                    <div v-else
                        class="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground italic text-[11px]">
                        <Search :size="24" class="opacity-20" />
                        <p>No hay producción registrada para esta fecha.</p>
                    </div>
                </div>
            </CardContent>
        </Card>

    </div>
</template>

<style scoped>
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

    .no-print,
    nav,
    button {
        display: none !important;
    }
}
</style>

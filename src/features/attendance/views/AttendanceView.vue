<script setup>
import { onMounted, computed, ref, watch } from 'vue';
import {
  ClipboardCheck, Printer, UserCheck, CircleCheck, CircleX,
  Clock, AlertTriangle, Search, HelpCircle, Stethoscope, CalendarIcon,
  MoreHorizontal, UserMinus
} from 'lucide-vue-next';
import { DateFormatter, getLocalTimeZone, parseDate, today } from '@internationalized/date';
import { useAttendanceStore } from '../store/attendanceStore';
import { usePersonalStore } from '../../personal/store/personalStore';
import { useAuthStore } from '../../auth/store/authStore';
import { useReports } from '@/composables/useReports';
import { useLocationStore } from '../../locations/store/locationStore';
import AttendanceNotesModal from '../components/AttendanceNotesModal.vue';
import AttendanceConfirmModal from '../components/AttendanceConfirmModal.vue';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const attendanceStore = useAttendanceStore();
const techStore = usePersonalStore();
const authStore = useAuthStore();
const locationStore = useLocationStore();
const { downloadMonthlyAttendancePdf } = useReports();

const df = new DateFormatter('es-PE', { dateStyle: 'long' });

const dateValue = computed({
  get: () => {
    try {
      return attendanceStore.selectedDate ? parseDate(attendanceStore.selectedDate) : undefined;
    } catch { return undefined; }
  },
  set: (val) => { if (val) attendanceStore.selectedDate = val.toString(); }
});

const isPopoverOpen = ref(false);

const isToday = computed(() => {
  if (!dateValue.value) return false;
  return dateValue.value.compare(today(getLocalTimeZone())) === 0;
});

const isPast = computed(() => {
  if (!dateValue.value) return false;
  return dateValue.value.compare(today(getLocalTimeZone())) < 0;
});

const isDateDisabled = (date) => {
  return date.compare(today(getLocalTimeZone())) > 0;
};

// Auto-close popover when a date is selected
watch(dateValue, (val, old) => {
  if (val && val !== old) {
    isPopoverOpen.value = false;
  }
});

const searchQuery = ref('');
const showNotesModal = ref(false);
const selectedTechForNotes = ref(null);
const pendingStatus = ref(null);
const notesText = ref('');
const selectedLocationId = ref('all');

const showConfirmModal = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmName = ref('');
const confirmAction = ref(null);
const confirmType = ref('danger');

const openConfirmModal = (title, message, name, action, type = 'danger') => {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmName.value = name;
  confirmAction.value = action;
  confirmType.value = type;
  showConfirmModal.value = true;
};

const handleConfirmAction = async () => {
  if (confirmAction.value) await confirmAction.value();
  showConfirmModal.value = false;
};

onMounted(async () => {
  await techStore.fetchTechnicians();
  await attendanceStore.fetchAttendance();
});

watch(() => authStore.userProfile, async (profile) => {
  if (!profile) return;
  if (profile.role === 'admin') {
    await locationStore.fetchLocations();
    if (!selectedLocationId.value) selectedLocationId.value = 'all';
  } else if (profile.role === 'sede') {
    selectedLocationId.value = profile.locationId;
  }
}, { immediate: true });

watch(() => attendanceStore.selectedDate, async (newDate) => {
  await attendanceStore.fetchAttendance(newDate);
});

const filteredTechnicians = computed(() => {
  const profile = authStore.userProfile;
  const query = searchQuery.value.toLowerCase();
  return techStore.sortedTechnicians.filter(t => {
    if (!t.active) return false;
    if (profile?.role === 'sede' && t.locationId !== profile.locationId) return false;
    if (profile?.role === 'admin' && selectedLocationId.value !== 'all' && t.locationId !== selectedLocationId.value) return false;
    return t.fullName.toLowerCase().includes(query) || t.role?.toLowerCase().includes(query);
  });
});

const subtitleText = computed(() =>
  authStore.userProfile?.role === 'sede'
    ? 'Gestiona la asistencia diaria de tu sede.'
    : 'Gestión diaria de asistencia del personal técnico.'
);

const presentCount = computed(() =>
  filteredTechnicians.value.filter(t => attendanceStore.records[t.id]?.status === 'present').length
);

const canMarkAll = computed(() => {
  // Enable if there are any technicians in the current filtered list who DON'T have a record yet
  return filteredTechnicians.value.some(t => !attendanceStore.records[t.id]);
});

const getStatusInfo = (status) => {
  const map = {
    present: { icon: CircleCheck, badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', label: 'Presente' },
    absent: { icon: CircleX, badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400', label: 'Falta' },
    late: { icon: Clock, badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', label: 'Tarde' },
    justified: { icon: CircleCheck, badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', label: 'Justificado' },
    dm: { icon: Stethoscope, badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400', label: 'D. Médico' },
    permiso: { icon: UserMinus, badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', label: 'Permiso' },
  };
  return map[status] ?? { icon: HelpCircle, badge: 'bg-muted text-muted-foreground', label: 'Pendiente' };
};

const handleStatusClick = async (techId, status) => {
  if (['late', 'justified', 'dm', 'absent', 'permiso'].includes(status)) {
    selectedTechForNotes.value = techId;
    pendingStatus.value = status;
    notesText.value = attendanceStore.records[techId]?.notes || '';
    showNotesModal.value = true;
  } else {
    await attendanceStore.setAttendanceStatus(techId, status);
  }
};

const saveWithNotes = async (newNotes) => {
  if (selectedTechForNotes.value && pendingStatus.value) {
    await attendanceStore.setAttendanceStatus(selectedTechForNotes.value, pendingStatus.value, { notes: newNotes });
    showNotesModal.value = false;
    selectedTechForNotes.value = null;
    pendingStatus.value = null;
    notesText.value = '';
  }
};

const handleTogglePresence = async (techId) => {
  if (attendanceStore.records[techId]) {
    const tech = techStore.technicians.find(t => t.id === techId);
    openConfirmModal(
      '¿Desmarcar Asistencia?',
      'Esta acción eliminará el registro de asistencia del técnico:',
      tech?.fullName || '',
      () => attendanceStore.removeAttendance(techId),
      'danger'
    );
  } else {
    await handleStatusClick(techId, 'present');
  }
};

const handleMarkAll = async () => {
  const ids = filteredTechnicians.value.filter(t => !attendanceStore.records[t.id]).map(t => t.id);
  if (!ids.length) return;
  openConfirmModal(
    '¿Marcar Todos los Filtrados?',
    `Se marcarán ${ids.length} técnicos como "Presentes" para el día seleccionado.`,
    '',
    () => attendanceStore.markBulkAttendance(attendanceStore.selectedDate, ids),
    'primary'
  );
};

const formatTime = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

const printReport = async () => {
  const ym = attendanceStore.selectedDate.substring(0, 7);
  await attendanceStore.fetchMonthlyAttendance(ym);
  downloadMonthlyAttendancePdf(ym);
};
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <div class="flex flex-1 flex-col gap-4 p-4 pt-2 min-w-0 overflow-y-auto">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-base font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck :size="18" class="text-primary" />
            Control de Asistencia diaria
          </h1>
          <p class="text-[11px] text-muted-foreground mt-0.5">{{ subtitleText }}</p>
        </div>
        <div class="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="sm" @click="handleMarkAll" :disabled="!canMarkAll"
                class="h-8 text-xs gap-1.5 font-bold shadow-sm px-3">
                <UserCheck :size="14" /> Marcar Todo
              </Button>
            </TooltipTrigger>
            <TooltipContent>Marcar todos como presentes</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button size="sm" variant="outline" @click="printReport" class="h-8 text-xs gap-1.5 font-bold px-3">
                <Printer :size="14" /> Reporte
              </Button>
            </TooltipTrigger>
            <TooltipContent>Descargar reporte mensual</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <!-- Filters -->
      <Card>
        <CardContent class="p-2 flex flex-col sm:flex-row items-center gap-2">
          <!-- Search -->
          <div class="relative flex-1 w-full">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold" :size="13" />
            <input v-model="searchQuery" type="text" placeholder="Buscar técnico..."
              class="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold" />
          </div>

          <!-- Location selector (admin only) -->
          <div v-if="authStore.userProfile?.role === 'admin'" class="w-full sm:w-64 shrink-0">
            <Select v-model="selectedLocationId">
              <SelectTrigger class="h-8 text-xs w-full overflow-hidden font-bold">
                <SelectValue placeholder="Sede" class="truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" class="font-bold">Todas las Sedes</SelectItem>
                <SelectItem v-for="loc in locationStore.locations" :key="loc.id" :value="loc.id" class="font-bold">
                  <span class="truncate block w-full">{{ loc.nombre }}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Date picker -->
          <Popover v-model:open="isPopoverOpen">
            <PopoverTrigger as-child>
              <Button variant="outline"
                :class="cn('h-8 w-full sm:w-48 justify-start text-xs font-bold shrink-0', !dateValue && 'text-muted-foreground')">
                <CalendarIcon :size="13" class="mr-2 text-primary" />
                {{ dateValue ? df.format(dateValue.toDate(getLocalTimeZone())) : 'Seleccionar fecha' }}
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0">
              <Calendar v-model="dateValue" :initial-focus="true" layout="month-and-year"
                :is-date-disabled="isDateDisabled" :max-value="today(getLocalTimeZone())" />
            </PopoverContent>
          </Popover>

          <!-- Historical mode badge -->
          <div v-if="isPast"
            class="flex items-center gap-2 shrink-0 px-3 py-1 rounded-md bg-amber-500/10 text-amber-600">
            <Clock :size="13" />
            <span class="text-xs font-bold uppercase tracking-wider">Histórico</span>
          </div>

          <!-- Present count -->
          <div class="flex items-center gap-2 shrink-0 px-3 py-1 rounded-md bg-primary/10 text-primary">
            <UserCheck :size="13" />
            <span class="text-xs font-bold">{{ presentCount }} presentes</span>
          </div>
        </CardContent>
      </Card>

      <!-- Table -->
      <Card>
        <!-- Loading -->
        <div v-if="attendanceStore.loading && techStore.technicians.length === 0"
          class="flex flex-col items-center justify-center py-20 gap-3">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p class="text-sm text-muted-foreground">Sincronizando registros...</p>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredTechnicians.length === 0"
          class="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <AlertTriangle :size="36" class="text-muted-foreground/40" />
          <div>
            <p class="font-semibold text-sm">Sin resultados</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-xs">No se encontraron técnicos activos con los filtros
              seleccionados.</p>
          </div>
        </div>

        <!-- Data table -->
        <div v-else class="overflow-x-auto">
          <Table class="min-w-[800px]">
            <TableHeader>
              <TableRow class="hover:bg-transparent bg-muted/30">
                <TableHead class="pl-4 text-[10px] font-bold uppercase tracking-widest">Nombre Completo</TableHead>
                <TableHead v-if="authStore.userProfile?.role === 'admin'" class="text-[10px] font-bold uppercase tracking-widest text-center">Sede</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest text-center">Cargo / Función</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest text-center">Estado</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest text-center">Hora Ingreso</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest text-right pr-4">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="t in filteredTechnicians" :key="t.id" class="group transition-colors">
                <!-- Name -->
                <TableCell class="pl-4 py-3">
                  <div class="flex items-center gap-3">
                    <Avatar class="h-8 w-8 rounded-lg border border-primary/10 shadow-sm">
                      <AvatarFallback class="rounded-lg bg-primary/5 text-primary text-[10px] font-bold">
                        {{ t.fullName.charAt(0) }}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p class="text-sm font-bold leading-tight text-foreground">{{ t.fullName }}</p>
                    </div>
                  </div>
                </TableCell>

                <!-- Sede (admin only) -->
                <TableCell v-if="authStore.userProfile?.role === 'admin'" class="text-center py-3">
                  <Badge variant="outline" class="text-[10px] font-bold uppercase tracking-wider border-muted-foreground/20">
                    {{locationStore.locations.find(l => l.id === t.locationId)?.nombre || 'Sin sede'}}
                  </Badge>
                </TableCell>

                <!-- Role -->
                <TableCell class="text-center py-3 text-sm">
                  <Badge variant="secondary" class="text-[10px] font-bold uppercase tracking-wider bg-muted border-none">{{ t.role || '-' }}</Badge>
                </TableCell>

                <!-- Status -->
                <TableCell class="text-center py-3">
                  <Badge
                    class="text-[10px] font-bold uppercase tracking-wider h-6 px-2.5 inline-flex items-center gap-1 border-none shadow-sm"
                    :class="getStatusInfo(attendanceStore.records[t.id]?.status).badge">
                    <component :is="getStatusInfo(attendanceStore.records[t.id]?.status).icon" :size="12" />
                    {{ getStatusInfo(attendanceStore.records[t.id]?.status).label }}
                  </Badge>
                </TableCell>

                <!-- Check-in time -->
                <TableCell class="text-center py-3 font-mono text-xs font-bold text-muted-foreground">
                  {{ formatTime(attendanceStore.records[t.id]?.checkIn) }}
                </TableCell>

                <!-- Actions -->
                <TableCell class="text-right pr-4 py-3">
                  <div class="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-primary transition-colors">
                          <MoreHorizontal :size="16" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" class="w-48">
                        <DropdownMenuLabel class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                          Opciones de Asistencia
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <!-- Toggle Presence / Mark Present -->
                        <DropdownMenuItem @click="handleTogglePresence(t.id)"
                          :class="attendanceStore.records[t.id] ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'">
                          <template v-if="!attendanceStore.records[t.id]">
                            <CircleCheck class="mr-2 h-4 w-4" />
                            <span>Marcar Presente</span>
                          </template>
                          <template v-else>
                            <CircleX class="mr-2 h-4 w-4" />
                            <span>Desmarcar Asistencia</span>
                          </template>
                        </DropdownMenuItem>

                        <!-- Additional statuses only if not marked present/anything yet -->
                        <template v-if="!attendanceStore.records[t.id]">
                          <DropdownMenuSeparator />
                          <DropdownMenuItem @click="handleStatusClick(t.id, 'late')" class="text-amber-600 font-medium">
                            <Clock class="mr-2 h-4 w-4" />
                            <span>Marcar Tarde</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem @click="handleStatusClick(t.id, 'absent')" class="text-rose-600 font-medium">
                            <CircleX class="mr-2 h-4 w-4" />
                            <span>Marcar Falta</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem @click="handleStatusClick(t.id, 'permiso')" class="text-amber-600 font-medium">
                            <UserMinus class="mr-2 h-4 w-4" />
                            <span>Marcar Permiso</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem @click="handleStatusClick(t.id, 'dm')" class="text-sky-600 font-medium">
                            <Stethoscope class="mr-2 h-4 w-4" />
                            <span>Descanso Médico</span>
                          </DropdownMenuItem>
                        </template>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      <AttendanceNotesModal :show="showNotesModal" :initial-notes="notesText" :loading="attendanceStore.loading"
        @close="showNotesModal = false" @save="saveWithNotes" />

      <AttendanceConfirmModal :show="showConfirmModal" :title="confirmTitle" :message="confirmMessage"
        :name="confirmName" :type="confirmType" :loading="attendanceStore.loading" @close="showConfirmModal = false"
        @confirm="handleConfirmAction" />
    </div>
  </TooltipProvider>
</template>
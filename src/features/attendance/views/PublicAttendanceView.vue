<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { usePersonalStore } from '../../personal/store/personalStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { attendanceService } from '../services/attendanceService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'vue-sonner';
import {
  Fingerprint, Clock, CheckCircle2, ChevronRight, User, AlertCircle, RefreshCw, LogOut, LogIn, ArrowLeft
} from 'lucide-vue-next';

const personalStore = usePersonalStore();
const attendanceStore = useAttendanceStore();

const step = ref(1); // 1: ID, 2: Actions, 3: Success
const selectedTechName = ref('');
const dniInput = ref('');
const verifiedTech = ref(null);
const todayRecord = ref(null);
const loading = ref(false);

const currentTime = ref('');
const currentDate = ref('');
let clockTimer = null;

// Countdown for success screen auto-reset
const countdown = ref(5);
let countdownTimer = null;
const successMessage = ref('');
const successTime = ref('');
const successType = ref(''); // 'entrada' | 'salida'

// Format date to local YYYY-MM-DD
const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const activeTechnicians = computed(() => {
  return personalStore.technicians.filter(t => t.active);
});

const updateClock = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  currentDate.value = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

onMounted(async () => {
  loading.value = true;
  await personalStore.fetchTechnicians();
  loading.value = false;
  
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (countdownTimer) clearInterval(countdownTimer);
});

const handleVerification = async () => {
  if (!selectedTechName.value) {
    toast.error('Por favor, selecciona tu nombre.');
    return;
  }
  if (!dniInput.value || dniInput.value.length < 8) {
    toast.error('Por favor, ingresa tu DNI completo (8 dígitos).');
    return;
  }

  // Find tech by name (case insensitive match)
  const tech = activeTechnicians.value.find(
    t => t.fullName.trim().toUpperCase() === selectedTechName.value.trim().toUpperCase()
  );

  if (!tech) {
    toast.error('Nombre no encontrado en la lista de técnicos activos.');
    return;
  }

  // Verify DNI
  if (tech.dni !== dniInput.value.trim()) {
    toast.error('DNI incorrecto. Inténtalo de nuevo.');
    return;
  }

  loading.value = true;
  try {
    verifiedTech.value = tech;
    // Fetch today's record
    const todayStr = getLocalDateString();
    const records = await attendanceService.getAttendanceByDate(todayStr);
    todayRecord.value = records[tech.id] || null;
    step.value = 2;
    toast.success(`Identidad verificada. ¡Hola ${tech.fullName.split(' ')[0]}!`);
  } catch (err) {
    console.error('Error fetching today record:', err);
    toast.error('Error al conectar con la base de datos.');
  } finally {
    loading.value = false;
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

const handleMark = async (type) => {
  if (!verifiedTech.value) return;
  loading.value = true;
  try {
    const { data } = await attendanceStore.registerSelfAttendance(verifiedTech.value.id, type);
    
    successType.value = type === 'checkIn' ? 'Entrada' : 'Salida';
    const timestamp = type === 'checkIn' ? data.checkIn : data.checkOut;
    successTime.value = formatTime(timestamp);
    successMessage.value = `Has registrado tu ${successType.value.toLowerCase()} correctamente a las ${successTime.value}.`;
    
    step.value = 3;
    startCountdown();
  } catch (err) {
    toast.error(err.message || 'Error al registrar la marcación.');
  } finally {
    loading.value = false;
  }
};

const startCountdown = () => {
  countdown.value = 5;
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownTimer);
      resetFlow();
    }
  }, 1000);
};

const resetFlow = () => {
  step.value = 1;
  selectedTechName.value = '';
  dniInput.value = '';
  verifiedTech.value = null;
  todayRecord.value = null;
  if (countdownTimer) clearInterval(countdownTimer);
};

const handleBack = () => {
  step.value = 1;
  dniInput.value = '';
};
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-emerald-950 via-background to-teal-950">
    <!-- Main Card container -->
    <div class="w-full max-w-md p-6 rounded-2xl border border-primary/20 bg-card/85 backdrop-blur-md shadow-2xl relative overflow-hidden transition-all duration-300">
      
      <!-- Brand Logo / Header -->
      <div class="flex flex-col items-center mb-6 text-center">
        <div class="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-2 shadow-inner">
          <Fingerprint class="text-primary h-7 w-7 animate-pulse" />
        </div>
        <h2 class="text-lg font-bold tracking-tight text-foreground">Registro de Asistencia</h2>
        <p class="text-xs text-muted-foreground uppercase tracking-widest font-bold">Consorcio GALCAS</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading && step === 1" class="flex flex-col items-center justify-center py-10 gap-3">
        <RefreshCw class="h-8 w-8 animate-spin text-primary" />
        <p class="text-xs text-muted-foreground">Cargando...</p>
      </div>

      <!-- STEP 1: Identification -->
      <div v-else-if="step === 1" class="space-y-4">
        <p class="text-xs text-center text-muted-foreground">
          Selecciona tu nombre y valida tu DNI para marcar tu ingreso o salida de hoy.
        </p>

        <div class="space-y-3">
          <!-- Autocomplete input using native datalist -->
          <div class="grid gap-1.5">
            <Label for="tech-select" class="font-bold text-xs uppercase tracking-wider text-muted-foreground">Tu Nombre Completo</Label>
            <div class="relative">
              <User class="absolute left-3 top-3 text-muted-foreground" :size="16" />
              <input
                id="tech-select"
                list="techs-list"
                v-model="selectedTechName"
                placeholder="Escribe tu nombre para buscar..."
                class="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-bold"
              />
            </div>
            <datalist id="techs-list">
              <option v-for="t in activeTechnicians" :key="t.id" :value="t.fullName">
                {{ t.role }}
              </option>
            </datalist>
          </div>

          <!-- DNI Input -->
          <div class="grid gap-1.5">
            <Label for="dni-input" class="font-bold text-xs uppercase tracking-wider text-muted-foreground">Tu número de DNI</Label>
            <div class="relative">
              <Fingerprint class="absolute left-3 top-3 text-muted-foreground" :size="16" />
              <input
                id="dni-input"
                type="text"
                pattern="[0-9]*"
                maxlength="8"
                v-model="dniInput"
                placeholder="Ingresa los 8 dígitos"
                class="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-bold"
                @keyup.enter="handleVerification"
              />
            </div>
          </div>

          <Button @click="handleVerification" class="w-full h-11 font-bold mt-2 shadow-md gap-1.5 transition-all active:scale-[0.98]">
            Verificar Identidad <ChevronRight :size="16" />
          </Button>
        </div>
      </div>

      <!-- STEP 2: Attendance Actions -->
      <div v-else-if="step === 2" class="space-y-5">
        <!-- Back Button -->
        <button @click="handleBack" class="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft :size="14" /> Regresar
        </button>

        <!-- Tech Info Profile Box -->
        <div class="p-3.5 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
          <div class="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <User class="text-primary h-5 w-5" />
          </div>
          <div>
            <h4 class="text-sm font-bold leading-tight">{{ verifiedTech?.fullName }}</h4>
            <p class="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">{{ verifiedTech?.role }}</p>
          </div>
        </div>

        <!-- Clock Box -->
        <div class="text-center py-4 bg-muted/30 border border-border/50 rounded-xl relative overflow-hidden">
          <Clock class="absolute top-2 right-2 text-muted-foreground/10" :size="80" />
          <div class="text-3xl font-mono font-bold tracking-tight text-primary">{{ currentTime }}</div>
          <div class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1 capitalize">{{ currentDate }}</div>
        </div>

        <!-- Mark Buttons Area -->
        <div class="grid gap-3.5">
          <!-- Entrada (Check In) -->
          <div class="border border-border/80 rounded-xl p-3.5 flex flex-col items-center justify-center text-center bg-card shadow-sm">
            <div class="flex items-center gap-2 mb-2">
              <LogIn :size="16" class="text-emerald-500" />
              <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registro de Entrada</span>
            </div>
            
            <template v-if="todayRecord?.checkIn">
              <div class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <CheckCircle2 :size="14" />
                <span>Marcada a las {{ formatTime(todayRecord.checkIn) }}</span>
              </div>
            </template>
            <template v-else>
              <Button @click="handleMark('checkIn')" :disabled="loading" class="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-xs uppercase tracking-wider shadow-md">
                Registrar Entrada
              </Button>
            </template>
          </div>

          <!-- Salida (Check Out) -->
          <div class="border border-border/80 rounded-xl p-3.5 flex flex-col items-center justify-center text-center bg-card shadow-sm">
            <div class="flex items-center gap-2 mb-2">
              <LogOut :size="16" class="text-sky-500" />
              <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registro de Salida</span>
            </div>

            <template v-if="todayRecord?.checkOut">
              <div class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <CheckCircle2 :size="14" />
                <span>Marcada a las {{ formatTime(todayRecord.checkOut) }}</span>
              </div>
            </template>
            <template v-else>
              <!-- Disable Salida only if they haven't checked in yet, but let them force if necessary or let them register directly -->
              <Button @click="handleMark('checkOut')" :disabled="loading" class="w-full bg-sky-600 hover:bg-sky-500 font-bold text-xs uppercase tracking-wider shadow-md">
                Registrar Salida
              </Button>
            </template>
          </div>
        </div>

        <button @click="resetFlow" class="w-full text-center text-xs text-muted-foreground hover:text-foreground font-bold hover:underline transition-all">
          No soy yo, salir
        </button>
      </div>

      <!-- STEP 3: Success Screen -->
      <div v-else-if="step === 3" class="text-center py-6 space-y-5 animate-in fade-in zoom-in duration-300">
        <div class="flex justify-center">
          <div class="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/15">
            <CheckCircle2 class="text-emerald-500 h-12 w-12" />
          </div>
        </div>

        <div class="space-y-1.5">
          <h3 class="text-xl font-bold text-foreground">¡Marcación Registrada!</h3>
          <p class="text-sm font-bold text-primary">{{ verifiedTech?.fullName }}</p>
          <p class="text-xs text-muted-foreground px-4 leading-relaxed mt-1">
            {{ successMessage }}
          </p>
        </div>

        <!-- Success countdown timer -->
        <div class="p-3 bg-muted/30 rounded-xl max-w-[280px] mx-auto text-xs font-bold text-muted-foreground border border-border/40">
          Reiniciando pantalla en <span class="text-primary font-mono text-sm px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">{{ countdown }}</span> segundos...
        </div>

        <Button @click="resetFlow" variant="outline" class="w-full font-bold">
          Registrar Otra Asistencia
        </Button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Scoped adjustments for smooth view sizing */
.bg-background {
  background-color: var(--background);
}
.bg-card {
  background-color: var(--card);
}
</style>

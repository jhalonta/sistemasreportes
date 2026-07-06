<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { usePersonalStore } from '../../personal/store/personalStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useLocationStore } from '../../locations/store/locationStore';
import { attendanceService } from '../services/attendanceService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'vue-sonner';
import {
  Fingerprint, Clock, CheckCircle2, ChevronRight, User, AlertCircle, RefreshCw, LogOut, LogIn, ArrowLeft, Camera, MapPin, Check
} from 'lucide-vue-next';

const personalStore = usePersonalStore();
const attendanceStore = useAttendanceStore();
const locationStore = useLocationStore();

const step = ref(1); // 1: ID, 2: Actions, 3: Success
const selectedTechId = ref('');
const dniInput = ref('');
const dbError = ref('');
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

// Camera state refs
const videoRef = ref(null);
const canvasRef = ref(null);
const mediaStream = ref(null);
const isCameraReady = ref(false);
const cameraError = ref('');

// Geolocation state refs
const userCoordinates = ref(null);
const geolocationError = ref('');
const distanceToOffice = ref(null);
const checkingLocation = ref(false);
const officeGeocerca = ref(null);

// Format date to local YYYY-MM-DD
const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const activeTechnicians = computed(() => {
  return personalStore.technicians.filter(t => t.active);
});

const isCheckoutDisabled = computed(() => {
  const now = new Date();
  const hours = now.getHours();
  const dayOfWeek = now.getDay();
  const limitHour = dayOfWeek === 6 ? 13 : 18;
  return hours < 8 || hours >= limitHour;
});

const checkoutDisabledReason = computed(() => {
  const now = new Date();
  const hours = now.getHours();
  const dayOfWeek = now.getDay();
  const limitHour = dayOfWeek === 6 ? '13:00' : '18:00';
  
  if (hours < 8) {
    return 'El registro de salida estará disponible a partir de las 08:00 am.';
  } else {
    return `La marcación de salida cerró a las ${limitHour}. Contacte al administrador.`;
  }
});

const isBeforeCheckInStart = computed(() => {
  const now = new Date();
  const hours = now.getHours();
  return hours < 7;
});

const isAfterCheckInEnd = computed(() => {
  const now = new Date();
  const hours = now.getHours();
  return hours >= 9;
});

const updateClock = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  currentDate.value = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

onMounted(async () => {
  loading.value = true;
  dbError.value = '';
  try {
    await Promise.all([
      personalStore.fetchTechnicians(),
      locationStore.fetchLocations()
    ]);
    if (personalStore.error) {
      dbError.value = personalStore.error;
      toast.error(personalStore.error);
    }
  } catch (err) {
    dbError.value = 'Error de conexión con el servidor de base de datos.';
    toast.error(dbError.value);
  } finally {
    loading.value = false;
  }
  
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (countdownTimer) clearInterval(countdownTimer);
  stopCamera();
});

// CAMERA FUNCTIONS
const startCamera = async () => {
  cameraError.value = '';
  isCameraReady.value = false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 320, height: 240 }
    });
    mediaStream.value = stream;
    await nextTick();
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      videoRef.value.onloadedmetadata = () => {
        isCameraReady.value = true;
      };
    }
  } catch (err) {
    console.error("Error accessing camera:", err);
    cameraError.value = 'No se pudo acceder a la cámara frontal. Active la cámara para marcar.';
    toast.error(cameraError.value);
  }
};

const stopCamera = () => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(track => track.stop());
    mediaStream.value = null;
    isCameraReady.value = false;
  }
};

const captureSelfie = () => {
  if (!videoRef.value || !canvasRef.value) return null;
  const video = videoRef.value;
  const canvas = canvasRef.value;
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  
  // Mirror horizontally
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  
  return canvas.toDataURL('image/jpeg', 0.6);
};

// GPS GEOLOCATION FUNCTIONS
const getGPSLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La geolocalización no está soportada por este navegador.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        let msg = 'Error al obtener ubicación GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Acceso de ubicación denegado. Permita el uso de ubicación en su navegador.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'La ubicación GPS no está disponible.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Tiempo de espera agotado al leer GPS.';
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // en metros
};

const verifyLocationRestriction = async (tech) => {
  geolocationError.value = '';
  userCoordinates.value = null;
  distanceToOffice.value = null;

  // Coordenadas fijas de la oficina central (GALCAS Moyobamba)
  officeGeocerca.value = {
    nombre: 'Sede Principal Moyobamba',
    latitud: -5.946140,
    longitud: -77.301255,
    radio: 50 // 50 metros de tolerancia
  };
  
  checkingLocation.value = true;
  try {
    const coords = await getGPSLocation();
    userCoordinates.value = coords;
    
    const dist = calculateDistance(coords.lat, coords.lng, officeGeocerca.value.latitud, officeGeocerca.value.longitud);
    distanceToOffice.value = dist;
    
    if (dist > officeGeocerca.value.radio) {
      toast.error(`Ubicación GPS lejana a la sede. Distancia: ${dist.toFixed(0)}m.`);
    } else {
      toast.success(`Ubicación de geocerca verificada.`);
    }
  } catch (err) {
    console.error('GPS error:', err);
    geolocationError.value = err.message;
    toast.error(err.message);
  } finally {
    checkingLocation.value = false;
  }
};

const handleVerification = async () => {
  if (!selectedTechId.value) {
    toast.error('Por favor, selecciona tu nombre.');
    return;
  }
  if (!dniInput.value || dniInput.value.length < 8) {
    toast.error('Por favor, ingresa tu DNI completo (8 dígitos).');
    return;
  }

  // Find tech by ID directly
  const tech = activeTechnicians.value.find(t => t.id === selectedTechId.value);

  if (!tech) {
    toast.error('Técnico no encontrado.');
    return;
  }

  // Verify DNI
  if (tech.dni !== dniInput.value.trim()) {
    toast.error('DNI incorrecto. Inténtelo de nuevo.');
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
    
    // Iniciar cámara y verificar geocerca
    startCamera();
    verifyLocationRestriction(tech);
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

  // Validar límite de hora de entrada (máximo 09:00 am)
  if (type === 'checkIn') {
    const now = new Date();
    if (now.getHours() >= 9) {
      toast.error('El registro de entrada ya no está disponible (cerró a las 09:00 am).');
      return;
    }
  }

  // 1. Validar Geocerca GPS si está configurada
  if (officeGeocerca.value) {
    if (geolocationError.value) {
      toast.error(`GPS Error: ${geolocationError.value}. No se puede marcar.`);
      return;
    }
    if (checkingLocation.value) {
      toast.error('Determinando ubicación GPS actual. Espere un momento...');
      return;
    }
    if (!userCoordinates.value) {
      toast.error('No se ha podido leer la ubicación GPS del dispositivo.');
      return;
    }
    if (distanceToOffice.value > officeGeocerca.value.radio) {
      toast.error(`Acceso denegado: Estás fuera del rango de la sede (${distanceToOffice.value.toFixed(0)}m de distancia. Límite: ${officeGeocerca.value.radio}m)`);
      return;
    }
  }

  // 2. Validar captura de selfie
  let selfieBase64 = null;
  if (isCameraReady.value) {
    selfieBase64 = captureSelfie();
  } else {
    toast.error('La cámara no está lista. Por favor actívala para marcar asistencia.');
    return;
  }

  loading.value = true;
  try {
    const extraData = {};
    const locData = userCoordinates.value ? {
      lat: userCoordinates.value.lat,
      lng: userCoordinates.value.lng,
      distance: distanceToOffice.value
    } : null;

    if (type === 'checkIn') {
      extraData.checkInPhoto = selfieBase64;
      if (locData) extraData.checkInLocation = locData;
    } else {
      extraData.checkOutPhoto = selfieBase64;
      if (locData) extraData.checkOutLocation = locData;
    }

    const { data } = await attendanceStore.registerSelfAttendance(verifiedTech.value.id, type, extraData);
    
    successType.value = type === 'checkIn' ? 'Entrada' : 'Salida';
    const timestamp = type === 'checkIn' ? data.checkIn : data.checkOut;
    successTime.value = formatTime(timestamp);
    successMessage.value = `Has registrado tu ${successType.value.toLowerCase()} correctamente a las ${successTime.value}.`;
    
    stopCamera();
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
  selectedTechId.value = '';
  dniInput.value = '';
  verifiedTech.value = null;
  todayRecord.value = null;
  stopCamera();
  if (countdownTimer) clearInterval(countdownTimer);
};

const handleBack = () => {
  step.value = 1;
  dniInput.value = '';
  stopCamera();
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
        <!-- Database Error Banner -->
        <div v-if="dbError" class="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold text-center leading-relaxed">
          {{ dbError }}<br>
          <span class="text-[10px] opacity-80">Por favor, recarga la página o contacta al administrador.</span>
        </div>

        <p class="text-xs text-center text-muted-foreground">
          Selecciona tu nombre y valida tu DNI para marcar tu ingreso o salida de hoy.
        </p>

        <div class="space-y-3">
          <!-- Dropdown selection -->
          <div class="grid gap-1.5">
            <Label for="tech-select" class="font-bold text-xs uppercase tracking-wider text-muted-foreground">Tu Nombre Completo</Label>
            <div class="relative">
              <User class="absolute left-3 top-3 text-muted-foreground pointer-events-none z-10" :size="16" />
              <select
                id="tech-select"
                v-model="selectedTechId"
                class="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-bold cursor-pointer appearance-none"
              >
                <option value="" disabled selected>Selecciona tu nombre de la lista...</option>
                <option v-for="t in activeTechnicians" :key="t.id" :value="t.id">
                  {{ t.fullName }}
                </option>
              </select>
              <span class="absolute right-3 top-3 text-muted-foreground pointer-events-none text-[10px]">▼</span>
            </div>
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


        <!-- Camera & GPS Verification Container -->
        <div class="flex flex-col items-center gap-2.5 border border-border/85 rounded-xl p-3.5 bg-card shadow-sm">
          <div class="flex items-center gap-1.5 self-start text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            <Camera :size="14" class="text-primary" />
            <span>Foto de Verificación</span>
          </div>

          <!-- Video Stream -->
          <div class="relative w-full aspect-video rounded-lg border-2 border-primary/20 bg-muted overflow-hidden flex items-center justify-center shadow-inner">
            <video 
              ref="videoRef" 
              autoplay 
              playsinline 
              muted
              class="w-full h-full object-cover transform -scale-x-100" 
              v-show="isCameraReady"
            ></video>
            <canvas ref="canvasRef" class="hidden"></canvas>

            <!-- Loading and Error Placeholders -->
            <div v-if="!isCameraReady && !cameraError" class="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
              <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span class="text-[10px] font-semibold">Iniciando cámara frontal...</span>
            </div>
            <div v-if="cameraError" class="flex flex-col items-center gap-1.5 text-destructive p-4 text-center">
              <AlertCircle :size="20" class="opacity-85" />
              <span class="text-[10px] font-bold leading-tight">{{ cameraError }}</span>
            </div>
          </div>

          <!-- GPS Geofence details -->
          <div class="w-full mt-1.5 border-t pt-2">
            <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              <span class="flex items-center gap-1"><MapPin :size="11" class="text-primary" /> Ubicación GPS</span>
              
              <span v-if="officeGeocerca && checkingLocation" class="text-amber-500 flex items-center gap-1 animate-pulse">
                <RefreshCw :size="10" class="animate-spin" /> Obteniendo...
              </span>
              <span v-else-if="officeGeocerca && geolocationError" class="text-rose-500 font-bold">
                ⚠️ Error GPS
              </span>
              <span v-else-if="officeGeocerca && distanceToOffice !== null" :class="distanceToOffice <= officeGeocerca.radio ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'">
                {{ distanceToOffice <= 30 ? '✅ En la Oficina' : (distanceToOffice <= officeGeocerca.radio ? '✅ En Rango' : '❌ Fuera de Rango') }}
              </span>
              <span v-else-if="!officeGeocerca" class="text-emerald-500 font-bold">
                ✅ Sede sin restricción
              </span>
            </div>

            <div class="text-[10px] font-semibold text-muted-foreground leading-snug">
              <div v-if="checkingLocation" class="text-amber-500/80">
                Calculando distancia a la sede: {{ officeGeocerca?.nombre }}...
              </div>
              <div v-else-if="geolocationError" class="text-rose-500 leading-tight">
                {{ geolocationError }}
              </div>
              <div v-else-if="officeGeocerca && distanceToOffice !== null" class="flex justify-between w-full">
                <span v-if="distanceToOffice <= 30">📍 <strong class="text-emerald-500">Dentro de la oficina</strong></span>
                <span v-else>Distancia a sede: <strong class="text-foreground">{{ distanceToOffice.toFixed(0) }}m</strong></span>
                <span>Radio de tolerancia: <strong class="text-foreground">{{ officeGeocerca.radio }}m</strong></span>
              </div>
              <div v-else-if="!officeGeocerca">
                Esta sede no requiere validación de coordenadas GPS.
              </div>
            </div>
          </div>
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
            <template v-else-if="isBeforeCheckInStart">
              <div class="flex flex-col items-center gap-1.5 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 max-w-[280px]">
                <Clock :size="16" class="text-amber-500 shrink-0" />
                <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 leading-tight">
                  El registro de entrada estará disponible a partir de las 07:00 am.
                </span>
              </div>
            </template>
            <template v-else-if="isAfterCheckInEnd">
              <div class="flex flex-col items-center gap-1.5 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 max-w-[280px]">
                <AlertCircle :size="16" class="text-rose-500 shrink-0" />
                <span class="text-[10px] font-bold text-rose-600 dark:text-rose-400 leading-tight">
                  El registro de entrada cerró a las 09:00 am.
                </span>
              </div>
            </template>
            <template v-else>
              <Button 
                @click="handleMark('checkIn')" 
                :disabled="loading || checkingLocation || (officeGeocerca && (geolocationError || distanceToOffice > officeGeocerca.radio || !userCoordinates)) || !isCameraReady" 
                class="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-40"
              >
                Registrar Entrada
              </Button>
              <div v-if="officeGeocerca && distanceToOffice > officeGeocerca.radio" class="mt-2 text-[9px] text-rose-500 font-bold leading-normal">
                ⚠️ Fuera de rango: Debe estar a menos de {{ officeGeocerca.radio }}m de la oficina.
              </div>
              <div v-else-if="officeGeocerca && geolocationError" class="mt-2 text-[9px] text-rose-500 font-bold leading-normal">
                ⚠️ Active la ubicación GPS y brinde permisos al navegador para marcar.
              </div>
              <div v-else-if="!isCameraReady && !cameraError" class="mt-2 text-[9px] text-amber-500 font-bold leading-normal">
                ⚠️ Esperando activación de la cámara para la selfie obligatoria.
              </div>
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
            <template v-else-if="!todayRecord?.checkIn">
              <div class="flex flex-col items-center gap-1.5 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 max-w-[280px]">
                <AlertCircle :size="16" class="text-amber-500 shrink-0" />
                <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 leading-tight">
                  Debe registrar su entrada primero para poder marcar la salida.
                </span>
              </div>
            </template>
            <template v-else-if="isCheckoutDisabled">
              <div class="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border max-w-[280px]"
                :class="new Date().getHours() < 8 ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'">
                <AlertCircle :size="16" class="shrink-0" />
                <span class="text-[10px] font-bold leading-tight">
                  {{ checkoutDisabledReason }}
                </span>
              </div>
            </template>
            <template v-else>
              <Button 
                @click="handleMark('checkOut')" 
                :disabled="loading || checkingLocation || (officeGeocerca && (geolocationError || distanceToOffice > officeGeocerca.radio || !userCoordinates)) || !isCameraReady" 
                class="w-full bg-sky-600 hover:bg-sky-500 font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-40"
              >
                Registrar Salida
              </Button>
              <div v-if="officeGeocerca && distanceToOffice > officeGeocerca.radio" class="mt-2 text-[9px] text-rose-500 font-bold leading-normal">
                ⚠️ Fuera de rango: Debe estar a menos de {{ officeGeocerca.radio }}m de la oficina.
              </div>
              <div v-else-if="officeGeocerca && geolocationError" class="mt-2 text-[9px] text-rose-500 font-bold leading-normal">
                ⚠️ Active la ubicación GPS y brinde permisos al navegador para marcar.
              </div>
              <div v-else-if="!isCameraReady && !cameraError" class="mt-2 text-[9px] text-amber-500 font-bold leading-normal">
                ⚠️ Esperando activación de la cámara para la selfie obligatoria.
              </div>
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

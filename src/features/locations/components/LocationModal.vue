<script setup>
import { ref, watch, onMounted } from 'vue';
import { Save, Building2, MapPin, Navigation, User, Tag } from 'lucide-vue-next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const props = defineProps({
  show: Boolean,
  location: Object,
  loading: Boolean
});

const emit = defineEmits(['close', 'save']);

const form = ref({
  nombre: '',
  codigo: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  supervisor: '',
  estado: 'activa',
  latitud: '',
  longitud: '',
  radio: 100
});

const detectingLocation = ref(false);

const detectCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert('La geolocalización no está soportada por su navegador.');
    return;
  }
  detectingLocation.value = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.value.latitud = position.coords.latitude.toFixed(6);
      form.value.longitud = position.coords.longitude.toFixed(6);
      detectingLocation.value = false;
    },
    (error) => {
      console.error('Error getting geolocation:', error);
      alert('No se pudo obtener su ubicación. Asegúrese de dar permisos de GPS.');
      detectingLocation.value = false;
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
};

watch(() => props.show, (isShowing) => {
  if (isShowing) {
    if (props.location) {
      form.value = { 
        latitud: '',
        longitud: '',
        radio: 100,
        ...props.location 
      };
    } else {
      form.value = {
        nombre: '',
        codigo: '',
        direccion: '',
        ciudad: '',
        departamento: '',
        supervisor: '',
        estado: 'activa',
        latitud: '',
        longitud: '',
        radio: 100
      };
    }
  }
});

const handleSubmit = () => {
  if (!form.value.nombre || !form.value.codigo) {
    return;
  }
  emit('save', { ...form.value });
};
</script>

<template>
  <Dialog :open="show" @update:open="val => { if (!val) emit('close') }">
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Building2 class="text-primary" :size="20" />
          {{ location ? 'Editar Sede' : 'Nueva Sede' }}
        </DialogTitle>
        <DialogDescription>
          Completa la información de la sede operativa.
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="grid gap-4 py-4">
        <!-- Nombre & Código -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="grid gap-2 sm:col-span-2">
            <Label for="nombre">Nombre de la Sede</Label>
            <div class="relative">
              <Building2 class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
              <Input
                id="nombre"
                v-model="form.nombre"
                placeholder="Ej. Electro Oriente - Moyobamba"
                required
                class="pl-9 bg-background"
              />
            </div>
          </div>
          <div class="grid gap-2">
            <Label for="codigo">Código</Label>
            <div class="relative">
              <Tag class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
              <Input
                id="codigo"
                v-model="form.codigo"
                placeholder="Ej. MOY01"
                required
                class="pl-9 bg-background uppercase font-bold"
              />
            </div>
          </div>
        </div>

        <!-- Dirección -->
        <div class="grid gap-2">
          <Label for="direccion">Dirección</Label>
          <div class="relative">
            <MapPin class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
            <Input
              id="direccion"
              v-model="form.direccion"
              placeholder="Av. Principal N° 123"
              required
              class="pl-9 bg-background"
            />
          </div>
        </div>

        <!-- Ciudad & Departamento -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="ciudad">Ciudad</Label>
            <div class="relative">
              <Navigation class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
              <Input
                id="ciudad"
                v-model="form.ciudad"
                placeholder="Moyobamba"
                required
                class="pl-9 bg-background"
              />
            </div>
          </div>
          <div class="grid gap-2">
            <Label for="departamento">Departamento</Label>
            <div class="relative">
              <MapPin class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
              <Input
                id="departamento"
                v-model="form.departamento"
                placeholder="San Martín"
                required
                class="pl-9 bg-background"
              />
            </div>
          </div>
        </div>

        <!-- Supervisor & Estado -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="grid gap-2 sm:col-span-2">
            <Label for="supervisor">Supervisor Responsable</Label>
            <div class="relative">
              <User class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
              <Input
                id="supervisor"
                v-model="form.supervisor"
                placeholder="Nombre del responsable"
                required
                class="pl-9 bg-background"
              />
            </div>
          </div>
          <div class="grid gap-2">
            <Label for="estado">Estado</Label>
            <Select v-model="form.estado">
              <SelectTrigger id="estado" class="bg-background w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activa">Activa</SelectItem>
                <SelectItem value="inactiva">Inactiva</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Geocerca (Latitud, Longitud, Radio) -->
        <div class="border-t pt-4 mt-2">
          <h3 class="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
            <Navigation :size="16" />
            Configuración de Geocerca (GPS)
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div class="grid gap-2">
              <Label for="latitud">Latitud</Label>
              <Input
                id="latitud"
                v-model="form.latitud"
                placeholder="Ej: -6.02345"
                class="bg-background font-mono text-xs"
              />
            </div>
            <div class="grid gap-2">
              <Label for="longitud">Longitud</Label>
              <Input
                id="longitud"
                v-model="form.longitud"
                placeholder="Ej: -76.97123"
                class="bg-background font-mono text-xs"
              />
            </div>
            <div class="grid gap-2">
              <Label for="radio">Radio Tolerancia (m)</Label>
              <Input
                id="radio"
                type="number"
                v-model.number="form.radio"
                placeholder="Ej: 100"
                min="10"
                class="bg-background font-mono text-xs"
              />
            </div>
          </div>
          <div class="mt-3 flex justify-between items-center">
            <p class="text-[10px] text-muted-foreground">
              Deje latitud/longitud en blanco si no desea restringir marcación por GPS.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-7 text-[10px] gap-1 px-2.5 font-bold"
              @click="detectCurrentLocation"
              :disabled="detectingLocation"
            >
              <div v-if="detectingLocation" class="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
              <MapPin v-else :size="12" />
              {{ detectingLocation ? 'Obteniendo GPS...' : 'Usar mi ubicación actual' }}
            </Button>
          </div>
        </div>
      </form>

      <DialogFooter>
        <Button variant="outline" @click="emit('close')" :disabled="loading">
          Cancelar
        </Button>
        <Button @click="handleSubmit" class="gap-2" :disabled="loading">
          <Save v-if="!loading" :size="16" />
          <div v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          {{ loading ? 'Guardando...' : (location ? 'Guardar Cambios' : 'Registrar Sede') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

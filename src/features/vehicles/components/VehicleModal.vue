<script setup>
import { reactive, onMounted, computed, watch } from 'vue';
import { Save, Truck, Bike, Tag, Building2, Info } from 'lucide-vue-next';
import { useLocationStore } from '../../locations/store/locationStore';
import { useAuthStore } from '../../auth/store/authStore';
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
  vehicle: {
    type: Object,
    default: null
  },
  loading: Boolean,
  placaError: {
    type: String,
    default: null
  }
});

const locationStore = useLocationStore();
const authStore = useAuthStore();
const emit = defineEmits(['close', 'save']);

const userProfile = computed(() => authStore.userProfile);
const isSedeRole = computed(() => userProfile.value?.role === 'sede');

const form = reactive({
  tipo: 'motokar',
  placa: '',
  estado: 'disponible',
  sedeId: ''
});

const vehicleTypes = [
  { value: 'motokar', label: 'Motokar' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'moto', label: 'Motocicleta' },
  { value: 'otro', label: 'Otro' }
];

const vehicleStates = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'mantenimiento', label: 'En Mantenimiento' },
  { value: 'asignado', label: 'Asignado' },
  { value: 'inactivo', label: 'Inactivo' }
];

onMounted(() => {
  if (locationStore.locations.length === 0) {
    locationStore.fetchLocations();
  }
});

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.vehicle) {
      Object.assign(form, { ...props.vehicle });
    } else {
      Object.assign(form, {
        tipo: 'motokar',
        placa: '',
        estado: 'disponible',
        sedeId: isSedeRole.value ? userProfile.value.locationId : ''
      });
    }
  }
});

const handleSubmit = () => {
  if (!form.placa || !form.sedeId) {
    return;
  }
  emit('save', { ...form });
};

const getVehicleIcon = computed(() => {
  switch (form.tipo?.toLowerCase()) {
    case 'moto':
    case 'motocicleta':
      return Bike;
    case 'motokar':
    case 'camioneta':
    case 'otro':
    default:
      return Truck;
  }
});
</script>

<template>
  <Dialog :open="show" @update:open="val => { if (!val) emit('close') }">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <component :is="getVehicleIcon" class="text-primary" :size="20" />
          {{ vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo' }}
        </DialogTitle>
        <DialogDescription>
          Administra las unidades de transporte de la sede.
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="grid gap-4 py-4">
        <!-- Tipo & Placa -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="tipo">Tipo de Vehículo</Label>
            <div class="relative">
              <component :is="getVehicleIcon" class="absolute left-2.5 top-2.5 z-10 text-muted-foreground pointer-events-none" :size="16" />
            <Select v-model="form.tipo" :disabled="false">
              <SelectTrigger id="tipo" class="pl-9 bg-background w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="type in vehicleTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid gap-2">
          <Label for="placa">Placa / Serial</Label>
          <div class="relative">
            <Tag class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
            <Input
              id="placa"
              v-model="form.placa"
              placeholder="ABC-123"
              :class="['pl-9 bg-background font-bold uppercase', placaError ? 'border-rose-500 focus-visible:ring-rose-500' : '']"
              maxlength="20"
              required
              @input="form.placa = form.placa.toUpperCase()"
            />
            </div>
            <p v-if="placaError" class="text-[11px] text-rose-500 font-medium flex items-center gap-1">
              <span>⚠</span> {{ placaError }}
            </p>
          </div>
        </div>

        <!-- Sede -->
        <div class="grid gap-2">
          <Label for="sedeId">Sede Asignada</Label>
          <div class="relative">
            <Building2 class="absolute left-2.5 top-2.5 z-10 text-muted-foreground pointer-events-none" :size="16" />
            <Select v-model="form.sedeId" :disabled="isSedeRole">
              <SelectTrigger id="sedeId" class="pl-9 bg-background w-full">
                <SelectValue placeholder="Seleccionar sede..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="loc in locationStore.locations" :key="loc.id" :value="loc.id">
                  {{ loc.nombre }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Estado -->
        <div class="grid gap-2">
          <Label for="estado">Estado Actual</Label>
          <div class="relative">
            <Info class="absolute left-2.5 top-2.5 z-10 text-muted-foreground pointer-events-none" :size="16" />
            <Select v-model="form.estado">
              <SelectTrigger id="estado" class="pl-9 bg-background w-full">
                <SelectValue placeholder="Estado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="state in vehicleStates" :key="state.value" :value="state.value">
                  {{ state.label }}
                </SelectItem>
              </SelectContent>
            </Select>
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
          {{ loading ? 'Guardando...' : (vehicle ? 'Guardar Cambios' : 'Registrar Vehículo') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

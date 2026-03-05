<script setup>
import { reactive, onMounted, computed, watch } from 'vue';
import { Save, Truck, Tag, X, Building2, Eye, Info } from 'lucide-vue-next';
import BaseModal from '../../../components/BaseModal.vue';
import { useLocationStore } from '../../locations/store/locationStore';
import { useAuthStore } from '../../auth/store/authStore';

const props = defineProps({
  show: Boolean,
  vehicle: {
    type: Object,
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
  { value: 'disponible', label: 'Disponible', class: 'state-available' },
  { value: 'mantenimiento', label: 'En Mantenimiento', class: 'state-maintenance' },
  { value: 'asignado', label: 'Asignado', class: 'state-assigned' },
  { value: 'inactivo', label: 'Inactivo', class: 'state-inactive' }
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
</script>

<template>
  <BaseModal
    :show="show"
    :title="vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'"
    :subtitle="'Administra las unidades de transporte de la sede.'"
    :icon="Truck"
    max-width="600px"
    @close="emit('close')"
  >
    <div class="vehicle-form">
      <!-- Tipo de Vehículo -->
      <div class="form-group">
        <label for="tipo">Tipo de Vehículo</label>
        <div class="input-with-icon">
          <span class="icon"><Truck :size="18" /></span>
          <select id="tipo" v-model="form.tipo" class="form-control">
            <option v-for="type in vehicleTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Placa -->
      <div class="form-group">
        <label for="placa">Placa / Serial</label>
        <div class="input-with-icon">
          <span class="icon"><Tag :size="18" /></span>
          <input 
            id="placa" 
            v-model="form.placa" 
            type="text" 
            placeholder="Ej: ABC-123" 
            class="form-control"
            required
            maxlength="20"
          />
        </div>
      </div>

      <!-- Sede -->
      <div class="form-group">
        <label for="sedeId">Sede Asignada</label>
        <div class="input-with-icon">
          <span class="icon"><Building2 :size="18" /></span>
          <select 
            id="sedeId" 
            v-model="form.sedeId" 
            class="form-control" 
            :disabled="isSedeRole"
          >
            <option value="" disabled>Seleccione una sede...</option>
            <option v-for="loc in locationStore.locations" :key="loc.id" :value="loc.id">
              {{ loc.nombre }}
            </option>
          </select>
        </div>
      </div>

      <!-- Estado -->
      <div class="form-group">
        <label for="estado">Estado Actual</label>
        <div class="input-with-icon">
          <span class="icon"><Info :size="18" /></span>
          <select id="estado" v-model="form.estado" class="form-control">
            <option v-for="state in vehicleStates" :key="state.value" :value="state.value">
              {{ state.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" @click="handleSubmit">
        <Save :size="20" />
        {{ vehicle ? 'Guardar Cambios' : 'Registrar Vehículo' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.vehicle-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon .icon {
  position: absolute;
  left: 1rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.8rem;
  border-radius: 12px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
  font-size: 0.95rem;
  transition: all 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.form-control:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
  opacity: 0.7;
}

select.form-control {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
}
</style>

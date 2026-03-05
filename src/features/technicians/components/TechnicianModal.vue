<script setup>
import { ref, watch } from 'vue';
import { Save, User, Phone, Mail, Tag, X, CreditCard, Building2 } from 'lucide-vue-next';
import BaseModal from '../../../components/BaseModal.vue';
import { useLocationStore } from '../../locations/store/locationStore';
import { useAuthStore } from '../../auth/store/authStore';
import { onMounted, computed } from 'vue';

const props = defineProps({
  show: Boolean,
  technician: Object,
  loading: Boolean
});

const locationStore = useLocationStore();
const authStore = useAuthStore();
const emit = defineEmits(['close', 'save']);

const userProfile = computed(() => authStore.userProfile);
const isSedeRole = computed(() => userProfile.value?.role === 'sede');

onMounted(() => {
  if (locationStore.locations.length === 0) {
    locationStore.fetchLocations();
  }
});

const form = ref({
  fullName: '',
  dni: '',
  phone: '',
  email: '',
  role: 'Técnico Electricista',
  locationId: '',
  active: true
});

const roles = ['Técnico Electricista', 'Personal de apoyo', 'Asistente Administrativo'];

watch(() => props.show, (isShowing) => {
  if (isShowing) {
    if (props.technician) {
      form.value = { ...props.technician };
    } else {
      form.value = {
        fullName: '',
        dni: '',
        phone: '',
        email: '',
        role: 'Técnico Electricista',
        locationId: isSedeRole.value ? userProfile.value.locationId : '',
        active: true
      };
    }
  }
});

const removeSpecialty = (index) => {
  form.value.specialties.splice(index, 1);
};

const handleSubmit = () => {
  const data = { ...form.value };
  data.fullName = form.value.fullName.trim().toUpperCase();
  emit('save', data);
};
</script>

<template>
  <BaseModal
    :show="show"
    :title="technician ? 'Editar Personal' : 'Nuevo Personal'"
    :subtitle="'Completa la información del personal.'"
    :icon="User"
    max-width="650px"
    @close="emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="tech-form">
      <div class="form-group">
        <label for="fullName">Nombres y Apellidos</label>
        <div class="input-with-icon">
          <span class="icon"><User :size="18" /></span>
          <input id="fullName" v-model="form.fullName" type="text" required placeholder="Ej. Juan Pérez García" />
        </div>
      </div>

      <div class="form-group">
        <label for="dni">DNI</label>
        <div class="input-with-icon">
          <span class="icon"><CreditCard :size="18" /></span>
          <input id="dni" v-model="form.dni" type="text" required placeholder="N° de Documento" maxlength="8" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="phone">Teléfono</label>
          <div class="input-with-icon">
            <span class="icon"><Phone :size="18" /></span>
            <input id="phone" v-model="form.phone" type="tel" placeholder="+51..." />
          </div>
        </div>
        <div class="form-group">
          <label for="email">Correo Electrónico</label>
          <div class="input-with-icon">
            <span class="icon"><Mail :size="18" /></span>
            <input id="email" v-model="form.email" type="email" placeholder="ejemplo@correo.com" />
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="locationId">Sede Asignada</label>
        <div class="input-with-icon">
          <span class="icon"><Building2 :size="18" /></span>
          <select 
            id="locationId" 
            v-model="form.locationId" 
            class="role-select" 
            :disabled="isSedeRole"
          >
            <option value="" disabled>Seleccione una sede...</option>
            <option v-for="loc in locationStore.locations" :key="loc.id" :value="loc.id">
              {{ loc.nombre }}
            </option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="role">Cargo / Función</label>
        <div class="input-with-icon">
          <span class="icon"><Tag :size="18" /></span>
          <select id="role" v-model="form.role" class="role-select">
            <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
          </select>
        </div>
      </div>

      <div class="form-group toggle-group">
        <label>Estado</label>
        <div class="toggle-wrap">
          <span :class="{ active: !form.active }">Inactivo</span>
          <button type="button" class="toggle-btn" :class="{ active: form.active }" @click="form.active = !form.active">
            <span class="toggle-slider"></span>
          </button>
          <span :class="{ active: form.active }">Activo</span>
        </div>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="loading" @click="handleSubmit">
        <Save :size="20" />
        {{ loading ? 'Guardando...' : (technician ? 'Guardar Cambios' : 'Guardar Personal') }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.tech-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.specialties-input-wrap {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.btn-add-tag {
  background: var(--brand-primary, #6366f1);
  color: white;
  padding: 0 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.specialties-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 32px;
}

.role-select {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
  appearance: none;
}

.remove-tag {
  cursor: pointer;
}

.toggle-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
}

.toggle-wrap span.active {
  color: var(--text-main);
}

.toggle-btn {
  width: 44px;
  height: 22px;
  background: var(--border-2, #e2e8f0);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
}

.toggle-btn.active {
  background: var(--success, #10b981);
}

.toggle-slider {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: all 0.3s;
}

.toggle-btn.active .toggle-slider {
  left: 24px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: var(--border-2, #e2e8f0);
  color: var(--text-main);
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.input-with-icon {
  position: relative;
  width: 100%;
}

.input-with-icon .icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.input-with-icon input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
}
</style>

<script setup>
import { ref, watch } from 'vue';
import { Save, Building2, MapPin, Navigation, User, Tag, X } from 'lucide-vue-next';
import BaseModal from '../../../components/BaseModal.vue';

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
  estado: 'activa'
});

watch(() => props.show, (isShowing) => {
  if (isShowing) {
    if (props.location) {
      form.value = { ...props.location };
    } else {
      form.value = {
        nombre: '',
        codigo: '',
        direccion: '',
        ciudad: '',
        departamento: '',
        supervisor: '',
        estado: 'activa'
      };
    }
  }
});

const handleSubmit = () => {
  emit('save', { ...form.value });
};
</script>

<template>
  <BaseModal
    :show="show"
    :title="location ? 'Editar Sede' : 'Nueva Sede'"
    :subtitle="'Completa la información de la sede operativa.'"
    :icon="Building2"
    max-width="650px"
    @close="emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="location-form">
      <div class="form-row">
        <div class="form-group flex-2">
          <label for="nombre">Nombre de la Sede</label>
          <div class="input-with-icon">
            <span class="icon"><Building2 :size="18" /></span>
            <input id="nombre" v-model="form.nombre" type="text" required placeholder="Ej. Electro Oriente - Moyobamba" />
          </div>
        </div>
        <div class="form-group flex-1">
          <label for="codigo">Código</label>
          <div class="input-with-icon">
            <span class="icon"><Tag :size="18" /></span>
            <input id="codigo" v-model="form.codigo" type="text" required placeholder="Ej. MOY01" />
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="direccion">Dirección</label>
        <div class="input-with-icon">
          <span class="icon"><MapPin :size="18" /></span>
          <input id="direccion" v-model="form.direccion" type="text" required placeholder="Av. Principal N° 123" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="ciudad">Ciudad</label>
          <div class="input-with-icon">
            <span class="icon"><Navigation :size="18" /></span>
            <input id="ciudad" v-model="form.ciudad" type="text" required placeholder="Moyobamba" />
          </div>
        </div>
        <div class="form-group">
          <label for="departamento">Departamento</label>
          <div class="input-with-icon">
            <span class="icon"><MapPin :size="18" /></span>
            <input id="departamento" v-model="form.departamento" type="text" required placeholder="San Martín" />
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="supervisor">Supervisor Responsable</label>
        <div class="input-with-icon">
          <span class="icon"><User :size="18" /></span>
          <input id="supervisor" v-model="form.supervisor" type="text" required placeholder="Nombre del supervisor" />
        </div>
      </div>

      <div class="form-group toggle-group">
        <label>Estado</label>
        <div class="toggle-wrap">
          <span :class="{ active: form.estado === 'inactiva' }">Inactiva</span>
          <button type="button" class="toggle-btn" :class="{ active: form.estado === 'activa' }" @click="form.estado = form.estado === 'activa' ? 'inactiva' : 'activa'">
            <span class="toggle-slider"></span>
          </button>
          <span :class="{ active: form.estado === 'activa' }">Activa</span>
        </div>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('close')">
        <X :size="20" />
        Cancelar
      </button>
      <button type="button" class="btn-primary" :disabled="loading" @click="handleSubmit">
        <Save :size="20" />
        {{ loading ? 'Guardando...' : 'Guardar Sede' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.location-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
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

label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: var(--text-muted);
}
</style>

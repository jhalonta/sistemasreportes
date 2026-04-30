<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { Save, User, Phone, Mail, Tag, CreditCard, Building2 } from 'lucide-vue-next';
import { useLocationStore } from '../../locations/store/locationStore';
import { useAuthStore } from '../../auth/store/authStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  active: 'true' // Use string for Select
});

const roles = ['Técnico Electricista', 'Personal de apoyo', 'Asistente Administrativo'];

watch(() => props.show, (isShowing) => {
  if (isShowing) {
    if (props.technician) {
      form.value = { 
        ...props.technician,
        active: props.technician.active === false ? 'false' : 'true'
      };
    } else {
      form.value = {
        fullName: '',
        dni: '',
        phone: '',
        email: '',
        role: 'Técnico Electricista',
        locationId: isSedeRole.value ? userProfile.value.locationId : '',
        active: 'true'
      };
    }
  }
});

const handleSubmit = () => {
  const data = { 
    ...form.value,
    active: form.value.active === 'true'
  };
  data.fullName = form.value.fullName.trim().toUpperCase();
  emit('save', data);
};
</script>

<template>
  <Dialog :open="show" @update:open="val => { if (!val) emit('close') }">
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <User class="text-primary" :size="20" />
          {{ technician ? 'Editar Personal' : 'Nuevo Personal' }}
        </DialogTitle>
        <DialogDescription>
          Completa la información del personal para registrarlo en el sistema.
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="grid gap-4 py-4">
        <!-- Full Name -->
        <div class="grid gap-2">
          <Label for="fullName">Nombres y Apellidos</Label>
          <div class="relative">
            <User class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
            <Input
              id="fullName"
              v-model="form.fullName"
              placeholder="Ej. JUAN PÉREZ GARCÍA"
              required
              class="pl-9 bg-background"
            />
          </div>
        </div>

        <!-- DNI -->
        <div class="grid gap-2">
          <Label for="dni">DNI</Label>
          <div class="relative">
            <CreditCard class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
            <Input
              id="dni"
              v-model="form.dni"
              placeholder="Número de documento de 8 dígitos"
              maxlength="8"
              required
              class="pl-9 bg-background"
            />
          </div>
        </div>

        <!-- Phone & Email -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="phone">Teléfono</Label>
            <div class="relative">
              <Phone class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
              <Input
                id="phone"
                v-model="form.phone"
                type="tel"
                placeholder="9XXXXXXXX"
                class="pl-9 bg-background"
              />
            </div>
          </div>
          <div class="grid gap-2">
            <Label for="email">Correo Electrónico</Label>
            <div class="relative">
              <Mail class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
              <Input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="ejemplo@correo.com"
                class="pl-9 bg-background"
              />
            </div>
          </div>
        </div>

        <!-- Location -->
        <div class="grid gap-2">
          <Label for="locationId">Sede Asignada</Label>
          <div class="relative">
            <Building2 class="absolute left-2.5 top-2.5 z-10 text-muted-foreground pointer-events-none" :size="16" />
            <Select v-model="form.locationId" :disabled="isSedeRole">
              <SelectTrigger class="pl-9 bg-background w-full">
                <SelectValue placeholder="Seleccione una sede..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="loc in locationStore.locations" :key="loc.id" :value="loc.id">
                  {{ loc.nombre }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Role & Status -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="role">Cargo / Función</Label>
            <div class="relative">
              <Tag class="absolute left-2.5 top-2.5 z-10 text-muted-foreground pointer-events-none" :size="16" />
              <Select v-model="form.role">
                <SelectTrigger class="pl-9 bg-background w-full">
                  <SelectValue placeholder="Seleccione cargo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="role in roles" :key="role" :value="role">
                    {{ role }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid gap-2">
            <Label for="active">Estado</Label>
            <Select v-model="form.active">
              <SelectTrigger class="bg-background w-full">
                <SelectValue placeholder="Seleccione estado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activo</SelectItem>
                <SelectItem value="false">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </form>

      <DialogFooter>
        <Button variant="outline" @click="emit('close')" :disabled="loading">
          Cancelar
        </Button>
        <Button @click="handleSubmit" :disabled="loading" class="gap-2">
          <Save v-if="!loading" :size="16" />
          {{ loading ? 'Guardando...' : (technician ? 'Guardar Cambios' : 'Registrar Personal') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

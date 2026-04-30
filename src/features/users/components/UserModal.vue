<script setup>
import { ref, computed, watch } from 'vue';
import { 
  Users, 
  Key, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Building2, 
  ShieldCheck,
  Save,
  Info
} from 'lucide-vue-next';
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
  loading: Boolean,
  technicians: {
    type: Array,
    default: () => []
  },
  locations: {
    type: Array,
    default: () => []
  },
  user: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'save']);

// State
const userRole = ref('tecnico'); // 'tecnico', 'sede', or 'admin'
const selectedTechId = ref('');
const selectedSedeId = ref('');
const accountEmail = ref('');
const accountPassword = ref('');
const showPassword = ref(false);

const isEditing = computed(() => !!props.user);

const resetForm = () => {
  if (props.user) {
    userRole.value = props.user.role;
    accountEmail.value = props.user.email;
    selectedTechId.value = props.user.technicianId || '';
    selectedSedeId.value = props.user.locationId || '';
  } else {
    userRole.value = 'tecnico';
    selectedTechId.value = '';
    selectedSedeId.value = '';
    accountEmail.value = '';
  }
  accountPassword.value = '';
  showPassword.value = false;
};

watch(() => props.show, (val) => {
  if (val) resetForm();
});

const handleSubmit = () => {
  if (isEditing.value) {
    if (!accountPassword.value || accountPassword.value.length < 6) return;
    emit('save', {
      uid: props.user.uid,
      password: accountPassword.value
    });
    return;
  }

  let emailToUse = '';
  let extraData = {};

  if (userRole.value === 'tecnico') {
    if (!selectedTechId.value) return;
    const tech = props.technicians.find(t => t.id === selectedTechId.value);
    emailToUse = tech.email;
    extraData = { technicianId: tech.id };
  } else if (userRole.value === 'sede') {
    if (!selectedSedeId.value || !accountEmail.value) return;
    emailToUse = accountEmail.value;
    extraData = { locationId: selectedSedeId.value };
  } else {
    if (!accountEmail.value) return;
    emailToUse = accountEmail.value;
    extraData = { fullName: 'Administrador' };
  }

  if (!accountPassword.value || accountPassword.value.length < 6) return;

  emit('save', {
    email: emailToUse,
    password: accountPassword.value,
    role: userRole.value,
    extraData
  });
};

const isFormValid = computed(() => {
  if (isEditing.value) return accountPassword.value.length >= 6;
  if (userRole.value === 'tecnico') return !!selectedTechId.value && accountPassword.value.length >= 6;
  if (userRole.value === 'sede') return !!selectedSedeId.value && !!accountEmail.value && accountPassword.value.length >= 6;
  return !!accountEmail.value && accountPassword.value.length >= 6;
});
</script>

<template>
  <Dialog :open="show" @update:open="val => { if (!val) emit('close') }">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Key class="text-primary" :size="20" />
          {{ isEditing ? 'Actualizar Contraseña' : 'Habilitar Acceso' }}
        </DialogTitle>
        <DialogDescription>
          {{ isEditing 
            ? 'Modifica las credenciales de acceso para el usuario seleccionado.' 
            : 'Crea una cuenta de acceso para un técnico, administrativo o administrador.' }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <!-- Tipo de Usuario (Solo Creación) -->
        <div v-if="!isEditing" class="grid gap-2">
          <Label>Tipo de Usuario</Label>
          <div class="grid grid-cols-3 gap-2">
            <Button 
              type="button" 
              variant="outline"
              :class="{ 'bg-primary/10 border-primary text-primary': userRole === 'tecnico' }"
              @click="userRole = 'tecnico'"
              class="h-20 flex-col gap-2"
            >
              <Users :size="20" />
              <span class="text-xs font-bold">TÉCNICO</span>
            </Button>
            <Button 
              type="button" 
              variant="outline"
              :class="{ 'bg-primary/10 border-primary text-primary': userRole === 'sede' }"
              @click="userRole = 'sede'"
              class="h-20 flex-col gap-2"
            >
              <Building2 :size="20" />
              <span class="text-xs font-bold">SEDE</span>
            </Button>
            <Button 
              type="button" 
              variant="outline"
              :class="{ 'bg-primary/10 border-primary text-primary': userRole === 'admin' }"
              @click="userRole = 'admin'"
              class="h-20 flex-col gap-2"
            >
              <ShieldCheck :size="20" />
              <span class="text-xs font-bold">ADMIN</span>
            </Button>
          </div>
        </div>

        <!-- Section for Technician -->
        <div v-if="userRole === 'tecnico' && !isEditing" class="grid gap-2 animate-in slide-in-from-top-2 duration-300">
          <Label for="techId">Seleccionar Técnico (Con email)</Label>
          <div class="relative">
            <Users class="absolute left-2.5 top-2.5 z-10 text-muted-foreground pointer-events-none" :size="16" />
            <Select v-model="selectedTechId">
              <SelectTrigger id="techId" class="pl-9 bg-background w-full">
                <SelectValue placeholder="Seleccione un técnico..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in technicians" :key="t.id" :value="t.id">
                  {{ t.fullName }} ({{ t.email }})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p v-if="technicians.length === 0" class="text-[11px] text-amber-600 font-bold flex items-center gap-1">
            <Info :size="10" /> No hay técnicos activos con email sin cuenta asignada.
          </p>
        </div>

        <!-- Section for Sede or Admin -->
        <template v-else-if="userRole !== 'tecnico' && !isEditing">
          <div v-if="userRole === 'sede'" class="grid gap-2 animate-in slide-in-from-top-2 duration-300">
            <Label for="sedeId">Seleccionar Sede</Label>
            <div class="relative">
              <Building2 class="absolute left-2.5 top-2.5 z-10 text-muted-foreground pointer-events-none" :size="16" />
              <Select v-model="selectedSedeId">
                <SelectTrigger id="sedeId" class="pl-9 bg-background w-full">
                  <SelectValue placeholder="Seleccione una sede..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="l in locations" :key="l.id" :value="l.id">
                    {{ l.nombre }} ({{ l.codigo }})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid gap-2 animate-in slide-in-from-top-2 duration-300">
            <Label for="email">Correo de Acceso</Label>
            <div class="relative">
              <Mail class="absolute left-2.5 top-2.5 text-muted-foreground" :size="16" />
              <Input 
                id="email"
                v-model="accountEmail" 
                type="email" 
                placeholder="ejemplo@correo.com"
                class="pl-9 bg-background"
              />
            </div>
          </div>
        </template>

        <!-- Readonly info in Edit Mode -->
        <div v-if="isEditing" class="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
          <div class="space-y-1">
            <Label class="text-[10px] text-muted-foreground uppercase">Usuario</Label>
            <div class="flex items-center gap-2 text-sm font-bold truncate">
              <Mail :size="14" class="text-primary" />
              {{ accountEmail }}
            </div>
          </div>
          <div class="space-y-1">
            <Label class="text-[10px] text-muted-foreground uppercase">Tipo</Label>
            <div class="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck :size="14" class="text-primary" />
              {{ userRole.toUpperCase() }}
            </div>
          </div>
        </div>

        <!-- Password -->
        <div class="grid gap-2" v-if="selectedTechId || selectedSedeId || userRole === 'admin' || isEditing">
          <Label for="password">{{ isEditing ? 'Nueva Contraseña' : 'Asignar Contraseña' }}</Label>
          <div class="relative group">
            <Lock class="absolute left-2.5 top-2.5 text-muted-foreground group-focus-within:text-primary transition-colors" :size="16" />
            <Input 
              id="password"
              v-model="accountPassword" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="Mínimo 6 caracteres"
              class="pl-9 pr-10 bg-background"
            />
            <button 
              @click="showPassword = !showPassword" 
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" 
              type="button"
            >
              <Eye v-if="!showPassword" :size="18" />
              <EyeOff v-else :size="18" />
            </button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('close')" :disabled="loading">
          Cancelar
        </Button>
        <Button @click="handleSubmit" class="gap-2" :disabled="loading || !isFormValid">
          <Save v-if="!loading" :size="16" />
          <div v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          {{ loading ? 'Procesando...' : (isEditing ? 'Actualizar Contraseña' : 'Habilitar Acceso') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

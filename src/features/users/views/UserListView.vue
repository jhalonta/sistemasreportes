<script setup>
import { onMounted, ref, computed } from 'vue';
import { toast } from 'vue-sonner';
import { useUserStore } from '../store/userStore';
import { useLocationStore } from '../../locations/store/locationStore';
import { usePersonalStore } from '../../personal/store/personalStore';
import UserModal from '../components/UserModal.vue';
import { 
  UserPlus, 
  Search, 
  ShieldCheck, 
  MapPin, 
  Wrench, 
  UserCircle,
  MoreVertical,
  UserX,
  RefreshCw,
  Mail,
  Calendar,
  MoreHorizontal,
  Lock,
  Power,
  AlertTriangle,
  Pencil,
  KeyRound
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const userStore = useUserStore();
const locationStore = useLocationStore();
const techStore = usePersonalStore();

const showModal = ref(false);
const searchQuery = ref('');
const userToDelete = ref(null);
const editingUser = ref(null);

onMounted(async () => {
  await userStore.fetchUsers();
  if (locationStore.locations.length === 0) {
    locationStore.fetchLocations();
  }
  if (techStore.technicians.length === 0) {
    techStore.fetchTechnicians();
  }
});

const filteredUsers = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return userStore.users.filter(u => 
    u.email.toLowerCase().includes(query) ||
    u.role.toLowerCase().includes(query)
  );
});

const getRoleConfig = (role) => {
  switch (role) {
    case 'admin': return { label: 'ADMIN', icon: ShieldCheck, color: 'bg-rose-950 text-rose-400 border-rose-900/50' };
    case 'sede': return { label: 'SEDE', icon: MapPin, color: 'bg-blue-950 text-blue-400 border-blue-900/50' };
    case 'tecnico': return { label: 'TECNICO', icon: Wrench, color: 'bg-amber-950 text-amber-400 border-amber-900/50' };
    default: return { label: 'USUARIO', icon: UserCircle, color: 'bg-slate-900 text-slate-400 border-slate-800' };
  }
};

const getOwnerName = (user) => {
  if (user.role === 'tecnico') {
    const tech = techStore.technicians.find(t => t.id === user.technicianId);
    return tech ? tech.fullName : 'Técnico Desconocido';
  } else if (user.role === 'sede') {
    const sede = locationStore.locations.find(l => l.id === user.locationId);
    return sede ? sede.nombre : 'Sede Desconocida';
  } else if (user.role === 'admin') {
    return user.fullName || 'Administrador del Sistema';
  }
  return 'Usuario';
};

const handleToggleStatus = async (user) => {
  try {
    await userStore.toggleUserStatus(user.uid, user.active !== false);
    toast.success(`Estado de ${user.email} actualizado`);
  } catch (err) {
    toast.error(err.message || 'Error al actualizar estado');
  }
};

const handleDeleteUser = (user) => {
  userToDelete.value = user;
};

const confirmDeleteAction = async () => {
  if (!userToDelete.value) return;
  
  const user = userToDelete.value;
  try {
    await userStore.deleteUser(user.uid);
    toast.success('Acceso eliminado correctamente');
    userToDelete.value = null;
  } catch (err) {
    toast.error(err.message || 'Error al eliminar acceso');
  }
};

const handleEditUser = (user) => {
  editingUser.value = user;
  showModal.value = true;
};

const handleSaveAccount = async (payload) => {
  try {
    if (editingUser.value) {
      // Modo Edición: solo contraseña
      await userStore.updateUser(payload.uid, { password: payload.password });
      toast.success('Contraseña actualizada correctamente');
    } else {
      // Modo Creación
      await userStore.createUserAccount(
        payload.email,
        payload.password,
        payload.role,
        payload.extraData
      );
      toast.success('Acceso habilitado correctamente');
    }
    showModal.value = false;
    editingUser.value = null;
  } catch (err) {
    toast.error(err.message || 'Error al procesar la solicitud');
  }
};
</script>

<template>
  <div class="flex flex-1 flex-col gap-4 p-4 pt-2">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Gestión de Accesos</h1>
        <p class="text-sm text-muted-foreground italic">
          Control de identidades y permisos del sistema.
        </p>
      </div>
      <Button @click="showModal = true" class="gap-2 shadow-sm">
        <UserPlus :size="18" /> Habilitar Acceso
      </Button>
    </div>

    <!-- Stats & Search -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card class="md:col-span-3">
        <CardContent class="p-4">
          <div class="relative w-full">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" :size="16" />
            <Input 
              v-model="searchQuery" 
              placeholder="Buscar por email o rol..." 
              class="pl-10 bg-background"
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5">
            <p class="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Usuarios</p>
            <p class="text-2xl font-bold">{{ userStore.users.length }}</p>
          </div>
          <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck :size="20" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Users Table -->
    <Card class="overflow-hidden border-none shadow-md">
      <div class="overflow-x-auto">
        <Table>
          <TableHeader class="bg-secondary/50">
            <TableRow>
              <TableHead class="w-[300px]">Usuario / Identidad</TableHead>
              <TableHead>Rol del Sistema</TableHead>
              <TableHead>Sede / Referencia</TableHead>
              <TableHead class="text-center">Estado</TableHead>
              <TableHead class="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="userStore.loading && userStore.users.length === 0">
              <TableCell colspan="5" class="h-32 text-center text-muted-foreground">
                <div class="flex items-center justify-center gap-2">
                  <RefreshCw class="animate-spin" :size="18" />
                  Cargando usuarios...
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="filteredUsers.length === 0">
              <TableCell colspan="5" class="h-32 text-center text-muted-foreground">
                No se encontraron usuarios que coincidan con la búsqueda.
              </TableCell>
            </TableRow>
            <TableRow v-for="user in filteredUsers" :key="user.uid" class="group transition-colors hover:bg-muted/50">
              <TableCell>
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                    <Mail :size="16" />
                  </div>
                  <div class="flex flex-col">
                    <span class="font-bold text-sm">{{ user.email }}</span>
                    <span class="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">UID: {{ user.uid.substring(0, 8) }}...</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <div 
                    class="px-3 py-1 bg-muted/50 border rounded-md font-mono font-black text-[11px] tracking-widest uppercase flex items-center gap-2 shadow-sm"
                    :class="getRoleConfig(user.role).color"
                  >
                    <component :is="getRoleConfig(user.role).icon" :size="12" />
                    {{ getRoleConfig(user.role).label }}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-2 text-sm">
                  <span class="text-muted-foreground font-medium">
                    {{ getOwnerName(user) }}
                  </span>
                </div>
              </TableCell>
              <TableCell class="text-center">
                <Badge 
                  :class="cn(
                    'capitalize font-bold px-2.5 py-0.5 border-none shadow-sm',
                    user.active !== false 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                      : 'bg-rose-500 text-white hover:bg-rose-600'
                  )"
                >
                  {{ user.active !== false ? 'Activo' : 'Inactivo' }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="h-8 w-8">
                      <MoreHorizontal :size="16" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="w-48">
                    <DropdownMenuLabel>Gestión de Acceso</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem @click="handleEditUser(user)" class="cursor-pointer">
                      <KeyRound class="mr-2 h-4 w-4 text-amber-500" />
                      <span>Actualizar Contraseña</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="handleToggleStatus(user)" class="cursor-pointer">
                      <Power class="mr-2 h-4 w-4" :class="user.active !== false ? 'text-rose-500' : 'text-emerald-500'" />
                      <span>{{ user.active !== false ? 'Deshabilitar Acceso' : 'Habilitar Acceso' }}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="handleDeleteUser(user)" class="cursor-pointer text-rose-600 focus:text-rose-600">
                      <Trash2 class="mr-2 h-4 w-4" />
                      <span>Eliminar Definitivamente</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>

    <UserModal 
      :show="showModal"
      :user="editingUser"
      :locations="locationStore.locations"
      :technicians="techStore.technicians"
      @close="() => { showModal = false; editingUser = null; }"
      @save="handleSaveAccount"
      :loading="userStore.loading"
    />

    <!-- Delete Confirmation Dialog -->
    <Dialog :open="!!userToDelete" @update:open="val => { if(!val) userToDelete = null }">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 font-bold text-rose-600">
            <AlertTriangle :size="20" />
            ¿Eliminar Acceso?
          </DialogTitle>
          <DialogDescription class="pt-2">
            Esta acción no se puede deshacer. Se eliminará el acceso de <strong>{{ userToDelete?.email }}</strong> permanentemente del sistema.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4">
          <Button variant="outline" @click="userToDelete = null">Cancelar</Button>
          <Button variant="destructive" @click="confirmDeleteAction" :disabled="userStore.loading">
            {{ userStore.loading ? 'Eliminando...' : 'Sí, Eliminar' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

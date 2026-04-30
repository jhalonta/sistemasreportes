<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { usePersonalStore } from '../store/personalStore';
import { useLocationStore } from '../../locations/store/locationStore';
import { useAuthStore } from '../../auth/store/authStore';
import PersonalModal from '../components/PersonalModal.vue';
import { 
  Plus, Pencil, Trash2, User, Phone, Mail, Search, 
  AlertTriangle, Building2, UserCircle2, MoreHorizontal 
} from 'lucide-vue-next';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const personalStore = usePersonalStore();
const locationStore = useLocationStore();
const authStore = useAuthStore();
const showModal = ref(false);
const selectedTech = ref(null);
const searchQuery = ref('');
const selectedLocationId = ref('all');
const selectedRole = ref('all');

const PAGE_SIZE = 10;
const currentPage = ref(1);

onMounted(() => {
  personalStore.fetchTechnicians();
  locationStore.fetchLocations();
});

watch(() => authStore.userProfile, (profile) => {
  if (profile?.role === 'sede') {
    selectedLocationId.value = profile.locationId;
  }
}, { immediate: true });

const openModal = (tech = null) => {
  selectedTech.value = tech;
  showModal.value = true;
};

const handleSave = async (data) => {
  try {
    const profile = authStore.userProfile;
    if (profile?.role === 'sede') {
      data.locationId = profile.locationId;
    }
    
    if (selectedTech.value) {
      await personalStore.updateTechnician(selectedTech.value.id, data);
    } else {
      await personalStore.addTechnician(data);
    }
    showModal.value = false;
  } catch (err) {
    // Error handled in store
  }
};

const techToDelete = ref(null);

const confirmDelete = (tech) => {
  techToDelete.value = tech;
};

const handleDelete = async () => {
  if (techToDelete.value) {
    await personalStore.deleteTechnician(techToDelete.value.id);
    techToDelete.value = null;
  }
};

const filteredTechnicians = computed(() => {
  const profile = authStore.userProfile;
  const query = searchQuery.value.toLowerCase();
  
  return personalStore.technicians.filter(t => {
    // Filter by role/sede access
    if (profile?.role === 'sede' && t.locationId !== profile.locationId) {
      return false;
    }

    // Filter by selected location (for admin)
    if (profile?.role === 'admin' && selectedLocationId.value !== 'all' && t.locationId !== selectedLocationId.value) {
      return false;
    }

    // Filter by selected role
    if (selectedRole.value !== 'all' && t.role !== selectedRole.value) {
      return false;
    }
    
    const locName = locationStore.locations.find(l => l.id === t.locationId)?.nombre || '';
    return t.fullName.toLowerCase().includes(query) ||
      t.phone?.includes(query) ||
      t.email?.toLowerCase().includes(query) ||
      t.role?.toLowerCase().includes(query) ||
      locName.toLowerCase().includes(query);
  });
});

const availableRoles = computed(() => {
  const roles = personalStore.technicians
    .map(t => t.role)
    .filter(role => !!role);
  return [...new Set(roles)].sort();
});

// Reset to page 1 whenever filters change
watch([searchQuery, selectedLocationId, selectedRole], () => { currentPage.value = 1; });

const paginatedTechnicians = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredTechnicians.value.slice(start, start + PAGE_SIZE);
});

const getLocationName = (locationId) => {
  const loc = locationStore.locations.find(l => l.id === locationId);
  return loc ? loc.nombre : 'Sin sede';
};
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <div class="flex flex-1 flex-col gap-4 p-4 pt-2 min-w-0 overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-base font-bold tracking-tight flex items-center gap-2">
            <UserCircle2 :size="18" class="text-primary" />
            Gestión de Personal técnico
          </h1>
          <p class="text-[11px] text-muted-foreground mt-0.5">
            {{ authStore.userProfile?.role === 'sede' 
              ? 'Administra el personal operativo asignatodo a tu sede.' 
              : 'Administra el directorio de personal técnico y administrativo del sistema.' }}
          </p>
        </div>
        <Button @click="openModal()" size="sm" class="gap-2 h-8 text-xs px-3">
          <Plus :size="14" /> Nuevo Personal
        </Button>
      </div>

      <!-- Filters & Stats -->
      <Card>
        <CardContent class="p-4 flex flex-col md:flex-row items-center gap-4">
          <div class="relative flex-1 w-full">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" :size="16" />
            <Input 
              v-model="searchQuery" 
              placeholder="Buscar por nombre, teléfono, cargo o sede..." 
              class="pl-10 bg-background"
            />
          </div>

          <!-- Location selection for admin -->
          <div v-if="authStore.userProfile?.role === 'admin'" class="w-full md:w-64 shrink-0">
            <Select v-model="selectedLocationId">
              <SelectTrigger class="h-10 bg-background w-full">
                <SelectValue placeholder="Todas las sedes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Sedes</SelectItem>
                <SelectItem v-for="loc in locationStore.locations" :key="loc.id" :value="loc.id">
                  {{ loc.nombre }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Role selection -->
          <div class="w-full md:w-48 shrink-0">
            <Select v-model="selectedRole">
              <SelectTrigger class="h-10 bg-background w-full">
                <SelectValue placeholder="Todos los cargos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Cargos</SelectItem>
                <SelectItem v-for="role in availableRoles" :key="role" :value="role">
                  {{ role }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            <User :size="14" />
            {{ filteredTechnicians.length }} Integrantes
          </div>
        </CardContent>
      </Card>

      <!-- Main Content -->
      <Card class="overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <Table class="min-w-[800px]">
            <TableHeader>
              <TableRow class="hover:bg-transparent bg-muted/30">
                <TableHead class="pl-4 text-[10px] font-bold uppercase tracking-widest w-[300px]">Nombre Completo / Identidad</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest w-[180px]">Contacto</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest">Sede Asignada</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest">Cargo / Función</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest text-center w-[120px]">Estado</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest text-right pr-4 w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading State -->
              <TableRow v-if="personalStore.loading && personalStore.technicians.length === 0">
                <TableCell colspan="6" class="h-64 text-center">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p class="text-sm text-muted-foreground">Cargando personal...</p>
                  </div>
                </TableCell>
              </TableRow>

              <!-- Empty State -->
              <TableRow v-else-if="filteredTechnicians.length === 0">
                <TableCell colspan="6" class="h-64 text-center">
                  <div class="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <AlertTriangle :size="48" class="opacity-20" />
                    <div class="space-y-1">
                      <p class="font-semibold text-foreground">No se encontró personal</p>
                      <p class="text-xs">Prueba con otros criterios de búsqueda.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>

              <!-- Data Rows -->
              <TableRow v-for="t in paginatedTechnicians" :key="t.id" class="group transition-colors">
                <TableCell class="pl-4 py-3">
                  <div class="flex items-center gap-3">
                    <Avatar class="h-9 w-9 rounded-lg border border-primary/10 shadow-sm">
                      <AvatarFallback class="rounded-lg bg-primary/5 text-primary font-bold text-xs">
                        {{ t.fullName.charAt(0) }}
                      </AvatarFallback>
                    </Avatar>
                    <div class="space-y-0.5">
                      <p class="font-bold text-sm leading-none text-foreground">{{ t.fullName }}</p>
                      <p class="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">{{ t.dni || 'SIN DNI' }}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell class="py-3">
                  <div class="flex flex-col gap-0.5 text-xs font-semibold">
                    <div v-if="t.phone" class="flex items-center gap-1.5 text-muted-foreground">
                      <Phone :size="11" class="shrink-0" /> {{ t.phone }}
                    </div>
                    <div v-if="t.email" class="flex items-center gap-1.5 text-muted-foreground truncate max-w-[160px]">
                      <Mail :size="11" class="shrink-0" /> {{ t.email }}
                    </div>
                  </div>
                </TableCell>
                <TableCell class="py-3">
                  <div class="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Building2 :size="13" class="shrink-0" />
                    {{ getLocationName(t.locationId) }}
                  </div>
                </TableCell>
                <TableCell class="py-3">
                  <Badge variant="outline" class="font-bold text-[10px] uppercase tracking-wider bg-muted border-none">
                    {{ t.role || 'Sin cargo' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-center py-3">
                  <Badge 
                    class="h-5 text-[10px] px-2 font-bold border-none shadow-sm"
                    :class="t.active ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-rose-500 text-white hover:bg-rose-600'"
                  >
                    {{ t.active ? 'ACTIVO' : 'INACTIVO' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right pr-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-primary transition-colors">
                        <MoreHorizontal :size="16" />
                        <span class="sr-only">Abrir menú</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-[160px]">
                      <DropdownMenuLabel class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem @click="openModal(t)" class="cursor-pointer">
                        <Pencil class="mr-2 h-4 w-4 text-blue-500" />
                        <span>Editar Ficha</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="confirmDelete(t)" class="cursor-pointer text-rose-600 focus:text-rose-600 font-medium">
                        <Trash2 class="mr-2 h-4 w-4" />
                        <span>Eliminar Registro</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- Pagination Footer -->
        <div v-if="filteredTechnicians.length > PAGE_SIZE"
          class="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
          <p class="text-[11px] text-muted-foreground shrink-0">
            Mostrando
            <span class="font-bold text-foreground">{{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, filteredTechnicians.length) }}</span>
            de
            <span class="font-bold text-foreground">{{ filteredTechnicians.length }}</span>
            registros
          </p>
          <Pagination
            v-model:page="currentPage"
            :total="filteredTechnicians.length"
            :items-per-page="PAGE_SIZE"
            :sibling-count="1"
            show-edges
            class="w-auto mx-0"
          >
            <PaginationContent v-slot="{ items }">
              <PaginationFirst />
              <PaginationPrevious />
              <template v-for="item in items" :key="item.type === 'page' ? item.value : `ellipsis-${item.value}`">
                <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === currentPage" />
                <PaginationEllipsis v-else />
              </template>
              <PaginationNext />
              <PaginationLast />
            </PaginationContent>
          </Pagination>
        </div>
      </Card>

      <!-- Modals -->
      <PersonalModal 
        :show="showModal" 
        :technician="selectedTech" 
        :loading="personalStore.loading"
        @close="showModal = false"
        @save="handleSave"
      />

      <!-- Delete Confirmation Dialog -->
      <Dialog :open="!!techToDelete" @update:open="val => { if(!val) techToDelete = null }">
        <DialogContent class="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2 font-bold text-rose-600">
              <AlertTriangle :size="20" />
              ¿Eliminar Personal?
            </DialogTitle>
            <DialogDescription class="pt-2">
              Esta acción no se puede deshacer. Se eliminará a <strong>{{ techToDelete?.fullName }}</strong> permanentemente del sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="mt-4">
            <Button variant="outline" @click="techToDelete = null">Cancelar</Button>
            <Button variant="destructive" @click="handleDelete" :disabled="personalStore.loading">
              {{ personalStore.loading ? 'Eliminando...' : 'Sí, Eliminar' }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </TooltipProvider>
</template>

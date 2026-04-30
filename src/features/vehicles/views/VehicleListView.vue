<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { toast } from 'vue-sonner';
import { useVehicleStore } from '../store/vehicleStore';
import { useLocationStore } from '../../locations/store/locationStore';
import { useAuthStore } from '../../auth/store/authStore';
import VehicleModal from '../components/VehicleModal.vue';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Truck, 
  Bike,
  Tag, 
  Search, 
  AlertTriangle, 
  Building2,
  CircleCheck,
  XCircle,
  HelpCircle,
  Wrench,
  MoreHorizontal
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

const vehicleStore = useVehicleStore();
const locationStore = useLocationStore();
const authStore = useAuthStore();

const showModal = ref(false);
const selectedVehicle = ref(null);
const searchQuery = ref('');
const selectedLocationId = ref('all');
const selectedType = ref('all');
const vehicleToDelete = ref(null);
const modalError = ref(null);

const PAGE_SIZE = 10;
const currentPage = ref(1);

const vehicleTypes = [
  { value: 'motokar', label: 'Motokar' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'moto', label: 'Motocicleta' },
  { value: 'otro', label: 'Otro' }
];

onMounted(async () => {
  await vehicleStore.fetchVehicles();
  if (locationStore.locations.length === 0) {
    locationStore.fetchLocations();
  }
});

watch(() => authStore.userProfile, (profile) => {
  if (profile?.role === 'sede') {
    selectedLocationId.value = profile.locationId;
  }
}, { immediate: true });

const filteredVehicles = computed(() => {
  const profile = authStore.userProfile;
  const query = searchQuery.value.toLowerCase();
  
  return vehicleStore.vehicles.filter(v => {
    // 1. Role-based filter
    if (profile?.role === 'sede' && v.sedeId !== profile.locationId) {
      return false;
    }

    // 2. Filter by selected location (for admin)
    if (profile?.role === 'admin' && selectedLocationId.value !== 'all' && v.sedeId !== selectedLocationId.value) {
      return false;
    }

    // 3. Filter by selected type
    if (selectedType.value !== 'all' && v.tipo?.toLowerCase() !== selectedType.value.toLowerCase()) {
      return false;
    }
    
    // 4. Search query filter
    const locName = locationStore.locations.find(l => l.id === v.sedeId)?.nombre || '';
    return v.placa.toLowerCase().includes(query) ||
           v.tipo.toLowerCase().includes(query) ||
           v.estado.toLowerCase().includes(query) ||
           locName.toLowerCase().includes(query);
  });
});

const openModal = (vehicle = null) => {
  selectedVehicle.value = vehicle;
  modalError.value = null;
  showModal.value = true;
};

const handleSave = async (data) => {
  modalError.value = null;
  try {
    const profile = authStore.userProfile;
    if (profile?.role === 'sede') {
      data.sedeId = profile.locationId;
    }

    if (selectedVehicle.value) {
      await vehicleStore.updateVehicle(selectedVehicle.value.id, data);
      toast.success('Vehículo actualizado correctamente.');
    } else {
      await vehicleStore.addVehicle(data);
      toast.success('Vehículo registrado correctamente.');
    }
    showModal.value = false;
  } catch (err) {
    if (err.message === 'PLACA_DUPLICADA') {
      modalError.value = 'Esta placa ya está registrada en el sistema.';
      toast.error('Placa duplicada', { description: 'Esta placa ya está registrada en el sistema.' });
    } else {
      toast.error('Error al guardar el vehículo.');
    }
  }
};

const confirmDelete = (vehicle) => {
  vehicleToDelete.value = vehicle;
};

const handleDelete = async () => {
  if (vehicleToDelete.value) {
    const placa = vehicleToDelete.value.placa;
    try {
      await vehicleStore.deleteVehicle(vehicleToDelete.value.id);
      vehicleToDelete.value = null;
      toast.success(`Vehículo ${placa} eliminado correctamente.`);
    } catch {
      toast.error('Error al eliminar el vehículo.');
    }
  }
};

const getStatusConfig = (state) => {
  switch (state) {
    case 'disponible': return { icon: CircleCheck, class: 'bg-emerald-500 hover:bg-emerald-600', label: 'Disponible' };
    case 'mantenimiento': return { icon: Wrench, class: 'bg-amber-500 hover:bg-amber-600', label: 'Mantenimiento' };
    case 'asignado': return { icon: Truck, class: 'bg-blue-500 hover:bg-blue-600', label: 'Asignado' };
    case 'inactivo': return { icon: XCircle, class: 'bg-rose-500 hover:bg-rose-600', label: 'Inactivo' };
    default: return { icon: HelpCircle, class: 'bg-slate-500 hover:bg-slate-600', label: 'Desconocido' };
  }
};

const getLocationName = (sedeId) => {
  const loc = locationStore.locations.find(l => l.id === sedeId);
  return loc ? loc.nombre : 'Sede no encontrada';
};

// Reset to page 1 whenever filters change
watch([searchQuery, selectedLocationId, selectedType], () => { currentPage.value = 1; });

const paginatedVehicles = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredVehicles.value.slice(start, start + PAGE_SIZE);
});

const getVehicleIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'moto':
    case 'motocicleta':
      return Bike;
    case 'motokar':
    case 'camioneta':
    case 'otro':
      return Truck;
    default:
      return Truck;
  }
};
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <div class="flex flex-1 flex-col gap-4 p-4 pt-2 min-w-0 overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-base font-bold tracking-tight flex items-center gap-2">
            <Truck :size="18" class="text-primary" />
            Flota de Vehículos corporativos
          </h1>
          <p class="text-[11px] text-muted-foreground mt-0.5">
            {{ authStore.userProfile?.role === 'sede' 
              ? 'Control de unidades de transporte de tu sede.' 
              : 'Administra la flota de vehículos corporativos del sistema.' }}
          </p>
        </div>
        <Button v-if="authStore.userProfile?.role === 'admin' || authStore.userProfile?.role === 'sede'" @click="openModal()" size="sm" class="gap-2 h-8 text-xs px-3">
          <Plus :size="14" /> Nuevo Vehículo
        </Button>
      </div>

      <!-- Filters & Stats -->
      <Card>
        <CardContent class="p-4 flex flex-col md:flex-row items-center gap-4">
          <div class="relative flex-1 w-full">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" :size="16" />
            <Input 
              v-model="searchQuery" 
              placeholder="Buscar por placa, tipo o sede..." 
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

          <!-- Type selection -->
          <div class="w-full md:w-48 shrink-0">
            <Select v-model="selectedType">
              <SelectTrigger class="h-10 bg-background w-full">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Tipos</SelectItem>
                <SelectItem v-for="type in vehicleTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex items-center gap-4 shrink-0">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Truck :size="14" />
              {{ filteredVehicles.length }} Unidades
            </div>
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
              <CircleCheck :size="14" />
              {{ filteredVehicles.filter(v => v.estado === 'disponible').length }} Disponibles
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Main Content -->
      <Card class="overflow-hidden">
        <div class="overflow-x-auto">
          <Table class="min-w-[800px]">
            <TableHeader>
              <TableRow class="hover:bg-transparent bg-muted/30">
                <TableHead class="pl-4 text-[10px] font-bold uppercase tracking-widest w-[250px]">Unidad</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest w-[140px]">Placa / Serial</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest flex-1">Sede Asignada</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest text-center w-[140px]">Estado</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest text-right pr-4 w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading State -->
              <TableRow v-if="vehicleStore.loading && vehicleStore.vehicles.length === 0">
                <TableCell colspan="5" class="h-64 text-center text-muted-foreground pl-4 pr-4">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p class="text-sm text-muted-foreground">Cargando flota...</p>
                  </div>
                </TableCell>
              </TableRow>

              <!-- Empty State -->
              <TableRow v-else-if="filteredVehicles.length === 0">
                <TableCell colspan="5" class="h-64 text-center text-muted-foreground pl-4 pr-4 font-semibold text-sm">
                  <div class="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <AlertTriangle :size="48" class="opacity-20" />
                    <div class="space-y-1">
                      <p class="font-semibold text-foreground">No se encontraron vehículos</p>
                      <p class="text-xs">Prueba con otros criterios de búsqueda.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>

              <!-- Data Rows -->
              <TableRow v-for="v in paginatedVehicles" :key="v.id" class="group transition-colors">
                <TableCell class="pl-4 py-3">
                  <div class="flex items-center gap-3">
                    <div 
                      class="h-10 w-10 rounded-lg flex items-center justify-center shadow-sm"
                      :class="{
                        'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20': v.estado === 'disponible',
                        'bg-amber-500/10 text-amber-600 border border-amber-500/20': v.estado === 'mantenimiento',
                        'bg-blue-500/10 text-blue-600 border border-blue-500/20': v.estado === 'asignado',
                        'bg-rose-500/10 text-rose-600 border border-rose-500/20': v.estado === 'inactivo'
                      }"
                    >
                      <component :is="getVehicleIcon(v.tipo)" :size="20" />
                    </div>
                    <div class="space-y-0.5">
                      <p class="font-bold text-sm leading-none capitalize text-foreground">{{ v.tipo }}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell class="py-3">
                  <span class="inline-block px-1.5 py-0.5 bg-muted text-foreground border rounded text-xs font-bold tracking-widest font-mono">
                    {{ v.placa }}
                  </span>
                </TableCell>
                <TableCell class="py-3">
                  <div class="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Building2 :size="13" class="shrink-0" />
                    {{ getLocationName(v.sedeId) }}
                  </div>
                </TableCell>
                <TableCell class="text-center py-3">
                  <Badge 
                    class="h-6 text-[10px] px-2.5 font-bold uppercase tracking-wider border-none"
                    :class="getStatusConfig(v.estado).class"
                  >
                    <component :is="getStatusConfig(v.estado).icon" :size="12" class="mr-1" />
                    {{ getStatusConfig(v.estado).label }}
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
                      <DropdownMenuItem @click="openModal(v)" class="cursor-pointer">
                        <Pencil class="mr-2 h-4 w-4 text-blue-500" />
                        <span>Editar Equipo</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem v-if="authStore.userProfile?.role === 'admin'" @click="confirmDelete(v)" class="cursor-pointer text-rose-600 focus:text-rose-600 font-medium">
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
        <div v-if="filteredVehicles.length > PAGE_SIZE"
          class="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
          <p class="text-[11px] text-muted-foreground shrink-0">
            Mostrando
            <span class="font-bold text-foreground">{{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, filteredVehicles.length) }}</span>
            de
            <span class="font-bold text-foreground">{{ filteredVehicles.length }}</span>
            registros
          </p>
          <Pagination
            v-model:page="currentPage"
            :total="filteredVehicles.length"
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
      <VehicleModal
        :show="showModal"
        :vehicle="selectedVehicle"
        :loading="vehicleStore.loading"
        :placa-error="modalError"
        @close="showModal = false"
        @save="handleSave"
      />

      <!-- Delete Confirmation Dialog -->
      <Dialog :open="!!vehicleToDelete" @update:open="val => { if(!val) vehicleToDelete = null }">
        <DialogContent class="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2 font-bold text-rose-600">
              <AlertTriangle :size="20" />
              ¿Eliminar Vehículo?
            </DialogTitle>
            <DialogDescription class="pt-2">
              Esta acción no se puede deshacer. Se eliminará el vehículo con placa <strong>{{ vehicleToDelete?.placa }}</strong> permanentemente del sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="mt-4">
            <Button variant="outline" @click="vehicleToDelete = null">Cancelar</Button>
            <Button variant="destructive" @click="handleDelete" :disabled="vehicleStore.loading">
              {{ vehicleStore.loading ? 'Eliminando...' : 'Sí, Eliminar' }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </TooltipProvider>
</template>

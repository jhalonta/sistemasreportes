<script setup>
import { ref, onMounted, computed } from 'vue';
import { 
  Building2, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  MapPin, 
  User, 
  Tag, 
  AlertTriangle,
  MoreHorizontal
} from 'lucide-vue-next';
import { useLocationStore } from '../store/locationStore';
import LocationModal from '../components/LocationModal.vue';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

const locationStore = useLocationStore();
const searchQuery = ref('');
const showModal = ref(false);
const selectedLocation = ref(null);
const locationToDelete = ref(null);

const PAGE_SIZE = 10;
const currentPage = ref(1);

onMounted(() => {
  locationStore.fetchLocations();
});

const filteredLocations = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return locationStore.locations.filter(loc => 
    loc.nombre.toLowerCase().includes(query) ||
    loc.codigo.toLowerCase().includes(query) ||
    loc.ciudad.toLowerCase().includes(query)
  );
});

const paginatedLocations = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredLocations.value.slice(start, start + PAGE_SIZE);
});

// Reset to page 1 whenever filters change
import { watch } from 'vue';
watch(searchQuery, () => { currentPage.value = 1; });

const openModal = (loc = null) => {
  selectedLocation.value = loc;
  showModal.value = true;
};

const handleSave = async (data) => {
  try {
    if (selectedLocation.value) {
      await locationStore.updateLocation(selectedLocation.value.id, data);
    } else {
      await locationStore.addLocation(data);
    }
    showModal.value = false;
  } catch (error) {
    console.error('Error saving location:', error);
  }
};

const confirmDelete = (loc) => {
  locationToDelete.value = loc;
};

const handleDelete = async () => {
  if (locationToDelete.value) {
    await locationStore.deleteLocation(locationToDelete.value.id);
    locationToDelete.value = null;
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
            <Building2 class="text-primary" :size="18" />
            Gestión de Sedes y Centros
          </h1>
          <p class="text-[11px] text-muted-foreground mt-0.5">
            Administra las sedes operativas y centros de gestión logística del sistema.
          </p>
        </div>
        <Button @click="openModal()" size="sm" class="gap-2 h-8 text-xs px-3">
          <Plus :size="14" /> Nueva Sede
        </Button>
      </div>

      <!-- Filters & Stats -->
      <Card>
        <CardContent class="p-4 flex flex-col md:flex-row items-center gap-4">
          <div class="relative flex-1 w-full">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" :size="16" />
            <Input 
              v-model="searchQuery" 
              placeholder="Buscar por nombre, código o ciudad..." 
              class="pl-10 bg-background"
            />
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Building2 :size="14" />
            {{ filteredLocations.length }} Sedes Registradas
          </div>
        </CardContent>
      </Card>

      <!-- Main Content -->
      <Card class="overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <Table class="min-w-[800px]">
            <TableHeader>
              <TableRow class="hover:bg-transparent bg-muted/30">
                <TableHead class="pl-4 text-[10px] font-bold uppercase tracking-widest w-[300px]">Info Sede / Identificación</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest">Ubicación Geográfica</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest">Responsable Jefe</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest text-center w-[120px]">Estado</TableHead>
                <TableHead class="text-[10px] font-bold uppercase tracking-widest text-right pr-4 w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading State -->
              <TableRow v-if="locationStore.loading && locationStore.locations.length === 0">
                <TableCell colspan="5" class="h-64 text-center">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p class="text-sm text-muted-foreground">Cargando sedes...</p>
                  </div>
                </TableCell>
              </TableRow>

              <!-- Empty State -->
              <TableRow v-else-if="filteredLocations.length === 0">
                <TableCell colspan="5" class="h-64 text-center">
                  <div class="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <AlertTriangle :size="48" class="opacity-20" />
                    <div class="space-y-1">
                      <p class="font-semibold text-foreground">No se encontraron sedes</p>
                      <p class="text-xs">Prueba con otros criterios de búsqueda.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>

              <TableRow v-for="loc in paginatedLocations" :key="loc.id" class="group transition-colors">
                <TableCell class="pl-4 py-3">
                  <div class="flex items-center gap-3">
                    <Avatar class="h-10 w-10 rounded-lg border border-primary/10 shadow-sm">
                      <AvatarFallback class="rounded-lg bg-primary/5 text-primary font-bold text-xs">
                        {{ loc.codigo.substring(0, 2).toUpperCase() }}
                      </AvatarFallback>
                    </Avatar>
                    <div class="space-y-0.5">
                      <p class="font-bold text-sm leading-none text-foreground uppercase">{{ loc.nombre }}</p>
                      <p class="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter flex items-center gap-1">
                        <Tag :size="10" /> {{ loc.codigo }}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell class="py-3">
                  <div class="flex flex-col gap-0.5 text-xs font-semibold">
                    <div class="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin :size="11" class="text-primary shrink-0" /> {{ loc.direccion }}
                    </div>
                    <div class="text-muted-foreground/60 ml-3 py-0.5 text-[10px] uppercase tracking-wide">
                      {{ loc.ciudad }}, {{ loc.departamento }}
                    </div>
                  </div>
                </TableCell>
                <TableCell class="py-3">
                  <div class="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <User :size="13" class="shrink-0" />
                    {{ loc.supervisor }}
                  </div>
                </TableCell>
                <TableCell class="text-center py-3">
                  <Badge 
                    class="h-5 text-[10px] px-2 font-bold uppercase border-none shadow-sm"
                    :class="loc.estado === 'activa' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-rose-500 text-white hover:bg-rose-600'"
                  >
                    {{ loc.estado === 'activa' ? 'ACTIVA' : 'INACTIVA' }}
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
                      <DropdownMenuItem @click="openModal(loc)" class="cursor-pointer">
                        <Pencil class="mr-2 h-4 w-4 text-blue-500" />
                        <span>Editar Sede</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="confirmDelete(loc)" class="cursor-pointer text-rose-600 focus:text-rose-600 font-medium">
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
        <div v-if="filteredLocations.length > PAGE_SIZE"
          class="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
          <p class="text-[11px] text-muted-foreground shrink-0">
            Mostrando
            <span class="font-bold text-foreground">{{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, filteredLocations.length) }}</span>
            de
            <span class="font-bold text-foreground">{{ filteredLocations.length }}</span>
            sedes
          </p>
          <Pagination
            v-model:page="currentPage"
            :total="filteredLocations.length"
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
      <LocationModal 
        :show="showModal" 
        :location="selectedLocation" 
        :loading="locationStore.loading"
        @close="showModal = false"
        @save="handleSave"
      />

      <!-- Delete Confirmation Dialog -->
      <Dialog :open="!!locationToDelete" @update:open="val => { if(!val) locationToDelete = null }">
        <DialogContent class="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2 font-bold text-rose-600">
              <AlertTriangle :size="20" />
              ¿Eliminar Sede?
            </DialogTitle>
            <DialogDescription class="pt-2">
              Esta acción no se puede deshacer. Se eliminará la sede <strong>{{ locationToDelete?.nombre }}</strong> permanentemente del sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="mt-4">
            <Button variant="outline" @click="locationToDelete = null">Cancelar</Button>
            <Button variant="destructive" @click="handleDelete" :disabled="locationStore.loading">
              {{ locationStore.loading ? 'Eliminando...' : 'Sí, Eliminar' }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </TooltipProvider>
</template>

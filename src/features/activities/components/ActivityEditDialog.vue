<script setup>
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-vue-next';
import { useVModel } from '@vueuse/core';

const props = defineProps({
    show: { type: Boolean, default: false },
    editForm: { type: Object, default: () => ({ rateCode: '', assigned: 0, zone: 'priceUrban' }) },
    groupedRates: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    techs: { type: Array, default: () => [] },
    availableVehicles: { type: Array, default: () => [] }
});

import { computed } from 'vue';
import { Truck, Bike } from 'lucide-vue-next';

const getVehicleIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'moto':
    case 'motocicleta':
      return Bike;
    case 'motokar':
    case 'camioneta':
    case 'otro':
    default:
      return Truck;
  }
};
const leadTechs = computed(() => props.techs);
const partnerTechs = computed(() => props.techs.filter(t => t.id !== props.editForm.mainTechId));

const emit = defineEmits(['update:show', 'submit', 'close']);

const showModel = useVModel(props, 'show', emit);

const closeDialog = () => {
    emit('close');
};
</script>

<template>
    <Dialog :open="showModel" @update:open="val => !val && closeDialog()">
        <DialogContent class="sm:max-w-[500px] p-0 overflow-hidden shadow-2xl border-muted/20">
            <DialogHeader class="p-4 border-b bg-muted/30">
                <div class="space-y-1">
                    <DialogTitle class="text-base font-bold flex items-center gap-2 tracking-tight">
                        <Pencil :size="16" class="text-primary" />
                        EDITAR ACTIVIDAD
                    </DialogTitle>
                    <DialogDescription
                        class="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">
                        Modificar detalles de la tarea asignada
                    </DialogDescription>
                </div>
            </DialogHeader>

            <form @submit.prevent="$emit('submit')" class="p-6 space-y-6">
                <div class="grid grid-cols-1 gap-4">
                    <!-- Zone Selection -->
                    <div class="space-y-1.5 flex flex-col">
                        <Label class="text-[10px] font-bold uppercase text-muted-foreground ml-0.5">Zona</Label>
                        <Select v-model="editForm.zone" required>
                            <SelectTrigger class="h-9 text-xs w-full bg-background overflow-hidden inline-flex">
                                <SelectValue placeholder="Zona" class="truncate" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="priceUrban">Urbano</SelectItem>
                                <SelectItem value="priceRural">Rural</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <!-- Service/Activity Selection -->
                    <div class="space-y-1.5 flex flex-col">
                        <Label class="text-[10px] font-bold uppercase text-muted-foreground ml-0.5">Servicio / Actividad</Label>
                        <Select v-model="editForm.rateCode" required>
                            <SelectTrigger class="h-9 text-[11px] bg-background w-full overflow-hidden inline-flex">
                                <SelectValue placeholder="Seleccionar Actividad" class="truncate" />
                            </SelectTrigger>
                            <SelectContent class="max-h-[300px]">
                                <template v-for="(grp, category) in groupedRates" :key="category">
                                    <div class="px-2 py-1.5 text-[10px] font-black uppercase text-muted-foreground/50 bg-muted/10">
                                        {{ category }}
                                    </div>
                                    <SelectItem v-for="rate in grp" :key="rate.code" :value="rate.code" class="text-[11px] py-1.5 px-2">
                                        <div class="flex items-center justify-between w-full gap-4">
                                            <span class="truncate">{{ rate.code }} - {{ rate.name }}</span>
                                            <Badge variant="outline" class="text-[9px] font-black h-4 px-1 ml-auto shrink-0 border-muted-foreground/20">
                                                S/ {{ (rate[editForm.zone] || 0).toFixed(2) }}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                </template>
                            </SelectContent>
                        </Select>
                    </div>

                    <!-- Meta (Assigned) -->
                    <div class="space-y-1.5 flex flex-col">
                        <Label class="text-[10px] font-bold uppercase text-muted-foreground ml-0.5">Asignado</Label>
                        <Input type="number" v-model="editForm.assigned" class="h-9 text-sm font-bold bg-background" required min="1" />
                    </div>

                    <!-- Main Technician Selection -->
                    <div class="space-y-1.5 flex flex-col">
                        <Label class="text-[10px] font-bold uppercase text-muted-foreground ml-0.5">Técnico Principal</Label>
                        <Select v-model="editForm.mainTechId" required>
                            <SelectTrigger class="h-9 text-xs w-full bg-background overflow-hidden inline-flex">
                                <SelectValue placeholder="Técnico Principal" class="truncate" />
                            </SelectTrigger>
                            <SelectContent class="max-h-[200px]">
                                <SelectItem v-for="tech in leadTechs" :key="tech.id" :value="tech.id" class="text-xs">
                                    {{ tech.fullName }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <!-- Partner Technician Selection -->
                    <div class="space-y-1.5 flex flex-col">
                        <Label class="text-[10px] font-bold uppercase text-muted-foreground ml-0.5">Pareja (Opcional)</Label>
                        <Select v-model="editForm.partnerTechId">
                            <SelectTrigger class="h-9 text-xs w-full bg-background overflow-hidden inline-flex">
                                <SelectValue placeholder="Sin pareja" class="truncate" />
                            </SelectTrigger>
                            <SelectContent class="max-h-[200px]">
                                <SelectItem value="">Sin pareja</SelectItem>
                                <SelectItem v-for="tech in partnerTechs" :key="tech.id" :value="tech.id" class="text-xs">
                                    {{ tech.fullName }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <!-- Vehicle Selection -->
                    <div class="space-y-1.5 flex flex-col">
                        <Label class="text-[10px] font-bold uppercase text-muted-foreground ml-0.5">Vehículo</Label>
                        <Select v-model="editForm.vehicleId" required>
                            <SelectTrigger class="h-9 text-xs w-full bg-background overflow-hidden inline-flex">
                                <SelectValue placeholder="Placa" class="truncate" />
                            </SelectTrigger>
                            <SelectContent class="max-h-[200px]">
                                <SelectItem v-for="v in availableVehicles" :key="v.id" :value="v.id">
                                    <div class="flex items-center gap-2">
                                        <component :is="getVehicleIcon(v.tipo)" :size="14" class="text-muted-foreground shrink-0" />
                                        <span class="font-bold truncate text-xs">{{ v.placa }}</span>
                                        <span class="text-[9px] opacity-70 uppercase font-medium shrink-0">({{ v.tipo }})</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter class="px-0 pt-4 border-t flex flex-row gap-3">
                    <Button type="button" variant="outline" @click="closeDialog" class="flex-1 h-9 font-bold uppercase tracking-wider text-[11px]">
                        CANCELAR
                    </Button>
                    <Button type="submit" :disabled="loading" class="flex-1 h-9 font-black uppercase tracking-widest text-[11px]">
                        {{ loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

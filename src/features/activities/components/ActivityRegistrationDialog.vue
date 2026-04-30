<script setup>
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Plus, Trash2, Truck, Bike } from 'lucide-vue-next';
import { useVModel } from '@vueuse/core';

const props = defineProps({
    show: { type: Boolean, default: false },
    isAddingToExisting: { type: Boolean, default: false },
    availableLeadTechs: { type: Array, default: () => [] },
    availablePartners: { type: Array, default: () => [] },
    availableVehicles: { type: Array, default: () => [] },
    groupedRates: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    totalRealized: { type: [String, Number], default: '0.00' },
    selectedMainTech: { type: String, default: '' },
    selectedPartnerTech: { type: String, default: '' },
    selectedVehicle: { type: String, default: '' },
    activityRows: { type: Array, default: () => [] },
    techs: { type: Array, default: () => [] },
    zone: { type: String, default: 'priceUrban' }
});

const emit = defineEmits([
    'update:show', 'update:selectedMainTech', 'update:selectedPartnerTech',
    'update:selectedVehicle', 'add-row', 'remove-row', 'submit', 'close'
]);

const showModel = useVModel(props, 'show', emit);
const mainTechModel = useVModel(props, 'selectedMainTech', emit);
const partnerTechModel = useVModel(props, 'selectedPartnerTech', emit);
const vehicleModel = useVModel(props, 'selectedVehicle', emit);

const closeDialog = () => {
    emit('close');
};

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
</script>

<template>
    <Dialog :open="showModel" @update:open="val => !val && closeDialog()">
        <DialogContent class="sm:max-w-[700px] p-0 overflow-hidden shadow-2xl border-muted/20">
            <DialogHeader class="p-4 border-b bg-muted/30">
                <div class="space-y-1">
                    <DialogTitle class="text-base font-bold flex items-center gap-2 tracking-tight">
                        <Plus :size="16" class="text-primary" />
                        NUEVA PRODUCCIÓN DIARIA
                    </DialogTitle>
                    <DialogDescription
                        class="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">
                        Registro de equipo y actividades realizadas
                    </DialogDescription>
                </div>
            </DialogHeader>

            <div class="p-6 max-h-[70vh] overflow-y-auto space-y-8">
                <form @submit.prevent="$emit('submit')" id="main-activity-form" class="space-y-8">
                    <!-- Step 1: Team Selection -->
                    <div v-if="!isAddingToExisting || !selectedVehicle" class="space-y-4">
                        <div class="flex items-center gap-2 border-b pb-2 border-muted">
                            <span
                                class="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-[10px] text-primary-foreground font-bold">1</span>
                            <h3 class="text-xs font-bold uppercase tracking-widest text-foreground">Equipo de Trabajo
                            </h3>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div v-if="!isAddingToExisting" class="space-y-1.5 flex flex-col">
                                <Label class="text-[10px] font-bold uppercase text-muted-foreground ml-0.5">Técnico
                                    Principal</Label>
                                <Select v-model="mainTechModel" required>
                                    <SelectTrigger class="h-9 text-xs w-full bg-background overflow-hidden inline-flex">
                                        <SelectValue placeholder="Seleccionar" class="truncate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="p in availableLeadTechs" :key="p.id" :value="String(p.id)">
                                            {{ p.fullName }}
                                            <span class="text-[10px] text-muted-foreground ml-1">({{ p.role }})</span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div v-if="!isAddingToExisting" class="space-y-1.5 flex flex-col">
                                <Label class="text-[10px] font-bold uppercase text-muted-foreground ml-0.5">Pareja
                                    (Opcional)</Label>
                                <Select v-model="partnerTechModel">
                                    <SelectTrigger class="h-9 text-xs w-full bg-background overflow-hidden inline-flex">
                                        <SelectValue placeholder="Sin pareja" class="truncate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin pareja</SelectItem>
                                        <SelectItem v-for="p in availablePartners" :key="p.id" :value="String(p.id)">
                                            {{ p.fullName }}
                                            <span class="text-[10px] text-muted-foreground ml-1">({{ p.role }})</span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div :class="['space-y-1.5 flex flex-col', isAddingToExisting ? 'col-span-3' : '']">
                                <Label
                                    class="text-[10px] font-bold uppercase text-muted-foreground ml-0.5">Vehículo</Label>
                                <Select v-model="vehicleModel">
                                    <SelectTrigger class="h-9 text-xs w-full bg-background overflow-hidden inline-flex">
                                        <SelectValue placeholder="Placa / A pie" class="truncate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            <div class="flex items-center gap-2">
                                                <span class="font-bold">A pie / Sin vehículo</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem v-for="v in availableVehicles" :key="v.id" :value="String(v.id)">
                                            <div class="flex items-center gap-2">
                                                <component :is="getVehicleIcon(v.tipo)" :size="14" class="text-muted-foreground shrink-0" />
                                                <span class="font-bold truncate">{{ v.placa }}</span>
                                                <span class="text-[10px] opacity-70 uppercase font-medium shrink-0">({{ v.tipo }})</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <!-- Summary for Existing Group -->
                    <div v-else
                        class="p-4 bg-muted/50 rounded-lg border border-muted flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div
                                class="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                <Users :size="18" />
                            </div>
                            <div>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-primary/80 mb-0.5">
                                    Agregando a equipo existente</p>
                                <p class="text-sm font-bold">
                                    {{techs.find(t => t.id === selectedMainTech)?.fullName}}
                                    <span v-if="selectedPartnerTech && selectedPartnerTech !== 'none'"
                                        class="text-muted-foreground font-medium"> +
                                        {{techs.find(t => t.id === selectedPartnerTech)?.fullName}}</span>
                                </p>
                            </div>
                        </div>
                        <Badge variant="outline" class="font-bold px-3">EN CURSO</Badge>
                    </div>

                    <!-- Step 2: Activities -->
                    <div class="space-y-4">
                        <div class="flex items-center justify-between border-b pb-2 border-muted">
                            <div class="flex items-center gap-2">
                                <span
                                    class="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-[10px] text-primary-foreground font-bold">2</span>
                                <h3 class="text-xs font-bold uppercase tracking-widest text-foreground">Actividades
                                    Realizadas</h3>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div v-for="(row, index) in activityRows" :key="row.id"
                                class="p-4 bg-muted/20 rounded-lg border border-muted/50 transition-all hover:bg-muted/30 relative">

                                <div class="grid grid-cols-12 gap-4 items-end">
                                    <div class="col-span-12 sm:col-span-3 space-y-1.5 flex flex-col">
                                        <Label v-if="index === 0"
                                            class="text-[10px] font-bold uppercase text-muted-foreground ml-0.5">Zona</Label>
                                        <Select v-model="row.zone" required>
                                            <SelectTrigger class="h-9 text-xs w-full bg-background overflow-hidden inline-flex">
                                                <SelectValue placeholder="Zona" class="truncate" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="priceUrban">Urbano</SelectItem>
                                                <SelectItem value="priceRural">Rural</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div class="col-span-12 sm:col-span-6 space-y-1.5 flex flex-col">
                                        <Label v-if="index === 0"
                                            class="text-[10px] font-bold uppercase text-muted-foreground">Servicio
                                            / Actividad</Label>
                                        <Select v-model="row.rateCode" required>
                                            <SelectTrigger
                                                class="h-9 text-[11px] bg-background w-full overflow-hidden inline-flex">
                                                <SelectValue placeholder="Seleccionar Actividad" class="truncate" />
                                            </SelectTrigger>
                                            <SelectContent class="max-h-[300px]">
                                                <template v-for="(grp, category) in groupedRates" :key="category">
                                                    <div
                                                        class="px-2 py-1.5 text-[10px] font-black uppercase text-muted-foreground/50 bg-muted/10">
                                                        {{ category }}
                                                    </div>
                                                    <SelectItem v-for="rate in grp" :key="rate.code" :value="rate.code"
                                                        class="text-[11px] py-1.5 px-2">
                                                        <div class="flex items-center justify-between w-full gap-4">
                                                            <span class="truncate">{{ rate.code }} - {{ rate.name
                                                            }}</span>
                                                            <Badge variant="outline"
                                                                class="text-[9px] font-black h-4 px-1 ml-auto shrink-0 border-muted-foreground/20">
                                                                S/ {{ (rate[row.zone] || 0).toFixed(2) }}
                                                            </Badge>
                                                        </div>
                                                    </SelectItem>
                                                </template>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div class="col-span-12 sm:col-span-2 space-y-1.5 flex flex-col">
                                        <Label v-if="index === 0"
                                            class="text-[10px] font-bold uppercase text-muted-foreground text-center block">Asignar</Label>
                                        <Input type="number" v-model="row.assigned"
                                            class="h-9 text-xs text-center font-bold bg-background" />
                                    </div>

                                    <div class="col-span-12 sm:col-span-1 flex items-center justify-center">
                                        <Button v-if="activityRows.length > 1" type="button" variant="ghost" size="icon"
                                            class="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            @click="$emit('remove-row', index)">
                                            <Trash2 :size="15" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Button type="button" variant="outline"
                                class="w-full h-10 border-dashed border-2 text-xs font-bold gap-2 text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mt-2"
                                @click="$emit('add-row')">
                                <Plus :size="14" /> AGREGAR OTRA ACTIVIDAD
                            </Button>
                        </div>
                    </div>
                </form>
            </div>

            <DialogFooter class="p-4 border-t bg-muted/30 sm:justify-between flex-row items-center gap-4">
                <div class="flex flex-col">
                    <span
                        class="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 leading-none mb-1">TOTAL
                        PRODUCCIÓN</span>
                    <div class="flex items-baseline gap-1">
                        <span class="text-[11px] font-bold text-muted-foreground">S/</span>
                        <span class="text-xl font-black text-emerald-600 leading-none tabular-nums">{{ totalRealized
                        }}</span>
                    </div>
                </div>
                <div class="flex gap-3">
                    <Button variant="outline" size="sm" class="h-9 px-6 font-bold uppercase tracking-wider text-[11px]"
                        @click="closeDialog">CANCELAR</Button>
                    <Button size="sm" type="submit" form="main-activity-form" :disabled="loading"
                        class="h-9 px-8 font-black uppercase tracking-widest text-[11px]">
                        {{ loading ? 'PROCESANDO...' : 'REGISTRAR TODO' }}
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

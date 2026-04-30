<script setup>
import { defineProps, defineEmits, ref, watch } from 'vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck } from 'lucide-vue-next';

const props = defineProps({
    show: { type: Boolean, default: false },
    group: { type: Object, default: null },
    availableVehicles: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:show', 'save']);

const selectedVehicleId = ref('');

watch(() => props.show, (newVal) => {
    if (newVal && props.group) {
        selectedVehicleId.value = props.group.vehicleId || 'none';
    }
});

const handleSave = () => {
    emit('save', props.group, selectedVehicleId.value === 'none' ? null : selectedVehicleId.value);
    emit('update:show', false);
};
</script>

<template>
    <Dialog :open="show" @update:open="$emit('update:show', $event)">
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle class="flex items-center gap-2 text-primary">
                    <Truck :size="20" />
                    Asignar / Editar Vehículo
                </DialogTitle>
                <p class="text-[12px] text-muted-foreground font-medium leading-tight mt-1.5">
                    Modifique el vehículo asignado a <span class="font-bold">{{ group?.mainTechName }}</span>.
                </p>
            </DialogHeader>

            <div class="py-4 space-y-3">
                <Select v-model="selectedVehicleId">
                    <SelectTrigger class="w-full text-xs font-bold bg-background h-10">
                        <SelectValue placeholder="Seleccionar vehículo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none" class="text-muted-foreground italic font-semibold text-xs">Sin vehículo</SelectItem>
                        <SelectItem v-for="v in availableVehicles" :key="v.id" :value="v.id" class="font-bold text-xs uppercase">
                            {{ v.placa }} - {{ v.tipo }}
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <DialogFooter class="gap-2 sm:gap-0">
                <Button variant="outline" @click="$emit('update:show', false)" class="text-xs font-black uppercase tracking-widest flex-1">
                    Cancelar
                </Button>
                <Button type="button" @click="handleSave" class="flex-1 text-xs font-black uppercase tracking-widest">
                    Guardar Vehículo
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

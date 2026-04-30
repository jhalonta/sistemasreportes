<script setup>
import { PenLine, Plus, MapPin } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVModel } from '@vueuse/core';

const props = defineProps({
    subtitle: { type: String, default: '' },
    zone: { type: String, default: 'priceUrban' },
    isToday: { type: Boolean, default: true }
});

const emit = defineEmits(['open-modal', 'update:zone']);
const zoneModel = useVModel(props, 'zone', emit);
</script>

<template>
    <div class="flex items-center justify-between gap-3">
        <div class="space-y-0.5">
            <h1 class="text-base font-bold tracking-tight flex items-center gap-2">
                <PenLine :size="18" class="text-primary shrink-0" />
                Registro de Actividades
            </h1>
            <p class="text-[11px] text-muted-foreground">{{ subtitle }}</p>
        </div>

        <div class="flex items-center gap-2">
            <!-- Zone Selector -->
            <div class="flex items-center gap-1.5 mr-2 bg-muted/40 p-1 rounded-md border border-muted-foreground/10">
                <div
                    class="flex items-center gap-1 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <MapPin :size="10" /> Zona:
                </div>
                <Select v-model="zoneModel">
                    <SelectTrigger
                        class="h-7 w-[100px] text-[10px] font-bold bg-background border-none shadow-none focus:ring-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="priceUrban" class="text-[10px] font-bold">URBANO</SelectItem>
                        <SelectItem value="priceRural" class="text-[10px] font-bold">RURAL</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button size="sm" @click="$emit('open-modal')"
                class="h-8 text-xs gap-1.5 shadow-sm font-bold">
                <Plus :size="13" /> Nueva Producción
            </Button>
        </div>
    </div>
</template>

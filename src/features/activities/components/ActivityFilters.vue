<script setup>
import { computed, ref, watch } from 'vue';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Clock, ClipboardList } from 'lucide-vue-next';
import { cn } from '@/lib/utils';
import { today, getLocalTimeZone } from '@internationalized/date';
import { useVModel } from '@vueuse/core';

const props = defineProps({
    locationId: { type: String, required: true },
    locations: { type: Array, default: () => [] },
    dateValue: { type: Object, default: () => undefined },
    isToday: { type: Boolean, default: true },
    groupCount: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    df: { type: Object, required: true },
    getLocalTimeZone: { type: Function, required: true }
});

const emit = defineEmits(['update:locationId', 'update:dateValue']);

const locationIdModel = useVModel(props, 'locationId', emit);
const dateValueModel = useVModel(props, 'dateValue', emit);
const isPopoverOpen = ref(false);

// Auto-close popover when a date is selected
watch(dateValueModel, (newValue, oldValue) => {
    if (newValue && newValue !== oldValue) {
        isPopoverOpen.value = false;
    }
});

const isPast = computed(() => {
    if (!dateValueModel.value) return false;
    return dateValueModel.value.compare(today(getLocalTimeZone())) < 0;
});

const isDateDisabled = (date) => {
    return date.compare(today(getLocalTimeZone())) > 0;
};
</script>

<template>
    <Card>
        <CardContent class="p-2 flex flex-col sm:flex-row items-center gap-2">
            <!-- Sede (admin only) -->
            <div v-if="isAdmin" class="w-full sm:w-64 shrink-0">
                <Select v-model="locationIdModel">
                    <SelectTrigger class="h-8 text-xs w-full overflow-hidden">
                        <SelectValue placeholder="Seleccionar Sede" class="truncate" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Sedes</SelectItem>
                        <SelectItem v-for="loc in locations" :key="loc.id" :value="loc.id">
                            <span class="truncate block w-full">{{ loc.nombre }}</span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <!-- Date picker -->
            <Popover v-model:open="isPopoverOpen">
                <PopoverTrigger as-child>
                    <Button variant="outline"
                        :class="cn('h-8 w-full sm:w-48 justify-start text-xs font-normal shrink-0', !dateValueModel && 'text-muted-foreground')">
                        <CalendarIcon :size="13" class="mr-2 text-primary" />
                        {{ dateValueModel ? df.format(dateValueModel.toDate(getLocalTimeZone())) : 'Seleccionar fecha'
                        }}
                    </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0">
                    <Calendar v-model="dateValueModel" :initial-focus="true" layout="month-and-year"
                        :is-date-disabled="isDateDisabled" :max-value="today(getLocalTimeZone())" />
                </PopoverContent>
            </Popover>

            <div class="flex-1"></div>

            <!-- Historical mode badge -->
            <div v-if="isPast"
                class="flex items-center gap-2 shrink-0 px-3 py-1 rounded-md bg-amber-500/10 text-amber-600">
                <Clock :size="13" />
                <span class="text-xs font-semibold uppercase tracking-wider">Histórico</span>
            </div>

            <!-- Stats count -->
            <div class="flex items-center gap-2 shrink-0 px-3 py-1 rounded-md bg-primary/10 text-primary">
                <ClipboardList :size="13" />
                <span class="text-xs font-semibold">{{ groupCount }} grupos</span>
            </div>
        </CardContent>
    </Card>
</template>

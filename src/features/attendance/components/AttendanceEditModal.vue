<script setup>
import { ref, watch, computed } from 'vue';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const props = defineProps({
    show: Boolean,
    technician: {
        type: Object,
        default: () => ({})
    },
    record: {
        type: Object,
        default: () => null
    },
    selectedDate: {
        type: String,
        required: true
    },
    loading: Boolean
});

const emit = defineEmits(['close', 'save']);

const status = ref('present');
const checkInTime = ref('');
const checkOutTime = ref('');
const notes = ref('');

// Helper to extract HH:MM from Date/Timestamp
const getHoursMinutesString = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
};

// Check if a date string is Saturday
const isSaturday = (dateStr) => {
    if (!dateStr) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.getDay() === 6;
};

watch(() => props.show, (newShow) => {
    if (newShow) {
        if (props.record) {
            status.value = props.record.status || 'present';
            notes.value = props.record.notes || '';
            checkInTime.value = getHoursMinutesString(props.record.checkIn);
            checkOutTime.value = getHoursMinutesString(props.record.checkOut);
        } else {
            status.value = 'present';
            notes.value = '';
            checkInTime.value = '08:00';
            checkOutTime.value = isSaturday(props.selectedDate) ? '13:00' : '18:00';
        }
    }
});

// Disable times if status is absent, dm or permiso
const timesDisabled = computed(() => {
    return ['absent', 'dm', 'permiso'].includes(status.value);
});

// Auto clear times if status changed to a non-working status
watch(status, (newStatus) => {
    if (['absent', 'dm', 'permiso'].includes(newStatus)) {
        checkInTime.value = '';
        checkOutTime.value = '';
    } else if (!checkInTime.value && !checkOutTime.value) {
        checkInTime.value = '08:00';
        checkOutTime.value = isSaturday(props.selectedDate) ? '13:00' : '18:00';
    }
});

const handleSave = () => {
    emit('save', {
        status: status.value,
        checkInTime: checkInTime.value,
        checkOutTime: checkOutTime.value,
        notes: notes.value
    });
};
</script>

<template>
    <Dialog :open="show" @update:open="val => { if (!val) emit('close') }">
        <DialogContent class="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Editar Asistencia / Horario</DialogTitle>
                <DialogDescription>
                    Modifica el estado de asistencia y los horarios para:
                    <span class="font-bold text-foreground block mt-1">{{ technician?.fullName }}</span>
                </DialogDescription>
            </DialogHeader>

            <div class="grid gap-4 py-4">
                <!-- Status Select -->
                <div class="grid gap-2">
                    <Label for="status" class="font-bold">Estado</Label>
                    <Select v-model="status">
                        <SelectTrigger class="w-full bg-background font-bold">
                            <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="present" class="font-bold">Presente</SelectItem>
                            <SelectItem value="late" class="font-bold">Tarde</SelectItem>
                            <SelectItem value="absent" class="font-bold">Falta</SelectItem>
                            <SelectItem value="justified" class="font-bold">Justificado</SelectItem>
                            <SelectItem value="dm" class="font-bold">Descanso Médico</SelectItem>
                            <SelectItem value="permiso" class="font-bold">Permiso</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Times Grid -->
                <div class="grid grid-cols-2 gap-4">
                    <!-- Check-in Time -->
                    <div class="grid gap-2">
                        <Label for="checkInTime" class="font-bold">Hora de Entrada</Label>
                        <input
                            id="checkInTime"
                            type="time"
                            v-model="checkInTime"
                            :disabled="timesDisabled"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                        />
                    </div>

                    <!-- Check-out Time -->
                    <div class="grid gap-2">
                        <Label for="checkOutTime" class="font-bold">Hora de Salida</Label>
                        <input
                            id="checkOutTime"
                            type="time"
                            v-model="checkOutTime"
                            :disabled="timesDisabled"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                        />
                    </div>
                </div>

                <!-- Notes / Observation -->
                <div class="grid gap-2">
                    <Label for="notes" class="font-bold">Observación / Nota</Label>
                    <textarea
                        id="notes"
                        v-model="notes"
                        placeholder="Ej. Salió antes por cita médica, tardanza justificada por tráfico, etc..."
                        rows="3"
                        class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-bold"
                    />
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="emit('close')" :disabled="loading">Cancelar</Button>
                <Button @click="handleSave" :disabled="loading">
                    {{ loading ? 'Guardando...' : 'Guardar Cambios' }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

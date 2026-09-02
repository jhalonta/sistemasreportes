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
            checkOutTime.value = '';
        }
    }
});

// Disable times if status is absent, dm, permiso, vacaciones or compensacion
const timesDisabled = computed(() => {
    return ['absent', 'dm', 'permiso', 'vacaciones', 'compensacion'].includes(status.value);
});

// Auto clear times if status changed to a non-working status
watch(status, (newStatus) => {
    if (['absent', 'dm', 'permiso', 'vacaciones', 'compensacion'].includes(newStatus)) {
        checkInTime.value = '';
        checkOutTime.value = '';
    } else if (!checkInTime.value) {
        checkInTime.value = '08:00';
    }
});

// Auto-adjust status between present and late if the user changes checkInTime and current status is either present or late
watch(checkInTime, (newTime) => {
    if (!newTime) return;
    if (status.value === 'present' || status.value === 'late') {
        const [hours, minutes] = newTime.split(':').map(Number);
        if (hours > 8 || (hours === 8 && minutes > 0)) {
            status.value = 'late';
        } else {
            status.value = 'present';
        }
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
                            <SelectItem value="vacaciones" class="font-bold">Vacaciones</SelectItem>
                            <SelectItem value="compensacion" class="font-bold">Compensación</SelectItem>
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

                <!-- Foto Selfie & Geocerca GPS -->
                <div v-if="record && (record.checkInPhoto || record.checkOutPhoto)" class="border-t pt-3 mt-1">
                    <h4 class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Verificación Selfie y Geolocalización</h4>
                    <div class="grid grid-cols-2 gap-3">
                        <!-- Entrada -->
                        <div v-if="record.checkInPhoto" class="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/70 text-center">
                            <span class="text-[9px] uppercase font-bold text-muted-foreground">Selfie Entrada</span>
                            <div class="rounded overflow-hidden border border-border bg-background shadow-sm">
                                <img :src="record.checkInPhoto" class="h-20 w-32 object-cover" />
                            </div>
                            <div v-if="record.checkInLocation" class="text-[9px] font-bold text-muted-foreground leading-tight mt-0.5">
                                📍 {{ record.checkInLocation.distance !== undefined ? `A ${record.checkInLocation.distance.toFixed(0)}m de sede` : 'Registrado' }}
                                <div class="text-[8px] opacity-75 font-mono mt-0.5">({{ record.checkInLocation.lat.toFixed(4) }}, {{ record.checkInLocation.lng.toFixed(4) }})</div>
                            </div>
                        </div>

                        <!-- Salida -->
                        <div v-if="record.checkOutPhoto" class="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/70 text-center">
                            <span class="text-[9px] uppercase font-bold text-muted-foreground">Selfie Salida</span>
                            <div class="rounded overflow-hidden border border-border bg-background shadow-sm">
                                <img :src="record.checkOutPhoto" class="h-20 w-32 object-cover" />
                            </div>
                            <div v-if="record.checkOutLocation" class="text-[9px] font-bold text-muted-foreground leading-tight mt-0.5">
                                📍 {{ record.checkOutLocation.distance !== undefined ? `A ${record.checkOutLocation.distance.toFixed(0)}m de sede` : 'Registrado' }}
                                <div class="text-[8px] opacity-75 font-mono mt-0.5">({{ record.checkOutLocation.lat.toFixed(4) }}, {{ record.checkOutLocation.lng.toFixed(4) }})</div>
                            </div>
                        </div>
                    </div>
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

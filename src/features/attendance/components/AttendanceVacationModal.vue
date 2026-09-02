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
import { Sun, Calendar } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean,
  technician: {
    type: Object,
    default: () => ({})
  },
  initialDate: {
    type: String,
    default: ''
  },
  loading: Boolean
});

const emit = defineEmits(['close', 'save']);

const startDate = ref(props.initialDate);
const endDate = ref(props.initialDate);
const notes = ref('');

watch(() => props.show, (newShow) => {
  if (newShow) {
    startDate.value = props.initialDate || new Date().toISOString().split('T')[0];
    endDate.value = props.initialDate || new Date().toISOString().split('T')[0];
    notes.value = '';
  }
});

const datesValid = computed(() => {
  if (!startDate.value || !endDate.value) return false;
  return startDate.value <= endDate.value;
});

const daysCount = computed(() => {
  if (!datesValid.value) return 0;
  const [sy, sm, sd] = startDate.value.split('-').map(Number);
  const [ey, em, ed] = endDate.value.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

const formatDatePretty = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const handleSave = () => {
  if (!datesValid.value) return;
  emit('save', {
    startDate: startDate.value,
    endDate: endDate.value,
    notes: notes.value
  });
};
</script>

<template>
  <Dialog :open="show" @update:open="val => { if (!val) emit('close') }">
    <DialogContent class="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <Sun :size="20" />
          Programar Vacaciones
        </DialogTitle>
        <DialogDescription>
          Selecciona el rango de fechas en el que se aplicarán las vacaciones para:
          <span class="font-bold text-foreground block mt-1">{{ technician?.fullName }}</span>
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-2">
        <!-- Date range inputs -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-1.5">
            <Label for="vacationStartDate" class="font-bold text-xs">Fecha de Inicio</Label>
            <input
              id="vacationStartDate"
              type="date"
              v-model="startDate"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-bold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div class="grid gap-1.5">
            <Label for="vacationEndDate" class="font-bold text-xs">Fecha de Fin</Label>
            <input
              id="vacationEndDate"
              type="date"
              v-model="endDate"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-bold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <!-- Range calculation badge / error -->
        <div v-if="!datesValid" class="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold text-center">
          ⚠️ La fecha de fin no puede ser anterior a la fecha de inicio.
        </div>
        <div v-else-if="daysCount > 0" class="flex items-center gap-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold justify-center">
          <Calendar :size="15" />
          <span>{{ daysCount }} {{ daysCount === 1 ? 'día' : 'días' }} de vacaciones (Del {{ formatDatePretty(startDate) }} al {{ formatDatePretty(endDate) }})</span>
        </div>

        <!-- Notes -->
        <div class="grid gap-1.5">
          <Label for="vacationNotes" class="font-bold text-xs">Observación / Nota (Opcional)</Label>
          <textarea
            id="vacationNotes"
            v-model="notes"
            placeholder="Ej: Vacaciones anuales correspondientes al periodo 2026..."
            rows="3"
            class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-bold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('close')" :disabled="loading">Cancelar</Button>
        <Button @click="handleSave" :disabled="!datesValid || loading" class="bg-purple-600 hover:bg-purple-700 text-white font-bold">
          {{ loading ? 'Guardando...' : 'Guardar Vacaciones' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

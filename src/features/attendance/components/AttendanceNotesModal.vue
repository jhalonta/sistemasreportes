<script setup>
import { ref, watch } from 'vue';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const props = defineProps({
    show: Boolean,
    initialNotes: {
        type: String,
        default: ''
    },
    loading: Boolean
});

const emit = defineEmits(['close', 'save']);

const notesText = ref(props.initialNotes);

watch(() => props.show, (newShow) => {
    if (newShow) {
        notesText.value = props.initialNotes;
    }
});

const handleSave = () => {
    emit('save', notesText.value);
};
</script>

<template>
    <Dialog :open="show" @update:open="val => { if (!val) emit('close') }">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Motivo de Asistencia</DialogTitle>
                <DialogDescription>Especifica el motivo por el cual se está asignando este estado al técnico.
                </DialogDescription>
            </DialogHeader>

            <div class="grid gap-2">
                <label class="text-sm font-bold">Motivo / Observación</label>
                <textarea v-model="notesText"
                    placeholder="Ej: El técnico presentó su certificado médico, cuenta con permiso personal, etc..."
                    rows="4"
                    class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-bold" />
            </div>

            <DialogFooter>
                <Button variant="outline" @click="emit('close')" :disabled="loading">Cancelar</Button>
                <Button @click="handleSave" :disabled="loading">
                    {{ loading ? 'Guardando...' : 'Guardar Estado' }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

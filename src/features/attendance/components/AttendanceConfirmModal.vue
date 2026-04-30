<script setup>
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
    title: String,
    message: String,
    name: String,
    type: {
        type: String,
        default: 'danger'
    },
    loading: Boolean
});

const emit = defineEmits(['close', 'confirm']);
</script>

<template>
    <Dialog :open="show" @update:open="val => { if (!val) emit('close') }">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{ title }}</DialogTitle>
                <DialogDescription>{{ message }}</DialogDescription>
            </DialogHeader>

            <p v-if="name" class="text-sm">
                ¿Estás seguro de que deseas realizar esta acción para
                <span class="font-semibold">{{ name }}</span>?
            </p>
            <p v-else class="text-sm">
                ¿Estás seguro de que deseas realizar esta acción?
            </p>

            <DialogFooter>
                <Button variant="outline" @click="emit('close')" :disabled="loading">Cancelar</Button>
                <Button :variant="type === 'danger' ? 'destructive' : 'default'" @click="emit('confirm')"
                    :disabled="loading">
                    {{ loading ? 'Cargando...' : (type === 'danger' ? 'Sí, Confirmar' : 'Sí, Continuar') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

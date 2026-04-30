<script setup>
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { AlertTriangle, X, Trash2 } from 'lucide-vue-next';
import { useVModel } from '@vueuse/core';

const props = defineProps({
    showPartial: { type: Boolean, default: false },
    showCancel: { type: Boolean, default: false },
    showDelete: { type: Boolean, default: false },
    partialItems: { type: Array, default: () => [] },
    cancelReason: { type: String, default: '' },
    statusLoading: { type: Boolean, default: false }
});

const emit = defineEmits([
    'update:showPartial', 'update:showCancel', 'update:showDelete',
    'update:cancelReason', 'confirm-partial', 'confirm-cancel', 'confirm-delete'
]);

const showPartialModel = useVModel(props, 'showPartial', emit);
const showCancelModel = useVModel(props, 'showCancel', emit);
const showDeleteModel = useVModel(props, 'showDelete', emit);
const cancelReasonModel = useVModel(props, 'cancelReason', emit);
</script>

<template>
    <div>
        <!-- PARTIAL STATUS DIALOG -->
        <Dialog v-model:open="showPartialModel">
            <DialogContent class="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <AlertTriangle :size="18" class="text-amber-500" />
                        Cierre Parcial
                    </DialogTitle>
                    <DialogDescription>
                        Ingrese el avance real para cerrar esta actividad.
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4 py-4">
                    <Card v-for="item in partialItems" :key="item.id" class="p-3 space-y-2">
                        <p class="text-sm font-bold">{{ item.description }}</p>
                        <div class="flex items-center justify-between gap-4">
                            <span class="text-[10px] font-bold uppercase text-muted-foreground">Asignado: {{ item.assigned
                            }}</span>
                            <Input type="number" v-model="item.completed" class="h-8 w-24 text-center font-bold" />
                        </div>
                        <div class="space-y-1 mt-2">
                            <Label class="text-[10px] uppercase px-1 font-bold">Motivo (opcional)</Label>
                            <Textarea v-model="item.observations" rows="2"
                                placeholder="Indique por qué no se completó..." />
                        </div>
                    </Card>
                </div>
                <DialogFooter>
                    <Button variant="outline" @click="showPartialModel = false">Volver</Button>
                    <Button class="bg-amber-500 hover:bg-amber-600 text-white" @click="$emit('confirm-partial')"
                        :disabled="statusLoading">
                        Confirmar Cierre
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- CANCEL WORK DIALOG -->
        <Dialog v-model:open="showCancelModel">
            <DialogContent class="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <X :size="18" class="text-rose-500" />
                        Cancelar Trabajo
                    </DialogTitle>
                    <DialogDescription>
                        Indique el motivo por el cual no se pudo realizar la actividad.
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-2 py-4">
                    <Label class="text-[11px] uppercase text-muted-foreground px-1">Motivo de cancelación</Label>
                    <Textarea v-model="cancelReasonModel" rows="3"
                        placeholder="Ej: Falla mecánica, clima, material incompleto..." />
                </div>
                <DialogFooter>
                    <Button variant="outline" @click="showCancelModel = false">Volver</Button>
                    <Button variant="destructive" @click="$emit('confirm-cancel')" :disabled="statusLoading">
                        Confirmar Cancelación
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <!-- DELETE ACTIVITY DIALOG -->
        <Dialog v-model:open="showDeleteModel">
            <DialogContent class="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle class="flex items-center gap-2">
                        <Trash2 :size="18" class="text-rose-500" />
                        Eliminar Actividad
                    </DialogTitle>
                    <DialogDescription>
                        ¿Está seguro de que desea eliminar esta actividad de forma permanente? Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter class="pt-4">
                    <Button variant="outline" @click="showDeleteModel = false">Cancelar</Button>
                    <Button variant="destructive" @click="$emit('confirm-delete')" :disabled="statusLoading">
                        Sí, eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
<script setup>
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Edit2, Check, X, AlertTriangle } from 'lucide-vue-next';
import { ref } from 'vue';

const props = defineProps({
    partidas: { type: Array, default: () => [] },
    isAdmin: { type: Boolean, default: false },
    loading: { type: Boolean, default: false }
});

const emit = defineEmits(['update-prices']);

const editingId = ref(null);
const editForm = ref({
    priceRural: 0,
    priceUrban: 0
});

const startEdit = (partida) => {
    editingId.value = partida.id;
    editForm.value = {
        priceRural: partida.priceRural,
        priceUrban: partida.priceUrban
    };
};

const cancelEdit = () => {
    editingId.value = null;
};

const saveEdit = () => {
    emit('update-prices', editingId.value, editForm.value.priceRural, editForm.value.priceUrban);
    editingId.value = null;
};
</script>

<template>
    <Card class="overflow-hidden">
        <div v-if="loading && partidas.length === 0" class="flex flex-col items-center justify-center py-20 gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p class="text-sm text-muted-foreground">Cargando partidas...</p>
        </div>

        <div v-else-if="partidas.length === 0"
            class="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <AlertTriangle :size="36" class="text-muted-foreground/40" />
            <div>
                <p class="font-semibold text-sm">Sin resultados</p>
                <p class="text-xs text-muted-foreground mt-1">No se encontraron partidas con los filtros seleccionados.
                </p>
            </div>
        </div>

        <div v-else class="overflow-x-auto">
            <Table class="min-w-[800px]">
                <TableHeader>
                    <TableRow class="hover:bg-transparent bg-muted/30">
                        <TableHead class="pl-4 text-[10px] font-bold uppercase tracking-widest w-[100px]">Código
                        </TableHead>
                        <TableHead class="text-[10px] font-bold uppercase tracking-widest flex-1">Nombre de Partida
                        </TableHead>
                        <TableHead class="text-[10px] font-bold uppercase tracking-widest w-[180px]">Categoría
                        </TableHead>
                        <TableHead class="text-[10px] font-bold uppercase tracking-widest text-right w-[120px]">Precio
                            Rural</TableHead>
                        <TableHead class="text-[10px] font-bold uppercase tracking-widest text-right w-[120px]">Precio
                            Urbano</TableHead>
                        <TableHead v-if="isAdmin"
                            class="text-[10px] font-bold uppercase tracking-widest text-right pr-4 w-[100px]">Acciones
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-for="p in partidas" :key="p.id" class="group">
                        <TableCell class="pl-4 py-3">
                            <code
                                class="text-xs font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                                {{ p.code }}
                            </code>
                        </TableCell>
                        <TableCell class="py-3 max-w-[300px]">
                            <span class="text-xs font-semibold text-foreground truncate block" :title="p.name">
                                {{ p.name }}
                            </span>
                        </TableCell>
                        <TableCell class="py-3">
                            <Badge variant="outline" class="text-[10px] font-medium border-muted-foreground/20">
                                {{ p.category }}
                            </Badge>
                        </TableCell>

                        <TableCell class="text-right py-3 tabular-nums">
                            <div v-if="editingId === p.id" class="flex justify-end">
                                <Input type="number" v-model.number="editForm.priceRural" step="0.01"
                                    class="h-8 w-24 text-right text-xs font-bold" />
                            </div>
                            <span v-else class="text-xs font-bold">
                                S/ {{ (p.priceRural || 0).toFixed(2) }}
                            </span>
                        </TableCell>

                        <TableCell class="text-right py-3 tabular-nums">
                            <div v-if="editingId === p.id" class="flex justify-end">
                                <Input type="number" v-model.number="editForm.priceUrban" step="0.01"
                                    class="h-8 w-24 text-right text-xs font-bold" />
                            </div>
                            <span v-else class="text-xs font-bold">
                                S/ {{ (p.priceUrban || 0).toFixed(2) }}
                            </span>
                        </TableCell>

                        <TableCell v-if="isAdmin" class="text-right pr-4 py-3">
                            <div v-if="editingId === p.id" class="flex justify-end gap-1">
                                <Button variant="ghost" size="icon"
                                    class="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                    @click="saveEdit">
                                    <Check :size="14" />
                                </Button>
                                <Button variant="ghost" size="icon"
                                    class="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                    @click="cancelEdit">
                                    <X :size="14" />
                                </Button>
                            </div>
                            <Button v-else variant="ghost" size="icon"
                                class="h-7 w-7 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                @click="startEdit(p)">
                                <Edit2 :size="14" />
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    </Card>
</template>

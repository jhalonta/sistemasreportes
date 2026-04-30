<script setup>
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Check, AlertTriangle, X, PenLine, Pencil, Trash2, ClipboardList,
    Building2, Truck, Plus, MoreHorizontal
} from 'lucide-vue-next';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

defineProps({
    groupedActivities: { type: Array, default: () => [] },
    editingId: { type: String, default: null },
    editForm: { type: Object, default: () => ({ assigned: 0, completed: 0, observations: '' }) },
    isAdmin: { type: Boolean, default: false },
    locationNames: { type: Object, default: () => ({}) }
});

defineEmits([
    'add-to-group', 'update-status', 'start-edit', 'cancel-edit', 'save-edit', 'delete-activity'
]);

const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString('es-PE');
};

const calculateGroupProgress = (items) => {
    if (!items || items.length === 0) return 0;
    const totalAssigned = items.reduce((sum, item) => sum + (Number(item.assigned) || 0), 0);
    const totalCompleted = items.reduce((sum, item) => sum + (Number(item.completed) || 0), 0);
    if (totalAssigned === 0) return 0;
    return Math.min(Math.round((totalCompleted / totalAssigned) * 100), 100);
};

const getStatusBadge = (status) => {
    switch (status) {
        case 'en_proceso': return { label: 'En Proceso', class: 'bg-sky-500/15 text-sky-600' };
        case 'completada': return { label: 'Completada', class: 'bg-emerald-500/15 text-emerald-600' };
        case 'parcial': return { label: 'Parcial', class: 'bg-amber-500/15 text-amber-600' };
        case 'cancelada': return { label: 'Cancelada', class: 'bg-rose-500/15 text-rose-600' };
        default: return { label: status, class: '' };
    }
};
</script>

<template>
    <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
            <h3 class="text-sm font-bold tracking-tight flex items-center gap-2 uppercase">
                <ClipboardList :size="16" class="text-primary" />
                Producción Reciente
            </h3>
            <Badge variant="outline" class="text-[10px] font-medium px-2 py-0">
                {{ groupedActivities.length }} Grupos
            </Badge>
        </div>

        <div v-if="groupedActivities.length === 0"
            class="flex flex-col items-center justify-center py-20 bg-muted/20 border-2 border-dashed rounded-lg text-muted-foreground italic text-sm">
            <ClipboardList :size="32" class="opacity-10 mb-2" />
            No hay registros para esta fecha.
        </div>

        <div v-else class="space-y-4">
            <Card v-for="group in groupedActivities" :key="group.id" class="overflow-hidden">
                <!-- Group Header -->
                <div class="p-2 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <Badge class="bg-primary text-primary-foreground text-[10px] px-2 py-0">
                            {{ group.mainTechName }}
                        </Badge>
                        <Badge v-if="group.partnerTechName" variant="secondary" class="text-[10px] px-2 py-0">
                            + {{ group.partnerTechName }}
                        </Badge>

                        <Separator orientation="vertical" class="h-4 mx-1" />

                        <div v-if="isAdmin"
                            class="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                            <Building2 :size="12" />
                            {{ locationNames[group.mainTechId] || 'Sede' }}
                        </div>

                        <div class="flex items-center gap-2 text-[10px] text-muted-foreground font-medium border rounded pl-1.5 pr-1.5 bg-background h-6 transition-colors">
                            <div class="flex items-center gap-1 shrink-0 px-0.5">
                                <Truck :size="12" :class="group.vehiclePlaca ? 'text-primary' : 'opacity-50'" />
                                <span :class="!group.vehiclePlaca ? 'italic opacity-60' : ''">
                                    {{ group.vehiclePlaca || 'Sin vehículo asignado' }}
                                </span>
                            </div>
                            <template v-if="group.vehiclePlaca">
                                <Separator orientation="vertical" class="h-3 mx-0.5 opacity-50 relative top-[1px]" />
                                <div class="flex items-center gap-2 w-24 ml-0.5 transition-opacity">
                                    <Progress :model-value="calculateGroupProgress(group.items)"
                                        class="h-1.5 w-full bg-muted shadow-inner" />
                                    <span class="font-black tabular-nums text-[9px] min-w-[24px] text-primary">
                                        {{ calculateGroupProgress(group.items) }}%
                                    </span>
                                </div>
                            </template>
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <span class="text-[10px] text-muted-foreground font-mono">
                            {{ formatDate(group.timestamp) }}
                        </span>
                        <Tooltip>
                            <TooltipTrigger as-child>
                                <Button variant="ghost" size="icon" class="h-6 w-6"
                                    @click="$emit('add-to-group', group)">
                                    <Plus :size="14" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Agregar actividad a este grupo</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                <!-- Group Body: Table -->
                <Table>
                    <TableHeader>
                        <TableRow class="hover:bg-transparent text-[10px] uppercase text-muted-foreground">
                            <TableHead class="h-8 pl-4">Descripción</TableHead>
                            <TableHead class="h-8 text-center w-[80px]">Asignado</TableHead>
                            <TableHead class="h-8 text-center w-[80px]">Realizado</TableHead>
                            <TableHead class="h-8 text-center w-[120px]">Estado</TableHead>
                            <TableHead class="h-8 text-right pr-4 w-[140px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow v-for="activity in group.items" :key="activity.id" class="group/row">
                            <TableCell class="pl-4 py-2">
                                <div class="space-y-0.5">
                                    <div class="flex items-center gap-2">
                                        <p class="text-sm font-semibold leading-none">{{ activity.description }}</p>
                                        <Badge variant="secondary"
                                            class="text-[9px] font-bold px-1 h-3.5 uppercase bg-muted/50 border-none">
                                            {{ activity.zone || 'Urbano' }}
                                        </Badge>
                                    </div>
                                    <p v-if="activity.observations"
                                        class="text-[11px] text-muted-foreground italic truncate max-w-[300px]">
                                        "{{ activity.observations }}"
                                    </p>
                                </div>
                            </TableCell>

                            <TableCell class="text-center p-2">
                                <div class="flex flex-col items-center">
                                    <span class="text-xs font-bold">{{ activity.assigned }}</span>
                                    <span class="text-[9px] text-muted-foreground">S/ {{ activity.projectedValue ||
                                        '0.00' }}</span>
                                </div>
                            </TableCell>

                            <TableCell class="text-center p-2">
                                <div class="flex flex-col items-center">
                                    <span class="text-xs font-bold text-emerald-600">{{ activity.completed }}</span>
                                    <span class="text-[9px] text-emerald-600/70">S/ {{ activity.realizedValue ||
                                        activity.totalValue
                                        || '0.00' }}</span>
                                </div>
                            </TableCell>

                            <TableCell class="text-center p-2">
                                <Badge
                                    :class="cn('text-[10px] font-bold px-1.5 h-5 border-none', getStatusBadge(activity.status).class)">
                                    {{ getStatusBadge(activity.status).label }}
                                </Badge>
                            </TableCell>

                            <TableCell class="text-right pr-4 py-2">
                                <div class="flex justify-end pr-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger as-child>
                                            <Button variant="ghost" size="icon"
                                                class="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                <MoreHorizontal :size="16" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" class="w-[180px]">
                                            <DropdownMenuLabel
                                                class="text-[10px] uppercase text-muted-foreground font-black px-2 py-1.5 tracking-widest">
                                                Acciones
                                            </DropdownMenuLabel>

                                            <template v-if="activity.status === 'en_proceso'">
                                                <DropdownMenuItem
                                                    class="text-xs font-bold text-emerald-600 gap-2 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700"
                                                    @click="$emit('update-status', activity, group, 'completada')">
                                                    <Check :size="14" /> Completar Trabajo
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    class="text-xs font-bold text-amber-600 gap-2 cursor-pointer focus:bg-amber-50 focus:text-amber-700"
                                                    @click="$emit('update-status', activity, group, 'parcial')">
                                                    <AlertTriangle :size="14" /> Cierre Parcial
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    class="text-xs font-bold text-rose-600 gap-2 cursor-pointer focus:bg-rose-50 focus:text-rose-700"
                                                    @click="$emit('update-status', activity, group, 'cancelada')">
                                                    <X :size="14" /> Cancelar Trabajo
                                                </DropdownMenuItem>
                                            </template>

                                            <DropdownMenuItem v-else
                                                class="text-xs font-bold text-primary gap-2 cursor-pointer"
                                                @click="$emit('update-status', activity, group, 'en_proceso')">
                                                <PenLine :size="14" /> Reabrir actividad
                                            </DropdownMenuItem>

                                            <DropdownMenuSeparator />

                                            <DropdownMenuItem class="text-xs font-bold gap-2 cursor-pointer"
                                                @click="$emit('start-edit', activity)">
                                                <Pencil :size="14" /> Editar Registro
                                            </DropdownMenuItem>

                                            <DropdownMenuSeparator />

                                            <DropdownMenuItem class="text-xs font-bold text-rose-600 gap-2 cursor-pointer focus:bg-rose-50 focus:text-rose-700"
                                                @click="$emit('delete-activity', activity, group)">
                                                <Trash2 :size="14" /> Eliminar Actividad
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </TableCell>

                        </TableRow>
                    </TableBody>
                </Table>
            </Card>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { AlertTriangle, Plus, ClipboardList, Clock } from 'lucide-vue-next';
import { rates } from '../../../data/rates';
import { useAttendanceStore } from '../../attendance/store/attendanceStore';
import { usePersonalStore } from '../../personal/store/personalStore';
import { useActivityStore } from '../store/activityStore';
import { useNotifications } from '../../../composables/useNotifications';
import { useGlobalStore } from '../../../stores/global';
import { useAuthStore } from '../../auth/store/authStore';
import { useVehicleStore } from '../../vehicles/store/vehicleStore';
import { useLocationStore } from '../../locations/store/locationStore';
import { usePartidaStore } from '../../partidas/store/partidaStore';
import { DateFormatter, getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { storeToRefs } from 'pinia';
import { TooltipProvider } from '@/components/ui/tooltip';

// Modular Components
import ActivityHeader from '../components/ActivityHeader.vue';
import ActivityFilters from '../components/ActivityFilters.vue';
import ActivityList from '../components/ActivityList.vue';
import ActivityRegistrationDialog from '../components/ActivityRegistrationDialog.vue';
import ActivityEditDialog from '../components/ActivityEditDialog.vue';
import ActivityStatusDialogs from '../components/ActivityStatusDialogs.vue';
import GroupVehicleEditDialog from '../components/GroupVehicleEditDialog.vue';

const globalStore = useGlobalStore();
const { selectedDate } = storeToRefs(globalStore);

const { showNotification } = useNotifications();
const attendanceStore = useAttendanceStore();
const techStore = usePersonalStore();
const activityStore = useActivityStore();
const authStore = useAuthStore();
const vehicleStore = useVehicleStore();
const locationStore = useLocationStore();
const partidaStore = usePartidaStore();

const df = new DateFormatter('es-PE', {
    dateStyle: 'long',
});

const dateValue = computed({
    get: () => {
        try {
            if (!selectedDate.value) return undefined;
            return parseDate(selectedDate.value);
        } catch (e) {
            return undefined;
        }
    },
    set: (val) => {
        if (val) {
            globalStore.setDate(val.toString());
        }
    }
});

const selectedLocationId = ref('all');

onMounted(async () => {
    await Promise.all([
        techStore.fetchTechnicians(),
        attendanceStore.fetchAttendance(),
        activityStore.fetchActivities(),
        vehicleStore.fetchVehicles(),
        locationStore.fetchLocations(),
        partidaStore.fetchPartidas()
    ]);
});

watch(selectedDate, async (newDate) => {
    if (newDate) {
        await attendanceStore.fetchAttendance(newDate);
    }
});

watch(() => authStore.userProfile, async (profile) => {
    if (profile) {
        if (profile.role === 'admin') {
            await locationStore.fetchLocations();
            if (!selectedLocationId.value || selectedLocationId.value === '') {
                selectedLocationId.value = 'all';
            }
        } else if (profile.role === 'sede') {
            selectedLocationId.value = profile.locationId;
        }
    }
}, { immediate: true });

// Helper for safe ID generation
const generateId = () => {
    try {
        return crypto.randomUUID();
    } catch (e) {
        return Math.random().toString(36).substring(2, 15);
    }
};

const isToday = computed(() => {
    return selectedDate.value === today(getLocalTimeZone()).toString();
});

const subtitleText = computed(() => {
    return selectedDate.value ? df.format(parseDate(selectedDate.value).toDate(getLocalTimeZone())) : '';
});

// Form State
const selectedMainTech = ref('');
const selectedPartnerTech = ref('');
const selectedVehicle = ref('');
const selectedZone = ref('priceUrban');
const showMainModal = ref(false);
const activityRows = ref([
    { id: generateId(), rateCode: '', assigned: 0, completed: 0, observations: '', zone: selectedZone.value }
]);

// Editing State
const editingId = ref(null);
const editForm = ref({ rateCode: '', assigned: 0, zone: 'priceUrban' });
const showEditModal = ref(false);

// Status Modals State
const showPartialModal = ref(false);
const showCancelModal = ref(false);
const showDeleteModal = ref(false);
const currentStatusGroup = ref(null);
const partialItems = ref([]);
const cancelReason = ref('');
const statusLoading = ref(false);
const isAddingToExisting = ref(false);
const currentStatusItem = ref(null);

// Group Vehicle Editing
const showVehicleEditModal = ref(false);
const editingGroupVehicle = ref(null);

// Helpers
const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const getRateInfo = (code) => {
    return partidaStore.partidas.find(r => r.code === code) || null;
};

const getLocationName = (locationId) => {
    if (!locationId) return 'Sin sede';
    const loc = locationStore.locations.find(l => l.id === locationId);
    return loc ? loc.nombre : 'Sin sede';
};

const locationNames = computed(() => {
    const map = {};
    techStore.technicians.forEach(t => {
        map[t.id] = getLocationName(t.locationId);
    });
    return map;
});

// Computed Properties
const groupedRates = computed(() => {
    return partidaStore.partidas.reduce((acc, rate) => {
        const category = rate.category || 'Otros';
        if (!acc[category]) acc[category] = [];
        acc[category].push(rate);
        return acc;
    }, {});
});

const totalRealized = computed(() => {
    return activityRows.value.reduce((sum, row) => {
        const rate = getRateInfo(row.rateCode);
        if (!rate || !row.assigned) return sum;
        const price = rate[row.zone] || 0;
        return sum + (price * row.assigned);
    }, 0).toFixed(2);
});

const locationPersonnel = computed(() => {
    const profile = authStore.userProfile;

    return techStore.technicians.filter(p => {
        // Only show 'Técnico Electricista' or 'Personal de apoyo'
        if (p.role !== 'Técnico Electricista' && p.role !== 'Personal de apoyo') return false;

        if (!p.active) return false;

        if (profile?.role === 'sede') {
            if (p.locationId !== profile.locationId) return false;
        } else if (profile?.role === 'admin') {
            if (selectedLocationId.value !== 'all' && p.locationId !== selectedLocationId.value) return false;
        }

        return true;
    });
});

const operationalPersonnel = computed(() => {
    return locationPersonnel.value.filter(p => {
        const attendanceRecord = attendanceStore.records[p.id];
        return attendanceRecord?.status === 'present';
    });
});

const busyTechIds = computed(() => {
    const targetDate = selectedDate.value;
    const targetActivities = activityStore.activities.filter(a => a.timestamp.startsWith(targetDate));

    const ids = new Set();
    targetActivities.forEach(a => {
        if (a.mainTechId) ids.add(a.mainTechId);
        if (a.partnerTechId) ids.add(a.partnerTechId);
    });
    return ids;
});

const availableLeadTechs = computed(() => {
    const profile = authStore.userProfile;
    return operationalPersonnel.value.filter(p => {
        // Safe: keep current selection in list
        if (p.id === selectedMainTech.value || p.id === selectedPartnerTech.value) return true;

        const isBusy = busyTechIds.value.has(p.id);
        const isMain = p.id === selectedMainTech.value;
        const isPartner = p.id === selectedPartnerTech.value;

        if (!isBusy || isMain || isPartner) {
            if (selectedPartnerTech.value && p.id === selectedPartnerTech.value) return false;
            return true;
        }
        return false;
    });
});

const availablePartners = computed(() => {
    if (!selectedMainTech.value) return [];

    return operationalPersonnel.value.filter(p => {
        // Safe: keep current selection in list
        if (p.id === selectedPartnerTech.value || p.id === selectedMainTech.value) return true;

        const isBusy = busyTechIds.value.has(p.id);
        const isPartner = p.id === selectedPartnerTech.value;
        const isMain = p.id === selectedMainTech.value;

        if (!isBusy || isPartner || isMain) {
            if (p.id === selectedMainTech.value) return false;
            return true;
        }
        return false;
    });
});

const pendingPersonnel = computed(() => {
    return operationalPersonnel.value.filter(p => !busyTechIds.value.has(p.id));
});

const busyVehicleIds = computed(() => {
    const targetDate = selectedDate.value;
    const targetActivities = activityStore.activities.filter(a => a.timestamp.startsWith(targetDate));

    const ids = new Set();
    targetActivities.forEach(a => {
        if (a.vehicleId) ids.add(a.vehicleId);
    });
    return ids;
});

const availableVehicles = computed(() => {
    const profile = authStore.userProfile;
    return vehicleStore.vehicles.filter(v => {
        // Safe: keep current selected vehicle in the list
        if (v.id === selectedVehicle.value) return true;

        if (v.estado === 'mantenimiento') return false;
        if (busyVehicleIds.value.has(v.id)) return false;

        if (profile?.role === 'sede') {
            if (v.sedeId !== profile.locationId) return false;
        } else if (profile?.role === 'admin') {
            if (selectedLocationId.value !== 'all' && v.sedeId !== selectedLocationId.value) return false;
        }
        return true;
    });
});

const groupedActivities = computed(() => {
    const groups = [];
    const map = new Map();

    const targetDate = selectedDate.value;
    const profile = authStore.userProfile;

    const filtered = activityStore.activities.filter(a => {
        if (!a.timestamp.startsWith(targetDate)) return false;

        if (profile?.role === 'sede') {
            const tech = techStore.technicians.find(t => t.id === a.mainTechId);
            if (tech && tech.locationId !== profile.locationId) return false;
        } else if (profile?.role === 'admin') {
            if (selectedLocationId.value !== 'all') {
                const tech = techStore.technicians.find(t => t.id === a.mainTechId);
                if (tech && tech.locationId !== selectedLocationId.value) return false;
            }
        }

        return true;
    });

    filtered.forEach(act => {
        const key = `${act.mainTechId}|${act.partnerTechId}`;

        if (!map.has(key)) {
            const group = {
                id: key,
                timestamp: act.timestamp,
                mainTechId: act.mainTechId,
                mainTechName: act.mainTechName,
                partnerTechId: act.partnerTechId,
                partnerTechName: act.partnerTechName,
                vehicleId: null,
                vehiclePlaca: null,
                vehicleType: null,
                items: []
            };
            map.set(key, group);
            groups.push(group);
        }
        
        const group = map.get(key);
        group.items.push(act);

        // Consistency: Ensure the group picks up vehicle info if any activity in it has one
        if (act.vehicleId && !group.vehicleId) {
            group.vehicleId = act.vehicleId;
            group.vehiclePlaca = act.vehiclePlaca;
            group.vehicleType = vehicleStore.vehicles.find(v => v.id === act.vehicleId)?.tipo;
        }
    });

    // Compute aggregate status for the group
    groups.forEach(group => {
        const allCompletada = group.items.every(i => i.status === 'completada');
        const allCancelled = group.items.every(i => i.status === 'cancelada');
        const anyInProcess = group.items.some(i => i.status === 'en_proceso');

        if (anyInProcess) group.status = 'en_proceso';
        else if (allCompletada) group.status = 'completada';
        else if (allCancelled) group.status = 'cancelada';
        else group.status = 'parcial';
    });

    return groups;
});

// Actions
const openMainModal = () => {
    resetForm();
    isAddingToExisting.value = false;
    showMainModal.value = true;
};

const addActivityToGroup = async (group) => {
    try {
        const isSameTeam = selectedMainTech.value === group.mainTechId &&
            selectedPartnerTech.value === (group.partnerTechId || '');

        if (isSameTeam) {
            const hasEmptyRow = activityRows.value.length === 1 && !activityRows.value[0].rateCode;
            if (!hasEmptyRow) {
                addRow();
            }
        } else {
            selectedMainTech.value = group.mainTechId || '';
            selectedPartnerTech.value = group.partnerTechId || '';
            selectedVehicle.value = group.vehicleId || '';

            activityRows.value = [{
                id: generateId(),
                rateCode: '',
                assigned: 0,
                completed: 0,
                observations: '',
                zone: selectedZone.value
            }];
        }

        isAddingToExisting.value = true;
        showMainModal.value = true;
        await nextTick();
    } catch (e) {
        console.error("Error in addActivityToGroup:", e);
        showNotification("Error al cargar técnicos", "error");
    }
};

const addRow = () => {
    activityRows.value.push({
        id: generateId(),
        rateCode: '',
        assigned: 0,
        completed: 0,
        observations: '',
        zone: selectedZone.value
    });
};

const removeRow = (index) => {
    if (activityRows.value.length > 1) {
        activityRows.value.splice(index, 1);
    }
};

const startEditing = (activity) => {
    editingId.value = activity.id;
    editForm.value = {
        rateCode: activity.rateCode,
        assigned: activity.assigned,
        zone: activity.zone === 'Urbano' ? 'priceUrban' : 'priceRural',
        mainTechId: activity.mainTechId,
        partnerTechId: activity.partnerTechId || '',
        vehicleId: activity.vehicleId || ''
    };
    showEditModal.value = true;
};

const cancelEditing = () => {
    editingId.value = null;
    showEditModal.value = false;
};

const saveEdit = async (activity) => {
    const rate = getRateInfo(editForm.value.rateCode);
    if (!rate) return;

    const selectedRowZone = editForm.value.zone;
    const price = rate[selectedRowZone] || 0;
    const assigned = Number(editForm.value.assigned);

    // If service or zone changed, we keep the original 'completed' count but recalculate values
    // Actually the user says "only change the zone, task and meta", so we recalculate based on new meta
    const newProjected = (price * assigned).toFixed(2);
    // Realized value depends on 'completed', which we aren't editing here, so we keep it
    const newRealized = (price * (activity.completed || 0)).toFixed(2);

    const selectedMainTech = techStore.technicians.find(t => t.id === editForm.value.mainTechId);
    const selectedPartnerTech = techStore.technicians.find(t => t.id === editForm.value.partnerTechId);
    const selectedVehicle = editForm.value.vehicleId ? vehicleStore.vehicles.find(v => v.id === editForm.value.vehicleId) : null;
    
    const isTechChanging = editForm.value.mainTechId !== activity.mainTechId || (editForm.value.partnerTechId || null) !== (activity.partnerTechId || null);
    
    // We update this specific item
    await activityStore.updateActivity(activity.id, {
        rateCode: rate.code,
        description: `${rate.code} - ${rate.name}`,
        assigned: assigned,
        unitPrice: price,
        projectedValue: newProjected,
        realizedValue: newRealized,
        totalValue: newRealized,
        zone: selectedRowZone === 'priceUrban' ? 'Urbano' : 'Rural',
        mainTechId: selectedMainTech ? selectedMainTech.id : activity.mainTechId,
        mainTechName: selectedMainTech ? selectedMainTech.fullName : activity.mainTechName,
        partnerTechId: selectedPartnerTech ? selectedPartnerTech.id : null,
        partnerTechName: selectedPartnerTech ? selectedPartnerTech.fullName : null,
        vehicleId: selectedVehicle ? selectedVehicle.id : null,
        vehiclePlaca: selectedVehicle ? selectedVehicle.placa : null
    });

    // If techs did not change but vehicle did, apply vehicle change to whole group logically
    if (!isTechChanging && editForm.value.vehicleId !== activity.vehicleId) {
        const group = groupedActivities.value.find(g => g.mainTechId === activity.mainTechId && g.partnerTechId === activity.partnerTechId);
        if (group) {
            for (const item of group.items) {
                if (item.id !== activity.id) {
                    await activityStore.updateActivity(item.id, {
                        vehicleId: selectedVehicle ? selectedVehicle.id : null,
                        vehiclePlaca: selectedVehicle ? selectedVehicle.placa : null
                    });
                }
            }
        }
    }

    // Unreserve old vehicle if explicitly completely removed
    const oldVehicleId = activity.vehicleId;
    const newVehicleId = editForm.value.vehicleId;
    if (oldVehicleId && oldVehicleId !== newVehicleId) {
        // Quick verification: does any activity still use oldVehicleId today?
        const dbActivitiesForDate = activityStore.activities.filter(a => a.timestamp.startsWith(selectedDate.value));
        const stillInUse = dbActivitiesForDate.find(a => a.vehicleId === oldVehicleId);
        if (!stillInUse) {
            await vehicleStore.updateVehicle(oldVehicleId, { estado: 'disponible' });
        }
    }
    if (newVehicleId && oldVehicleId !== newVehicleId) {
        await vehicleStore.updateVehicle(newVehicleId, { estado: 'asignado' });
    }

    editingId.value = null;
    showEditModal.value = false;
    showNotification('Actividad actualizada', 'success');
};

const handleSubmit = async () => {
    const selectedDateObj = parseDate(selectedDate.value);
    const todayObj = today(getLocalTimeZone());
    if (selectedDateObj.compare(todayObj) > 0) {
        showNotification('No se pueden registrar actividades para fechas futuras.', 'error');
        return;
    }

    if (!selectedMainTech.value) {
        showNotification('Seleccione un técnico principal.', 'error');
        return;
    }

    const validRows = activityRows.value.filter(r => r.rateCode && (r.assigned > 0 || r.completed > 0));
    if (validRows.length === 0) {
        showNotification('Registre al menos una actividad con cantidades.', 'error');
        return;
    }

    try {
        const mainTech = techStore.technicians.find(p => p.id === selectedMainTech.value);
        const partnerTech = selectedPartnerTech.value && selectedPartnerTech.value !== 'none'
            ? techStore.technicians.find(p => p.id === selectedPartnerTech.value)
            : null;
        const vehicle = selectedVehicle.value && selectedVehicle.value !== 'none'
            ? vehicleStore.vehicles.find(v => v.id === selectedVehicle.value)
            : null;

        let savedCount = 0;
        const entryTime = new Date().toLocaleTimeString('en-US', { hour12: false });
        const timestamp = `${selectedDate.value}T${entryTime}`;

        for (const row of validRows) {
            const rate = getRateInfo(row.rateCode);
            const description = `${rate.code} - ${rate.name}`;
            const price = rate[row.zone] || 0;
            const rowProjected = (price * row.assigned).toFixed(2);
            const rowRealized = (price * row.completed).toFixed(2);

            await activityStore.addActivity({
                mainTechId: mainTech.id,
                mainTechName: mainTech.fullName,
                partnerTechId: partnerTech?.id || null,
                partnerTechName: partnerTech?.fullName || null,
                vehicleId: vehicle?.id || null,
                vehiclePlaca: vehicle?.placa || null,
                locationId: mainTech.locationId,
                description: description,
                assigned: row.assigned,
                completed: row.completed,
                rateCode: rate.code,
                unitPrice: price,
                zone: row.zone === 'priceUrban' ? 'Urbano' : 'Rural',
                projectedValue: rowProjected,
                realizedValue: rowRealized,
                observations: row.observations || '',
                timestamp: timestamp,
                status: 'en_proceso'
            });
            savedCount++;
        }

        // Explicitly update vehicle status to ensure consistency
        if (vehicle && vehicle.id) {
            // Re-verify if it still exists in the local store as a safety measure
            const stillExists = vehicleStore.vehicles.some(v => v.id === vehicle.id);
            if (stillExists) {
                await vehicleStore.updateVehicle(vehicle.id, { estado: 'asignado' });
            }
        }

        showMainModal.value = false;
        resetForm();

        showNotification(`${savedCount} actividades registradas (${selectedDate.value})`, 'success');
        scrollToTop();
    } catch (err) {
        console.error("Error in handleSubmit:", err);
        showNotification(err.message || 'Error al registrar actividades', 'error');
    }
};

const checkGroupCompletion = async (group) => {
    if (!group || !group.vehicleId) return;

    await nextTick();

    const freshGroup = groupedActivities.value.find(g => g.mainTechId === group.mainTechId && g.timestamp === group.timestamp);
    if (!freshGroup) return;

    const allClosed = freshGroup.items.every(i => ['completada', 'parcial', 'cancelada'].includes(i.status));
    
    // Safety check: only update if the vehicle actually exists in our current fleet
    const vehicleExists = vehicleStore.vehicles.find(v => v.id === group.vehicleId);
    if (!vehicleExists) return;

    if (allClosed) {
        await vehicleStore.updateVehicle(group.vehicleId, { estado: 'disponible' });
    } else {
        await vehicleStore.updateVehicle(group.vehicleId, { estado: 'asignado' });
    }
};

const handleUpdateStatus = async (item, group, newStatus) => {
    currentStatusGroup.value = group;
    currentStatusItem.value = item;

    if (newStatus === 'completada') {
        statusLoading.value = true;
        try {
            const rate = getRateInfo(item.rateCode);
            const price = rate[selectedZone.value] || rate.unitPrice || 0;
            const val = (price * item.assigned).toFixed(2);
            await activityStore.updateActivity(item.id, {
                status: 'completada',
                completed: item.assigned,
                unitPrice: price,
                realizedValue: val,
                totalValue: val
            });
            await checkGroupCompletion(group);
            showNotification('Actividad completada', 'success');
        } finally {
            statusLoading.value = false;
        }
    } else if (newStatus === 'parcial') {
        partialItems.value = [{
            id: item.id,
            description: item.description,
            assigned: item.assigned,
            completed: item.completed || 0,
            rateCode: item.rateCode,
            observations: ''
        }];
        showPartialModal.value = true;
    } else if (newStatus === 'cancelada') {
        cancelReason.value = '';
        showCancelModal.value = true;
    } else if (newStatus === 'en_proceso') {
        await activityStore.updateActivity(item.id, { status: 'en_proceso' });
        await checkGroupCompletion(group);
        showNotification('Actividad reabierta', 'info');
    }
};

const handleDeleteActivity = async (item, group) => {
    currentStatusItem.value = item;
    currentStatusGroup.value = group;
    showDeleteModal.value = true;
};

const confirmDeleteStatus = async () => {
    statusLoading.value = true;
    try {
        const item = currentStatusItem.value;
        const group = currentStatusGroup.value;
        await activityStore.deleteActivity(item.id);
        
        await nextTick();
        
        const freshGroup = groupedActivities.value.find(g => g.mainTechId === group.mainTechId && g.timestamp === group.timestamp);
        if (!freshGroup && group.vehicleId) {
             await vehicleStore.updateVehicle(group.vehicleId, { estado: 'disponible' });
        } else if (freshGroup) {
             await checkGroupCompletion(freshGroup);
        }
        
        showDeleteModal.value = false;
        showNotification('Actividad eliminada', 'success');
    } catch (err) {
        showNotification('Error al eliminar actividad: ' + err.message, 'error');
    } finally {
        statusLoading.value = false;
    }
};

const confirmPartialStatus = async () => {
    statusLoading.value = true;
    try {
        const item = partialItems.value[0];
        const rate = getRateInfo(item.rateCode);
        const price = rate[selectedZone.value] || rate.unitPrice || 0;
        const val = (price * item.completed).toFixed(2);
        await activityStore.updateActivity(item.id, {
            status: 'parcial',
            completed: Number(item.completed),
            unitPrice: price,
            realizedValue: val,
            totalValue: val,
            observations: item.observations ? `PARCIAL: ${item.observations}` : item.observations
        });
        await checkGroupCompletion(currentStatusGroup.value);
        showPartialModal.value = false;
        showNotification('Avance parcial registrado', 'success');
    } finally {
        statusLoading.value = false;
    }
};

const confirmCancelStatus = async () => {
    if (!cancelReason.value.trim()) {
        showNotification('Por favor, ingrese un motivo.', 'error');
        return;
    }
    statusLoading.value = true;
    try {
        await activityStore.updateActivity(currentStatusItem.value.id, {
            status: 'cancelada',
            observations: `CANCELADO: ${cancelReason.value.trim()}`
        });
        await checkGroupCompletion(currentStatusGroup.value);
        showCancelModal.value = false;
        showNotification('Actividad cancelada', 'info');
    } finally {
        statusLoading.value = false;
    }
};

const startVehicleEdit = (group) => {
    editingGroupVehicle.value = group;
    showVehicleEditModal.value = true;
};

const saveGroupVehicle = async (group, newVehicleId) => {
    const oldVehicleId = group.vehicleId;
    if (oldVehicleId === newVehicleId) {
        showVehicleEditModal.value = false;
        return;
    }

    try {
        const newVehicle = newVehicleId ? vehicleStore.vehicles.find(v => v.id === newVehicleId) : null;
        
        // Update all items in this group
        for (const item of group.items) {
            await activityStore.updateActivity(item.id, {
                vehicleId: newVehicleId || null,
                vehiclePlaca: newVehicle ? newVehicle.placa : null
            });
        }

        // Unreserve old vehicle if explicitly requested
        if (oldVehicleId) {
            await vehicleStore.updateVehicle(oldVehicleId, { estado: 'disponible' });
        }
        if (newVehicleId) {
            await vehicleStore.updateVehicle(newVehicleId, { estado: 'asignado' });
        }

        showNotification('Vehículo modificado correctamente', 'success');
        showVehicleEditModal.value = false;
    } catch (err) {
        showNotification('Error guardando vehículo: ' + err.message, 'error');
    }
};

const resetForm = () => {
    selectedMainTech.value = '';
    selectedPartnerTech.value = '';
    selectedVehicle.value = '';
    isAddingToExisting.value = false;
    activityRows.value = [{ id: generateId(), rateCode: '', assigned: 0, completed: 0, observations: '', zone: selectedZone.value }];
};
</script>

<template>
    <TooltipProvider :delay-duration="0">
        <div class="flex flex-1 flex-col min-w-0 gap-3 p-4 pt-2 overflow-y-auto">

            <ActivityHeader :subtitle="subtitleText" :isToday="isToday" v-model:zone="selectedZone"
                @open-modal="openMainModal" />

            <ActivityFilters v-model:locationId="selectedLocationId" v-model:dateValue="dateValue"
                :locations="locationStore.locations" :isToday="isToday" :groupCount="groupedActivities.length"
                :isAdmin="authStore.userProfile?.role === 'admin'" :df="df" :getLocalTimeZone="getLocalTimeZone" />

            <!-- PENDING ALERT -->
            <Transition name="fade">
                <div v-if="pendingPersonnel.length > 0"
                    class="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg shadow-sm">
                    <AlertTriangle :size="20" class="text-rose-600" />
                    <p class="text-sm font-bold text-rose-700">
                        Faltan reportar <span class="bg-rose-600 text-white px-1.5 py-0.5 rounded-sm mx-1">{{
                            pendingPersonnel.length
                        }}</span> técnicos para esta fecha
                    </p>
                </div>
            </Transition>

            <ActivityList :groupedActivities="groupedActivities" :editingId="editingId" :editForm="editForm"
                :isAdmin="authStore.userProfile?.role === 'admin'" :locationNames="locationNames"
                @add-to-group="addActivityToGroup" @update-status="handleUpdateStatus" @start-edit="startEditing"
                @cancel-edit="cancelEditing" @save-edit="saveEdit" @edit-vehicle="startVehicleEdit" @delete-activity="handleDeleteActivity" />

            <ActivityRegistrationDialog v-model:show="showMainModal" v-model:selectedMainTech="selectedMainTech"
                v-model:selectedPartnerTech="selectedPartnerTech" v-model:selectedVehicle="selectedVehicle"
                :isAddingToExisting="isAddingToExisting" :availableLeadTechs="availableLeadTechs"
                :availablePartners="availablePartners" :availableVehicles="availableVehicles"
                :groupedRates="groupedRates" :loading="activityStore.loading" :totalRealized="totalRealized"
                :activityRows="activityRows" :techs="techStore.technicians" :zone="selectedZone" @add-row="addRow"
                @remove-row="removeRow" @submit="handleSubmit" @close="showMainModal = false" />

            <ActivityEditDialog v-model:show="showEditModal" :editForm="editForm" :groupedRates="groupedRates"
                :loading="activityStore.loading" :techs="locationPersonnel" :availableVehicles="availableVehicles"
                @submit="saveEdit(groupedActivities.flatMap(g => g.items).find(i => i.id === editingId))"
                @close="cancelEditing" />

            <ActivityStatusDialogs v-model:showPartial="showPartialModal" v-model:showCancel="showCancelModal"
                v-model:showDelete="showDeleteModal" v-model:cancelReason="cancelReason" :partialItems="partialItems" 
                :statusLoading="statusLoading" @confirm-partial="confirmPartialStatus" @confirm-cancel="confirmCancelStatus"
                @confirm-delete="confirmDeleteStatus" />

            <GroupVehicleEditDialog v-model:show="showVehicleEditModal" :group="editingGroupVehicle"
                :availableVehicles="availableVehicles" @save="saveGroupVehicle" />

        </div>
    </TooltipProvider>
</template>

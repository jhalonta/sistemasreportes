<script setup>
import { computed, onMounted } from 'vue';
import { useAuthStore } from '../store/authStore';
import { usePersonalStore } from '../../personal/store/personalStore';
import { useLocationStore } from '../../locations/store/locationStore';
import {
  ShieldCheck, Building2, Mail, Phone, IdCard,
  MapPin, Briefcase, Wrench, CheckCircle2,
  AlertCircle, Hash, User, Globe, CalendarDays, BadgeCheck
} from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const authStore = useAuthStore();
const techStore = usePersonalStore();
const locationStore = useLocationStore();

onMounted(async () => {
  if (techStore.technicians.length === 0) techStore.fetchTechnicians();
  if (locationStore.locations.length === 0) locationStore.fetchLocations();
});

const profile  = computed(() => authStore.userProfile);
const role     = computed(() => profile.value?.role);

const technicalData = computed(() =>
  role.value === 'tecnico'
    ? techStore.technicians.find(t => t.id === profile.value?.technicianId)
    : null
);

const locationData = computed(() => {
  if (role.value === 'sede')
    return locationStore.locations.find(l => l.id === profile.value?.locationId);
  if (technicalData.value?.locationId)
    return locationStore.locations.find(l => l.id === technicalData.value.locationId);
  return null;
});

const formatDate = (date) => {
  if (!date) return '—';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const roleConfig = computed(() => ({
  admin:   { label: 'ADMIN',   icon: ShieldCheck, bar: 'bg-rose-500',   badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',   ring: 'ring-rose-500/30',   bg: 'bg-rose-500/8' },
  sede:    { label: 'SEDE',    icon: Building2,   bar: 'bg-sky-500',    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',      ring: 'ring-sky-500/30',    bg: 'bg-sky-500/8' },
  tecnico: { label: 'TÉCNICO', icon: Wrench,      bar: 'bg-amber-500',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', ring: 'ring-amber-500/30', bg: 'bg-amber-500/8' },
}[role.value]) ?? { label: 'USER', icon: User, bar: 'bg-slate-500', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20', ring: 'ring-slate-500/30', bg: 'bg-slate-500/8' });

const displayName = computed(() => {
  if (technicalData.value?.fullName) return technicalData.value.fullName;
  if (role.value === 'admin') return 'Administrador';
  return locationData.value?.nombre ?? 'Usuario';
});

const initials = computed(() =>
  displayName.value.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
);
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-5 space-y-3">

    <!-- ── HEADER CARD ─────────────────────────────────────────── -->
    <Card class="overflow-hidden border border-border/60 shadow-sm">
      <div class="h-0.5 w-full" :class="roleConfig.bar" />
      <CardContent class="p-4 flex items-center gap-3">

        <!-- Avatar -->
        <Avatar class="h-12 w-12 rounded-xl shrink-0 ring-2" :class="roleConfig.ring">
          <AvatarFallback class="rounded-xl font-black font-mono text-base" :class="roleConfig.bg">
            {{ initials }}
          </AvatarFallback>
        </Avatar>

        <!-- Name + meta -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="font-black font-mono text-base uppercase tracking-tight truncate">
              {{ displayName }}
            </h1>
            <Badge variant="outline" class="font-mono font-black text-[10px] tracking-widest uppercase shrink-0" :class="roleConfig.badge">
              <component :is="roleConfig.icon" :size="9" class="mr-1" />{{ roleConfig.label }}
            </Badge>
            <Badge
              v-if="technicalData"
              variant="outline"
              class="font-mono font-black text-[10px] shrink-0"
              :class="technicalData.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'"
            >
              <span class="h-1.5 w-1.5 rounded-full mr-1 inline-block" :class="technicalData.active ? 'bg-emerald-400' : 'bg-red-400'" />
              {{ technicalData.active ? 'ACTIVO' : 'INACTIVO' }}
            </Badge>
          </div>
          <div class="flex flex-wrap gap-x-3 mt-0.5 text-[11px] text-muted-foreground">
            <span class="flex items-center gap-1"><Mail :size="10" />{{ authStore.user?.email }}</span>
            <span v-if="locationData" class="flex items-center gap-1"><MapPin :size="10" />{{ locationData.ciudad }}, {{ locationData.departamento }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- ADMIN LAYOUT                                              -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template v-if="role === 'admin'">
      <div class="grid grid-cols-2 gap-3">

        <!-- Account info -->
        <Card class="border border-border/60 shadow-sm overflow-hidden">
          <CardContent class="p-4 space-y-3">
            <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Hash :size="10" /> Cuenta
            </p>
            <Separator class="opacity-40" />

            <div class="space-y-0.5">
              <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60">UID</p>
              <p class="font-mono text-[9px] break-all text-muted-foreground bg-muted/40 px-2 py-1.5 rounded border border-border/40 leading-relaxed">
                {{ authStore.user?.uid }}
              </p>
            </div>

            <div class="flex items-center justify-between">
              <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60">Email</p>
              <div class="flex items-center gap-1">
                <CheckCircle2 v-if="authStore.user?.emailVerified" :size="11" class="text-emerald-400" />
                <AlertCircle v-else :size="11" class="text-amber-400" />
                <span class="text-[11px] font-semibold">{{ authStore.user?.emailVerified ? 'Verificado' : 'Pendiente' }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                <CalendarDays :size="9" /> Miembro
              </p>
              <p class="text-[11px] font-semibold">{{ formatDate(profile?.createdAt) }}</p>
            </div>
          </CardContent>
        </Card>

        <!-- Admin access -->
        <Card class="border border-rose-500/20 shadow-sm overflow-hidden bg-rose-500/5">
          <CardContent class="p-4 flex flex-col items-center justify-center gap-3 h-full text-center">
            <div class="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <ShieldCheck :size="20" class="text-rose-400" />
            </div>
            <div>
              <p class="font-black font-mono text-xs uppercase tracking-tight text-rose-400">Acceso Total</p>
              <p class="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Control completo sobre usuarios, personal, sedes y vehículos.</p>
            </div>
            <div class="flex flex-wrap gap-1 justify-center">
              <Badge variant="outline" class="text-[9px] font-mono bg-rose-500/10 text-rose-400 border-rose-500/20">Usuarios</Badge>
              <Badge variant="outline" class="text-[9px] font-mono bg-rose-500/10 text-rose-400 border-rose-500/20">Personal</Badge>
              <Badge variant="outline" class="text-[9px] font-mono bg-rose-500/10 text-rose-400 border-rose-500/20">Sedes</Badge>
              <Badge variant="outline" class="text-[9px] font-mono bg-rose-500/10 text-rose-400 border-rose-500/20">Vehículos</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- SEDE LAYOUT                                               -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template v-else-if="role === 'sede'">
      <div class="grid grid-cols-2 gap-3">

        <!-- Sede info -->
        <Card class="border border-sky-500/20 shadow-sm overflow-hidden bg-sky-500/5">
          <CardContent class="p-4 space-y-3">
            <p class="text-[10px] font-black uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
              <Building2 :size="10" /> Sede
            </p>
            <Separator class="opacity-40" />

            <div class="space-y-2">
              <div>
                <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60">Nombre</p>
                <p class="font-bold text-sm uppercase">{{ locationData?.nombre ?? '—' }}</p>
              </div>
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60">Código</p>
                  <Badge variant="outline" class="font-mono font-black text-[10px] tracking-widest bg-sky-500/10 text-sky-400 border-sky-500/20 mt-0.5">
                    {{ locationData?.codigo ?? '—' }}
                  </Badge>
                </div>
                <div class="text-right">
                  <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60">Dirección</p>
                  <p class="text-[11px] text-muted-foreground">{{ locationData?.direccion ?? '—' }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Globe :size="10" />{{ locationData?.ciudad }}, {{ locationData?.departamento }}
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Account -->
        <Card class="border border-border/60 shadow-sm overflow-hidden">
          <CardContent class="p-4 space-y-3">
            <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Hash :size="10" /> Cuenta
            </p>
            <Separator class="opacity-40" />

            <div class="space-y-0.5">
              <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60">UID</p>
              <p class="font-mono text-[9px] break-all text-muted-foreground bg-muted/40 px-2 py-1.5 rounded border border-border/40 leading-relaxed">
                {{ authStore.user?.uid }}
              </p>
            </div>

            <div class="flex items-center justify-between">
              <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60">Email</p>
              <div class="flex items-center gap-1">
                <CheckCircle2 v-if="authStore.user?.emailVerified" :size="11" class="text-emerald-400" />
                <AlertCircle v-else :size="11" class="text-amber-400" />
                <span class="text-[11px] font-semibold">{{ authStore.user?.emailVerified ? 'Verificado' : 'Pendiente' }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                <CalendarDays :size="9" /> Miembro
              </p>
              <p class="text-[11px] font-semibold">{{ formatDate(profile?.createdAt) }}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- TÉCNICO LAYOUT                                            -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <template v-else-if="role === 'tecnico'">
      <div class="grid grid-cols-2 gap-3">

        <!-- Ficha operativa -->
        <Card class="border border-amber-500/20 shadow-sm overflow-hidden bg-amber-500/5">
          <CardContent class="p-4 space-y-3">
            <p class="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <Briefcase :size="10" /> Ficha Operativa
            </p>
            <Separator class="opacity-40" />

            <div class="grid grid-cols-2 gap-3">
              <div>
                <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1"><IdCard :size="9" /> DNI</p>
                <p class="font-mono font-black text-lg tracking-widest">{{ technicalData?.dni ?? '—' }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1"><Phone :size="9" /> Teléfono</p>
                <p class="font-mono font-black text-lg tracking-widest">{{ technicalData?.phone ?? '—' }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1"><BadgeCheck :size="9" /> Cargo</p>
                <p class="font-semibold text-sm mt-0.5">{{ technicalData?.role ?? '—' }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Sede + Cuenta -->
        <div class="space-y-3">
          <Card v-if="locationData" class="border border-border/60 shadow-sm overflow-hidden">
            <CardContent class="p-4 space-y-2">
              <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Building2 :size="10" /> Sede
              </p>
              <Separator class="opacity-40" />
              <div class="flex items-center justify-between gap-2">
                <p class="font-bold text-xs uppercase truncate">{{ locationData.nombre }}</p>
                <Badge variant="outline" class="font-mono font-black text-[10px] bg-sky-500/10 text-sky-400 border-sky-500/20 shrink-0">
                  {{ locationData.codigo }}
                </Badge>
              </div>
              <p class="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin :size="10" />{{ locationData.ciudad }}, {{ locationData.departamento }}
              </p>
            </CardContent>
          </Card>

          <Card class="border border-border/60 shadow-sm overflow-hidden">
            <CardContent class="p-4 space-y-2">
              <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Hash :size="10" /> Cuenta
              </p>
              <Separator class="opacity-40" />
              <div class="flex items-center justify-between">
                <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60">Email</p>
                <div class="flex items-center gap-1">
                  <CheckCircle2 v-if="authStore.user?.emailVerified" :size="11" class="text-emerald-400" />
                  <AlertCircle v-else :size="11" class="text-amber-400" />
                  <span class="text-[11px] font-semibold">{{ authStore.user?.emailVerified ? 'Verificado' : 'Pendiente' }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <p class="text-[10px] uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1"><CalendarDays :size="9" /> Miembro</p>
                <p class="text-[11px] font-semibold">{{ formatDate(profile?.createdAt) }}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>

  </div>
</template>

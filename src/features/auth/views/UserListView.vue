<script setup>
import { onMounted, ref, computed } from 'vue';
import { useUserStore } from '../store/userStore';
import { useTechnicianStore } from '../../technicians/store/technicianStore';
import { useLocationStore } from '../../locations/store/locationStore';
import { useNotifications } from '../../../composables/useNotifications';
import BaseModal from '../../../components/BaseModal.vue';
import { 
  Users, 
  Key, 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  Mail, 
  Eye, 
  EyeOff,
  UserPlus,
  ShieldAlert,
  Building2,
  Lock
} from 'lucide-vue-next';

const userStore = useUserStore();
const techStore = useTechnicianStore();
const locationStore = useLocationStore();
const { showNotification } = useNotifications();

const searchQuery = ref('');
const showAccountModal = ref(false);

// Account Creation State
const userRole = ref('tecnico'); // 'tecnico', 'sede', or 'admin'
const selectedTechId = ref('');
const selectedSedeId = ref('');
const accountEmail = ref('');
const accountPassword = ref('');
const showPassword = ref(false);

onMounted(async () => {
  await Promise.all([
    userStore.fetchUsers(),
    techStore.fetchTechnicians(),
    locationStore.fetchLocations()
  ]);
});

const techniciansWithoutAccount = computed(() => {
  return techStore.technicians.filter(t => 
    t.active && 
    t.email && 
    !userStore.users.some(u => u.technicianId === t.id)
  );
});

const filteredUsers = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return userStore.users.filter(u => {
    const tech = techStore.technicians.find(t => t.id === u.technicianId);
    const sede = locationStore.locations.find(l => l.id === u.locationId);
    return (
      u.email.toLowerCase().includes(query) ||
      (tech?.fullName || '').toLowerCase().includes(query) ||
      (sede?.nombre || '').toLowerCase().includes(query)
    );
  });
});

const getTargetName = (user) => {
  if (user.role === 'tecnico') {
    const tech = techStore.technicians.find(t => t.id === user.technicianId);
    return tech ? tech.fullName : 'Técnico Desconocido';
  } else if (user.role === 'sede') {
    const sede = locationStore.locations.find(l => l.id === user.locationId);
    return sede ? sede.nombre : 'Sede Desconocida';
  } else if (user.role === 'admin') {
    return 'Administrador del Sistema';
  }
  return 'Usuario';
};

const handleCreateAccount = async () => {
  let emailToUse = '';
  let extraData = {};

  if (userRole.value === 'tecnico') {
    if (!selectedTechId.value) {
      showNotification('Seleccione un técnico', 'error');
      return;
    }
    const tech = techStore.technicians.find(t => t.id === selectedTechId.value);
    emailToUse = tech.email;
    extraData = { technicianId: tech.id };
  } else if (userRole.value === 'sede') {
    if (!selectedSedeId.value) {
      showNotification('Seleccione una sede', 'error');
      return;
    }
    if (!accountEmail.value) {
      showNotification('Ingrese un correo de acceso', 'error');
      return;
    }
    emailToUse = accountEmail.value;
    extraData = { locationId: selectedSedeId.value };
  } else {
    // Admin role
    if (!accountEmail.value) {
      showNotification('Ingrese un correo de acceso', 'error');
      return;
    }
    emailToUse = accountEmail.value;
    extraData = { fullName: 'Administrador' };
  }

  if (!accountPassword.value || accountPassword.value.length < 6) {
    showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }
  
  try {
    await userStore.createUserAccount(
      emailToUse,
      accountPassword.value,
      userRole.value,
      extraData
    );
    showNotification('Cuenta creada correctamente', 'success');
    showAccountModal.value = false;
    // Reset state
    selectedTechId.value = '';
    selectedSedeId.value = '';
    accountEmail.value = '';
    accountPassword.value = '';
  } catch (err) {
    showNotification(err.message || 'Error al crear la cuenta', 'error');
  }
};
</script>

<template>
  <div class="users-view">
    <div class="view-header">
      <div class="header-info">
        <h2 class="title"><Users :size="28" class="title-icon" /> Accesos de Usuario</h2>
        <p class="subtitle">Gestiona las credenciales de acceso para los técnicos.</p>
      </div>
      <button class="btn-add" @click="showAccountModal = true">
        <UserPlus :size="18" /> Habilitar Acceso
      </button>
    </div>

    <!-- Stats & Filters -->
    <div class="view-controls glass-panel">
      <div class="search-wrap">
        <Search :size="20" class="search-icon" />
        <input v-model="searchQuery" type="text" placeholder="Buscar por email o nombre de técnico..." />
      </div>
    </div>

    <!-- Users Table -->
    <div class="table-container glass-panel">
      <div v-if="userStore.loading && userStore.users.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando cuentas de usuario...</p>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="empty-state">
        <ShieldAlert :size="48" class="empty-icon" />
        <p>No se encontraron cuentas de usuario con acceso técnico.</p>
      </div>

      <table v-else class="user-table">
        <thead>
          <tr>
            <th>Usuario / Entidad</th>
            <th>Correo de Acceso</th>
            <th>Rol de Sistema</th>
            <th>Estado de Acceso</th>
            <th>F. Creación</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filteredUsers" :key="u.uid">
            <td>
              <div class="tech-cell">
                <div class="user-avatar" :class="u.role">
                  <component :is="u.role === 'tecnico' ? Users : (u.role === 'admin' ? ShieldCheck : Building2)" :size="16" />
                </div>
                <div class="tech-info-wrap">
                  <span class="main-name">{{ getTargetName(u) }}</span>
                  <span class="sub-name">
                    {{ u.role === 'tecnico' ? 'Técnico Operativo' : (u.role === 'admin' ? 'Acceso Total' : 'Sede Administrativa') }}
                  </span>
                </div>
              </div>
            </td>
            <td>
              <div class="email-cell">
                <Mail :size="14" /> {{ u.email }}
              </div>
            </td>
            <td>
              <span class="role-chip" :class="u.role">{{ u.role.toUpperCase() }}</span>
            </td>
            <td>
              <div class="status-cell active">
                <ShieldCheck :size="16" />
                <span>Habilitado</span>
              </div>
            </td>
            <td class="time-cell">
              {{ u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'N/A' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Account Modal -->
    <BaseModal
      :show="showAccountModal"
      title="Habilitar Nuevo Acceso"
      subtitle="Crea una cuenta de acceso para un técnico con email registrado."
      :icon="Key"
      max-width="500px"
      @close="showAccountModal = false"
    >
      <div class="account-form">
        <div class="form-group">
          <label>Tipo de Usuario</label>
          <div class="role-selector">
            <button 
              type="button" 
              class="role-btn" 
              :class="{ active: userRole === 'tecnico' }"
              @click="userRole = 'tecnico'"
            >
              <Users :size="18" /> Técnico
            </button>
            <button 
              type="button" 
              class="role-btn" 
              :class="{ active: userRole === 'sede' }"
              @click="userRole = 'sede'"
            >
              <Building2 :size="18" /> Sede
            </button>
            <button 
              type="button" 
              class="role-btn" 
              :class="{ active: userRole === 'admin' }"
              @click="userRole = 'admin'"
            >
              <ShieldCheck :size="18" /> Admin
            </button>
          </div>
        </div>

        <!-- Section for Technician -->
        <div v-if="userRole === 'tecnico'" class="form-group animate-in">
          <label>Seleccionar Técnico (Solo con email)</label>
          <select v-model="selectedTechId" class="custom-select">
            <option value="" disabled>Seleccione un técnico...</option>
            <option v-for="t in techniciansWithoutAccount" :key="t.id" :value="t.id">
              {{ t.fullName }} ({{ t.email }})
            </option>
          </select>
          <p v-if="techniciansWithoutAccount.length === 0" class="help-text warning">
            No hay técnicos activos con email sin cuenta asignada.
          </p>
        </div>

        <!-- Section for Sede or Admin -->
        <template v-else>
          <div v-if="userRole === 'sede'" class="form-group animate-in">
            <label>Seleccionar Sede</label>
            <select v-model="selectedSedeId" class="custom-select">
              <option value="" disabled>Seleccione una sede...</option>
              <option v-for="l in locationStore.locations" :key="l.id" :value="l.id">
                {{ l.nombre }} ({{ l.codigo }})
              </option>
            </select>
          </div>
          <div class="form-group animate-in">
            <label>Correo de Acceso (E-mail)</label>
            <div class="input-with-icon">
              <Mail :size="18" class="field-icon" />
              <input 
                v-model="accountEmail" 
                type="email" 
                placeholder="ejemplo@correo.com"
                class="custom-input icon-padding"
              />
            </div>
          </div>
        </template>

        <div class="form-group" v-if="selectedTechId || selectedSedeId || userRole === 'admin'">
          <label>Asignar Contraseña</label>
          <div class="password-input">
            <input 
              v-model="accountPassword" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="Mínimo 6 caracteres"
              class="custom-input"
            />
            <button @click="showPassword = !showPassword" class="btn-toggle-eye" type="button">
              <Eye v-if="!showPassword" :size="20" />
              <EyeOff v-else :size="20" />
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showAccountModal = false">Cancelar</button>
        <button 
          class="btn-primary" 
          @click="handleCreateAccount" 
          :disabled="userStore.loading || (!selectedTechId && !selectedSedeId && userRole !== 'admin')"
        >
          {{ userStore.loading ? 'Procesando...' : 'Habilitar Acceso de Usuario' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.users-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.title-icon {
  color: #10b981;
  -webkit-text-fill-color: initial;
}

.subtitle {
  color: var(--text-muted);
  margin: 0.25rem 0 0 0;
}

.btn-add {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.view-controls {
  padding: 1.25rem;
}

.search-wrap {
  position: relative;
  max-width: 500px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-wrap input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
}

.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th {
  text-align: left;
  padding: 1rem 1.5rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-2);
}

.user-table td {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-2);
}

.tech-info-wrap {
  display: flex;
  flex-direction: column;
}

.main-name {
  font-weight: 700;
  color: var(--text-main);
  font-size: 0.95rem;
}

.sub-name {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: #f0fdf4;
  color: #16a34a;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar.admin {
  background: #fef3c7;
  color: #d97706;
}

.role-chip.admin { background: #fef3c7; color: #92400e; }

.role-selector {
  padding: 0.3rem 0.75rem;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.role-chip.tecnico { background: #dcfce7; color: #15803d; }
.role-chip.sede { background: #dbeafe; color: #1d4ed8; }

.role-selector {
  display: flex;
  gap: 0.75rem;
  background: var(--bg-input);
  padding: 0.4rem;
  border-radius: 12px;
  border: 1.5px solid var(--border-2);
}

.role-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.role-btn.active {
  background: white;
  color: var(--brand-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.input-with-icon {
  position: relative;
}

.field-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.icon-padding {
  padding-left: 2.75rem !important;
}

.animate-in {
  animation: slideDown 0.3s ease-out forwards;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.tech-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
}

.email-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 700;
  font-size: 0.85rem;
}

.status-cell.active {
  color: #10b981;
}

.account-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-muted);
}

.custom-select, .custom-input {
  width: 100%;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
}

.password-input {
  position: relative;
}

.btn-toggle-eye {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}

.help-text.warning {
  color: #d97706;
  font-size: 0.8rem;
  font-weight: 600;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
  color: var(--text-muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-2);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.btn-primary {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: var(--border-2, #e2e8f0);
  color: var(--text-main);
  font-weight: 600;
}
</style>

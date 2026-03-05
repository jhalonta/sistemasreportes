import initializeAdmin from './admin.js';

/**
 * Script para crear un nuevo técnico/administrador en Firebase Auth
 * Uso: node funciones_cli/createUser.js "email@ejemplo.com" "password123" "Sede Admin" "admin" "ID_SEDE"
 */

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Uso: node funciones_cli/createUser.js <email> <password> [displayName] [role] [locationId]');
    process.exit(0);
}

const [email, password, displayName = 'Nuevo Usuario', role = 'tecnico', locationId = 'GENERAL'] = args;

const run = async () => {
    const admin = await initializeAdmin();
    const db = admin.firestore();

    try {
        console.log(`Creando usuario: ${email}...`);
        
        // 1. Crear en Auth
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName,
            emailVerified: true
        });

        console.log(`✅ Usuario creado en Auth con UID: ${userRecord.uid}`);

        // 2. Guardar en Firestore colección 'users'
        await db.collection('users').doc(userRecord.uid).set({
            email,
            displayName,
            role,
            locationId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Datos de perfil guardados en Firestore.`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

run();

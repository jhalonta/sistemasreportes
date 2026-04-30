import initializeAdmin from './admin.js';

/**
 * Script para eliminar un usuario de Firebase Auth y su perfil en Firestore
 * Uso: node funciones_cli/deleteUser.js <uid>
 */

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Uso: node funciones_cli/deleteUser.js <uid>');
    process.exit(0);
}

const [uid] = args;

const run = async () => {
    const admin = await initializeAdmin();
    const db = admin.firestore();

    try {
        console.log(`Iniciando eliminación del usuario con UID: ${uid}...`);

        // 1. Eliminar de Firebase Auth
        try {
            await admin.auth().deleteUser(uid);
            console.log(`✅ Usuario eliminado de Firebase Authentication.`);
        } catch (authError) {
            if (authError.code === 'auth/user-not-found') {
                console.warn(`⚠️ El usuario no existe en Firebase Auth, procediendo con Firestore...`);
            } else {
                throw authError;
            }
        }

        // 2. Eliminar de Firestore colección 'users'
        await db.collection('users').doc(uid).delete();
        console.log(`✅ Documento de perfil eliminado de Firestore.`);

        console.log(`\n✨ Proceso completado con éxito.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error crítico:', error.message);
        process.exit(1);
    }
};

run();

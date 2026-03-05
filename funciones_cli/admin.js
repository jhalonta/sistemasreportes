import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your service account key (relative to the project root)
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../sistemasreportes-firebase-adminsdk-fbsvc-bbbb7a12c2.json');

const initializeAdmin = async () => {
    try {
        const serviceAccount = JSON.parse(
            await readFile(SERVICE_ACCOUNT_PATH, 'utf8')
        );

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log('✅ Firebase Admin SDK inicializado correctamente.');
        return admin;
    } catch (error) {
        console.error('❌ Error al inicializar Firebase Admin SDK:', error.message);
        process.exit(1);
    }
};

export default initializeAdmin;
export { admin };

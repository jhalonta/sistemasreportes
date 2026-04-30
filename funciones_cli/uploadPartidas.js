import initializeAdmin from './admin.js';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PARTIDAS_JSON_PATH = path.resolve(__dirname, '../src/data/partidas.json');

const uploadPartidas = async () => {
    const admin = await initializeAdmin();
    const db = admin.firestore();

    try {
        console.log('📖 Leyendo archivo JSON...');
        const data = JSON.parse(await readFile(PARTIDAS_JSON_PATH, 'utf8'));
        
        if (!Array.isArray(data)) {
            throw new Error('El archivo JSON debe contener un array de partidas.');
        }

        console.log(`🚀 Iniciando subida de ${data.length} partidas...`);

        const batchSize = 500;
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = db.batch();
            const chunk = data.slice(i, i + batchSize);

            chunk.forEach((item) => {
                // Usamos el código de la partida como ID del documento para evitar duplicados
                const docRef = db.collection('partidas').doc(item.code);
                batch.set(docRef, {
                    ...item,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            console.log(`✅ Lote ${(i / batchSize) + 1} completado (${Math.min(i + batchSize, data.length)}/${data.length})`);
        }

        console.log('✨ Todas las partidas se han subido correctamente a Firestore.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante la subida:', error.message);
        process.exit(1);
    }
};

uploadPartidas();

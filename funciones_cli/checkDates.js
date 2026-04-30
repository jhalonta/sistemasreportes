import initializeAdmin from './admin.js';

async function check() {
    const admin = await initializeAdmin();
    const db = admin.firestore();

    const allActs = await db.collection('activities').get();
    const dates = new Set();
    const counts = {};

    for (const doc of allActs.docs) {
       const data = doc.data();
       const day = data.timestamp ? data.timestamp.split('T')[0] : 'no-date';
       dates.add(day);
       if (!counts[day]) counts[day] = 0;
       counts[day]++;
    }

    console.log('--- RESUMEN DE ACTIVIDADES EN BASE DE DATOS ---');
    console.log(counts);
    process.exit(0);
}

check();

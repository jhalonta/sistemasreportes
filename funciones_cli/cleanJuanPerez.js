import initializeAdmin from './admin.js';

async function clean() {
    const admin = await initializeAdmin();
    const db = admin.firestore();

    console.log('Cleaning JUAN PEREZ related records...');

    let countDeleted = 0;
    
    // Clean Activities
    const allActs = await db.collection('activities').get();
    for (const doc of allActs.docs) {
       const data = doc.data();
       if (
           (data.mainTechName && data.mainTechName.toUpperCase().includes('JUAN PEREZ')) ||
           (data.partnerTechName && data.partnerTechName.toUpperCase().includes('JUAN PEREZ'))
       ) {
           await doc.ref.delete();
           countDeleted++;
           console.log('Deleted activity:', doc.id, '-', data.description);
       }
    }
    
    // Clean Technicians
    const allTechs = await db.collection('technicians').get();
    for (const doc of allTechs.docs) {
       const data = doc.data();
       if (data.nombre && data.nombre.toUpperCase().includes('JUAN PEREZ')) {
           await doc.ref.delete();
           countDeleted++;
           console.log('Deleted technician:', doc.id, '-', data.nombre);
       }
    }

    console.log(`Finished. Deleted ${countDeleted} records related to JUAN PEREZ`);
    process.exit(0);
}

clean();

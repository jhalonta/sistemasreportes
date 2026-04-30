import initializeAdmin from './admin.js';

async function backfill() {
    const admin = await initializeAdmin();
    const db = admin.firestore();

    console.log('Fetching all technicians to map locationId...');
    const techSnap = await db.collection('technicians').get();
    const techMap = {};
    techSnap.docs.forEach(doc => {
        const t = doc.data();
        if (t.locationId) {
            techMap[doc.id] = t.locationId;
        }
    });
    console.log(`Loaded ${Object.keys(techMap).length} technicians with locationId.`);

    console.log('Fetching activities to backfill missing locationIds...');
    const actsSnap = await db.collection('activities').get();
    
    let countUpdates = 0;
    const batch = db.batch();

    for (const doc of actsSnap.docs) {
        const data = doc.data();
        if (!data.locationId && data.mainTechId) {
            const sedeId = techMap[data.mainTechId];
            if (sedeId) {
                batch.update(doc.ref, { locationId: sedeId });
                countUpdates++;
            }
        }
    }

    if (countUpdates > 0) {
        await batch.commit();
        console.log(`Successfully backfilled locationId for ${countUpdates} activities!`);
    } else {
        console.log('No activities needed locationId backfill.');
    }

    process.exit(0);
}

backfill();

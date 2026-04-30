import initializeAdmin from './admin.js';

async function check() {
    const admin = await initializeAdmin();
    const db = admin.firestore();

    const snapshot = await db.collection('activities').where('timestamp', '>=', '2026-03-05').where('timestamp', '<', '2026-03-06').limit(1).get();
    if (snapshot.empty) {
        console.log('No records found for March 5th');
    } else {
        const data = snapshot.docs[0].data();
        console.log("LOCATION ID:", data.locationId);
        console.log("SEDE ID:", data.sedeId);
        console.log("MAIN TECH:", data.mainTechName);
        console.log("DATE:", data.date);
    }
    process.exit(0);
}

check();

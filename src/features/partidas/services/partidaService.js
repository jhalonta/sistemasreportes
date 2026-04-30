import {
    collection,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from 'firebase/firestore';
import { firestore } from '@/firebase';

const COLLECTION_NAME = 'partidas';

export const partidaService = {
    /**
     * Fetches all partidas ordered by code
     */
    async getAll() {
        const q = query(collection(firestore, COLLECTION_NAME), orderBy('code', 'asc'));
        const querySnapshot = await getDocs(q);
        const partidas = [];
        querySnapshot.forEach((doc) => {
            partidas.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return partidas;
    },

    /**
     * Updates rural and urban prices for a partida
     * @param {string} id - Document ID (which is the code)
     * @param {Object} prices - { priceRural, priceUrban }
     */
    async updatePrices(id, prices) {
        const docRef = doc(firestore, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            ...prices,
            updatedAt: serverTimestamp()
        });
    }
};

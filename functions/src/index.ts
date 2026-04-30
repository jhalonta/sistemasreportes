import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

/**
 * Crear usuario en Auth y Firestore
 */
export const createUserAuth = onCall(async (request) => {
  const {email, password, role, extraData} = request.data;

  try {
    // Validar que el técnico no tenga otra cuenta (Server-side check)
    if (extraData?.technicianId) {
      const q = await admin.firestore().collection("users")
        .where("technicianId", "==", extraData.technicianId)
        .limit(1)
        .get();
      if (!q.empty) {
        throw new HttpsError("already-exists", "El tecnico ya tiene cuenta.");
      }
    }

    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: extraData?.fullName || email,
      emailVerified: true,
    });

    await admin.firestore().collection("users")
      .doc(userRecord.uid)
      .set({
        email: email,
        role: role,
        active: true,
        ...extraData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {uid: userRecord.uid};
  } catch (err: unknown) {
    if (err instanceof HttpsError) throw err;
    const message = err instanceof Error ? err.message : "Error";
    throw new HttpsError("internal", message);
  }
});

/**
 * Actualizar usuario
 */
export const updateUserAuth = onCall(async (request) => {
  const {uid, data} = request.data;

  try {
    const authUpdates: {
      email?: string;
      disabled?: boolean;
      password?: string;
    } = {};

    if (data.email) authUpdates.email = data.email;
    if (data.active === false) authUpdates.disabled = true;
    if (data.active === true) authUpdates.disabled = false;
    if (data.password) authUpdates.password = data.password;

    if (Object.keys(authUpdates).length > 0) {
      await admin.auth().updateUser(uid, authUpdates);
    }

    // No guardamos la contraseña en Firestore por seguridad
    const firestoreData = {...data};
    delete firestoreData.password;

    if (Object.keys(firestoreData).length > 0) {
      await admin.firestore().collection("users")
        .doc(uid)
        .set({
          ...firestoreData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
    }

    return {success: true};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    throw new HttpsError("internal", message);
  }
});

/**
 * Eliminar usuario
 */
export const deleteUserAuth = onCall(async (request) => {
  const {uid} = request.data;

  try {
    await admin.auth().deleteUser(uid);

    await admin.firestore().collection("users")
      .doc(uid)
      .delete();

    return {success: true};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    throw new HttpsError("internal", message);
  }
});

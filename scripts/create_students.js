/**
 * create_students.js
 *
 * Crea cuentas de estudiantes en Firebase Authentication Y su perfil en Firestore
 * (con los niveles que tenga habilitados cada uno), a partir de students.json.
 *
 * COMO USARLO:
 *   1. Edita students.json (en esta carpeta) con tu lista de estudiantes.
 *   2. node create_students.js
 *
 * Se puede volver a correr para agregar mas estudiantes o CAMBIAR los niveles
 * habilitados de alguien que ya existe (actualiza su perfil sin duplicar la cuenta).
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const studentsFile = path.join(__dirname, "students.json");

async function run() {
  if (!fs.existsSync(studentsFile)) {
    console.log("No existe students.json. Crea uno con este formato:\n");
    console.log(JSON.stringify([
      { email: "estudiante1@tweetalig.local", password: "cambiame123", name: "Nombre Apellido", enabledLevels: ["A1"] },
      { email: "estudiante2@tweetalig.local", password: "cambiame123", name: "Nombre Apellido", enabledLevels: ["A2"] },
    ], null, 2));
    return;
  }

  const students = JSON.parse(fs.readFileSync(studentsFile, "utf-8"));
  console.log(`Procesando ${students.length} estudiantes...\n`);

  for (const s of students) {
    let uid;
    try {
      const user = await admin.auth().createUser({ email: s.email, password: s.password, displayName: s.name || "" });
      uid = user.uid;
      console.log(`✅ Cuenta creada: ${s.email} (UID: ${uid})`);
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        const existing = await admin.auth().getUserByEmail(s.email);
        uid = existing.uid;
        console.log(`⏭️  Cuenta ya existia: ${s.email} (UID: ${uid}) — actualizando perfil`);
      } else {
        console.log(`❌ Error con ${s.email}: ${err.message}`);
        continue;
      }
    }

    await db.collection("users").doc(uid).set({
      role: "student",
      name: s.name || "",
      email: s.email,
      enabledLevels: s.enabledLevels || ["A1"],
    }, { merge: true });
    console.log(`   Perfil guardado — niveles habilitados: ${(s.enabledLevels || ["A1"]).join(", ")}\n`);
  }

  console.log("Listo. Revisa la coleccion 'users' en Firestore Console para confirmar.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });

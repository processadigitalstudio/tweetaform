/**
 * create_students.js
 *
 * Crea cuentas de estudiantes en Firebase Authentication Y su perfil en Firestore
 * (con UN SOLO nivel habilitado por estudiante), a partir de students.csv.
 *
 * COMO USARLO:
 *   1. Edita students.csv (en esta carpeta) con tu lista de estudiantes.
 *      Formato de columnas: name,email,password,level
 *      Ejemplo:
 *        name,email,password,level
 *        Juan Perez,juan.perez@tweetalig.local,clave123,A1
 *        Maria Gomez,maria.gomez@tweetalig.local,clave456,A2
 *   2. node create_students.js
 *
 * Se puede volver a correr para agregar mas estudiantes o CAMBIAR el nivel de
 * alguien que ya existe (actualiza su perfil sin duplicar la cuenta).
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const csvFile = path.join(__dirname, "students.csv");
const VALID_LEVELS = ["A1", "A2", "B1", "B2"];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ""; });
    return row;
  });
}

async function run() {
  if (!fs.existsSync(csvFile)) {
    console.log("No existe students.csv. Crea uno con este formato (guardalo como .csv, ej. desde Excel/Sheets):\n");
    console.log("name,email,password,level");
    console.log("Juan Perez,juan.perez@tweetalig.local,clave123,A1");
    console.log("Maria Gomez,maria.gomez@tweetalig.local,clave456,A2");
    return;
  }

  const rows = parseCSV(fs.readFileSync(csvFile, "utf-8"));
  console.log(`Procesando ${rows.length} estudiantes...\n`);

  for (const s of rows) {
    if (!s.email || !s.password) {
      console.log(`⏭️  Fila incompleta, saltando: ${JSON.stringify(s)}`);
      continue;
    }
    const level = (s.level || "").toUpperCase();
    if (!VALID_LEVELS.includes(level)) {
      console.log(`❌ Nivel invalido para ${s.email}: "${s.level}" (debe ser A1, A2, B1 o B2) — saltando`);
      continue;
    }

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
      level: level,
    }, { merge: true });
    console.log(`   Perfil guardado — nivel habilitado: ${level}\n`);
  }

  console.log("Listo. Revisa la coleccion 'users' en Firestore Console para confirmar.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });

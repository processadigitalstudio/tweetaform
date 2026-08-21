/**
 * seed_firestore.js
 *
 * Sube las unidades de /content a Firestore, una unidad = un documento
 * en la coleccion "units", usando el unit_id como ID del documento.
 *
 * COMO USARLO:
 *   1. npm install firebase-admin
 *   2. Pon tu archivo de clave de servicio (descargado de Firebase Console)
 *      en esta misma carpeta y renombralo a: serviceAccountKey.json
 *      (ese nombre ya esta en .gitignore, nunca se sube a GitHub)
 *   3. node seed_firestore.js
 *
 * Vuelve a correrlo cada vez que agregues o edites una unidad en /content —
 * sobreescribe el documento existente si el unit_id ya existe (no duplica).
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const contentDir = path.join(__dirname, "..", "content");

async function seed() {
  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("No se encontraron archivos .json en /content");
    return;
  }

  console.log(`Encontradas ${files.length} unidades. Subiendo...\n`);

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    if (!data.unit_id) {
      console.log(`  Saltando ${file}: no tiene campo "unit_id"`);
      continue;
    }

    await db.collection("units").doc(data.unit_id).set(data);
    console.log(`  Subida: ${data.unit_id} (${data.title})`);
  }

  console.log("\nListo. Revisa la coleccion 'units' en Firestore Console.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error subiendo las unidades:", err);
    process.exit(1);
  });

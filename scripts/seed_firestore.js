/**
 * seed_firestore.js (v3 — usa GitHub como host de archivos, no Firebase Storage)
 *
 * MOTIVO DEL CAMBIO: Firebase Storage requiere el plan Blaze, y hay un incidente
 * de facturacion de Google bloqueando su activacion. Mientras se resuelve, este
 * script apunta los audios/imagenes directo a tu repositorio PUBLICO de GitHub
 * (raw.githubusercontent.com), que es gratis y no depende de Blaze para nada.
 *
 * Si mas adelante quieres migrar a Firebase Storage, solo cambia GITHUB_RAW_BASE
 * por la logica de subida — el resto del script no cambia.
 *
 * COMO USARLO:
 *   1. cd scripts && npm install
 *   2. Pon tu clave de servicio en esta carpeta como serviceAccountKey.json
 *   3. Sube tus .mp3 y .png a content/{unit_id}/audio/ e /images/ EN GITHUB
 *      (haz commit + push antes de correr este script, o las URLs no van a existir)
 *   4. node seed_firestore.js
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

// AJUSTA esto si tu usuario/repo/rama son distintos:
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/processadigitalstudio/tweetaform/main/content";

function githubUrlFor(unitId, subfolder, filename) {
  if (!filename) return null;
  const localPath = path.join(contentDir, unitId, subfolder, filename);
  if (!fs.existsSync(localPath)) {
    console.log(`    ⚠️  No encontrado localmente todavia: ${subfolder}/${filename} (¿ya lo pusiste en la carpeta?)`);
    return null;
  }
  return `${GITHUB_RAW_BASE}/${unitId}/${subfolder}/${encodeURIComponent(filename)}`;
}

function processUnit(unitId, data) {
  if (Array.isArray(data.listening)) {
    for (const item of data.listening) {
      if (item.audio_file) {
        const url = githubUrlFor(unitId, "audio", item.audio_file);
        if (url) item.audio_url = url;
      }
    }
  }

  if (Array.isArray(data.vocabulary)) {
    for (const word of data.vocabulary) {
      if (word.image_file) {
        const url = githubUrlFor(unitId, "images", word.image_file);
        if (url) word.image_url = url;
      }
    }
  }

  for (const arrName of ["vocab_practice", "quiz_pool"]) {
    if (Array.isArray(data[arrName])) {
      for (const item of data[arrName]) {
        if (item.image_file) {
          const url = githubUrlFor(unitId, "images", item.image_file);
          if (url) item.image_url = url;
        }
      }
    }
  }

  return data;
}

async function seed() {
  if (!fs.existsSync(contentDir)) {
    console.log("No existe la carpeta /content");
    return;
  }
  const unitFolders = fs.readdirSync(contentDir).filter((f) =>
    fs.statSync(path.join(contentDir, f)).isDirectory()
  );

  if (unitFolders.length === 0) {
    console.log("No se encontraron carpetas de unidades en /content");
    return;
  }

  console.log(`Encontradas ${unitFolders.length} unidades. Procesando...\n`);

  for (const unitId of unitFolders) {
    const jsonPath = path.join(contentDir, unitId, "unit.json");
    if (!fs.existsSync(jsonPath)) {
      console.log(`  Saltando ${unitId}: no tiene unit.json (¿está pendiente?)`);
      continue;
    }
    console.log(`Unidad: ${unitId}`);
    let data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    data = processUnit(unitId, data);

    await db.collection("units").doc(data.unit_id || unitId).set(data);
    console.log(`  ✅ Guardada en Firestore: ${data.unit_id || unitId} (${data.title || ""})\n`);
  }

  console.log("Listo. Revisa la coleccion 'units' en Firestore Console — los campos audio_url/image_url deberian apuntar a GitHub.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error subiendo las unidades:", err);
    process.exit(1);
  });

/**
 * seed_firestore.js (v4 — un solo archivo units.json en vez de carpetas por unidad)
 *
 * Lee content/units.json (un array con TODAS las unidades), y por cada una:
 *   1. Calcula las URLs de audio/imagenes apuntando a content/audio/ y content/images/ en GitHub
 *   2. Guarda el documento final en Firestore, coleccion "units"
 *
 * COMO USARLO:
 *   1. cd scripts && npm install
 *   2. Pon tu clave de servicio en esta carpeta como serviceAccountKey.json
 *   3. Sube tus .mp3 y .png a content/audio/ y content/images/ EN GITHUB
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
const unitsFile = path.join(contentDir, "units.json");

// AJUSTA esto si tu usuario/repo/rama son distintos:
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/processadigitalstudio/tweetaform/main/content";

function githubUrlFor(subfolder, filename) {
  if (!filename) return null;
  const localPath = path.join(contentDir, subfolder, filename);
  if (!fs.existsSync(localPath)) {
    console.log(`    ⚠️  No encontrado localmente todavia: ${subfolder}/${filename}`);
    return null;
  }
  return `${GITHUB_RAW_BASE}/${subfolder}/${encodeURIComponent(filename)}`;
}

function processUnit(data) {
  if (Array.isArray(data.listening)) {
    for (const item of data.listening) {
      if (item.audio_file) {
        const url = githubUrlFor("audio", item.audio_file);
        if (url) item.audio_url = url;
      }
    }
  }

  if (Array.isArray(data.vocabulary)) {
    for (const word of data.vocabulary) {
      if (word.image_file) {
        const url = githubUrlFor("images", word.image_file);
        if (url) word.image_url = url;
      }
    }
  }

  for (const arrName of ["vocab_practice", "quiz_pool"]) {
    if (Array.isArray(data[arrName])) {
      for (const item of data[arrName]) {
        if (item.image_file) {
          const url = githubUrlFor("images", item.image_file);
          if (url) item.image_url = url;
        }
      }
    }
  }

  return data;
}

async function seed() {
  if (!fs.existsSync(unitsFile)) {
    console.log("No existe content/units.json — nada que subir todavia.");
    return;
  }

  const units = JSON.parse(fs.readFileSync(unitsFile, "utf-8"));
  console.log(`Encontradas ${units.length} unidades en units.json. Procesando...\n`);

  for (let data of units) {
    if (!data.unit_id) {
      console.log("  Saltando una unidad sin unit_id");
      continue;
    }
    console.log(`Unidad: ${data.unit_id}`);
    data = processUnit(data);
    await db.collection("units").doc(data.unit_id).set(data);
    console.log(`  ✅ Guardada en Firestore: ${data.unit_id} (${data.title || ""})\n`);
  }

  console.log("Listo. Revisa la coleccion 'units' en Firestore Console.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error subiendo las unidades:", err);
    process.exit(1);
  });

/**
 * check_files.js
 *
 * Revisa tu carpeta content/ y te dice EXACTAMENTE que archivos de audio
 * e imagenes faltan, comparando contra lo que content/units.json espera.
 * No toca Firebase para nada — es solo un chequeo local.
 *
 * COMO USARLO:
 *   node check_files.js
 */

const fs = require("fs");
const path = require("path");

const contentDir = path.join(__dirname, "..", "content");
const unitsFile = path.join(contentDir, "units.json");

if (!fs.existsSync(unitsFile)) {
  console.log("No encuentro content/units.json. ¿Estas corriendo esto desde la carpeta scripts?");
  process.exit(1);
}

const units = JSON.parse(fs.readFileSync(unitsFile, "utf-8"));

let missingImages = [];
let missingAudio = [];
let totalImagesExpected = 0;
let totalAudioExpected = 0;

function checkImage(unitId, filename) {
  if (!filename) return;
  totalImagesExpected++;
  const p = path.join(contentDir, "images", filename);
  if (!fs.existsSync(p)) missingImages.push({ unit: unitId, file: filename });
}

function checkAudio(unitId, filename) {
  if (!filename) return;
  totalAudioExpected++;
  const p = path.join(contentDir, "audio", filename);
  if (!fs.existsSync(p)) missingAudio.push({ unit: unitId, file: filename });
}

for (const unit of units) {
  for (const v of unit.vocabulary || []) {
    if (v.has_image) checkImage(unit.unit_id, v.image_file);
  }
  for (const l of unit.listening || []) {
    checkAudio(unit.unit_id, l.audio_file);
  }
}

console.log(`\nImagenes esperadas: ${totalImagesExpected} — faltan: ${missingImages.length}`);
if (missingImages.length) {
  console.log("\n❌ IMAGENES FALTANTES:");
  missingImages.forEach((m) => console.log(`   [${m.unit}] ${m.file}`));
}

console.log(`\nAudios esperados: ${totalAudioExpected} — faltan: ${missingAudio.length}`);
if (missingAudio.length) {
  console.log("\n❌ AUDIOS FALTANTES:");
  missingAudio.forEach((m) => console.log(`   [${m.unit}] ${m.file}`));
}

if (missingImages.length === 0 && missingAudio.length === 0) {
  console.log("\n✅ Todo completo. No falta ningun archivo de audio ni imagen.");
}

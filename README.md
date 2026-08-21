# Tweetaform

Plataforma de aprendizaje autogestionado de inglés para **Tweetalig Centro de Idiomas** (Cartagena, Barranquilla, Sincelejo).

## Qué es

Curso de inglés A1–B2 alineado al MCER, organizado en unidades con 6 lecciones cada una:
**Vocabulario → Gramática (+ práctica) → Reading → Listening → Writing → Quiz de unidad**.

- Colores y logo tomados del Manual de Identidad Corporativo de Tweetalig.
- Interfaz bilingüe (inglés por defecto, botón "Ver en español" para instrucciones/navegación).
- Retroalimentación de Writing generada en vivo con la API de Anthropic (Claude).

## Estado actual (piloto MVP)

- **Alcance:** 20 unidades (5 por nivel: A1, A2, B1, B2) de las 64 totales del curso completo.
- **Contenido completo (las 6 lecciones) hoy:** unidad 1 de cada nivel — A1-01, A2-01, B1.1-01, B2-01.
- **Pendiente:** unidades 2–5 de cada nivel (ver `docs/tracker_contenido_ingles.xlsx`, hoja "Unidades", columna "Fase").

## Estructura del repositorio

```
tweetaform/
├── app/
│   └── Tweetaform.jsx        # prototipo funcional (React) — pantalla de niveles, mapa de unidad, 6 lecciones interactivas
├── content/
│   ├── unidad_A1_01.json     # unidad piloto A1, en el formato que usará la base de datos
│   ├── unidad_A2_01.json
│   ├── unidad_B1.1_01.json
│   └── unidad_B2_01.json
└── docs/
    ├── tracker_contenido_ingles.xlsx   # mapa de las 64 unidades, gramática, clasificación del banco de 550 preguntas, especificaciones de contenido
    └── muestra_4_niveles.md            # las 4 unidades piloto en formato legible, para revisión
```

## Modelo de datos por unidad

Cada unidad sigue este esquema (ver los `.json` en `/content` para ejemplos reales):

```
unit_id, level, title, grammar_topic, vocab_theme, can_do
grammar_explanation { core_rule, structure_notes[], exceptions[]?, register_notes?, common_mistake }
grammar_practice []       // 4-6 ejercicios de práctica dirigida, sin nota
vocabulary []
reading { title, word_count, text, questions[] }
listening { title, transcript, questions[] }
writing { prompt, rubric[] }
quiz []                  // evaluación final de la unidad
```

Campos con `?` son opcionales — los usan los niveles B1/B2 para casos más complejos (excepciones, registro formal/informal); A1/A2 no los necesitan.

## Stack recomendado para producción

- **Firebase** (Firestore + Hosting + Auth) — mismo stack que el Portal de Notas de Tweetalig ya en uso.
- Plan Spark (gratis) alcanza para desarrollo y para el piloto; pasar a Blaze (pago por uso) cuando haya tráfico real de estudiantes.
- Audio real: Firebase Storage + ElevenLabs para generar los mp3 de Listening a partir de los transcripts ya escritos.

## Respaldo en Firebase

Firestore es la fuente de verdad del contenido (no los `.json` de `/content` — esos son la copia editable/versionada en Git; Firestore es lo que la app realmente lee en producción).

```
scripts/
├── package.json
└── seed_firestore.js     # sube /content/*.json a la colección "units" en Firestore
```

**Para cargar (o actualizar) el contenido en Firestore:**
1. `cd scripts && npm install`
2. Descarga tu clave de servicio desde Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.
3. Guárdala en `scripts/serviceAccountKey.json` (ya está en `.gitignore` — nunca se sube a GitHub).
4. `node seed_firestore.js`

Repite el paso 4 cada vez que agregues o edites una unidad en `/content`.

## Próximos pasos

1. Completar las unidades 2–5 de cada nivel del piloto (16 unidades restantes).
2. Migrar los datos de `/content` a Firestore.
3. Conseguir los audios reales de Listening (transcripts ya listos).
4. Conectar el dashboard de progreso del estudiante y el panel admin/coordinación (reutilizando la clasificación de actividad Activo/Cursando/Alerta/Riesgo/Inactivo/Sin historial ya usada en Tweetalig).

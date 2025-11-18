// scripts/update-image-urls-to-s3.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Noticia from '../models/Noticias.js';

dotenv.config();

/* =========================
   CONFIG MONGO
   ========================= */

const MONGO_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://aaronguapo69:X3B7D2o5jPZMgMlm@cluster0.uxax8yp.mongodb.net/RealMedia';

/* =========================
   PREFIJOS VIEJO / NUEVO
   ========================= */

const OLD_PREFIX = 'https://maslatino.com/wp-content/uploads/';
const NEW_PREFIX = 'https://maslatino-contenido.s3.us-east-2.amazonaws.com/wp-content/uploads/';

/* =========================
   SCRIPT PRINCIPAL
   ========================= */

async function run() {
  try {
    console.log('🧬 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    console.log('🔍 Buscando noticias con meta.image que use el dominio viejo...');
    const count = await Noticia.countDocuments({
      'meta.image': { $regex: '^' + OLD_PREFIX }
    });

    console.log(`📊 Noticias a actualizar: ${count}`);

    if (count === 0) {
      console.log('✅ No hay imágenes con el dominio viejo. Nada que hacer.');
      await mongoose.disconnect();
      return;
    }

    // Requiere MongoDB 4.2+ (update con pipeline)
    const result = await Noticia.updateMany(
      { 'meta.image': { $regex: '^' + OLD_PREFIX } },
      [
        {
          $set: {
            'meta.image': {
              $replaceOne: {
                input: '$meta.image',
                find: OLD_PREFIX,
                replacement: NEW_PREFIX
              }
            }
          }
        }
      ]
    );

    console.log('✅ Actualización terminada:');
    console.log('   matchedCount:   ', result.matchedCount);
    console.log('   modifiedCount:  ', result.modifiedCount);

    await mongoose.disconnect();
    console.log('🔌 MongoDB desconectado. Listo.');
  } catch (err) {
    console.error('💥 Error en el script:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

run();

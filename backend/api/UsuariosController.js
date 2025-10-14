import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import Usuario from '../models/Usuarios.js';
import Podcast from '../models/Podcast.js'; // asegúrate de importar el modelo
import Show from '../models/Show.js'; // asegúrate de importar el modelo
import Noticia from '../models/Noticias.js'; // asegúrate de importar el modelo
import VerificationCode from '../models/VerificationCode.js';
import nodemailer from 'nodemailer';
import Category from '../models/Categorias.js';
import mongoose from 'mongoose';

dotenv.config();

class UsuariosController {

async updateUserCategories(req, res) {
    try {
      const { id } = req.params;
      const { categories } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Falta el ID del usuario.' });
      }

      if (!Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({ error: 'Las categorías deben ser un array no vacío de IDs.' });
      }

      // Validar que todos los IDs de categorías existan
      const validCategories = await Category.find({ _id: { $in: categories.map(cat => new mongoose.Types.ObjectId(cat)) } });
      if (validCategories.length !== categories.length) {
        return res.status(400).json({ error: 'Una o más categorías no existen.' });
      }

      const user = await Usuario.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      // Actualizar las categorías (sobrescribir el array existente)
      user.categories = categories.map(cat => new mongoose.Types.ObjectId(cat));

      await user.save();

      res.status(200).json(user);
    } catch (err) {
      console.error('Error al actualizar categorías:', err);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }

async setLastPlayed(req, res) {
    try {
      const userId = req.user?._id || req.params.userId;
      console.log("usuario", userId);
      if (!userId) {
        return res.status(400).json({ error: 'userId no encontrado en el token o los parámetros' });
      }

      const { podcastId, episodeId, position = 0, isPaused = true } = req.body || {};
      if (!podcastId || !episodeId) {
        return res.status(400).json({ error: 'podcastId y episodeId son obligatorios' });
      }

      const update = {
        lastPlayedEpisode: {
          podcastId,
          episodeId,
          position,
          isPaused,
          playedAt: new Date()
        }
      };

      await Usuario.findByIdAndUpdate(userId, { $set: update }, { new: true });

      return res.status(204).send(); // Nada que devolver, solo confirmamos
    } catch (err) {
      console.error('setLastPlayed error:', err);
      return res.status(500).json({ error: 'Error al guardar el último episodio reproducido' });
    }
  }
 async getLastPlayed(req, res) {
    try {
      const userId = req.user?._id || req.params.userId;
      if (!userId) {
        return res.status(400).json({ error: 'userId no encontrado en el token o los parámetros' });
      }

      const user = await Usuario.findById(userId)
        .select('lastPlayedEpisode')
        .lean();

      if (!user?.lastPlayedEpisode?.episodeId || !user.lastPlayedEpisode.podcastId) {
        // 204: no hay contenido, así puedes decidir no mostrar reproductor
        return res.status(204).send();
      }

      const { podcastId, episodeId, position = 0, isPaused = true, playedAt } = user.lastPlayedEpisode;

      const podcast = await Podcast.findById(podcastId)
        .select(`
          title coverImage author authorName
          episodes._id episodes.title episodes.description episodes.audioUrl
          episodes.image episodes.duration episodes.releaseDate
        `)
        .lean();

      if (!podcast) {
        return res.status(404).json({ error: 'Podcast no encontrado' });
      }

      const episode = podcast.episodes?.find(e => e._id.toString() === episodeId.toString());
      if (!episode) {
        return res.status(404).json({ error: 'Episodio no encontrado en el podcast' });
      }

      return res.json({
        podcast: {
          _id: podcast._id,
          title: podcast.title,
          coverImage: podcast.coverImage,
          author: podcast.author,
          authorName: podcast.authorName
        },
        episode,
        playerState: {
          position,
          isPaused,
          playedAt
        }
      });
    } catch (err) {
      console.error('getLastPlayed error:', err);
      return res.status(500).json({ error: 'Error al obtener el último episodio reproducido' });
    }
  }
async updateUserProfile(req, res) {
  try {
    const { id } = req.params;
    const { name, shortDescription } = req.body;

    console.log(req.body)
    if (!id) {
      return res.status(400).json({ error: 'Falta el ID del usuario.' });
    }

    const user = await Usuario.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Actualizar solo los campos permitidos (nombre y descripción, no email)
    if (name) user.name = name;
    if (shortDescription !== undefined) user.shortDescription = shortDescription;

    await user.save();

    res.status(200).json(user);
  } catch (err) {
    console.error('Error al actualizar perfil:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
async deleteUserAccount(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Falta el ID del usuario.' });
    }

    const user = await Usuario.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.status(200).json({ message: 'Cuenta eliminada exitosamente.' });
  } catch (err) {
    console.error('Error al eliminar cuenta:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
async getUserBack(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Falta el ID del usuario.' });
    }

    const user = await Usuario.findById(id).select('-password'); // Excluir la contraseña por seguridad

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async getAll(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Falta el ID del usuario.' });
    }

    const user = await Usuario.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const favoritos = user.favorites;

    const noticias = [];
    const podcasts = [];
    const episodios = [];

    for (const fav of favoritos) {
      const id = fav.contentId;
      const tipo = fav.contentType;

      if (tipo === 'Noticia') {
        const noticia = await Noticia.findById(id).select('_id title meta.image categories');
        if (noticia) noticias.push(noticia);
      } else if (tipo === 'Podcast') {
        const podcast = await Podcast.findById(id).select('_id title coverImage categories');
        if (podcast) podcasts.push(podcast);
      } else if (tipo === 'Episodio') {
        // Buscar el podcast que contiene ese episodio
        const podcast = await Podcast.findOne(
          { 'episodes._id': id },
          {
            _id: 1,
            title: 1,
            coverImage: 1,
            categories: 1,
            episodes: { $elemMatch: { _id: id } },
          }
        ).populate('categories', 'name slug color');

        if (podcast && podcast.episodes.length > 0) {
          const episode = podcast.episodes[0];

          episodios.push({
            _id: episode._id,
            title: episode.title,
            description: episode.description,
            audioUrl: episode.audioUrl,
            image: episode.image,
            duration: episode.duration,
            releaseDate: episode.releaseDate,
            podcastId: podcast._id,
            podcastTitle: podcast.title,
            podcastCoverImage: podcast.coverImage,
            categories: podcast.categories,
          });
        }
      }
    }

    console.log("Episodios", episodios);
    res.status(200).json({
      noticias,
      podcasts,
      episodios
    });

  } catch (err) {
    console.error('Error al obtener favoritos:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}



async getAllByCategory(req, res) {
  try {
    const categoria = decodeURIComponent(req.params.category); // por si hay tildes o espacios

    // Búsqueda en cada colección
    const podcasts = await Podcast.find({ categories: categoria });
    const shows = await Show.find({ categories: categoria });
    const noticias = await Noticia.find({ categories: categoria });

    // Devolver todo junto
    return res.status(200).json({
      podcasts,
      shows,
      noticias
    });
  } catch (error) {
    console.error('Error al obtener contenidos por categoría:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
async getFavorites(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Falta el ID del usuario.' });
    }

    const user = await Usuario.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const favoritos = user.favorites;

    const noticias = [];
    const podcastsMap = new Map();
    const episodios = [];

    for (const fav of favoritos) {
      const id = fav.contentId;
      const tipo = fav.contentType;

      if (tipo === 'Noticia') {
        const noticia = await Noticia.findById(id).select('_id title meta.image categories').populate('categories', '_id name slug image color');
        if (noticia) noticias.push(noticia);
      } else if (tipo === 'Podcast') {
        const podcast = await Podcast.findById(id).select('_id title coverImage categories').populate('categories', '_id name slug image color');
        if (podcast) podcastsMap.set(podcast._id.toString(), podcast);
      } else if (tipo === 'Episodio') {
        const podcast = await Podcast.findOne({ 'episodes._id': id }).select('_id title coverImage categories').populate('categories', '_id name slug image color');
        if (podcast && !podcastsMap.has(podcast._id.toString())) {
          podcastsMap.set(podcast._id.toString(), podcast);
        }

        // Si quieres seguir devolviendo los episodios como lista
        const podWithEp = await Podcast.findOne({ 'episodes._id': id }, { 'episodes.$': 1 }).populate('categories', '_id name slug image color');
        if (podWithEp?.episodes?.[0]) {
          const ep = podWithEp.episodes[0].toObject();
          ep.podcastId = podWithEp._id;
          episodios.push(ep);
        }
      }
    }

    const podcasts = Array.from(podcastsMap.values());

    console.log("prueba",podcasts);
    res.status(200).json({
      noticias,
      podcasts,
      episodios
    });

  } catch (err) {
    console.error('Error al obtener favoritos:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}



// controllers/user.controller.js

 async checkFavorite(req, res) {
  try {
    const { noticia, Tipo, IdUsuario } = req.body;

    console.log(req.body)

    if (!noticia || !Tipo || !IdUsuario) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const user = await Usuario.findById(IdUsuario);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isFav = user.favorites.some(fav =>
      fav.contentId.toString() === noticia && fav.contentType === Tipo
    );

    return res.status(200).json({ isFavorite: isFav });
  } catch (err) {
    console.error('Error al verificar favorito:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}


async  addToFavorite(req, res) {
  try {
    const { noticia, Tipo, IdUsuario } = req.body;

    if (!noticia || !Tipo || !IdUsuario) {
      return res.status(400).json({ error: 'Faltan datos requeridos.' });
    }

    const user = await Usuario.findById(IdUsuario);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Verificar si ya existe ese favorito
    const yaExiste = user.favorites.some(fav =>
      fav.contentId.toString() === noticia &&
      fav.contentType === Tipo
    );

    if (yaExiste) {
      return res.status(409).json({ message: 'Ya está en favoritos.' });
    }

    // Agregar nuevo favorito
    user.favorites.push({
      contentId: noticia,
      contentType: Tipo
    });

    await user.save();

    res.status(200).json({ message: 'Agregado a favoritos con éxito.' });
  } catch (error) {
    console.error('Error al agregar favorito:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}


// controllers/user.controller.js

async removeFromFavorites(req, res) {
  try {
    const { noticia, Tipo, IdUsuario } = req.body;

    if (!noticia || !Tipo || !IdUsuario) {
      return res.status(400).json({ error: 'Faltan datos requeridos.' });
    }

    const user = await Usuario.findById(IdUsuario);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Filtrar y eliminar el favorito correspondiente
    const favoritosOriginales = user.favorites.length;
    user.favorites = user.favorites.filter(fav =>
      !(fav.contentId.toString() === noticia && fav.contentType === Tipo)
    );

    if (user.favorites.length === favoritosOriginales) {
      return res.status(404).json({ message: 'El favorito no fue encontrado.' });
    }

    await user.save();

    res.status(200).json({ message: 'Favorito eliminado con éxito.' });
  } catch (error) {
    console.error('Error al eliminar favorito:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}



// PATCH /api/usuarios/update-language
async UpdateLanguagee(req, res) {
  try {
    
    const userId = req.body.providerId; // asegúrate de tener el userId autenticado
    const { language } = req.body;

    // Validar el idioma permitido
    const allowedLanguages = ['es', 'en', 'pt'];
    if (!allowedLanguages.includes(language)) {
      return res.status(400).json({ message: 'Idioma no soportado' });
    }

    // Actualizar el idioma del usuario
    const updatedUser = await Usuario.findByIdAndUpdate(
      userId,
      { language },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Idioma actualizado', language: updatedUser.language });
  } catch (error) {
    console.error('Error al actualizar el idioma:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

async postIdiomaUsuario(req, res) {
  try {
    const { providerId, language } = req.body;

    // Validar que los datos requeridos estén presentes
    if (!providerId || !language) {
      return res.status(400).json({ message: 'providerId y language son requeridos' });
    }

    // Validar que el idioma esté en los valores permitidos
    const validLanguages = ['es', 'en', 'fr', 'pt'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ message: 'Idioma no válido' });
    }

    // Buscar y actualizar el usuario
    const updatedUser = await Usuario.findOneAndUpdate(
      { providerId }, // Condición para encontrar al usuario
      { language },   // Actualizar solo el campo language
      { new: true, runValidators: true } // Retornar el documento actualizado y validar
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.status(200).json({ message: 'Idioma actualizado exitosamente', user: updatedUser });
  } catch (error) {
    console.error('Error al actualizar el idioma:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
}


 async resetPassword(req, res) {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, código y nueva contraseña son requeridos.' });
    }

    try {
      // 1) Obtener registro de código
      const registro = await VerificationCode.findOne({ email });
      if (!registro || registro.code !== code) {
        return res.status(400).json({ message: 'Código inválido.' });
      }
      if (registro.expiresAt < new Date()) {
        return res.status(410).json({ message: 'Código expirado.' });
      }

      // 2) Buscar usuario y actualizar la contraseña
      const user = await Usuario.findOne({ email, provider: 'email' });
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      // 3) Hashear la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

      await user.save();

      // 4) Eliminar el código (opcional)
      await VerificationCode.deleteOne({ email });

      return res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
      console.error('Error en resetPassword:', err);
      return res.status(500).json({ message: 'Error del servidor.' });
    }
  }


  async postNuevoUsuario(req, res) {
    try {
      const {
        name,
        email,
        password,
        gender,
        country,
        provider,
        providerId,
        avatar = '',
        categories = [],
        language = 'es'
      } = req.body;

      // Si el proveedor es 'email', usamos el email como providerId
      const finalProviderId = provider === 'email' ? email : providerId;

      // Validación básica
      if (!name || !email || !password || !gender || !country) {
        return res.status(400).json({ message: 'Faltan campos requeridos.' });
      }

      // Verificar si ya existe por email o providerId
      const usuarioExistente = await Usuario.findOne({
        $or: [
          { email },
          ...(finalProviderId ? [{ providerId: finalProviderId }] : [])
        ]
      });

      if (usuarioExistente) {
        return res.status(409).json({ message: 'Ya existe un usuario con ese email o providerId.' });
      }

      // Encriptar contraseña si es registro clásico
      let hashedPassword = '';
      if (provider === 'email') {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
      }

      const nuevoUsuario = new Usuario({
        name,
        email,
        password: hashedPassword,
        gender,
        country,
        provider,
        providerId: finalProviderId,
        avatar,
        categories,
        language,
        createdAt: new Date()
      });

      await nuevoUsuario.save();

      return res.status(201).json({
        message: 'Usuario registrado exitosamente.',
        usuario: {
          _id: nuevoUsuario._id,
          name: nuevoUsuario.name,
          email: nuevoUsuario.email
        }
      });

    } catch (error) {
      console.error('Error al registrar usuario:', error);
      return res.status(500).json({ message: 'Error del servidor.' });
    }
  }

  
 async enviarCodigo(req, res) {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email requerido' });

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

  try {
    await VerificationCode.findOneAndUpdate(
      { email },
      { code: codigo, expiresAt },
      { upsert: true, new: true }
    );

    // CONFIGURA TU TRANSPORT CON CREDENCIALES REALES
    /*
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS
      }
    });
    */
    const transporter = nodemailer.createTransport({
        host: 'smtp.mailgun.org',
        port: 465,
        secure:true,
        auth: {
              user: process.env.EMAIL_FROM,
              pass: process.env.EMAIL_PASS
        }

      });

    await transporter.sendMail({
      from: `"Tu App" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Código de verificación',
      html: `<p>Tu código de verificación es: <b>${codigo}</b></p>`
    });

    res.json({ message: 'Código enviado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al enviar código' });
  }
}


 async verificarCodigo(req, res) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: 'Email y código requeridos' });
  }

  try {
    const registro = await VerificationCode.findOne({ email });

    if (!registro || registro.code !== code) {
      return res.status(400).json({ message: 'Código inválido' });
    }

    if (registro.expiresAt < new Date()) {
      return res.status(410).json({ message: 'Código expirado' });
    }

    // Opcional: eliminar después de validar
    await VerificationCode.deleteOne({ email });

    res.json({ message: 'Código verificado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al verificar código' });
  }
}




async saveDeviceToken(req, res) {
    const { token, platform } = req.body;
    const userId = req.user.id; // Asumiendo middleware de auth con JWT que pone req.user

    if (!token || !platform) {
      return res.status(400).json({ message: 'Token y platform requeridos.' });
    }

    try {
      const user = await Usuario.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      // Evitar duplicados
      const exists = user.deviceTokens.some(dt => dt.token === token && dt.platform === platform);
      if (!exists) {
        user.deviceTokens.push({ token, platform });
        await user.save();
      }

      return res.json({ message: 'Token guardado exitosamente.' });
    } catch (err) {
      console.error('Error al guardar token:', err);
      return res.status(500).json({ message: 'Error del servidor.' });
    }
  }

  async sendPushNotification(req, res) {
    const { userId, title, body } = req.body; // Para enviar a un usuario específico; ajusta para grupos/todos

    if (!userId || !title || !body) {
      return res.status(400).json({ message: 'userId, title y body requeridos.' });
    }

    try {
      const user = await Usuario.findById(userId);
      if (!user || !user.deviceTokens.length) {
        return res.status(404).json({ message: 'Usuario o tokens no encontrados.' });
      }

      // Configura APN Provider (usa .p8 key de Apple Developer)
      const apnProvider = new apn.Provider({
        token: {
          key: process.env.APN_KEY, // Contenido de tu archivo .p8 (base64 o raw)
          keyId: process.env.APN_KEY_ID, // Tu Key ID de Apple
          teamId: process.env.APN_TEAM_ID // Tu Team ID de Apple
        },
        production: false // false para development/sandbox
      });

      const notification = new apn.Notification({
        title,
        body,
        topic: 'tu.bundle.id' // Bundle ID de tu app (ej. io.ionic.starter)
      });

      // Envía a todos los tokens iOS del usuario
      const iosTokens = user.deviceTokens.filter(dt => dt.platform === 'ios').map(dt => dt.token);
      if (iosTokens.length) {
        const responses = await apnProvider.send(notification, iosTokens);
        console.log('Respuestas APNs:', responses);
      }

      // Cierra el provider (opcional, pero bueno para no mantener conexiones)
      apnProvider.shutdown();

      return res.json({ message: 'Notificación enviada.' });
    } catch (err) {
      console.error('Error al enviar notificación:', err);
      return res.status(500).json({ message: 'Error del servidor.' });
    }
  }

}

const usuariosController = new UsuariosController();
export default usuariosController;

/*

async getFavorites(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Falta el ID del usuario.' });
    }

    const user = await Usuario.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const favoritos = user.favorites;

    const noticias = [];
    const podcasts = [];
    const episodios = [];

    for (const fav of favoritos) {
      const id = fav.contentId;
      const tipo = fav.contentType;

      if (tipo === 'Noticia') {
        const noticia = await Noticia.findById(id).select('_id title meta.image categories');
        if (noticia) noticias.push(noticia);
      } else if (tipo === 'Podcast') {
        const podcast = await Podcast.findById(id).select('_id title coverImage categories');
        if (podcast) podcasts.push(podcast);
      } else if (tipo === 'Episodio') {
        const podcast = await Podcast.findOne(
          { 'episodes._id': id },
          {
            _id: 1,
            title: 1,
            coverImage: 1,
            categories: 1,
            episodes: { $elemMatch: { _id: id } },
          }
        ).populate('categories', 'name slug color');

        if (podcast && podcast.episodes.length > 0) {
          const episode = podcast.episodes[0];

          episodios.push({
            _id: episode._id,
            title: episode.title,
            description: episode.description,
            audioUrl: episode.audioUrl,
            image: episode.image,
            duration: episode.duration,
            releaseDate: episode.releaseDate,
            podcastId: podcast._id,
            podcastTitle: podcast.title,
            podcastCoverImage: podcast.coverImage,
            categories: podcast.categories,
          });
        }
      }
    }

    res.status(200).json({
      noticias,
      podcasts,
      episodios
    });

  } catch (err) {
    console.error('Error al obtener favoritos:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
*/

import { fileURLToPath } from 'url';
import multer from 'multer';
import path from 'path';
import MainController from './MainController.js';
import SpotifyController from './SpotifyController.js';
import NoticiasController from './NoticiasController.js'
import UsuariosController from './UsuariosController.js'
import AuthController from './AuthController.js';
import streamingController from './StreamingController.js'
import RadioController from './RadioController.js';
import CategoriasController from './CategoriasController.js';
import PodcastController from './PodcastController.js';
import PodcastControllerPC from './PodcastControllerPC.js';
import CalendarioControllerPC from './CalendarioControllerPC.js';
import SmartLinkController from './SmartLinkController.js';
import CalendarioController from './CalendarioController.js';
import TaquicardiaController from './TaquiController.js';
import MuxController from './MuxController.js';
import Noticia from '../models/Noticias.js'; // ajusta el path
import UserAdminController from './UsuarioAdminController.js'
import dotenv from 'dotenv';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem'; // Cambia require a import
import Usuario from '../models/Usuarios.js';
import { OAuth2Client } from 'google-auth-library';
import admin from './firebase-admin.js';
import { sendNotificationToUser } from './onesignal-service.js';  // Ajusta la ruta si es necesario

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { flexibleChecksumsMiddlewareOptions } from '@aws-sdk/middleware-flexible-checksums';
import crypto from 'crypto';
import { verifyToken, requireRole } from '../authAdmin.js';

dotenv.config();

const CLIENT_ID = '839716319068-kvfo69vbtp239991itvmr367cb9fprkv.apps.googleusercontent.com'; // Your web client ID
const { APPLE_TEAM_ID, APPLE_CLIENT_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, JWT_SECRET } = process.env;
const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'images'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  requestChecksumCalculation: 'NEVER'  // Deshabilita checksums automáticos para PutObject y similares
});
// ⚠️ Quita checksums para que S3 no exija x-amz-checksum-*
s3.middlewareStack.remove(flexibleChecksumsMiddlewareOptions.name);

// Helpers
function sanitizeFilename(name = 'file') {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function yyyymmddParts(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return { y, m, dd };
}

// Limpia el nombre del archivo
function sanitize(name = '') {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return base.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').toLowerCase();
}

export default class MainRoute {
  static configRoutes(router) {
    // ✅ Usa rutas bien formadas
    router.route('/').get(MainController.apiGetTests);


    //login
    router.route('/login').post(AuthController.login);


    
    router.route('/search').get(SpotifyController.apiSearchPodcast);
    router.route('/podcast').post(SpotifyController.savePodcast);
    router.route('/podcasts').get(SpotifyController.getAllPodcasts);
    router.route('/podcastIndividual').post(SpotifyController.getPodcastDespliegue);
    router.post('/showIndividual',SpotifyController.getShowDespliegue.bind(SpotifyController));

    // --- Tus rutas previas (ajústalas si tu prefijo es /aaron/maslatino) ---
    router.get('/podcasts', PodcastController.obtenerPodcasts);
    router.post('/podcasts', PodcastController.crearPodcast);
    router.get('/podcasts/:id', PodcastController.obtenerPodcastPorId);
    router.put('/podcasts/:id', PodcastController.actualizarPodcast);
    router.delete('/podcasts/:id', PodcastController.eliminarPodcast);

    // Episodios embebidos
    router.post('/podcasts/:id/episodios', PodcastController.agregarEpisodio);
    router.put('/podcasts/:id/episodios/:episodioId', PodcastController.editarEpisodio);
    router.delete('/podcasts/:id/episodios/:episodioId', PodcastController.eliminarEpisodio);

    // BÚSQUEDAS UTILITARIAS QUE YA USABAS
    router.get('/podcasts/categoria/:name', PodcastController.obtenerPodcastsPorNombreCategoria);
    router.get('/podcasts/categoria-id/:id', PodcastController.obtenerPodcastsPorCategoriaId);
    router.get('/podcast/por-episodio/:id', PodcastController.getPodcastByEpisodeId);

    // --- (Opcional) Mux: si MÁS ADELANTE quieres Direct Upload + Webhooks/JWT ---
    router.post('/maslatino/mux/uploads', MuxController.createDirectUpload);
    router.post('/maslatino/mux/webhooks', MuxController.webhook);
    router.get('/maslatino/mux/playback/:playbackId/token', MuxController.getSignedPlaybackToken);

    // Estado Mux por episodio (para polling si lo usas)
    router.get('/maslatino/mux/episodes/:podcastId/:episodeId/mux', MuxController.getEpisodeMuxStatus);









    
    router.route('/shows').get(SpotifyController.getShowsAndEpisodes);

    //noticias
    //router.route('/noticiasGet').get(NoticiasController.getAllNoticias);
    router.route('/noticiasPost').post(NoticiasController.createNoticia);
    router.route('/getNoticias').get(NoticiasController.getAllNoticias);
    router.route('/getNoticiasInicio').post(NoticiasController.getNoticiaCategorias);
    router.route('/noticias/recientes').get(NoticiasController.getNoticiasRecientes);
    router.route('/noticias/recomendadas').get(NoticiasController.getNoticiasRecomendadas);

    router.get('/noticias/archivo/:anio/:mes', NoticiasController.getNoticiasByArchive);
    router.get('/noticias/categoria/:slug', NoticiasController.getNoticiasByCategory);
    router.get('/archivos', NoticiasController.getArchivos);
    router.get('/categorias', NoticiasController.getCategorias);
    
    router.route('/por-categorias-relevantes/:userId').get(NoticiasController.getNoticiasUsuario);


    router.route('/getNoticiaDespliegue').post(NoticiasController.getNoticiaDespliegue);
    router.route('/noticia/:id').get(NoticiasController.getNoticiaById);
    router.get('/noticia/slug/:slug', NoticiasController.getNoticiaBySlug);
    router.put('/noticia/:id', NoticiasController.updateNoticia);
    router.delete('/noticia/:id', NoticiasController.deleteNoticia);
    router.patch('/noticia/:id/autorizar', NoticiasController.toggleAutorizarNoticia);
    router.get('/noticias/paginadas', NoticiasController.getNoticiasPaginadas);

    
    
    
    router.route('/registrarUsuario').post(UsuariosController.postNuevoUsuario);
    router.route('/IdiomaUsuarioInicio').put(UsuariosController.postIdiomaUsuario);
    router.route('/enviar-codigo').post(UsuariosController.enviarCodigo);
    router.route('/verificar-codigo').post(UsuariosController.verificarCodigo);
    router.route('/reset-password').post(UsuariosController.resetPassword);


    //UserAdminController

router
  .route('/admin/login')
  .post(UserAdminController.login);

// CRUD de usuarios del panel (solo Administrador puede hacer cambios)
router
  .route('/admin/usuarios')
  .post(
    verifyToken,
    requireRole(['Administrador']),
    UserAdminController.crearUsuario
  )
  .get(
    verifyToken,
    requireRole(['Administrador']),
    UserAdminController.listarUsuarios
  );

router
  .route('/admin/usuarios/:id')
  .get(
    verifyToken,
    requireRole(['Administrador']),
    UserAdminController.obtenerUsuario
  )
  .put(
    verifyToken,
    requireRole(['Administrador']),
    UserAdminController.actualizarUsuario
  )
  .delete(
    verifyToken,
    requireRole(['Administrador']),
    UserAdminController.eliminarUsuario
  );

    router.post('/apple-login', async (req, res) => {
  console.log('Solicitud recibida en /apple-login:', req.body);
  const { id_token } = req.body;
  try {
    if (!id_token) {
      console.log('No id_token proporcionado');
      return res.status(400).json({ message: 'No id_token proporcionado' });
    }

    // Obtén claves públicas de Apple
    const { data: appleKeys } = await axios.get('https://appleid.apple.com/auth/keys');
    console.log('Claves públicas obtenidas:', appleKeys);
    const header = jwt.decode(id_token, { complete: true });
    if (!header) {
      console.log('No se pudo decodificar el id_token');
      return res.status(400).json({ message: 'id_token inválido' });
    }
    const appleKey = appleKeys.keys.find(key => key.kid === header.header.kid);
    if (!appleKey) {
      console.log('Clave Apple no encontrada para kid:', header.header.kid);
      return res.status(400).json({ message: 'Clave Apple no encontrada' });
    }

    // Convierte clave pública a PEM
    const pubKey = jwkToPem(appleKey);
    console.log('Clave pública generada:', pubKey);

    // Verifica el token
    const decoded = jwt.verify(id_token, pubKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: process.env.APPLE_CLIENT_ID,
    });
    console.log('Token decodificado:', decoded);

    // Busca o crea usuario
    let user = await Usuario.findOne({ provider: 'apple', providerId: decoded.sub });
    if (!user) {
      user = new Usuario({
        provider: 'apple',
        providerId: decoded.sub,
        email: decoded.email || null,
        name: decoded.name ? `${decoded.name.firstName || ''} ${decoded.name.lastName || ''}`.trim() : null,
        verified: true,
        language: 'es',
        createdAt: new Date(),
      });
      await user.save();
      console.log('Usuario creado:', user);
    } else {
      console.log('Usuario encontrado:', user);
    }

    // Genera token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('Token JWT generado:', token);

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        language: user.language,
        categories: user.categories,
      },
    });
  } catch (error) {
    console.error('Error en Apple login:', error.message, error.stack);
    res.status(500).json({ message: 'Error en autenticación con Apple', error: error.message });
  }
});


router.post('/google-login', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ message: 'No id_token proporcionado' });

  try {
    const client = new OAuth2Client(CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: CLIENT_ID,  // Expected aud; add array [CLIENT_ID, androidClientId] if testing alternatives
    });
    const payload = ticket.getPayload();  // This is your decodedToken equivalent
    const uid = payload.sub;  // Google's unique user ID (sub)
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    let user = await Usuario.findOne({ provider: 'google', providerId: uid });
    if (!user) {
      user = new Usuario({
        provider: 'google',
        providerId: uid,
        email: email || null,
        name: name || null,
        avatar: picture || null,
        language: 'es',
        createdAt: new Date(),
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        language: user.language,
        categories: user.categories,
      },
    });
  } catch (error) {
    console.error('Error en Google login:', error);
    res.status(500).json({ message: 'Error en autenticación con Google', error: error.message });
  }
});
    router.post('/save-device-token', async (req, res) => {
      const { token, platform } = req.body;
      const authToken = req.headers.authorization?.split(' ')[1];
      if (!authToken) return res.status(401).json({ message: 'No autenticado' });

      try {
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        const user = await Usuario.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        if (!user.deviceTokens.some(dt => dt.token === token)) {
          user.deviceTokens.push({ token, platform });
          await user.save();
          console.log(`Token registrado para user ${user._id}: ${token} (${platform})`);
        }

        res.json({ message: 'Token registrado' });
      } catch (error) {
        console.error('Error al registrar token:', error);
        res.status(500).json({ message: 'Error al registrar token' });
      }
    });

    router.post('/test-notification', async (req, res) => {
      const { userId, message } = req.body;  // Envía estos en el body desde Postman o similar
      try {
        await sendNotificationToUser(userId, message, { route: '/home' });  // Ejemplo con data.route
        res.json({ message: 'Notificación enviada' });
      } catch (error) {
        res.status(500).json({ message: 'Error enviando notificación', error: error.message });
      }
    });
    router.route('/update-language').put(UsuariosController.UpdateLanguagee);
    router.route('/add-favorites').put(UsuariosController.addToFavorite);
    router.post('/usuarios/:userId/last-played', UsuariosController.setLastPlayed);
    router.get('/usuarios/:userId/last-played', UsuariosController.getLastPlayed);




    router.route('/remove-favorites').put(UsuariosController.removeFromFavorites);
    router.route('/check-favorite').post(UsuariosController.checkFavorite);
    router.route('/get-favorites/:userId').get(UsuariosController.getFavorites);
    router.route('/get-by-category/:category').get(UsuariosController.getAllByCategory);
    router.route('/get-user/:id').get(UsuariosController.getUserBack);
    router.route('/update-user-info/:id').put(UsuariosController.updateUserProfile);
    router.route('/delete-user/:id').delete(UsuariosController.deleteUserAccount);
    router.route('/update-user-categories/:id').put(UsuariosController.updateUserCategories);

    


    router.route('/crear-stream').post(streamingController.apiCrearStreams);
    router.route('/get-stream/:id').get(streamingController.apiGetStreams);
    //Stream
   
    //
    router.post('/radioPost', RadioController.guardarRadios);
    router.get('/radios', RadioController.obtenerRadios);
    router.get('/radios/:id', RadioController.obtenerRadioPorId);

    //categorias
    router.post('/categoriaPost', CategoriasController.crearCategoria);
    router.get('/categorias', CategoriasController.obtenerCategorias);
    router.get('/taquicardia', TaquicardiaController.live);

    
    router.get('/categorias/:id', CategoriasController.obtenerCategoriaPorId);
    router.post('/categorias/by-ids', CategoriasController.obtenerCategoriasPorIds); // Add this
    router.put('/categorias/:id', CategoriasController.actualizarCategoria);
    router.delete('/categorias/:id', CategoriasController.eliminarCategoria);
    router.get('/categoriasUsuario/:id',CategoriasController.obtenerCategoriasUsuario);
    router.delete('/categoriasUsuarioDelete/:userId/:id', CategoriasController.categoriasUsuarioDelete);

    // Obtener noticias por ID de categoría
    router.get('/noticias/categoria/:id', NoticiasController.obtenerNoticiasPorCategoriaId);

    // Obtener podcasts por ID de categoría
    router.get('/podcasts/categoria/:id', PodcastController.obtenerPodcastsPorCategoriaId);

    router.post('/podcasts', PodcastController.crearPodcast);
    router.get('/podcasts', PodcastController.obtenerPodcasts);
    router.get('/podcasts/:id', PodcastController.obtenerPodcastPorId);
    router.put('/podcasts/:id', PodcastController.actualizarPodcast);
    router.delete('/podcasts/:id', PodcastController.eliminarPodcast);
    router.get('/podcasts/by-category-name/:name', PodcastController.obtenerPodcastsPorNombreCategoria);
    router.get('/podcasts/episode/:id', PodcastController.getPodcastByEpisodeId);
    router.post('/podcasts/:id/episodios', PodcastController.agregarEpisodio);
    router.put('/podcasts/:id/episodios/:episodioId', PodcastController.editarEpisodio);
    router.delete('/podcasts/:id/episodios/:episodioId', PodcastController.eliminarEpisodio);

    

    // CRUD
    // ✅ Primero las rutas específicas
    router.get('/podcasts-pc/home', PodcastControllerPC.obtenerPodcastsHome);
    router.get('/podcasts-pc/by-category-name/:name', PodcastControllerPC.obtenerPodcastsPorNombreCategoria);

    // CRUD
    router.post('/podcasts-pc', PodcastControllerPC.crearPodcast);
    router.get('/podcasts-pc', PodcastControllerPC.obtenerPodcasts);

    // ✅ Ruta paramétrica al final y con validación de ObjectId por regex
    router.get('/podcasts-pc/:id([0-9a-fA-F]{24})', PodcastControllerPC.obtenerPodcastPorId);
    router.put('/podcasts-pc/:id([0-9a-fA-F]{24})', PodcastControllerPC.actualizarPodcast);
    router.delete('/podcasts-pc/:id([0-9a-fA-F]{24})', PodcastControllerPC.eliminarPodcast);

    // Episodios (también valida el :id)
    router.post('/podcasts-pc/:id([0-9a-fA-F]{24})/episodios', PodcastControllerPC.agregarEpisodio);
    router.put('/podcasts-pc/:id([0-9a-fA-F]{24})/episodios/:episodioId([0-9a-fA-F]{24})', PodcastControllerPC.editarEpisodio);
    router.delete('/podcasts-pc/:id([0-9a-fA-F]{24})/episodios/:episodioId([0-9a-fA-F]{24})', PodcastControllerPC.eliminarEpisodio);




        // CRUD + listados
    router.post('/calendar', /*auth,*/ CalendarioController.crearItem);
    router.get('/calendar', CalendarioController.listar);
    router.get('/calendar/upcoming', CalendarioController.listarProximos);
    router.get('/calendar/past', CalendarioController.listarPasados);
    router.get('/calendar/stats', /*auth,*/ CalendarioController.stats);

    router.get('/calendar/by-category-name/:name', CalendarioController.obtenerPorNombreCategoria);

    router.get('/calendar/slug/:slug', CalendarioController.obtenerPorSlug);
    router.get('/calendar/:id', CalendarioController.obtenerPorId);

    router.put('/calendar/:id', /*auth,*/ CalendarioController.actualizarItem);
    router.patch('/calendar/:id/publish', /*auth,*/ CalendarioController.publicarItem);
    router.patch('/calendar/:id/archive', /*auth,*/ CalendarioController.archivarItem);
    router.patch('/calendar/:id/featured', /*auth,*/ CalendarioController.toggleDestacado);

    router.delete('/calendar/:id', /*auth,*/ CalendarioController.eliminarItem);

    // Bulk ops opcionales
    router.patch('/calendar/bulk/publish', /*auth,*/ CalendarioController.publicarBulk);
    router.delete('/calendar/bulk', /*auth,*/ CalendarioController.eliminarBulk);

    // OBLIGATORIO: primero rutas fijas, luego las con :id
    router.post('/calendar-pc', CalendarioControllerPC.crearItem);
    router.get('/calendar-pc', CalendarioControllerPC.obtenerItems);
    router.get('/calendar-pc/home', CalendarioControllerPC.obtenerDestacadosHome);
    router.get('/calendar-pc/by-category-name/:name', CalendarioControllerPC.obtenerPorNombreCategoria);

    // valida que el id sea un ObjectId
    router.get('/calendar-pc/:id([0-9a-fA-F]{24})', CalendarioControllerPC.obtenerItemPorId);
    router.put('/calendar-pc/:id([0-9a-fA-F]{24})', CalendarioControllerPC.actualizarItem);
    router.delete('/calendar-pc/:id([0-9a-fA-F]{24})', CalendarioControllerPC.eliminarItem);

    router.get('/share/podcast/:podcastId/episode/:episodeId', SmartLinkController.redirectPodcastLink);

    router.post('/sign-upload', async (req, res) => {
      try {
        const { filename = 'archivo', contentType = 'application/octet-stream', approxSize = 0 } = req.body || {};
        console.log('Signing with ContentType:', contentType);
 

        // (opcional) límite por tamaño
        const maxMB = Number(process.env.MAX_UPLOAD_MB || 10);
        if (approxSize > maxMB * 1024 * 1024) {
          return res.status(400).json({ error: `Archivo > ${maxMB} MB` });
        }

        const safe = sanitizeFilename(filename);
        const { y, m, dd } = yyyymmddParts(new Date());
        const prefix = process.env.UPLOAD_PREFIX || 'uploads';
        // Ejemplo de estructura: uploads/2025/11/04/ts-8hex-nombre.ext
        const rand = Math.random().toString(16).slice(2, 10);
        const key = `${prefix}/${y}/${m}/${dd}/${Date.now()}-${rand}-${safe}`;

        const putCmd = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          ContentType: contentType
          // ACL: 'public-read'  // solo si tu bucket **no** usa Bucket owner enforced
        });

        // Firma válida unos minutos (sube a 300–600s mientras pruebas)
        const uploadUrl = await getSignedUrl(s3, putCmd, {
          expiresIn: 300,
          signableHeaders: new Set(['content-type'])  // <- Añade esto
        });
        // URL pública (usa CloudFront si lo tienes; si no, S3 directo)
        const region = process.env.AWS_REGION;
        const cdn = process.env.CDN_BASE_URL;
        const publicUrl = cdn
          ? `https://${cdn}/${key}`
          : `https://${process.env.S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;

        return res.json({ uploadUrl, publicUrl, key, contentType });
      } catch (err) {
        console.error('sign-upload error:', err);
        return res.status(500).json({ error: 'No se pudo firmar la subida' });
      }
    });

    return router;
  }
}


// controllers/mux.controller.ts
import dotenv from 'dotenv';
import Mux from '@mux/mux-node';
import Podcast from '../models/Podcast.js';

dotenv.config();

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET
});

// Si usarás playback firmado:
const SIGNING_KEY_ID = process.env.MUX_SIGNING_KEY_ID; // kid
const PRIVATE_KEY_BASE64 = process.env.MUX_PRIVATE_KEY_BASE64; // PKCS8 base64

function getPrivateKeyPem() {
  if (!PRIVATE_KEY_BASE64) return null;
  return Buffer.from(PRIVATE_KEY_BASE64, 'base64').toString('utf8');
}

class MuxController {
  // (B) Crear Direct Upload (si más adelante subes desde front)
  async createDirectUpload(req, res) {
    try {
      const { podcastId, episodeId, kind, playbackPolicy, staticRenditions } = req.body;

      const upload = await mux.video.uploads.create({
        cors_origin: '*',
        new_asset_settings: {
          passthrough: `${podcastId}:${episodeId}`,  // para ubicar episodio en webhook
          playback_policy: [playbackPolicy || 'public'],
          // static renditions si quieres MP4/M4A
          static_renditions: staticRenditions,
        }
      });

      return res.status(201).json({ uploadId: upload.id, url: upload.url });
    } catch (err) {
      console.error('createDirectUpload error:', err);
      return res.status(500).json({ message: 'Error creando Direct Upload', error: err?.message || err });
    }
  }

  // (B) Webhook de Mux para reflejar estado/ids en la DB
  async webhook(req, res) {
    try {
      // ⚠️ IMPORTANTE: valida la firma del webhook en producción
      const { type, data } = req.body || {};

      // Los eventos de interés:
      // - video.asset.created / video.asset.ready / video.asset.errored
      // - video.upload.created / video.upload.cancelled
      // El "passthrough" te dice {podcastId}:{episodeId}
      const passthrough = data?.passthrough || data?.tracks?.[0]?.passthrough || null;
      if (!passthrough) {
        // puede que sea un evento no asociado (ignora)
        return res.sendStatus(200);
      }

      const [podcastId, episodeId] = String(passthrough).split(':');

      const podcast = await Podcast.findById(podcastId);
      if (!podcast) return res.sendStatus(200); // ignora si no lo hallas

      const ep = podcast.episodes.id(episodeId);
      if (!ep) return res.sendStatus(200);

      if (type === 'video.asset.created') {
        ep.mux = {
          ...(ep.mux?.toObject?.() ?? ep.mux ?? {}),
          assetId: data?.id,
          status: 'preparing'
        };
      }

      if (type === 'video.asset.ready') {
        ep.mux = {
          ...(ep.mux?.toObject?.() ?? ep.mux ?? {}),
          assetId: data?.id,
          duration: data?.duration,
          status: 'ready',
          playbackIds: (data?.playback_ids || []).map((p) => ({ id: p.id, policy: p.policy }))
        };
        // Actualiza duración visible en episodio si quieres mantener la copia:
        ep.duration = data?.duration ?? ep.duration;
      }

      if (type === 'video.asset.errored') {
        ep.mux = {
          ...(ep.mux?.toObject?.() ?? ep.mux ?? {}),
          status: 'errored'
        };
      }

      podcast.updatedAt = Date.now();
      await podcast.save();

      return res.sendStatus(200);
    } catch (err) {
      console.error('mux webhook error:', err);
      return res.sendStatus(200); // contesta 200 para no reintentar indefinidamente
    }
  }

  // (B) Si usas playback "signed", generas un token corto
  async getSignedPlaybackToken(req, res) {
    try {
      const playbackId = req.params.playbackId;
      const key = getPrivateKeyPem();
      if (!SIGNING_KEY_ID || !key) {
        return res.status(400).json({ message: 'Signing keys not configured' });
      }

      // JWT válido 15 min
      const jwt = await mux.video.playbackIds.createToken(playbackId, {
        keyId: SIGNING_KEY_ID,
        keySecret: key,
        expiration: Math.floor(Date.now() / 1000) + (15 * 60) // 15 min
      });

      res.json({ token: jwt });
    } catch (err) {
      console.error('signed token error:', err);
      res.status(500).json({ message: 'Error generando token', error: err?.message || err });
    }
  }

  // (B) Polling de estado (si no usas webhooks en dev)
  async getEpisodeMuxStatus(req, res) {
    try {
      const { podcastId, episodeId } = req.params;
      const podcast = await Podcast.findById(podcastId);
      if (!podcast) return res.status(404).json({ message: 'Podcast no encontrado' });

      const ep = podcast.episodes.id(episodeId);
      if (!ep) return res.status(404).json({ message: 'Episodio no encontrado' });

      res.json({ mux: ep.mux || null });
    } catch (err) {
      console.error('getEpisodeMuxStatus error:', err);
      res.status(500).json({ message: 'Error consultando estado', error: err?.message || err });
    }
  }
}

const muxController = new MuxController();
export default muxController;

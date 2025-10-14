import dotenv from 'dotenv';
import Mux from '@mux/mux-node';

dotenv.config();

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET
});

class StreamController {
  async apiCrearStreams(req, res) {
    try {
      const liveStream = await muxClient.video.liveStreams.create({
        playback_policy: ['public'],
        new_asset_settings: { playback_policy: ['public'] }
      });
      res.json(liveStream);
    } catch (err) {
      console.error('Error creando el stream:', err);
      res.status(500).json({ error: 'Error creando el stream' });
    }
  }

  async apiGetStreams(req, res) {
    try {
      const stream = await muxClient.video.liveStreams.get(req.params.id);
      res.json(stream);
    } catch (err) {
      console.error('Stream no encontrado:', err);
      res.status(404).json({ error: 'Stream no encontrado' });
    }
  }
}

export default new StreamController();

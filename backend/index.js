import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';

import mainRoute from './api/MainRoute.js';

dotenv.config();

const app = express();
const router = express.Router();

// Render, NGINX y Cloudflare envían cabeceras de proxy.
app.set('trust proxy', true);

const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:4000',
  'http://localhost:8100',
  'http://localhost:3000',
  'http://192.168.1.10:5000',
  'http://192.168.1.10:4200',
  'http://localhost:5000',
  'https://maslatinomobile.netlify.app',
  'https://maslatino.netlify.app',
  'https://maslatino.onrender.com',
  'https://super-cajeta-50e752.netlify.app',
  'https://localhost',
  'https://18.191.71.237',
  'http://18.191.71.237',
  'https://maslatino-q7fe.onrender.com',
  'capacitor://localhost',
  'https://www.maslatino.com',
  'https://maslatino.com',
  'www.maslatino.com',
  'https://maslatinoregular.onrender.com',
  'https://maslatinonetwork.com',
  'https://realmediagroups.com',
  'https://www.realmediagroups.com',
  'http://localhost',
  'https://melodic-alfajores-aa5cb7.netlify.app/',
];

const corsOptions = {
  origin(origin, callback) {
    // Permite curl, aplicaciones móviles y solicitudes del mismo origen.
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin)
      || origin.startsWith('capacitor://')
      || origin.startsWith('http://localhost')
    ) {
      return callback(null, true);
    }

    console.log('CORS bloqueado para:', origin);
    return callback(new Error('CORS no permitido por esta fuente'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 204,
};

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.use('/aaron/maslatino', mainRoute.configRoutes(router));

app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.DB_URL;
    if (!mongoUri) {
      throw new Error('Configura MONGODB_URI o DB_URL antes de iniciar el backend');
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const port = process.env.PORT || 4200;
    const server = createServer(app);
    const io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    app.set('socketio', io);

    io.on('connection', (socket) => {
      console.log('Usuario conectado:', socket.id);

      socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
      });

      socket.on('newNotification', (data) => {
        io.emit('updateNotifications', data);
      });
    });

    server.listen(port, () => {
      console.log(`Servidor activo en puerto: ${port}`);
    });
  } catch (error) {
    console.error('Error al iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const DeviceTokenSchema = new Schema({
  token: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android'],
    required: true
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const FavoriteSchema = new Schema({
  contentId: {
    type: Types.ObjectId,
    required: true
  },
  contentType: {
    type: String,
    enum: ['Noticia', 'Podcast', 'Episodio', 'Radio'],
    required: true
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const UserSchema = new Schema({
  provider: {
    type: String,
    enum: ['email', 'google', 'facebook', 'apple', 'microsoft'],
    required: true
  },
  providerId: {
    type: String,
    required: true,
    unique: true
  },
  name: { type: String, trim: true },
  shortDescription: { type: String, trim: true },
  email: { type: String, trim: true },
  password: { type: String, required: function () { return this.provider === 'email'; } },
  avatar: { type: String, trim: true },
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }],
  language: {
    type: String,
    enum: ['es', 'en', 'fr', 'pt'],
    default: 'es'
  },
  favorites: [FavoriteSchema],
  lastPlayedEpisode: {
    episodeId: {
      type: Schema.Types.ObjectId,
      required: false
    },
    podcastId: {
      type: Schema.Types.ObjectId,
      ref: 'Podcast'
    },
    playedAt: {
      type: Date,
      default: Date.now
    }
  },
  deviceTokens: [DeviceTokenSchema], // Nuevo campo para tokens de dispositivos
  createdAt: { type: Date, default: Date.now }
});

export default model('User', UserSchema);
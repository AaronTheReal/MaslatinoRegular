// models/BestFanzone.js
import mongoose from 'mongoose';
import PlacePhotoSchema from './PlacePhotoSchema.js';

const PlaceSchema = new mongoose.Schema({
  placeId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  formattedAddress: String,
  rating: Number,
  priceLevel: String,
  googleMapsUri: String,
  photos: [PlacePhotoSchema],
  lastUpdated: { type: Date, default: Date.now }
});

const BestFanzoneSchema = new mongoose.Schema({
  city: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  places: [PlaceSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});


export default mongoose.model('BestFanzone', BestFanzoneSchema);

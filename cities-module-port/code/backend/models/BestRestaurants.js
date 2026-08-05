// models/BestRestaurants.js
import mongoose from 'mongoose';

const PhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  authorName: String,
  authorUri: String,
});

const RestaurantSchema = new mongoose.Schema({
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
  photos: [PhotoSchema],
  lastUpdated: { type: Date, default: Date.now }
});

const BestRestaurantsSchema = new mongoose.Schema({
  city: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  restaurants: [RestaurantSchema],
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
});

BestRestaurantsSchema.index({ city: 1 });

export default mongoose.model('BestRestaurants', BestRestaurantsSchema);
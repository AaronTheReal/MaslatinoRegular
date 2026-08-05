// models/BestRestaurants.js
import mongoose from 'mongoose';
import PlacePhotoSchema from './PlacePhotoSchema.js';

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
  photos: [PlacePhotoSchema],
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


export default mongoose.model('BestRestaurants', BestRestaurantsSchema);
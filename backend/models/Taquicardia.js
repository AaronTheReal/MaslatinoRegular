import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;



const TaquicardiaSchema = new Schema({
    live:Boolean
});

export default model('Taquicardia', TaquicardiaSchema);
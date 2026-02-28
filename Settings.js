const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    storeName: String,
    phone: String,
    email: String,
    address: String,
    facebook: String,
    instagram: String,
    whatsapp: String,
    shippingPrices: { type: Map, of: Number },
    shippingCompany: String
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);

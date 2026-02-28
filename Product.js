const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    nameAr: { type: String, required: true },
    nameEn: { type: String },
    nameFr: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true },
    drawingPrice: { type: Number, default: 0 },
    descriptionAr: { type: String },
    descriptionEn: { type: String },
    descriptionFr: { type: String },
    colors: [{
        ar: String,
        en: String,
        fr: String
    }],
    images: [String],
    drawingInstructionsAr: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);

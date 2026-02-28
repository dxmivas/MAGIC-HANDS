const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    nameAr: { type: String, required: true },
    nameEn: { type: String },
    nameFr: { type: String },
    description: String
});

module.exports = mongoose.model('Category', categorySchema);

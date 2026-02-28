const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    customer: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        wilaya: { type: String, required: true },
        address: { type: String, required: true }
    },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        nameAr: String,
        price: Number,
        quantity: Number,
        color: String,
        drawingDescription: String,
        drawingImage: String,
        image: String
    }],
    subtotal: Number,
    shipping: Number,
    total: Number,
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending' 
    }
});

module.exports = mongoose.model('Order', orderSchema);

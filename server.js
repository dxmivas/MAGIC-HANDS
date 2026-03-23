require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dkyzabphz',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper to extract Public ID from Cloudinary URL
function getPublicIdFromUrl(url) {
    if (!url || !url.includes('cloudinary')) return null;
    try {
        // Example: https://res.cloudinary.com/dkyzabphz/image/upload/v12345/products/shirt.jpg
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return null;
        
        // Skip 'upload' and the version (e.g., 'v12345') if present
        let startIndex = uploadIndex + 1;
        if (parts[startIndex].startsWith('v')) {
            startIndex++;
        }
        
        // Join remaining parts and remove extension
        const publicIdWithExt = parts.slice(startIndex).join('/');
        const publicId = publicIdWithExt.split('.')[0];
        return publicId;
    } catch (err) {
        console.error('Error parsing Cloudinary URL:', err);
        return null;
    }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Admin Authentication Middleware
const adminAuth = (req, res, next) => {
    const adminPassword = req.headers['admin-password'];
    if (adminPassword === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ message: 'غير مصرح لك بالوصول' });
    }
};

// Admin Login Route
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true, message: 'تم تسجيل الدخول بنجاح' });
    } else {
        res.status(401).json({ success: false, message: 'كلمة المرور خاطئة' });
    }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(__dirname));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// MongoDB Connection
console.log('📡 Attempting to connect to MongoDB Atlas...');
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
    console.error('❌ MONGODB_URI is not defined in .env file!');
} else {
    const maskedURI = mongoURI.replace(/:([^@]+)@/, ':****@');
    console.log('🔗 Target URI:', maskedURI);
}

mongoose.connect(mongoURI)
    .then(() => {
        console.log('✅✅✅ SUCCESS: Connected to MongoDB Atlas');
        console.log('📂 Database Name:', mongoose.connection.name);
    })
    .catch(err => {
        console.error('❌❌❌ CONNECTION ERROR:');
        console.error('Message:', err.message);
        if (err.message.includes('authentication failed')) {
            console.error('👉 Tip: Check your username and password in .env');
        } else if (err.message.includes('ETIMEDOUT')) {
            console.error('👉 Tip: Network timeout. Check IP Access List in Atlas (0.0.0.0/0).');
        }
    });

// Handle errors after initial connection
mongoose.connection.on('error', err => {
    console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

// Models
const Product = require('./Product');
const Order = require('./Order');
const Category = require('./Category');
const Settings = require('./Settings');

// Image Upload Endpoint
app.post('/api/upload', upload.array('images', 10), (req, res) => {
    try {
        console.log('📥 Received images upload request');
        console.log('📦 Files received:', req.files ? req.files.length : 0);
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        
        const filePaths = req.files.map(file => `/uploads/${file.filename}`);
        console.log('✅ Generated file paths:', filePaths);
        res.json({ urls: filePaths });
    } catch (err) {
        console.error('❌ Upload error:', err);
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/upload-single', upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const filePath = `/uploads/${req.file.filename}`;
        res.json({ url: filePath });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Routes - Products
app.get('/api/products', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ محاولة جلب المنتجات وقاعدة البيانات غير متصلة');
            return res.status(503).json({ 
                message: 'قاعدة البيانات غير متصلة حالياً. تأكد من إعدادات IP Whitelist في MongoDB Atlas.' 
            });
        }
        console.log('🔍 GET /api/products - جلب المنتجات');
        const products = await Product.find().sort({ createdAt: -1 });
        console.log(`✅ تم جلب ${products.length} منتج`);
        res.json(products);
    } catch (err) {
        console.error('❌ خطأ في جلب المنتجات:', err.message);
        res.status(500).json({ message: 'خطأ في قاعدة البيانات: ' + err.message });
    }
});

app.post('/api/products', adminAuth, async (req, res) => {
    const product = new Product(req.body);
    try {
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.put('/api/products/:id', adminAuth, async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/products/:id', adminAuth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product && product.images && product.images.length > 0) {
            console.log(`🗑️ Attempting to delete ${product.images.length} images from Cloudinary for product: ${product._id}`);
            for (const imageUrl of product.images) {
                const publicId = getPublicIdFromUrl(imageUrl);
                if (publicId) {
                    // Use a separate try-catch so Cloudinary errors don't stop DB deletion
                    try {
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`✅ Deleted from Cloudinary: ${publicId}`);
                    } catch (cloudinaryErr) {
                        console.warn(`⚠️ Could not delete from Cloudinary: ${publicId}. Error:`, cloudinaryErr.message);
                        console.warn(`👉 Tip: Make sure CLOUDINARY_API_KEY and SECRET are correct in .env`);
                    }
                }
            }
        }
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted from database (Cloudinary cleanup attempted)' });
    } catch (err) {
        console.error('❌ Error deleting product:', err);
        res.status(500).json({ message: err.message });
    }
});

// Routes - Orders
app.get('/api/orders', adminAuth, async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    const order = new Order(req.body);
    try {
        const newOrder = await order.save();
        
        // WhatsApp Notification logic
        const adminPhone = process.env.WHATSAPP_PHONE;
        const apiKey = process.env.WHATSAPP_API_KEY;
        
        if (adminPhone && apiKey && adminPhone !== '213XXXXXXXXX') {
            const message = `🔔 *طلب جديد من متجر Magic Hands!*%0A%0A👤 *العميل:* ${order.customer.name}%0A📞 *الهاتف:* ${order.customer.phone}%0A📍 *الولاية:* ${order.customer.wilaya}%0A💰 *الإجمالي:* ${order.total} دج%0A📦 *عدد المنتجات:* ${order.items.length}%0A%0A🔗 *عرض في لوحة التحكم:* ${req.protocol}://${req.get('host')}/admin.html#orders`;
            
            axios.get(`https://api.callmebot.com/whatsapp.php?phone=${adminPhone}&text=${message}&apikey=${apiKey}`)
                .then(() => console.log('✅ WhatsApp notification sent successfully'))
                .catch(err => console.error('❌ WhatsApp notification failed:', err.message));
        }

        res.status(201).json(newOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.put('/api/orders/:id', adminAuth, async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/orders/:id', adminAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order && order.items) {
            for (const item of order.items) {
                if (item.drawingImage) {
                    const publicId = getPublicIdFromUrl(item.drawingImage);
                    if (publicId) {
                        try {
                            await cloudinary.uploader.destroy(publicId);
                            console.log(`✅ Deleted customer drawing from Cloudinary: ${publicId}`);
                        } catch (cloudinaryErr) {
                            console.warn(`⚠️ Could not delete drawing from Cloudinary: ${publicId}. Error:`, cloudinaryErr.message);
                        }
                    }
                }
            }
        }
        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: 'Order deleted from database (Cloudinary cleanup attempted)' });
    } catch (err) {
        console.error('❌ Error deleting order:', err);
        res.status(500).json({ message: err.message });
    }
});

// Routes - Categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/categories', adminAuth, async (req, res) => {
    const category = new Category(req.body);
    try {
        const newCategory = await category.save();
        res.status(201).json(newCategory);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.put('/api/categories/:id', adminAuth, async (req, res) => {
    try {
        const updatedCategory = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedCategory);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/categories/:id', adminAuth, async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Routes - Settings
app.get('/api/settings', async (req, res) => {
    try {
        console.log('🔍 GET /api/settings - جلب الإعدادات');
        let settings = await Settings.findOne();
        if (!settings) {
            console.log('ℹ️ لم يتم العثور على إعدادات، إنشاء إعدادات افتراضية');
            settings = new Settings({ 
                storeName: 'Magic Hands',
                shippingPrices: {} 
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error('❌ خطأ في جلب الإعدادات:', err.message);
        res.status(500).json({ message: 'خطأ في قاعدة البيانات: ' + err.message });
    }
});

app.post('/api/settings', adminAuth, async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (settings) {
            // Merge existing settings with new data to avoid overwriting missing fields
            const updatedData = { ...settings.toObject(), ...req.body };
            settings = await Settings.findByIdAndUpdate(settings._id, updatedData, { new: true });
        } else {
            settings = new Settings(req.body);
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error('❌ Settings update error:', err);
        res.status(400).json({ message: err.message });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('💥 Global Error:', err.stack);
    res.status(500).json({ 
        message: 'حدث خطأ في السيرفر', 
        error: err.message 
    });
});

// Catch unhandled rejections and exceptions to keep server alive
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔴 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('🔴 Uncaught Exception:', err);
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

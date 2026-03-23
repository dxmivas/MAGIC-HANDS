// Admin Panel Logic for Magic Hands

// Configuration for API URL - supports both local development and production
const getApiUrl = () => {
    const host = window.location.hostname || 'localhost';
    const port = window.location.port;
    
    // Production: use full URL to backend API
    if (host !== 'localhost' && host !== '127.0.0.1') {
        // For production, replace with your actual Render/Railway API URL
        return 'https://magic-hands-api.onrender.com/api'; // UPDATE THIS with your actual backend URL
    }
    
    // Local development: use relative path or port 5000
    if (port === '5000') {
        return '/api';
    }
    
    return `http://${host}:5000/api`;
};

const API_URL = getApiUrl();

let adminPassword = localStorage.getItem('adminPassword') || '';

// Helper function for authenticated fetch
async function authFetch(url, options = {}) {
    options.headers = {
        ...options.headers,
        'admin-password': adminPassword
    };

    const response = await fetch(url, options);
    
    if (response.status === 401) {
        showLogin();
        throw new Error('غير مصرح لك بالوصول');
    }
    
    return response;
}

function showLogin() {
    document.getElementById('loginOverlay').classList.add('active');
    document.getElementById('adminPassword').focus();
}

async function handleLogin(e) {
    e.preventDefault();
    const passwordInput = document.getElementById('adminPassword');
    const loginError = document.getElementById('loginError');
    const password = passwordInput.value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (data.success) {
            adminPassword = password;
            localStorage.setItem('adminPassword', password);
            document.getElementById('loginOverlay').classList.remove('active');
            loginError.textContent = '';
            initAdmin();
        } else {
            loginError.textContent = 'كلمة المرور خاطئة';
        }
    } catch (error) {
        loginError.textContent = 'خطأ في الاتصال بالسيرفر';
    }
}

let products = [];
let orders = [];
let shippingPrices = {};
let shippingCompany = '';
let categories = [];
let currentEditingProduct = null;
let currentEditingCategory = null;

// Initialize Admin Panel
async function initAdmin() {
    if (!adminPassword) {
        showLogin();
        return;
    }
    try {
        // First check if server is alive and password is correct
        try {
            const testRes = await authFetch(`${API_URL}/settings`);
            if (!testRes.ok && testRes.status === 503) {
                const data = await testRes.json();
                showNotification(data.message);
            }
        } catch (e) {
            if (e.message === 'غير مصرح لك بالوصول') return;
            showNotification('السيرفر لا يعمل! تأكد من تشغيل Node.js');
        }

        await Promise.all([
            fetchProducts(),
            fetchOrders(),
            fetchCategories(),
            fetchSettings()
        ]);
        loadDashboard();
    } catch (error) {
        console.error('Error initializing admin panel:', error);
    }
}

async function fetchProducts() {
    try {
        const response = await authFetch(`${API_URL}/products`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Server error');
        }
        const data = await response.json();
        products = Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('❌ Error fetching products:', err);
        showNotification('خطأ في جلب المنتجات: ' + err.message);
        products = [];
    }
}

async function fetchOrders() {
    try {
        const response = await authFetch(`${API_URL}/orders`);
        const data = await response.json();
        orders = Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('❌ Error fetching orders:', err);
        orders = [];
    }
}

async function fetchCategories() {
    try {
        const response = await authFetch(`${API_URL}/categories`);
        const data = await response.json();
        categories = Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('❌ Error fetching categories:', err);
        categories = [];
    }
}

async function fetchSettings() {
    try {
        const response = await authFetch(`${API_URL}/settings`);
        const settings = await response.json();
        
        if (settings && !settings.message) {
            shippingPrices = settings.shippingPrices || {};
            shippingCompany = settings.shippingCompany || '';
            
            // Load store settings into form if on settings section
            const settingsForm = document.getElementById('settingsForm');
            if (settingsForm) {
                if (document.getElementById('storeName')) document.getElementById('storeName').value = settings.storeName || '';
                if (document.getElementById('storePhone')) document.getElementById('storePhone').value = settings.phone || '';
                if (document.getElementById('storeEmail')) document.getElementById('storeEmail').value = settings.email || '';
                if (document.getElementById('storeAddress')) document.getElementById('storeAddress').value = settings.address || '';
                if (document.getElementById('storeFacebook')) document.getElementById('storeFacebook').value = settings.facebook || '';
                if (document.getElementById('storeInstagram')) document.getElementById('storeInstagram').value = settings.instagram || '';
                if (document.getElementById('storeWhatsapp')) document.getElementById('storeWhatsapp').value = settings.whatsapp || '';
            }
        }
        
        initializeShippingPrices();
    } catch (err) {
        console.error('❌ Error fetching settings:', err);
        initializeShippingPrices();
    }
}


const wilayas = [
    'أدرار', 'الشلف', 'الأغواط', 'أم البواقي', 'باتنة', 'بجاية', 'بسكرة', 'بشار',
    'البليدة', 'البويرة', 'تمنراست', 'تبسة', 'تلمسان', 'تيارت', 'تيزي وزو', 'الجزائر',
    'الجلفة', 'جيجل', 'سطيف', 'سعيدة', 'سكيكدة', 'سيدي بلعباس', 'عنابة', 'قالمة',
    'قسنطينة', 'المدية', 'مستغانم', 'المسيلة', 'معسكر', 'ورقلة', 'وهران', 'البيض',
    'إليزي', 'برج بوعريريج', 'بومرداس', 'الطارف', 'تندوف', 'تيسمسيلت', 'الوادي',
    'خنشلة', 'سوق أهراس', 'تيبازة', 'ميلة', 'عين الدفلى', 'النعامة', 'عين تموشنت',
    'غرداية', 'غليزان', 'تيميمون', 'برج باجي مختار', 'أولاد جلال', 'بني عباس',
    'عين صالح', 'عين قزام', 'تقرت', 'جانت', 'المغير', 'المنيعة'
];

// Initialize default shipping prices if empty
function initializeShippingPrices() {
    if (Object.keys(shippingPrices).length === 0) {
        wilayas.forEach(wilaya => {
            shippingPrices[wilaya] = 500;
        });
    }
}

// Navigation
async function showSection(sectionId, e) {
    if (e) e.preventDefault();
    
    // First, update UI immediately for better responsiveness
    updateUIForSection(sectionId, e);

    // Then, try to refresh data from API
    try {
        await Promise.all([
            fetchProducts().catch(err => console.error('Error fetching products:', err)),
            fetchOrders().catch(err => console.error('Error fetching orders:', err)),
            fetchCategories().catch(err => console.error('Error fetching categories:', err)),
            fetchSettings().catch(err => console.error('Error fetching settings:', err))
        ]);
        
        // Load section data after data is (hopefully) refreshed
        loadSectionData(sectionId);
    } catch (error) {
        console.error('Error refreshing data:', error);
        // Still try to load what we have
        loadSectionData(sectionId);
    }
}

function updateUIForSection(sectionId, e) {
    // Update navigation active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (e && e.currentTarget) {
        e.currentTarget.classList.add('active');
    } else {
        const activeLink = document.querySelector(`.nav-item[href="#${sectionId}"]`);
        if (activeLink) activeLink.classList.add('active');
    }
    
    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update header title
    const titles = {
        'dashboard': 'لوحة المعلومات',
        'products': 'المنتجات',
        'orders': 'الطلبيات',
        'shipping': 'التوصيل والأسعار',
        'categories': 'الفئات',
        'settings': 'الإعدادات'
    };
    
    const titleElement = document.getElementById('sectionTitle');
    if (titleElement) {
        titleElement.textContent = titles[sectionId] || 'لوحة التحكم';
    }
}

function loadSectionData(sectionId) {
    if (sectionId === 'dashboard') loadDashboard();
    if (sectionId === 'products') loadProductsTable();
    if (sectionId === 'orders') loadOrders();
    if (sectionId === 'shipping') loadShippingSettings();
    if (sectionId === 'categories') loadCategoriesTable();
}

// Dashboard
function loadDashboard() {
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('totalOrders').textContent = orders.length;
    
    // Update status counts
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
    const shippedOrders = orders.filter(o => o.status === 'shipped').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('confirmedOrders').textContent = confirmedOrders;
    document.getElementById('shippedOrders').textContent = shippedOrders;
    document.getElementById('deliveredOrders').textContent = deliveredOrders;
    document.getElementById('cancelledOrders').textContent = cancelledOrders;
    
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const netSales = orders.reduce((sum, order) => sum + (order.subtotal || 0), 0);
    const totalShipping = orders.reduce((sum, order) => sum + (order.shipping || 0), 0);
    
    document.getElementById('totalRevenue').textContent = `${totalRevenue.toLocaleString()} دج`;
    document.getElementById('netSales').textContent = `${netSales.toLocaleString()} دج`;
    document.getElementById('totalShipping').textContent = `${totalShipping.toLocaleString()} دج`;
    
    // Load recent orders
    const recentOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const tbody = document.getElementById('recentOrdersBody');
    
    if (recentOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد طلبات بعد</td></tr>';
        return;
    }
    
    tbody.innerHTML = recentOrders.map(order => `
        <tr onclick="viewOrderDetails('${order._id}')">
            <td>#${order._id.substring(0, 8)}...</td>
            <td>${order.customer.name}</td>
            <td>${order.total} دج</td>
            <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
            <td>${new Date(order.date).toLocaleDateString('ar-DZ')}</td>
        </tr>
    `).join('');
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'قيد الانتظار',
        'confirmed': 'مؤكدة',
        'shipped': 'تم الشحن',
        'delivered': 'تم التوصيل',
        'cancelled': 'ملغاة'
    };
    return statusMap[status] || status;
}

// Products Management
function searchProducts(query) {
    const filteredProducts = products.filter(product => 
        product.nameAr.toLowerCase().includes(query.toLowerCase()) ||
        product.nameFr.toLowerCase().includes(query.toLowerCase()) ||
        product.nameEn.toLowerCase().includes(query.toLowerCase())
    );
    loadProductsTable(filteredProducts);
}

function loadProductsTable(productsToDisplay = products) {
    // Reset search input if we are loading the full table
    if (productsToDisplay === products) {
        const searchInput = document.getElementById('productSearch');
        if (searchInput) searchInput.value = '';
    }

    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    if (productsToDisplay.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">لا توجد نتائج مطابقة.</td></tr>';
        return;
    }
    
    tbody.innerHTML = productsToDisplay.map(product => `
        <tr>
            <td>
                <img src="${product.images[0]}" alt="${product.nameAr}" 
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"
                     onerror="this.src='assets/placeholder.jpg'">
            </td>
            <td>${product.nameAr}</td>
            <td>${getCategoryName(product.category)}</td>
            <td>${product.price} دج</td>
            <td>${product.colors.map(c => typeof c === 'object' ? c.ar : c).join(', ')}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editProduct('${product._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getCategoryName(categoryId) {
    const category = categories.find(c => c._id === categoryId);
    return category ? category.nameAr : (categoryId === 'bags' ? 'حقائب' : 'إكسسوارات');
}

// Update product category select with dynamic categories
function updateCategorySelect() {
    const select = document.getElementById('productCategory');
    if (!select) return;
    const currentValue = select.value;
    
    select.innerHTML = categories.map(cat => 
        `<option value="${cat._id}">${cat.nameAr}</option>`
    ).join('');
    
    // Keep the current value if it still exists
    if (categories.find(c => c._id === currentValue)) {
        select.value = currentValue;
    }
}

function openAddProductModal() {
    currentEditingProduct = null;
    document.getElementById('productModalTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('imagesContainer').innerHTML = '';
    imageCounter = 0;
    updateCategorySelect();
    document.getElementById('productModal').classList.add('active');
}

function editProduct(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    currentEditingProduct = product;
    document.getElementById('productModalTitle').textContent = 'تعديل المنتج';
    
    updateCategorySelect();
    
    document.getElementById('productNameAr').value = product.nameAr;
    document.getElementById('productNameFr').value = product.nameFr;
    document.getElementById('productNameEn').value = product.nameEn;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDrawingPrice').value = product.drawingPrice || 0;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productDescAr').value = product.descriptionAr;
    document.getElementById('productDescFr').value = product.descriptionFr;
    document.getElementById('productDescEn').value = product.descriptionEn;
    
    // Fill colors from all three languages
    if (Array.isArray(product.colors) && product.colors.length > 0) {
        if (typeof product.colors[0] === 'object') {
            document.getElementById('productColorsAr').value = product.colors.map(c => c.ar).join(',');
            document.getElementById('productColorsEn').value = product.colors.map(c => c.en).join(',');
            document.getElementById('productColorsFr').value = product.colors.map(c => c.fr).join(',');
        } else {
            document.getElementById('productColorsAr').value = product.colors.join(',');
            document.getElementById('productColorsEn').value = '';
            document.getElementById('productColorsFr').value = '';
        }
    }
    
    document.getElementById('drawingInstructionsAr').value = product.drawingInstructionsAr || '';
    
    // Clear image inputs and show existing images
    document.getElementById('imagesContainer').innerHTML = '';
    imageCounter = 0;
    
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = product.images.map((img, index) => `
        <div class="preview-image" id="existing-image-${index}">
            <img src="${img}" onerror="this.src='assets/placeholder.jpg'">
            <button type="button" class="btn-remove-image" onclick="removeExistingImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    document.getElementById('productModal').classList.add('active');
}

function removeExistingImage(index) {
    if (!currentEditingProduct) return;
    
    // Remove from the current editing product's images array
    currentEditingProduct.images.splice(index, 1);
    
    // Update the preview
    const element = document.getElementById(`existing-image-${index}`);
    if (element) {
        element.remove();
    }
}

// Image Input Management
let imageCounter = 0;

function addImageInput() {
    imageCounter++;
    const container = document.getElementById('imagesContainer');
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'image-input-wrapper';
    inputWrapper.id = `image-wrapper-${imageCounter}`;
    inputWrapper.style.marginBottom = '10px';
    inputWrapper.style.padding = '10px';
    inputWrapper.style.border = '1px solid #ddd';
    inputWrapper.style.borderRadius = '5px';
    
    inputWrapper.innerHTML = `
        <div class="image-input-group" style="display: flex; align-items: center; gap: 10px;">
            <input type="file" 
                   name="images"
                   id="productImage${imageCounter}" 
                   accept="image/*" 
                   onchange="previewSelectedImage(event, ${imageCounter})"
                   class="image-input">
            <button type="button" class="btn btn-danger btn-sm" onclick="removeImageInput(${imageCounter})">حذف</button>
        </div>
        <div id="preview-${imageCounter}" class="image-item-preview" style="margin-top: 10px;"></div>
    `;
    container.appendChild(inputWrapper);
}

function removeImageInput(id) {
    const wrapper = document.getElementById(`image-wrapper-${id}`);
    if (wrapper) {
        wrapper.remove();
    }
}

function previewSelectedImage(event, id) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(`preview-${id}`);
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="معاينة">`;
            }
        };
        reader.readAsDataURL(file);
    }
}

function previewImages(event) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'preview-image';
            div.innerHTML = `<img src="${e.target.result}">`;
            preview.appendChild(div);
        };
        
        reader.readAsDataURL(file);
    }
}

async function saveProduct(event) {
    event.preventDefault();
    
    // Parse colors into objects with three languages
    const colorsAr = document.getElementById('productColorsAr').value.split(',').map(c => c.trim()).filter(c => c);
    const colorsEn = document.getElementById('productColorsEn').value.split(',').map(c => c.trim()).filter(c => c);
    const colorsFr = document.getElementById('productColorsFr').value.split(',').map(c => c.trim()).filter(c => c);
    
    // Create color objects with all three languages
    const colors = colorsAr.map((ar, index) => ({
        ar: ar,
        en: colorsEn[index] || ar,
        fr: colorsFr[index] || ar
    }));
    
    const product = {
        nameAr: document.getElementById('productNameAr').value,
        nameFr: document.getElementById('productNameFr').value,
        nameEn: document.getElementById('productNameEn').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        drawingPrice: parseFloat(document.getElementById('productDrawingPrice').value) || 0,
        descriptionAr: document.getElementById('productDescAr').value,
        descriptionFr: document.getElementById('productDescFr').value,
        descriptionEn: document.getElementById('productDescEn').value,
        colors: colors,
        drawingInstructionsAr: document.getElementById('drawingInstructionsAr').value,
        images: currentEditingProduct ? currentEditingProduct.images : []
    };
    
    // Handle Cloudinary Upload
    const imageInputs = document.querySelectorAll('input[type="file"].image-input');
    const cloudName = 'dkyzabphz';
    const uploadPreset = 'ml_default'; // تأكد من إنشاء هذا الـ Preset كـ Unsigned في Cloudinary
    
    const uploadPromises = [];
    
    imageInputs.forEach((input) => {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            
            const uploadTask = fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            }).then(res => res.json());
            
            uploadPromises.push(uploadTask);
        }
    });
    
    try {
        if (uploadPromises.length > 0) {
            showNotification('جاري رفع الصور سحابياً...');
            const results = await Promise.all(uploadPromises);
            
            const newImageUrls = results.map(res => {
                if (res.secure_url) return res.secure_url;
                console.error('Cloudinary error:', res);
                throw new Error(res.error ? res.error.message : 'Upload failed');
            });
            
            product.images = [...product.images, ...newImageUrls];
        }
        
        if (product.images.length === 0 && (!currentEditingProduct || currentEditingProduct.images.length === 0)) {
            product.images = ['assets/placeholder.jpg'];
        }
        
        await saveProductToServer(product);
    } catch (error) {
        console.error('Error in saveProduct:', error);
        showNotification('حدث خطأ أثناء رفع الصور: ' + error.message);
    }
}

async function saveProductToServer(product) {
    try {
        let response;
        if (currentEditingProduct) {
            response = await authFetch(`${API_URL}/products/${currentEditingProduct._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
        } else {
            response = await authFetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
        }

        if (response.ok) {
            await fetchProducts();
            closeProductModal();
            loadProductsTable();
            showNotification('تم حفظ المنتج بنجاح');
        } else {
            showNotification('حدث خطأ أثناء حفظ المنتج');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('حدث خطأ في الاتصال بالخادم');
    }
}

async function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    try {
        const response = await authFetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await fetchProducts();
            loadProductsTable();
            showNotification('تم حذف المنتج');
        } else {
            showNotification('حدث خطأ أثناء حذف المنتج');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('حدث خطأ في الاتصال بالخادم');
    }
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

// Categories Management
function loadCategoriesTable() {
    const tbody = document.getElementById('categoriesTableBody');
    
    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد فئات. أضف فئتك الأولى!</td></tr>';
        return;
    }
    
    tbody.innerHTML = categories.map(category => `
        <tr>
            <td>${category.nameAr}</td>
            <td>${category.nameEn || '-'}</td>
            <td>${category.nameFr || '-'}</td>
            <td>${category.description || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editCategory('${category._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openAddCategoryModal() {
    currentEditingCategory = null;
    document.getElementById('categoryModalTitle').textContent = 'إضافة فئة جديدة';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryModal').classList.add('active');
}

function editCategory(categoryId) {
    const category = categories.find(c => c._id === categoryId);
    if (!category) return;
    
    currentEditingCategory = category;
    document.getElementById('categoryModalTitle').textContent = 'تعديل الفئة';
    document.getElementById('categoryNameAr').value = category.nameAr;
    document.getElementById('categoryNameEn').value = category.nameEn || '';
    document.getElementById('categoryNameFr').value = category.nameFr || '';
    document.getElementById('categoryDescription').value = category.description || '';
    
    document.getElementById('categoryModal').classList.add('active');
}

async function saveCategory(event) {
    event.preventDefault();
    
    const category = {
        nameAr: document.getElementById('categoryNameAr').value,
        nameEn: document.getElementById('categoryNameEn').value,
        nameFr: document.getElementById('categoryNameFr').value,
        description: document.getElementById('categoryDescription').value
    };
    
    try {
        let response;
        if (currentEditingCategory) {
            response = await authFetch(`${API_URL}/categories/${currentEditingCategory._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(category)
            });
        } else {
            response = await authFetch(`${API_URL}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(category)
            });
        }

        if (response.ok) {
            await fetchCategories();
            closeCategoryModal();
            loadCategoriesTable();
            showNotification('تم حفظ الفئة بنجاح');
        } else {
            showNotification('حدث خطأ أثناء حفظ الفئة');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('حدث خطأ في الاتصال بالخادم');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    
    try {
        const response = await authFetch(`${API_URL}/categories/${categoryId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await fetchCategories();
            loadCategoriesTable();
            showNotification('تم حذف الفئة');
        } else {
            showNotification('حدث خطأ أثناء حذف الفئة');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('حدث خطأ في الاتصال بالخادم');
    }
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

// Orders Management
function searchOrders(query) {
    const statusFilter = document.getElementById('orderStatusFilter').value;
    const filteredOrders = orders.filter(order => {
        const matchesQuery = 
            order.customer.name.toLowerCase().includes(query.toLowerCase()) ||
            order.customer.phone.includes(query) ||
            getWilayaWithNumber(order.customer.wilaya).toLowerCase().includes(query.toLowerCase()) ||
            order._id.toLowerCase().includes(query.toLowerCase()) ||
            order._id.slice(-6).toUpperCase().includes(query.toUpperCase());
        
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        
        return matchesQuery && matchesStatus;
    });
    
    displayOrders(filteredOrders);
}

function loadOrders(filter = 'all') {
    // Reset search input when filter changes
    const searchInput = document.getElementById('orderSearch');
    if (searchInput) searchInput.value = '';
    
    const filteredOrders = filter === 'all' 
        ? orders 
        : orders.filter(o => o.status === filter);
    
    displayOrders(filteredOrders);
}

function getWilayaWithNumber(wilayaName) {
    const index = wilayas.indexOf(wilayaName);
    if (index !== -1) {
        const num = (index + 1).toString().padStart(2, '0');
        return `${num} - ${wilayaName}`;
    }
    return wilayaName;
}

function displayOrders(ordersToDisplay) {
    const container = document.getElementById('ordersContainer');
    if (!container) return;
    
    if (ordersToDisplay.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">لا توجد طلبات مطابقة</p>';
        return;
    }
    
    container.innerHTML = [...ordersToDisplay].reverse().map(order => `
        <div class="order-card" onclick="viewOrderDetails('${order._id}')">
            <div class="order-header">
                <div>
                    <h3>طلب #${order._id.slice(-6).toUpperCase()}</h3>
                    <p>${new Date(order.date).toLocaleString('ar-DZ')}</p>
                </div>
                <span class="status-badge status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-body">
                <p><strong>العميل:</strong> ${order.customer.name}</p>
                <p><strong>الهاتف:</strong> ${order.customer.phone}</p>
                <p><strong>الولاية:</strong> ${getWilayaWithNumber(order.customer.wilaya)}</p>
                <p><strong>المجموع:</strong> ${order.total} دج</p>
            </div>
        </div>
    `).join('');
}

function filterOrders(status) {
    loadOrders(status);
}

function viewOrderDetails(orderId) {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;
    
    const detailsHTML = `
        <div class="order-detail">
            <h3>طلب #${order._id.slice(-6).toUpperCase()}</h3>
            <div class="order-info">
                <div class="info-section">
                    <h4>معلومات العميل</h4>
                    <p><strong>الاسم:</strong> ${order.customer.name}</p>
                    <p><strong>الهاتف:</strong> ${order.customer.phone}</p>
                    <p><strong>الولاية:</strong> ${getWilayaWithNumber(order.customer.wilaya)}</p>
                    <p><strong>العنوان:</strong> ${order.customer.address}</p>
                </div>
                
                <div class="info-section">
                    <h4>المنتجات</h4>
                    ${order.items.map(item => `
                        <div class="order-item" style="border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 15px;">
                            <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 10px;">
                                <img src="${item.image}" alt="${item.nameAr}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                                <p><strong>${item.nameAr}</strong></p>
                            </div>
                            <p>اللون: ${item.color || 'غير محدد'} | الكمية: ${item.quantity}</p>
                            <p>السعر: ${item.price * item.quantity} دج</p>
                            ${(item.drawingDescription || item.drawingImage) ? `
                                <div style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                                    <p class="drawing-note"><i class="fas fa-paint-brush"></i> رسمة مخصصة: ${item.drawingDescription || 'بدون وصف'}</p>
                                    ${item.drawingImage ? `
                                        <div style="margin-top: 10px;">
                                            <p>صورة الرسمة:</p>
                                            <img src="${item.drawingImage}" alt="رسمة الزبون" style="max-width: 250px; max-height: 250px; border-radius: 5px; border: 1px solid #ddd;">
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="info-section">
                    <h4>ملخص الطلب</h4>
                    <p><strong>المجموع الفرعي:</strong> ${order.subtotal} دج</p>
                    <p><strong>التوصيل:</strong> ${order.shipping} دج</p>
                    <p><strong>المجموع الكلي:</strong> ${order.total} دج</p>
                </div>
                
                <div class="info-section">
                    <h4>حالة الطلب</h4>
                    <select id="statusSelect" class="form-control" onchange="updateOrderStatus('${order._id}', this.value)">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>مؤكد</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغى</option>
                    </select>
                </div>
            </div>
            
            <div class="modal-footer" style="margin-top: 2rem;">
                <button class="btn btn-danger" onclick="deleteOrder('${order._id}')">حذف الطلب</button>
            </div>
        </div>
    `;
    
    document.getElementById('orderDetails').innerHTML = detailsHTML;
    document.getElementById('orderModal').classList.add('active');
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await authFetch(`${API_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            await fetchOrders();
            showNotification('تم تحديث حالة الطلب');
            viewOrderDetails(orderId);
            loadOrders();
            loadDashboard();
        } else {
            showNotification('حدث خطأ أثناء تحديث حالة الطلب');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('حدث خطأ في الاتصال بالخادم');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('هل أنت متأكد من حذف هذه الطلبية؟ لا يمكن التراجع عن هذا الإجراء')) {
        return;
    }
    
    try {
        const response = await authFetch(`${API_URL}/orders/${orderId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await fetchOrders();
            showNotification('تم حذف الطلبية');
            closeOrderModal();
            loadOrders();
            loadDashboard();
        } else {
            showNotification('حدث خطأ أثناء حذف الطلبية');
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        showNotification('حدث خطأ في الاتصال بالخادم');
    }
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

// Shipping Settings
function loadShippingSettings() {
    // shippingPrices and shippingCompany are already loaded by fetchSettings
    
    // Load shipping company
    document.getElementById('shippingCompanyName').value = shippingCompany || '';
    
    // Load wilaya prices
    const container = document.getElementById('wilayaPrices');
    if (!container) return;
    
    container.innerHTML = wilayas.map((wilaya, index) => {
        const num = (index + 1).toString().padStart(2, '0');
        return `
        <div class="wilaya-price-item">
            <label>${num} - ${wilaya}</label>
            <input type="number" 
                   id="price_${wilaya}" 
                   value="${shippingPrices[wilaya] || 500}" 
                   min="0" 
                   step="50">
            <span>دج</span>
        </div>
    `}).join('');
}

async function saveShippingCompany(event) {
    event.preventDefault();
    shippingCompany = document.getElementById('shippingCompanyName').value;
    await saveSettingsToServer({ shippingCompany });
    showNotification('تم حفظ معلومات مكتب التوصيل');
}

async function saveWilayaPrices() {
    wilayas.forEach(wilaya => {
        const input = document.getElementById(`price_${wilaya}`);
        if (input) {
            shippingPrices[wilaya] = parseInt(input.value) || 500;
        }
    });
    
    await saveSettingsToServer({ shippingPrices });
    showNotification('تم حفظ أسعار التوصيل');
}

// Store Settings
async function saveStoreSettings(event) {
    event.preventDefault();
    
    const settings = {
        phone: document.getElementById('storePhone').value,
        email: document.getElementById('storeEmail').value,
        address: document.getElementById('storeAddress').value,
        facebook: document.getElementById('storeFacebook').value,
        instagram: document.getElementById('storeInstagram').value,
        whatsapp: document.getElementById('storeWhatsapp').value
    };
    
    await saveSettingsToServer(settings);
    showNotification('تم حفظ الإعدادات');
}

async function saveSettingsToServer(settingsData) {
    try {
        const response = await authFetch(`${API_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });
        
        if (response.ok) {
            await fetchSettings();
        } else {
            showNotification('حدث خطأ أثناء حفظ الإعدادات');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('حدث خطأ في الاتصال بالخادم');
    }
}

// Notification system
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('active');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('active');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
};

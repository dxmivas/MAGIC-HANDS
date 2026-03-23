// Main application logic for Magic Hands e-commerce

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

function getWilayaWithNumber(wilayaName) {
    const index = wilayas.indexOf(wilayaName);
    if (index !== -1) {
        const num = (index + 1).toString().padStart(2, '0');
        return `${num} - ${wilayaName}`;
    }
    return wilayaName;
}

// Products and Categories data (Global variables)
let products = [];
let categories = [];

// Cart management
let cart = JSON.parse(localStorage.getItem('mh_cart')) || [];

// Fetch initial data
async function initApp() {
    console.log('🚀 Initializing App...');
    console.log('📍 API URL:', API_URL);
    try {
        const [productsResponse, settingsResponse, categoriesResponse] = await Promise.all([
            fetch(`${API_URL}/products`).catch(e => ({ error: true, message: e.message, type: 'products' })),
            fetch(`${API_URL}/settings`).catch(e => ({ error: true, message: e.message, type: 'settings' })),
            fetch(`${API_URL}/categories`).catch(e => ({ error: true, message: e.message, type: 'categories' }))
        ]);

        // Check for fetch errors
        if (productsResponse.error) console.error('❌ Products fetch failed:', productsResponse.message);
        if (settingsResponse.error) console.error('❌ Settings fetch failed:', settingsResponse.message);
        if (categoriesResponse.error) console.error('❌ Categories fetch failed:', categoriesResponse.message);

        const productsData = (productsResponse.ok && !productsResponse.error) ? await productsResponse.json() : [];
        const settingsData = (settingsResponse.ok && !settingsResponse.error) ? await settingsResponse.json() : null;
        const categoriesData = (categoriesResponse.ok && !categoriesResponse.error) ? await categoriesResponse.json() : [];

        console.log('✅ Data fetched successfully:', { 
            productsCount: Array.isArray(productsData) ? productsData.length : 0, 
            hasSettings: !!settingsData && !settingsData.message, 
            categoriesCount: Array.isArray(categoriesData) ? categoriesData.length : 0 
        });

        products = Array.isArray(productsData) ? productsData : [];
        categories = Array.isArray(categoriesData) ? categoriesData : [];
        
        if (settingsData && !settingsData.message) {
            console.log('⚙️ Applying Store Settings...', settingsData);
            if (settingsData.shippingPrices) {
                shippingPrices = settingsData.shippingPrices;
                console.log('🚚 Shipping prices loaded:', Object.keys(shippingPrices).length, 'wilayas');
            }
            applyStoreSettings(settingsData);
        } else {
            console.warn('⚠️ No settings data found or server error:', settingsData?.message);
        }
        
        initializeShippingPrices();
        loadProducts();
        loadCategoryButtons();
        updateCartCount();
        
        // Load wilayas for checkout if the select exists
        const wilayaSelect = document.getElementById('wilayaSelect');
        if (wilayaSelect) {
            // wilayas are already defined globally
            let options = `<option value="" data-i18n="checkout.selectWilaya">اختر الولاية</option>`;
            wilayas.forEach((w, index) => {
                const num = (index + 1).toString().padStart(2, '0');
                options += `<option value="${w}">${num} - ${w}</option>`;
            });
            wilayaSelect.innerHTML = options;
        }
    } catch (error) {
        console.error('💥 Critical error during app initialization:', error);
    }
}

function applyStoreSettings(settings) {
    console.log('Applying settings:', settings); // سجل لفحص البيانات القادمة
    try {
        // Contact Info
        const phoneEl = document.getElementById('contactPhone');
        const emailEl = document.getElementById('contactEmail');
        const addressEl = document.getElementById('contactAddress');
        
        if (phoneEl && settings.phone) phoneEl.textContent = settings.phone;
        if (emailEl && settings.email) emailEl.textContent = settings.email;
        if (addressEl && settings.address) {
            addressEl.textContent = settings.address;
            addressEl.removeAttribute('data-i18n');
        }

        // Helper to format URLs
        const formatURL = (url) => {
            if (!url || url === '#' || url.trim() === '') return '#';
            let cleanUrl = url.trim();
            if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) return cleanUrl;
            return `https://${cleanUrl}`;
        };

        // Social Links
        const facebookEl = document.getElementById('footerFacebook');
        const instagramEl = document.getElementById('footerInstagram');
        const whatsappEl = document.getElementById('footerWhatsapp');

        if (facebookEl) {
            const fbUrl = formatURL(settings.facebook);
            console.log('Facebook URL:', fbUrl);
            facebookEl.href = fbUrl;
        }
        
        if (instagramEl) {
            const igUrl = formatURL(settings.instagram);
            console.log('Instagram URL:', igUrl);
            instagramEl.href = igUrl;
        }
        
        // Special handling for WhatsApp
        if (whatsappEl) {
            let waData = settings.whatsapp || '';
            let waLink = '#';
            
            if (waData.trim() !== '') {
                if (waData.startsWith('http')) {
                    waLink = waData;
                } else {
                    const cleanNumber = waData.replace(/\D/g, '');
                    waLink = `https://wa.me/${cleanNumber}`;
                }
            }
            console.log('WhatsApp Link:', waLink);
            whatsappEl.href = waLink;
        }
    } catch (error) {
        console.error('Error applying store settings:', error);
    }
}


// Wilaya data with shipping prices
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

let shippingPrices = {};

// Initialize default shipping prices if not set
function initializeShippingPrices() {
    if (Object.keys(shippingPrices).length === 0) {
        wilayas.forEach(wilaya => {
            shippingPrices[wilaya] = 500; // Default 500 DZD
        });
    }
}

// Load category buttons dynamically
function loadCategoryButtons() {
    const categoriesContainer = document.getElementById('dynamicCategoryButtons');
    if (!categoriesContainer) return;
    
    // Clear existing buttons
    categoriesContainer.innerHTML = '';
    
    // Add buttons for each category
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.onclick = function(e) {
            filterProducts(category._id, e);
        };
        // Use the appropriate language name
        const categoryName = category[`name${currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)}`] || category.nameAr;
        button.textContent = categoryName;
        categoriesContainer.appendChild(button);
    });
}

// Load products on page load
let currentFilter = 'all';
let currentSearchTerm = '';

function loadProducts(filter = 'all', searchTerm = '') {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    currentFilter = filter;
    currentSearchTerm = searchTerm.toLowerCase();
    
    let filteredProducts = products;
    
    // Apply category filter
    if (currentFilter !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === currentFilter);
    }
    
    // Apply search filter
    if (currentSearchTerm) {
        filteredProducts = filteredProducts.filter(p => {
            const nameAr = (p.nameAr || '').toLowerCase();
            const nameEn = (p.nameEn || '').toLowerCase();
            const nameFr = (p.nameFr || '').toLowerCase();
            const descAr = (p.descriptionAr || '').toLowerCase();
            const descEn = (p.descriptionEn || '').toLowerCase();
            const descFr = (p.descriptionFr || '').toLowerCase();
            
            return nameAr.includes(currentSearchTerm) || 
                   nameEn.includes(currentSearchTerm) || 
                   nameFr.includes(currentSearchTerm) ||
                   descAr.includes(currentSearchTerm) ||
                   descEn.includes(currentSearchTerm) ||
                   descFr.includes(currentSearchTerm);
        });
    }
    
    productsGrid.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `<div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
            <i class="fas fa-search" style="font-size: 3rem; color: var(--text-light); margin-bottom: 1rem; display: block;"></i>
            <p>${currentLanguage === 'ar' ? 'لا توجد نتائج بحث تطابق مدخلاتك' : 
                 currentLanguage === 'fr' ? 'Aucun résultat ne correspond à votre recherche' : 
                 'No products match your search'}</p>
        </div>`;
        return;
    }
    
    filteredProducts.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.innerHTML += productCard;
    });
}

function handleSearch(term) {
    loadProducts(currentFilter, term);
}

function createProductCard(product) {
    const name = product[`name${currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)}`];
    const description = product[`description${currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)}`];
    const altText = `${name} - ${getTranslation('nav.home').includes('الرئيسية') ? 'متجر Magic Hands الجزائر' : 'Magic Hands Store Algeria'}`;
    
    return `
        <div class="product-card" onclick="openProductDetail('${product._id}')">
            <div class="product-image">
                <img src="${product.images[0]}" alt="${altText}" onerror="this.src='assets/placeholder.jpg'">
            </div>
            <div class="product-info">
                <h3 class="product-name">${name}</h3>
                <p class="product-description">${description}</p>
                <div class="product-colors">
                    ${product.colors.map(color => {
                        const colorDisplay = typeof color === 'object' ? (color[currentLanguage] || color.ar) : color;
                        return `<span class="color-tag">${colorDisplay}</span>`;
                    }).join('')}
                </div>
                <div class="product-footer">
                    <span class="product-price">${product.price} ${getTranslation('cart.total').includes('دج') ? 'دج' : 'DA'}</span>
                    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); addToCartQuick('${product._id}')">
                        ${getTranslation('product.addToCart')}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function openProductDetail(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    const modal = document.getElementById('productModal');
    const name = product[`name${currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)}`];
    const description = product[`description${currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)}`];
    const drawingInstructions = product.drawingInstructionsAr || '';
    
    const detailHTML = `
        <div class="product-detail-grid">
            <div class="product-images">
                <div class="product-image-gallery">
                    <img id="mainImage" src="${product.images[0]}" alt="${name}" onerror="this.src='assets/placeholder.jpg'">
                </div>
                ${product.images.length > 1 ? `
                    <div class="product-thumbnails">
                        ${product.images.map((img, index) => `
                            <img src="${img}" 
                                 alt="صورة ${index + 1}" 
                                 class="thumbnail ${index === 0 ? 'active' : ''}"
                                 onclick="document.getElementById('mainImage').src='${img}'; document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active')); this.classList.add('active');"
                                 onerror="this.src='assets/placeholder.jpg'">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="product-detail-info">
                <h2>${name}</h2>
                <p class="product-price-large" id="modalProductPrice" data-base-price="${product.price}">${product.price} ${getTranslation('cart.total').includes('دج') ? 'دج' : 'DA'}</p>
                <p>${description}</p>
                
                <div class="product-options">
                    <div class="option-group">
                        <label>${getTranslation('product.color')}</label>
                        <div class="color-options">
                            ${product.colors.map((color, index) => {
                                const colorDisplay = typeof color === 'object' ? (color[currentLanguage] || color.ar) : color;
                                return `
                                    <label class="color-option">
                                        <input type="radio" name="color" value="${colorDisplay}" ${index === 0 ? 'checked' : ''}>
                                        <span>${colorDisplay}</span>
                                    </label>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <div class="option-group">
                        <label>${getTranslation('product.quantity')}</label>
                        <input type="number" id="productQuantity" value="1" min="1" max="10" onchange="updateModalTotalPrice()">
                    </div>
                    
                    <div class="option-group">
                        <label>
                            <input type="checkbox" id="wantDrawing" onchange="toggleDrawingOptions(${product.drawingPrice || 0})">
                            ${getTranslation('product.drawingOption')} 
                            <span class="drawing-price-tag" style="color: #e67e22; font-weight: bold; display: none;" id="drawingPriceDisplay">(+ ${product.drawingPrice || 0} دج)</span>
                        </label>
                    </div>
                    
                    <div id="drawingOptions" style="display: none;">
                        ${drawingInstructions ? `
                            <div class="drawing-instructions">
                                <strong>${getTranslation('product.drawingInstructions')}</strong>
                                <p>${drawingInstructions}</p>
                            </div>
                        ` : ''}
                        <div class="option-group">
                            <label>${getTranslation('product.drawingDescription')}</label>
                            <textarea id="drawingDescription" rows="3" placeholder="${getTranslation('product.drawingDescription')}"></textarea>
                        </div>
                        <div class="option-group">
                            <label>صورة الرسمة</label>
                            <input type="file" id="drawingImage" accept="image/*" onchange="previewDrawingImage(event)">
                            <div id="drawingImagePreview" style="margin-top: 10px;"></div>
                        </div>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-block" onclick="addToCartFromDetail('${product._id}')">
                    ${getTranslation('product.addToCart')}
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('productDetail').innerHTML = detailHTML;
    modal.classList.add('active');
}

function toggleDrawingOptions(drawingPrice = 0) {
    const drawingOptions = document.getElementById('drawingOptions');
    const checkbox = document.getElementById('wantDrawing');
    const drawingPriceDisplay = document.getElementById('drawingPriceDisplay');
    
    drawingOptions.style.display = checkbox.checked ? 'block' : 'none';
    if (drawingPriceDisplay) {
        drawingPriceDisplay.style.display = checkbox.checked ? 'inline' : 'none';
    }
    
    updateModalTotalPrice(drawingPrice);
}

function updateModalTotalPrice(drawingPrice = 0) {
    const priceElement = document.getElementById('modalProductPrice');
    const quantity = parseInt(document.getElementById('productQuantity').value) || 1;
    const checkbox = document.getElementById('wantDrawing');
    
    if (!priceElement) return;
    
    const basePrice = parseFloat(priceElement.getAttribute('data-base-price'));
    const currentDrawingPrice = checkbox && checkbox.checked ? drawingPrice : 0;
    
    const total = (basePrice + currentDrawingPrice) * quantity;
    const unit = getTranslation('cart.total').includes('دج') ? 'دج' : 'DA';
    
    priceElement.textContent = `${total} ${unit}`;
}

function previewDrawingImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('drawingImagePreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="معاينة الرسمة" style="max-width: 200px; border-radius: 5px; border: 1px solid #ddd;">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
}

function addToCartQuick(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    // Open the product detail modal for selection
    openProductDetail(productId);
}

async function addToCartFromDetail(productId) {
    const product = products.find(p => p._id === productId);
    const selectedColor = document.querySelector('input[name="color"]:checked');
    
    if (!selectedColor) {
        alert(getTranslation('messages.selectColor'));
        return;
    }
    
    const quantity = parseInt(document.getElementById('productQuantity').value);
    const wantDrawing = document.getElementById('wantDrawing').checked;
    const drawingDescription = wantDrawing ? document.getElementById('drawingDescription').value : '';
    const drawingImageInput = document.getElementById('drawingImage');
    
    // Get color name from the span next to the input
    const colorLabel = selectedColor.parentElement.querySelector('span');
    const colorDisplay = colorLabel ? colorLabel.textContent : selectedColor.value;
    
    const cartItem = {
        productId: product._id,
        name: product[`name${currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)}`],
        nameAr: product.nameAr,
        price: product.price + (wantDrawing ? (product.drawingPrice || 0) : 0),
        color: colorDisplay,
        quantity: quantity,
        wantDrawing: wantDrawing,
        drawingDescription: drawingDescription,
        drawingImage: '',
        image: product.images[0]
    };
    
    // Handle drawing image - Convert to Base64 for local storage (Temporary)
    if (drawingImageInput.files && drawingImageInput.files[0] && wantDrawing) {
        const file = drawingImageInput.files[0];
        try {
            const base64Image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(file);
            });
            cartItem.drawingImage = base64Image;
        } catch (error) {
            console.error('Error reading drawing image:', error);
        }
    }
    
    cart.push(cartItem);
    saveCart();
    updateCartUI();
    closeProductModal();
    showNotification(getTranslation('messages.addedToCart'));
}

function saveCart() {
    localStorage.setItem('mh_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update cart items
    if (cart.length === 0) {
        cartItems.innerHTML = `<p class="empty-cart">${getTranslation('cart.empty')}</p>`;
        cartTotal.textContent = '0 دج';
        return;
    }
    
    let itemsHTML = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        itemsHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.color} × ${item.quantity}</p>
                    ${item.wantDrawing ? `<p class="drawing-note"><i class="fas fa-paint-brush"></i> ${getTranslation('product.drawingOption')}</p>` : ''}
                    ${item.drawingImage ? `<div class="drawing-image-preview"><img src="${item.drawingImage}" alt="رسمة الزبون" style="max-width: 150px; max-height: 150px; border-radius: 5px; border: 1px solid #ddd;"></div>` : ''}
                </div>
                <div class="cart-item-price">
                    <span>${itemTotal} دج</span>
                    <button class="btn-remove" onclick="removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = itemsHTML;
    cartTotal.textContent = `${total} دج`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    cartSidebar.classList.toggle('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function proceedToCheckout() {
    if (cart.length === 0) {
        alert(getTranslation('cart.empty'));
        return;
    }
    
    toggleCart();
    openCheckoutModal();
}

function openCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    const wilayaSelect = document.getElementById('wilayaSelect');
    
    // Populate wilaya select
    let wilayaOptions = `<option value="">${getTranslation('checkout.selectWilaya')}</option>`;
    wilayas.forEach((wilaya, index) => {
        const num = (index + 1).toString().padStart(2, '0');
        wilayaOptions += `<option value="${wilaya}">${num} - ${wilaya}</option>`;
    });
    wilayaSelect.innerHTML = wilayaOptions;
    
    updateCheckoutSummary();
    modal.classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('active');
}

function updateShippingCost() {
    updateCheckoutSummary();
}

function updateCheckoutSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const selectedWilaya = document.getElementById('wilayaSelect').value;
    const shipping = selectedWilaya ? (shippingPrices[selectedWilaya] || 500) : 0;
    const total = subtotal + shipping;
    
    document.getElementById('checkoutSubtotal').textContent = `${subtotal} دج`;
    document.getElementById('checkoutShipping').textContent = `${shipping} دج`;
    document.getElementById('checkoutTotal').textContent = `${total} دج`;
}

async function submitOrder(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    showNotification('جاري إرسال الطلب...');

    // Upload any temporary Base64 drawing images to Cloudinary
    const cloudName = 'dkyzabphz';
    const uploadPreset = 'ml_default';

    for (let item of cart) {
        if (item.drawingImage && item.drawingImage.startsWith('data:image')) {
            try {
                const cloudFormData = new FormData();
                cloudFormData.append('file', item.drawingImage);
                cloudFormData.append('upload_preset', uploadPreset);

                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST',
                    body: cloudFormData
                });
                const result = await response.json();
                
                if (result.secure_url) {
                    item.drawingImage = result.secure_url;
                } else {
                    console.error('Cloudinary upload error:', result);
                }
            } catch (error) {
                console.error('Error uploading drawing image to Cloudinary:', error);
            }
        }
    }

    const order = {
        customer: {
            name: formData.get('name') || form.querySelector('input[name="name"]').value,
            phone: formData.get('phone') || form.querySelector('input[name="phone"]').value,
            wilaya: document.getElementById('wilayaSelect').value,
            address: formData.get('address') || form.querySelector('textarea[name="address"]').value
        },
        items: cart.map(item => ({
            productId: item.productId,
            nameAr: item.nameAr,
            price: item.price,
            quantity: item.quantity,
            color: item.color,
            drawingDescription: item.drawingDescription,
            drawingImage: item.drawingImage,
            image: item.image
        })),
        subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        shipping: shippingPrices[document.getElementById('wilayaSelect').value] || 500,
        status: 'pending'
    };
    
    order.total = order.subtotal + order.shipping;
    
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(order)
        });

        if (response.ok) {
            // Clear cart
            cart = [];
            saveCart();
            updateCartUI();
            
            closeCheckoutModal();
            showNotification(getTranslation('messages.orderSuccess'));
            
            // Optionally redirect or show success page
            setTimeout(() => {
                window.location.href = '#home';
            }, 2000);
        } else {
            showNotification('حدث خطأ أثناء إرسال الطلب');
        }
    } catch (error) {
        console.error('Error submitting order:', error);
        showNotification('حدث خطأ في الاتصال بالخادم');
    }
}

function filterProducts(category, e) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // If the event target exists
    if (e && e.target) {
        e.target.classList.add('active');
    } else if (category === 'all') {
        // Fallback for the hardcoded 'All' button if needed
        const allBtn = document.querySelector('.filter-btn[onclick*="all"]');
        if (allBtn) allBtn.classList.add('active');
    }
    
    loadProducts(category, currentSearchTerm);
}

function toggleMobileMenu() {
    const nav = document.querySelector('.main-nav');
    nav.classList.toggle('active');
}

function showNotification(message) {
    // Simple notification system
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
    initApp();
    
    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            // Only apply smooth scroll if it's an internal anchor (e.g., #products)
            // and NOT just "#" or an external link that was updated
            if (href && href.startsWith('#') && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    // Close mobile menu if open
                    const nav = document.querySelector('.main-nav');
                    if (nav) nav.classList.remove('active');
                }
            }
            // If it's just "#" or an external link, let the browser handle it
        });
    });
});

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    const cartSidebar = document.getElementById('cartSidebar');
    if (cartSidebar && !cartSidebar.contains(event.target) && 
        !event.target.closest('.cart-btn') && 
        cartSidebar.classList.contains('active')) {
        cartSidebar.classList.remove('active');
    }
};

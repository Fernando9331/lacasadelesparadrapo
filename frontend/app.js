/* ==========================================================================
   E-COMMERCE INTERACTION & CLIENT-SERVER LOGIC
   ========================================================================== */

// API Base URL
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

// Dynamic Database State
let products = [];
let branches = {};

// Fallback Databases in case Backend is offline (Resilient Design)
const FALLBACK_PRODUCTS = [
  {
    id: 'im-1',
    name: 'Esparadrapo de Tela Impermeable 3"',
    category: 'insumos-medicos',
    categoryLabel: 'Insumos Médicos',
    desc: '[Offline Mode] Esparadrapo de alta adherencia y resistencia al agua, ideal para fijar vendajes.',
    price: 2.50,
    icon: 'ri-first-aid-kit-line'
  },
  {
    id: 'mp-1',
    name: 'Glicerina USP Pura (1 Litro)',
    category: 'materia-prima',
    categoryLabel: 'Materia Prima',
    desc: '[Offline Mode] Líquido viscoso neutro y dulce, grado USP. Materia prima base para cosmética.',
    price: 6.20,
    icon: 'ri-flask-line'
  },
  {
    id: 'hl-1',
    name: 'Detergente Líquido Concentrado (1 Galón)',
    category: 'hogar-limpieza',
    categoryLabel: 'Hogar / Limpieza',
    desc: '[Offline Mode] Fórmula activa de limpieza profunda para prendas delicadas.',
    price: 8.20,
    icon: 'ri-drop-line'
  },
  {
    id: 'cp-1',
    name: 'Crema Hidratante Urea 10% (500ml)',
    category: 'cuidado-personal',
    categoryLabel: 'Cuidado Personal',
    desc: '[Offline Mode] Emulsión dermatológica restauradora para piel extra seca.',
    price: 12.00,
    icon: 'ri-hand-sanitizer-line'
  },
  {
    id: 'ev-1',
    name: 'Frasco Gotero Vidrio Ámbar 30ml (Caja x 50)',
    category: 'envases',
    categoryLabel: 'Envases',
    desc: '[Offline Mode] Envase protector de luz UV para aceites y sueros cosméticos.',
    price: 15.00,
    icon: 'ri-cup-line'
  }
];

const FALLBACK_BRANCHES = {
  'guayaquil': {
    name: 'Agencia Matriz [Offline]',
    address: 'Luis Urdaneta 1111 entre Av. Quito y Av. Machala',
    phone: '042-296410',
    whatsapp: '593999422969',
    link: 'https://wa.me/593999422969'
  }
};

// 3. APPLICATION STATE
let cart = loadCartFromStorage();
let activeCategory = 'all';
let searchQuery = '';
let priceSort = 'default';
let selectedBranch = 'guayaquil';

// LocalStorage Synchronization
function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  try {
    const stored = localStorage.getItem('cart');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error loading cart from localStorage:', e);
    return [];
  }
}

// 4. DOM ELEMENTS
const DOM = {
  // Products Catalog
  productsGrid: document.getElementById('productsGridContainer'),
  resultsCount: document.getElementById('resultsCount'),
  emptyState: document.getElementById('emptyCatalogState'),
  searchInput: document.getElementById('catalogSearch'),
  clearSearchBtn: document.getElementById('clearSearch'),
  priceSort: document.getElementById('priceSort'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  categoryCards: document.querySelectorAll('.category-card'),
  
  // Category Counts
  countAll: document.getElementById('count-all'),
  countInsumos: document.getElementById('count-insumos-medicos'),
  countMateria: document.getElementById('count-materia-prima'),
  countHogar: document.getElementById('count-hogar-limpieza'),
  countCuidado: document.getElementById('count-cuidado-personal'),
  countEnvases: document.getElementById('count-envases'),

  // Cart elements
  openCartBtn: document.getElementById('openCartBtn'),
  closeCartBtn: document.getElementById('closeCartBtn'),
  cartSidebar: document.getElementById('cartSidebar'),
  cartBackdrop: document.getElementById('cartBackdrop'),
  cartEmptyState: document.getElementById('cartEmptyState'),
  cartItemsContainer: document.getElementById('cartItemsContainer'),
  cartSidebarFooter: document.getElementById('cartSidebarFooter'),
  cartSubtotal: document.getElementById('cartSubtotal'),
  cartTax: document.getElementById('cartTax'),
  cartTotal: document.getElementById('cartTotal'),
  cartCountBadge: document.getElementById('cartCountBadge'),
  cartItemsCount: document.getElementById('cartItemsCount'),
  startShoppingBtn: document.getElementById('startShoppingBtn'),
  footerCartLink: document.getElementById('footerCartLink'),
  
  // Checkout Form
  checkoutBranchSelect: document.getElementById('checkoutBranchSelect'),
  customerName: document.getElementById('customerName'),
  checkoutBtn: document.getElementById('checkoutBtn'),

  // Agencies Elements
  agencyTabCards: document.querySelectorAll('.agency-tab-card'),
  overlayBranchTitle: document.getElementById('overlayBranchTitle'),
  overlayBranchAddress: document.getElementById('overlayBranchAddress'),
  overlayCallBtn: document.getElementById('overlayCallBtn'),
  overlayWaBtn: document.getElementById('overlayWaBtn'),
  openBranchNav: document.getElementById('openBranchNav'),

  // Chatbot Elements
  chatbotWidget: document.getElementById('chatbotWidget'),
  chatbotToggle: document.getElementById('chatbotToggle'),
  chatbotWindow: document.getElementById('chatbotWindow'),
  chatbotClose: document.getElementById('chatbotClose'),
  chatMessages: document.getElementById('chatMessages'),
  chatInputArea: document.getElementById('chatInputArea'),
  chatUserInput: document.getElementById('chatUserInput'),
  quickReplyBtns: document.querySelectorAll('.quick-reply-btn'),
  footerCatLinks: document.querySelectorAll('.footer-cat-link'),

  // Custom Item Form Elements
  customProductForm: document.getElementById('customProductForm'),
  customItemName: document.getElementById('customItemName'),
  customItemQty: document.getElementById('customItemQty')
};

// 5. ASYNC DATA INGESTION FROM BACKEND API
async function loadServerData() {
  try {
    // Fetch Products
    const productsRes = await fetch(`${API_BASE_URL}/products`);
    if (!productsRes.ok) throw new Error('Failed to load products');
    products = await productsRes.json();
    console.log('✅ Products loaded successfully from Backend REST API.');

    // Fetch Branches
    const branchesRes = await fetch(`${API_BASE_URL}/branches`);
    if (!branchesRes.ok) throw new Error('Failed to load branches');
    branches = await branchesRes.json();
    console.log('✅ Branches loaded successfully from Backend REST API.');

  } catch (error) {
    console.warn('⚠️ Backend API unreachable. Loading offline fallback database...', error);
    products = FALLBACK_PRODUCTS;
    branches = FALLBACK_BRANCHES;
  }
}

// 6. CATALOG LOGIC & RENDERING
function renderCatalog() {
  // Filter products
  let filtered = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort products
  if (priceSort === 'low-high') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (priceSort === 'high-low') {
    filtered.sort((a, b) => b.price - a.price);
  }

  // Handle empty state
  if (filtered.length === 0) {
    DOM.productsGrid.style.display = 'none';
    DOM.emptyState.style.display = 'block';
    DOM.resultsCount.textContent = '0 productos encontrados';
  } else {
    DOM.productsGrid.style.display = 'grid';
    DOM.emptyState.style.display = 'none';
    DOM.resultsCount.textContent = `Mostrando ${filtered.length} producto(s)`;

    // Render cards
    DOM.productsGrid.innerHTML = filtered.map(p => `
      <div class="product-card">
        <a href="product-detail?id=${p.id}" class="product-card-link-wrapper">
          <span class="product-badge ${p.category}">
            <i class="${p.icon}"></i> ${p.categoryLabel}
          </span>
          <div class="product-image-area">
            <i class="${p.icon}"></i>
          </div>
          <div class="product-details">
            <h4 class="product-title">${p.name}</h4>
            <p class="product-desc">${p.desc}</p>
          </div>
        </a>
        <div class="product-details-bottom" style="padding: 0 1.5rem 1.5rem 1.5rem; margin-top: auto;">
          <div class="product-footer-stacked">
            <div class="product-price-row">
              <span class="price-lbl">Precio Unitario</span>
              <span class="product-price">$${p.price.toFixed(2)}</span>
            </div>
            <button class="btn btn-primary btn-sm add-to-cart-block-btn" onclick="addToCart('${p.id}')">
              <i class="ri-shopping-cart-2-line"></i> Agregar al Carrito
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }
}

// 7. UPDATE CATEGORY COUNTS
function updateCategoryCounts() {
  const counts = {
    all: products.length,
    'insumos-medicos': 0,
    'materia-prima': 0,
    'hogar-limpieza': 0,
    'cuidado-personal': 0,
    envases: 0
  };

  products.forEach(p => {
    if (counts[p.category] !== undefined) {
      counts[p.category]++;
    }
  });

  DOM.countAll.textContent = counts.all;
  DOM.countInsumos.textContent = counts['insumos-medicos'] || 0;
  DOM.countMateria.textContent = counts['materia-prima'] || 0;
  DOM.countHogar.textContent = counts['hogar-limpieza'] || 0;
  DOM.countCuidado.textContent = counts['cuidado-personal'] || 0;
  DOM.countEnvases.textContent = counts.envases || 0;
}

window.addToCart = function(productId) {
  const p = products.find(prod => prod.id === productId);
  if (!p) return;

  const existing = cart.find(item => item.product.id === productId);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ product: p, quantity: 1 });
  }

  updateCartUI();
  showCartToast(p.name);
};

// Add client-specified custom products to shopping list
function addCustomProductToCart(name, qty) {
  const customId = `custom-${Date.now()}`;
  const customProduct = {
    id: customId,
    name: name,
    category: 'custom',
    categoryLabel: 'Pedido Especial',
    desc: 'Producto especificado por el cliente (cotización requerida).',
    price: 0,
    icon: 'ri-edit-box-line'
  };

  cart.push({ product: customProduct, quantity: qty });
  updateCartUI();
  showCartToast(name);
}
window.addCustomProductToCart = addCustomProductToCart;

function updateCartQty(productId, delta) {
  const item = cart.find(i => i.product.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.product.id !== productId);
  }

  updateCartUI();
}

function removeCartItem(productId) {
  cart = cart.filter(i => i.product.id !== productId);
  updateCartUI();
}

function clearEntireCart() {
  if (!confirm('¿Estás seguro de que deseas vaciar todo el carrito?')) return;
  cart = [];
  updateCartUI();
}

function updateCartUI() {
  saveCartToStorage();
  // Update badges
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  DOM.cartCountBadge.textContent = totalCount;
  DOM.cartItemsCount.textContent = totalCount;

  if (cart.length === 0) {
    DOM.cartEmptyState.style.display = 'flex';
    DOM.cartItemsContainer.style.display = 'none';
    DOM.cartSidebarFooter.style.display = 'none';
  } else {
    DOM.cartEmptyState.style.display = 'none';
    DOM.cartItemsContainer.style.display = 'flex';
    DOM.cartSidebarFooter.style.display = 'block';

    // Render items list with clear cart button
    DOM.cartItemsContainer.innerHTML = `<div class="clear-cart-row"><button class="btn btn-outline btn-sm clear-cart-btn" onclick="clearEntireCart()"><i class="ri-delete-bin-line"></i> Vaciar Carrito</button></div>` + cart.map(item => {
      const isCustom = item.product.category === 'custom';
      const priceDisplay = isCustom ? 'A cotizar' : `$${item.product.price.toFixed(2)} c/u`;
      return `
        <div class="cart-item-row">
          <div class="cart-item-icon">
            <i class="${item.product.icon}"></i>
          </div>
          <div class="cart-item-info">
            <h4>${item.product.name}</h4>
            <p>${item.product.categoryLabel}</p>
            <div class="cart-item-price">${priceDisplay}</div>
          </div>
          <div class="cart-item-actions">
            <div class="cart-qty-ctrl">
              <button class="qty-btn" onclick="updateCartQty('${item.product.id}', -1)" aria-label="Disminuir cantidad"><i class="ri-subtract-line"></i></button>
              <span class="qty-num">${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartQty('${item.product.id}', 1)" aria-label="Incrementar cantidad"><i class="ri-add-line"></i></button>
            </div>
            <button class="remove-item-btn" onclick="removeCartItem('${item.product.id}')">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

    // Totals calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const tax = subtotal * 0.15; // 15% IVA
    const total = subtotal + tax;

    const hasCustom = cart.some(item => item.product.category === 'custom');

    DOM.cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    DOM.cartTax.textContent = `$${tax.toFixed(2)}`;
    DOM.cartTotal.textContent = `$${total.toFixed(2)}${hasCustom ? ' + Cotiz.' : ''}`;
  }
}

// Global reference for onclick functions
window.updateCartQty = updateCartQty;
window.removeCartItem = removeCartItem;
window.clearEntireCart = clearEntireCart;

// 9. DRAWER SLIDE TOGGLE
function openCartDrawer() {
  DOM.cartSidebar.classList.add('open');
  DOM.cartBackdrop.classList.add('open');
}

function closeCartDrawer() {
  DOM.cartSidebar.classList.remove('open');
  DOM.cartBackdrop.classList.remove('open');
}

// 9B. ADD-TO-CART TOAST NOTIFICATION
let toastTimeout = null;
function showCartToast(productName) {
  const toast = document.getElementById('cartToast');
  const toastName = document.getElementById('toastProductName');
  if (!toast || !toastName) return;

  toastName.textContent = productName;
  toast.classList.add('visible');

  // Auto-dismiss after 6 seconds
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 6000);
}

function hideCartToast() {
  const toast = document.getElementById('cartToast');
  if (toast) toast.classList.remove('visible');
  clearTimeout(toastTimeout);
}

// 10. CHECKOUT REDIRECTOR
function checkoutOrder() {
  window.location.href = 'checkout';
}

// 11. BRANCHES INTERACTIVE COMPONENT
function selectBranch(branchCode) {
  selectedBranch = branchCode;
  const data = branches[branchCode];
  if (!data) return;

  // Update tabs active state
  DOM.agencyTabCards.forEach(card => {
    if (card.dataset.branch === branchCode) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // Update HUD/Map View details
  DOM.overlayBranchTitle.textContent = data.name;
  DOM.overlayBranchAddress.textContent = data.address;
  
  if (data.phone) {
    DOM.overlayCallBtn.style.display = 'inline-flex';
    DOM.overlayCallBtn.href = `tel:${data.phone.replace(/-/g, '')}`;
  } else {
    DOM.overlayCallBtn.style.display = 'none';
  }

  DOM.overlayWaBtn.href = data.link;
}

// 12. CHATBOT INTELLIGENT ROUTING
function appendChatMessage(sender, text) {
  const isBot = sender === 'bot';
  const msgDiv = document.createElement('div');
  msgDiv.className = `msg ${isBot ? 'bot-msg' : 'user-msg'}`;
  
  // Support formatting in chatbot
  msgDiv.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  DOM.chatMessages.appendChild(msgDiv);
  
  // Scroll to bottom
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

// Post user text to Backend Chat API
async function postChatbotQuery(queryText) {
  try {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: queryText })
    });

    if (!res.ok) throw new Error('Server Chatbot error');
    const data = await res.json();
    
    setTimeout(() => {
      appendChatMessage('bot', data.response);
    }, 400);

  } catch (error) {
    console.error('Chatbot API error. Falling back to local responder.', error);
    
    // Offline local fallback responding
    setTimeout(() => {
      let offlineResponse = '';
      const qLower = queryText.toLowerCase();

      if (qLower.includes('sucursal') || qLower.includes('ubicacion')) {
        offlineResponse = `📍 [Modo Offline] Nuestra matriz está en Luis Urdaneta 1111 entre Av. Quito y Av. Machala (Guayaquil).`;
      } else {
        offlineResponse = `⚠️ [Modo Offline] El servidor de chat no está disponible. Puedes llamarnos directamente al 042-296410.`;
      }
      appendChatMessage('bot', offlineResponse);
    }, 400);
  }
}

// 13. EVENT LISTENERS
function initEventListeners() {
  // Search Events
  DOM.searchInput.addEventListener('keyup', (e) => {
    searchQuery = e.target.value;
    if (searchQuery.length > 0) {
      DOM.clearSearchBtn.style.display = 'block';
    } else {
      DOM.clearSearchBtn.style.display = 'none';
    }
    renderCatalog();
  });

  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    searchQuery = '';
    DOM.clearSearchBtn.style.display = 'none';
    renderCatalog();
    DOM.searchInput.focus();
  });

  // Sort Select Event
  DOM.priceSort.addEventListener('change', (e) => {
    priceSort = e.target.value;
    renderCatalog();
  });

  // Reset filter button
  DOM.resetFiltersBtn.addEventListener('click', () => {
    activeCategory = 'all';
    searchQuery = '';
    priceSort = 'default';
    DOM.searchInput.value = '';
    DOM.clearSearchBtn.style.display = 'none';
    DOM.priceSort.value = 'default';
    
    DOM.categoryCards.forEach(c => {
      if (c.dataset.category === 'all') c.classList.add('active');
      else c.classList.remove('active');
    });

    renderCatalog();
  });

  // Category Cards Click Events
  DOM.categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      DOM.categoryCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      activeCategory = card.dataset.category;
      renderCatalog();
      
      document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Cart Drawer open/close
  DOM.openCartBtn.addEventListener('click', openCartDrawer);
  DOM.closeCartBtn.addEventListener('click', closeCartDrawer);
  DOM.cartBackdrop.addEventListener('click', closeCartDrawer);
  DOM.startShoppingBtn.addEventListener('click', () => {
    closeCartDrawer();
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
  });
  
  if (DOM.footerCartLink) {
    DOM.footerCartLink.addEventListener('click', (e) => {
      e.preventDefault();
      openCartDrawer();
    });
  }

  // Checkout submit
  DOM.checkoutBtn.addEventListener('click', checkoutOrder);

  // Cart Toast event listeners
  const toastContinueBtn = document.getElementById('toastContinueBtn');
  const toastCheckoutBtn = document.getElementById('toastCheckoutBtn');
  const toastCloseBtn = document.getElementById('toastCloseBtn');

  if (toastContinueBtn) {
    toastContinueBtn.addEventListener('click', hideCartToast);
  }
  if (toastCheckoutBtn) {
    toastCheckoutBtn.addEventListener('click', () => {
      hideCartToast();
      window.location.href = 'checkout';
    });
  }
  if (toastCloseBtn) {
    toastCloseBtn.addEventListener('click', hideCartToast);
  }

  // Agency Tabs Clicking
  DOM.agencyTabCards.forEach(card => {
    card.addEventListener('click', () => {
      selectBranch(card.dataset.branch);
    });
  });

  DOM.openBranchNav.addEventListener('click', () => {
    document.getElementById('agencies').scrollIntoView({ behavior: 'smooth' });
  });

  // Chatbot Toggles
  DOM.chatbotToggle.addEventListener('click', () => {
    DOM.chatbotWindow.classList.toggle('open');
    DOM.chatbotWidget.querySelector('.bot-notification-pulse').style.display = 'none';
  });

  DOM.chatbotClose.addEventListener('click', () => {
    DOM.chatbotWindow.classList.remove('open');
  });

  // Chat Quick Replies
  DOM.quickReplyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.textContent;
      const type = btn.dataset.reply;
      
      // User message
      appendChatMessage('user', text);
      
      // Post query to backend NLP routing
      postChatbotQuery(text);
    });
  });

  // Chat Custom User Input Text
  DOM.chatInputArea.addEventListener('submit', (e) => {
    e.preventDefault();
    const queryText = DOM.chatUserInput.value.trim();
    if (!queryText) return;

    appendChatMessage('user', queryText);
    DOM.chatUserInput.value = '';

    postChatbotQuery(queryText);
  });

  // Footer Category Links
  DOM.footerCatLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const cat = link.dataset.cat;
      DOM.categoryCards.forEach(c => {
        if (c.dataset.category === cat) {
          c.click();
        }
      });
    });
  });

  // Custom Product Form Submission listener
  if (DOM.customProductForm) {
    DOM.customProductForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const customName = DOM.customItemName.value.trim();
      const customQty = parseInt(DOM.customItemQty.value) || 1;
      
      if (!customName) return;

      addCustomProductToCart(customName, customQty);

      // Reset fields
      DOM.customItemName.value = '';
      DOM.customItemQty.value = '1';
    });
  }
}

let isInitialized = false;

// 14. APP INITIALIZATION WITH BACKEND INGESTION
async function init() {
  if (isInitialized) return;
  isInitialized = true;
  await loadServerData();

  // Handle Category Redirects from other pages
  const redirectCat = localStorage.getItem('activeCategoryRedirect');
  if (redirectCat) {
    activeCategory = redirectCat;
    localStorage.removeItem('activeCategoryRedirect');
    
    // Update active class on category cards
    DOM.categoryCards.forEach(c => {
      if (c.dataset.category === activeCategory) c.classList.add('active');
      else c.classList.remove('active');
    });
  }

  // Handle Search Query Redirects
  const params = new URLSearchParams(window.location.search);
  const q = params.get('search');
  if (q) {
    searchQuery = q;
    DOM.searchInput.value = q;
    DOM.clearSearchBtn.style.display = 'block';
  }

  renderCatalog();
  updateCategoryCounts();
  updateCartUI();
  initEventListeners();
  
  // Set default active agency view
  selectBranch('guayaquil');
}

// Start client-server application
document.addEventListener('DOMContentLoaded', init);
init(); // Backwards fallback

/* ==========================================================================
   PRODUCT DETAIL PAGE CONTROLLER: LA CASA DEL ESPARADRAPO
   ========================================================================== */

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

// Dynamic Database State
let products = [];
let branches = {};
let currentProduct = null;
let pdpQuantity = 1;

// Detailed Specifications Map for Premium Ficha Técnica
const productSpecsMap = {
  'im-1': {
    presentation: 'Rollo de 3" x 5 yardas (Unidad)',
    sanitaryCode: 'ARCSA-2023-IM-09827',
    composition: 'Tela de algodón 100% tejida de alta resistencia, recubierta con adhesivo hipoalergénico a base de óxido de zinc.',
    usage: 'Fijación firme de apósitos, gasas, vendajes compresivos, catéteres y tubos médicos.'
  },
  'im-2': {
    presentation: 'Caja de 100 unidades (Sobres individuales estériles)',
    sanitaryCode: 'ARCSA-2022-IM-03485',
    composition: 'Algodón hidrófilo 100% blanqueado, libre de impurezas y almidón. Gasa tejida de 20x12.',
    usage: 'Limpieza y desinfección de heridas quirúrgicas, absorción de fluidos corporales durante curaciones.'
  },
  'im-3': {
    presentation: 'Rollo elástico de 4" de ancho (Unidad)',
    sanitaryCode: 'ARCSA-2021-IM-04392',
    composition: 'Fibras de poliéster y elastómero trenzado de alta compresión. Hipoalergénico y lavable.',
    usage: 'Tratamiento de esguinces, vendajes de compresión vascular y soporte deportivo articular.'
  },
  'im-4': {
    presentation: 'Caja de 100 unidades (Embalaje individual estéril)',
    sanitaryCode: 'ARCSA-2023-IM-01938',
    composition: 'Cilindro y émbolo de polipropileno grado médico, aguja de acero inoxidable con biselado triple.',
    usage: 'Administración de medicamentos inyectables por vía intramuscular o intravenosa, y toma de muestras.'
  },
  'mp-1': {
    presentation: 'Envase plástico de 1 Litro (Grado USP)',
    sanitaryCode: 'ARCSA-2023-CP-08249',
    composition: 'Glicerol vegetal puro al 99.5% obtenido por hidrólisis de aceites de coco y palma.',
    usage: 'Humectante base para cosméticos, jabones, cremas hidratantes, y excipiente farmacéutico.'
  },
  'mp-2': {
    presentation: 'Envase Galón de 3.78 Litros',
    sanitaryCode: 'ARCSA-2024-HL-01293',
    composition: 'Alcohol Etílico de caña de azúcar al 70% v/v, agua purificada y desmineralizada.',
    usage: 'Antiséptico de frotación externa para manos, desinfección de instrumental médico y superficies.'
  },
  'mp-3': {
    presentation: 'Saco / Funda hermética de 1 Kilogramo',
    sanitaryCode: 'ARCSA-2023-MP-00341',
    composition: 'Bicarbonato de Sodio puro al 99.9%, grado farmacéutico y alimenticio.',
    usage: 'Formulaciones efervescentes, antiácido estomacal, limpieza ecológica y aditivo cosmético.'
  },
  'hl-1': {
    presentation: 'Envase Galón de 3.78 Litros',
    sanitaryCode: 'No Requerido (Notificación Sanitaria de Limpieza)',
    composition: 'Tensoactivos aniónicos, agentes abrillantadores ópticos, conservantes y fragancias concentradas.',
    usage: 'Lavado a máquina y a mano de prendas delicadas, remoción de grasas en telas sin dañarlas.'
  },
  'hl-2': {
    presentation: 'Envase Galón de 3.78 Litros',
    sanitaryCode: 'ARCSA-2022-HL-02492',
    composition: 'Cloruro de benzalconio (Amonio cuaternario de quinta generación al 10%), aroma floral.',
    usage: 'Desinfección profunda de pisos de quirófano, áreas comunes, mesones de laboratorio y consultorios.'
  },
  'cp-1': {
    presentation: 'Frasco dispensador de 500 mililitros',
    sanitaryCode: 'ARCSA-2024-CP-09281',
    composition: 'Urea cosmética al 10%, extracto de avena, glicerina, base autoemulsionante dermatológica.',
    usage: 'Tratamiento diario para pieles xeróticas, descamadas o ásperas en pies, codos y cuerpo.'
  },
  'cp-2': {
    presentation: 'Tubo depresible de 250 mililitros',
    sanitaryCode: 'ARCSA-2023-CP-11394',
    composition: 'Dióxido de titanio, óxido de zinc micronizado, filtros orgánicos UVA/UVB, vitamina E.',
    usage: 'Protección diaria de la piel expuesta a radiación solar intensa. Hipoalergénico y no comedogénico.'
  },
  'ev-1': {
    presentation: 'Caja con 50 frascos con gotero de vidrio',
    sanitaryCode: 'No Requerido (Material de Empaque)',
    composition: 'Vidrio ámbar tipo III refractario, tetina de caucho natural y pipeta dosificadora de vidrio.',
    usage: 'Envasado seguro de fórmulas magistrales farmacéuticas, aceites esenciales y sérums cosméticos.'
  },
  'ev-2': {
    presentation: 'Caja con 20 botellas y cabezal atomizador',
    sanitaryCode: 'No Requerido (Material de Empaque)',
    composition: 'Polietileno tereftalato (PET) transparente de alta densidad, válvula de gatillo plástico.',
    usage: 'Envasado y aspersión fina de alcohol antiséptico, sanitizantes de superficies y tónicos capilares.'
  }
};

// Default Fallbacks
const FALLBACK_PRODUCTS = [
  {
    id: 'im-1',
    name: 'Esparadrapo de Tela Impermeable 3"',
    category: 'insumos-medicos',
    categoryLabel: 'Insumos Médicos',
    desc: '[Offline Mode] Esparadrapo de alta adherencia y resistencia al agua, ideal para fijar vendajes.',
    price: 2.50,
    icon: 'ri-first-aid-kit-line'
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

// Shopping Cart State (Sincronizado)
let cart = [];

// DOM ELEMENTS
const DOM = {
  // Breadcrumbs
  breadcrumbCategory: document.getElementById('breadcrumbCategory'),
  breadcrumbCurrent: document.getElementById('breadcrumbCurrent'),

  // PDP Container Elements
  pdpMainViewer: document.getElementById('pdpMainViewer'),
  pdpThumbnailsRow: document.getElementById('pdpThumbnailsRow'),
  pdpCategoryBadge: document.getElementById('pdpCategoryBadge'),
  pdpTitle: document.getElementById('pdpTitle'),
  pdpPrice: document.getElementById('pdpPrice'),
  pdpDescription: document.getElementById('pdpDescription'),
  pdpQtyInput: document.getElementById('pdpQtyInput'),
  pdpQtyDec: document.getElementById('pdpQtyDec'),
  pdpQtyInc: document.getElementById('pdpQtyInc'),
  pdpAddCartBtn: document.getElementById('pdpAddCartBtn'),
  pdpWaInquiryBtn: document.getElementById('pdpWaInquiryBtn'),

  // PDP Technical Specs
  specPresentation: document.getElementById('specPresentation'),
  specSanitaryCode: document.getElementById('specSanitaryCode'),
  specComposition: document.getElementById('specComposition'),
  specUsage: document.getElementById('specUsage'),

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

  // Search input redirecting
  searchInput: document.getElementById('catalogSearch'),

  // Custom Item Form Elements
  customProductForm: document.getElementById('customProductForm'),
  customItemName: document.getElementById('customItemName'),
  customItemQty: document.getElementById('customItemQty')
};

// 1. INGEST DATA FROM BACKEND REST API
async function loadServerData() {
  try {
    const productsRes = await fetch(`${API_BASE_URL}/products`);
    if (!productsRes.ok) throw new Error('Failed to load products');
    products = await productsRes.json();

    const branchesRes = await fetch(`${API_BASE_URL}/branches`);
    if (!branchesRes.ok) throw new Error('Failed to load branches');
    branches = await branchesRes.json();

  } catch (error) {
    console.warn('⚠️ PDP: Backend API unreachable. Loading fallback data...', error);
    products = FALLBACK_PRODUCTS;
    branches = FALLBACK_BRANCHES;
  }
}

// 2. RETRIEVE CURRENT PRODUCT DETAILS
function getSelectedProduct() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  
  if (!id) {
    console.error('No product ID supplied in query parameters.');
    window.location.href = 'index.html';
    return;
  }

  currentProduct = products.find(p => p.id === id);
  if (!currentProduct) {
    console.error('Product not found for ID:', id);
    window.location.href = 'index.html';
  }
}

// 3. RENDER THE DETAILED SPECIFICATIONS & GALLERY
function renderProductDetail() {
  if (!currentProduct) return;

  // Breadcrumbs
  DOM.breadcrumbCategory.textContent = currentProduct.categoryLabel;
  DOM.breadcrumbCategory.href = `index.html#catalogo`;
  DOM.breadcrumbCategory.onclick = () => {
    localStorage.setItem('activeCategoryRedirect', currentProduct.category);
  };
  DOM.breadcrumbCurrent.textContent = currentProduct.name;

  // Header Details
  DOM.pdpCategoryBadge.textContent = currentProduct.categoryLabel;
  DOM.pdpCategoryBadge.className = `product-badge ${currentProduct.category}`;
  DOM.pdpTitle.textContent = currentProduct.name;
  DOM.pdpPrice.textContent = `$${currentProduct.price.toFixed(2)}`;
  DOM.pdpDescription.textContent = currentProduct.desc;

  // Technical specs
  const specs = productSpecsMap[currentProduct.id] || {
    presentation: 'Por definir / Unidad',
    sanitaryCode: 'En trámite',
    composition: 'Información composición no provista.',
    usage: 'Uso general sugerido.'
  };

  DOM.specPresentation.textContent = specs.presentation;
  DOM.specSanitaryCode.textContent = specs.sanitaryCode;
  DOM.specComposition.textContent = specs.composition;
  DOM.specUsage.textContent = specs.usage;

  // WhatsApp link generator
  const waBranch = branches['guayaquil'] || FALLBACK_BRANCHES['guayaquil'];
  const waMsg = `Hola, quisiera recibir más detalles e información comercial sobre el producto: *${currentProduct.name}* (ID: ${currentProduct.id})`;
  DOM.pdpWaInquiryBtn.href = `https://api.whatsapp.com/send?phone=${waBranch.whatsapp}&text=${encodeURIComponent(waMsg)}`;

  // Main Image Viewer Rendering
  DOM.pdpMainViewer.innerHTML = `
    <div class="pdp-visual-icon-container gradient-var-1">
      <i class="${currentProduct.icon} pdp-icon-hero"></i>
    </div>
  `;

  // Gallery Thumbnails (Variations) Rendering
  // Renders 3 virtual photo views: Front view, Details view, Packaging view
  DOM.pdpThumbnailsRow.innerHTML = `
    <button class="thumb-btn active" data-variation="1">
      <i class="${currentProduct.icon}"></i>
      <span>Vista Frontal</span>
    </button>
    <button class="thumb-btn" data-variation="2">
      <i class="ri-search-eye-line"></i>
      <span>Detalle</span>
    </button>
    <button class="thumb-btn" data-variation="3">
      <i class="ri-archive-line"></i>
      <span>Empaque</span>
    </button>
  `;

  // Setup gallery switching events
  const thumbs = document.querySelectorAll('.thumb-btn');
  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      
      const variation = thumb.dataset.variation;
      updateMainViewerImage(variation);
    });
  });
}

// Switches gradients/icons to simulate multiple photos
function updateMainViewerImage(variation) {
  let innerHtml = '';
  if (variation === '1') {
    innerHtml = `<div class="pdp-visual-icon-container gradient-var-1"><i class="${currentProduct.icon} pdp-icon-hero"></i></div>`;
  } else if (variation === '2') {
    innerHtml = `<div class="pdp-visual-icon-container gradient-var-2"><i class="ri-zoom-in-line pdp-icon-hero"></i></div>`;
  } else if (variation === '3') {
    innerHtml = `<div class="pdp-visual-icon-container gradient-var-3"><i class="ri-archive-line pdp-icon-hero"></i></div>`;
  }

  DOM.pdpMainViewer.innerHTML = innerHtml;
}

// 4. PDP QUANTITY CONTROL ACTIONS
function changePdpQty(delta) {
  pdpQuantity += delta;
  if (pdpQuantity < 1) pdpQuantity = 1;
  DOM.pdpQtyInput.value = pdpQuantity;
}

function handlePdpQtyInput(event) {
  const value = parseInt(event.target.value) || 1;
  pdpQuantity = value < 1 ? 1 : value;
  DOM.pdpQtyInput.value = pdpQuantity;
}

// Add current product with specific PDP quantity to cart
function addCurrentProductToCart() {
  if (!currentProduct) return;

  const existing = cart.find(item => item.product.id === currentProduct.id);
  if (existing) {
    existing.quantity += pdpQuantity;
  } else {
    cart.push({ product: currentProduct, quantity: pdpQuantity });
  }

  updateCartUI();
  showCartToast(currentProduct.name);
  
  // Reset PDP selector
  pdpQuantity = 1;
  DOM.pdpQtyInput.value = 1;
}

// 5. LOCAL STORAGE CART SYNC (Shared routines)
function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  try {
    const stored = localStorage.getItem('cart');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error loading cart from storage', e);
    return [];
  }
}

// 6. SHARED CART DRAWER RENDER
function openCartDrawer() {
  DOM.cartSidebar.classList.add('open');
  DOM.cartBackdrop.classList.add('open');
}

function closeCartDrawer() {
  DOM.cartSidebar.classList.remove('open');
  DOM.cartBackdrop.classList.remove('open');
}

// 6B. ADD-TO-CART TOAST NOTIFICATION
let toastTimeout = null;
function showCartToast(productName) {
  const toast = document.getElementById('cartToast');
  const toastName = document.getElementById('toastProductName');
  if (!toast || !toastName) return;

  toastName.textContent = productName;
  toast.classList.add('visible');

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

    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const tax = subtotal * 0.15;
    const total = subtotal + tax;

    const hasCustom = cart.some(item => item.product.category === 'custom');

    DOM.cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    DOM.cartTax.textContent = `$${tax.toFixed(2)}`;
    DOM.cartTotal.textContent = `$${total.toFixed(2)}${hasCustom ? ' + Cotiz.' : ''}`;
  }
}

// Global binding for DOM actions
window.updateCartQty = updateCartQty;
window.removeCartItem = removeCartItem;
window.clearEntireCart = clearEntireCart;

// 7. CUSTOM CART ADDITIONS
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

// 8. CHECKOUT REDIRECTOR
function checkoutOrder() {
  window.location.href = 'checkout';
}

// 9. CHATBOT SYSTEM (Sincronizado)
function appendChatMessage(sender, text) {
  const isBot = sender === 'bot';
  const msgDiv = document.createElement('div');
  msgDiv.className = `msg ${isBot ? 'bot-msg' : 'user-msg'}`;
  msgDiv.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  DOM.chatMessages.appendChild(msgDiv);
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

async function postChatbotQuery(queryText) {
  try {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: queryText })
    });
    if (!res.ok) throw new Error('Chatbot error');
    const data = await res.json();
    setTimeout(() => appendChatMessage('bot', data.response), 400);
  } catch (error) {
    setTimeout(() => {
      appendChatMessage('bot', `⚠️ [Modo Offline] El servidor de chat no está disponible. Escríbenos directamente a la Agencia Matriz al WhatsApp: **+593 999 422 969**.`);
    }, 400);
  }
}

// 10. BIND EVENT LISTENERS
function initEventListeners() {
  // Quantity clicks
  DOM.pdpQtyDec.addEventListener('click', () => changePdpQty(-1));
  DOM.pdpQtyInc.addEventListener('click', () => changePdpQty(1));
  DOM.pdpQtyInput.addEventListener('change', handlePdpQtyInput);
  
  // Add to cart click
  DOM.pdpAddCartBtn.addEventListener('click', addCurrentProductToCart);

  // Cart drawer open/close
  DOM.openCartBtn.addEventListener('click', openCartDrawer);
  DOM.closeCartBtn.addEventListener('click', closeCartDrawer);
  DOM.cartBackdrop.addEventListener('click', closeCartDrawer);
  DOM.startShoppingBtn.addEventListener('click', () => {
    closeCartDrawer();
    window.location.href = 'index.html#catalogo';
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
    toastContinueBtn.addEventListener('click', () => {
      hideCartToast();
      window.location.href = 'index.html#catalogo';
    });
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

  // Custom Item Form Submit
  if (DOM.customProductForm) {
    DOM.customProductForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const customName = DOM.customItemName.value.trim();
      const customQty = parseInt(DOM.customItemQty.value) || 1;
      
      if (!customName) return;
      addCustomProductToCart(customName, customQty);

      DOM.customItemName.value = '';
      DOM.customItemQty.value = '1';
    });
  }

  // Search input: Press enter to redirect to home catalog with search query
  DOM.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const q = DOM.searchInput.value.trim();
      if (q) {
        window.location.href = `index.html?search=${encodeURIComponent(q)}#catalogo`;
      }
    }
  });

  // Chatbot floating triggers
  DOM.chatbotToggle.addEventListener('click', () => {
    DOM.chatbotWindow.classList.toggle('open');
    DOM.chatbotWidget.querySelector('.bot-notification-pulse').style.display = 'none';
  });
  DOM.chatbotClose.addEventListener('click', () => {
    DOM.chatbotWindow.classList.remove('open');
  });

  DOM.quickReplyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      appendChatMessage('user', btn.textContent);
      postChatbotQuery(btn.textContent);
    });
  });

  DOM.chatInputArea.addEventListener('submit', (e) => {
    e.preventDefault();
    const txt = DOM.chatUserInput.value.trim();
    if (!txt) return;
    appendChatMessage('user', txt);
    DOM.chatUserInput.value = '';
    postChatbotQuery(txt);
  });

  // Footer Category links
  DOM.footerCatLinks.forEach(link => {
    link.addEventListener('click', () => {
      localStorage.setItem('activeCategoryRedirect', link.dataset.cat);
    });
  });
}

// 11. BIND SEARCH REDIRECTOR TRIGGER ON HOME PAGE LOAD
// If coming from another page with a ?search= query, index.html must load and trigger search query.
// We will add this handler logic to frontend/app.js to support redirection searches.

let isInitialized = false;

// 12. INITIALIZATION
async function init() {
  if (isInitialized) return;
  isInitialized = true;
  cart = loadCartFromStorage();
  await loadServerData();
  getSelectedProduct();
  renderProductDetail();
  updateCartUI();
  initEventListeners();
}

document.addEventListener('DOMContentLoaded', init);
init(); // Backwards fallback

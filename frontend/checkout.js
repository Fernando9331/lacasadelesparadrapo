/* ==========================================================================
   CHECKOUT & PROFORMA CONTROLLER: LA CASA DEL ESPARADRAPO
   ========================================================================== */

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

// Checkout Page State
let cart = [];
let branches = {};
let selectedPaymentMethod = 'transfer'; // Default
let selectedDeliveryType = 'pickup'; // Default

// Fallbacks
const FALLBACK_BRANCHES = {
  'guayaquil': {
    name: 'Agencia Matriz [Offline]',
    address: 'Luis Urdaneta 1111 entre Av. Quito y Av. Machala',
    phone: '042-296410',
    whatsapp: '593999422969',
    link: 'https://wa.me/593999422969'
  }
};

// DOM ELEMENTS
const DOM = {
  // Form fields
  form: document.getElementById('billingDetailsForm'),
  customerName: document.getElementById('billCustomerName'),
  customerEmail: document.getElementById('billEmail'),
  docType: document.getElementById('billDocType'),
  docNum: document.getElementById('billDocNum'),
  phone: document.getElementById('billPhone'),
  agencySelect: document.getElementById('billAgencySelect'),
  
  // Logistics
  deliveryRadioCards: document.querySelectorAll('.delivery-radio-card'),
  shippingDetailsPanel: document.getElementById('shippingDetailsPanel'),
  shipProvince: document.getElementById('shipProvince'),
  shipCity: document.getElementById('shipCity'),
  shipAddress: document.getElementById('shipAddress'),

  // Payment Tabs
  payTabBtns: document.querySelectorAll('.pay-tab-btn'),
  payPanelTransfer: document.getElementById('payPanelTransfer'),
  payPanelDelivery: document.getElementById('payPanelDelivery'),

  // Cart summary column
  checkoutItemsList: document.getElementById('checkoutItemsList'),
  summarySubtotal: document.getElementById('summarySubtotal'),
  summaryShipping: document.getElementById('summaryShipping'),
  summaryTax: document.getElementById('summaryTax'),
  summaryTotal: document.getElementById('summaryTotal'),

  // Bottom action buttons
  downloadProformaBtn: document.getElementById('downloadProformaBtn'),
  submitOrderBtn: document.getElementById('submitOrderBtn'),

  // PDF Print templates variables
  proformaPrintTemplate: document.getElementById('proformaPrintTemplate'),
  pdfClientName: document.getElementById('pdfClientName'),
  pdfClientDoc: document.getElementById('pdfClientDoc'),
  pdfClientPhone: document.getElementById('pdfClientPhone'),
  pdfClientEmail: document.getElementById('pdfClientEmail'),
  pdfClientDelivery: document.getElementById('pdfClientDelivery'),
  pdfClientPayment: document.getElementById('pdfClientPayment'),
  pdfClientAddressRow: document.getElementById('pdfClientAddressRow'),
  pdfClientAddress: document.getElementById('pdfClientAddress'),
  pdfItemsTableBody: document.getElementById('pdfItemsTableBody'),
  pdfSubtotal: document.getElementById('pdfSubtotal'),
  pdfShipping: document.getElementById('pdfShipping'),
  pdfTax: document.getElementById('pdfTax'),
  pdfTotal: document.getElementById('pdfTotal')
};

// 1. CARGA EL CARRITO DESDE LOCAL STORAGE
function loadCart() {
  try {
    const stored = localStorage.getItem('cart');
    cart = stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error loading cart in checkout', e);
    cart = [];
  }

  if (cart.length === 0) {
    alert('Tu carrito está vacío. Serás redirigido al catálogo.');
    window.location.href = 'index.html';
  }
}

// 2. OBTIENE SUCURSALES DESDE BACKEND
async function loadBranches() {
  try {
    const res = await fetch(`${API_BASE_URL}/branches`);
    if (!res.ok) throw new Error('Failed to load branches');
    branches = await res.json();
  } catch (error) {
    console.warn('⚠️ Checkout: Fallback branches loaded.', error);
    branches = FALLBACK_BRANCHES;
  }

  // Populate branch select field
  DOM.agencySelect.innerHTML = Object.keys(branches).map(key => {
    const b = branches[key];
    return `<option value="${key}">${b.name} - Telf: ${b.phone}</option>`;
  }).join('');
}

// 3. RENDERIZA EL CARRITO EN EL RESUMEN
function renderCheckoutSummary() {
  DOM.checkoutItemsList.innerHTML = cart.map(item => {
    const isCustom = item.product.category === 'custom';
    const priceDisplay = isCustom ? 'A cotizar' : `$${(item.product.price * item.quantity).toFixed(2)}`;
    return `
      <div class="checkout-item-row">
        <div class="item-visual">
          <i class="${item.product.icon}"></i>
        </div>
        <div class="item-text">
          <h4>${item.product.name}</h4>
          <p>Cant: ${item.quantity} x ${isCustom ? 'Pedido Especial' : `$${item.product.price.toFixed(2)}`}</p>
        </div>
        <div class="item-price-total">
          ${priceDisplay}
        </div>
      </div>
    `;
  }).join('');

  recalculateTotals();
}

// 4. RECALCULA SUMATORIA E IMPUESTOS
function recalculateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shippingFee = selectedDeliveryType === 'shipping' ? 5.00 : 0.00;
  const tax = (subtotal + shippingFee) * 0.15; // 15% IVA
  const total = subtotal + shippingFee + tax;

  const hasCustom = cart.some(item => item.product.category === 'custom');

  DOM.summarySubtotal.textContent = `$${subtotal.toFixed(2)}`;
  DOM.summaryShipping.textContent = `$${shippingFee.toFixed(2)}`;
  DOM.summaryTax.textContent = `$${tax.toFixed(2)}`;
  DOM.summaryTotal.textContent = `$${total.toFixed(2)}${hasCustom ? ' + Cotiz.' : ''}`;
}

// 5. VALIDACIÓN DEL FORMULARIO DE FACTURACIÓN
function validateBillingForm() {
  const name = DOM.customerName.value.trim();
  const email = DOM.customerEmail.value.trim();
  const docNum = DOM.docNum.value.trim();
  const phone = DOM.phone.value.trim();
  const docTypeVal = DOM.docType.value;

  if (!name) {
    alert('Ingresa tu Nombre Completo o Razón Social.');
    DOM.customerName.focus();
    return false;
  }
  if (!email || !email.includes('@')) {
    alert('Ingresa un Correo Electrónico válido.');
    DOM.customerEmail.focus();
    return false;
  }
  if (!docNum) {
    alert('Ingresa tu Cédula o RUC.');
    DOM.docNum.focus();
    return false;
  }
  if (docTypeVal === 'cedula' && docNum.length !== 10) {
    alert('La Cédula de Identidad debe tener exactamente 10 dígitos.');
    DOM.docNum.focus();
    return false;
  }
  if (docTypeVal === 'ruc' && docNum.length !== 13) {
    alert('El R.U.C. debe tener exactamente 13 dígitos.');
    DOM.docNum.focus();
    return false;
  }
  if (!phone) {
    alert('Ingresa tu número de Teléfono Celular/WhatsApp.');
    DOM.phone.focus();
    return false;
  }

  // If shipping is selected, validate address fields
  if (selectedDeliveryType === 'shipping') {
    const city = DOM.shipCity.value.trim();
    const address = DOM.shipAddress.value.trim();
    if (!city) {
      alert('Ingresa la Ciudad de envío.');
      DOM.shipCity.focus();
      return false;
    }
    if (!address) {
      alert('Ingresa tu Dirección completa de entrega.');
      DOM.shipAddress.focus();
      return false;
    }
  }

  return true;
}

// 6. EXPORTACIÓN A PROFORMA PDF (HTML5 -> PDF)
function downloadPDFProforma() {
  if (!validateBillingForm()) return;

  // Llenar datos de cliente en la proforma oculta
  DOM.pdfClientName.textContent = DOM.customerName.value.trim();
  
  const docTypeLabel = DOM.docType.options[DOM.docType.selectedIndex].text;
  DOM.pdfClientDoc.textContent = `${docTypeLabel}: ${DOM.docNum.value.trim()}`;
  DOM.pdfClientPhone.textContent = DOM.phone.value.trim();
  DOM.pdfClientEmail.textContent = DOM.customerEmail.value.trim();

  // Delivery details
  const branchName = DOM.agencySelect.options[DOM.agencySelect.selectedIndex].text;
  if (selectedDeliveryType === 'pickup') {
    DOM.pdfClientDelivery.textContent = `Retiro en Agencia (${branchName})`;
    DOM.pdfClientAddressRow.style.display = 'none';
  } else {
    DOM.pdfClientDelivery.textContent = 'Envío por Servientrega (A Domicilio)';
    DOM.pdfClientAddressRow.style.display = 'table-row';
    DOM.pdfClientAddress.textContent = `${DOM.shipAddress.value.trim()}, ${DOM.shipCity.value.trim()} - ${DOM.shipProvince.value}`;
  }

  // Payment method details
  DOM.pdfClientPayment.textContent = selectedPaymentMethod === 'transfer' 
    ? 'Transferencia Bancaria (Banco Pichincha)' 
    : 'Pago Contra Entrega';

  // Render items in PDF table
  DOM.pdfItemsTableBody.innerHTML = cart.map((item, index) => {
    const isCustom = item.product.category === 'custom';
    const unitPriceText = isCustom ? 'A COTIZAR' : `$${item.product.price.toFixed(2)}`;
    const totalPriceText = isCustom ? 'A COTIZAR' : `$${(item.product.price * item.quantity).toFixed(2)}`;
    return `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td><strong>${item.product.name}</strong><br><small style="color:#555;">${item.product.desc}</small></td>
        <td style="text-align: center;">${item.product.categoryLabel}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${unitPriceText}</td>
        <td style="text-align: right; font-weight: bold;">${totalPriceText}</td>
      </tr>
    `;
  }).join('');

  // Update PDF totals
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shippingFee = selectedDeliveryType === 'shipping' ? 5.00 : 0.00;
  const tax = (subtotal + shippingFee) * 0.15;
  const total = subtotal + shippingFee + tax;

  const hasCustom = cart.some(item => item.product.category === 'custom');

  DOM.pdfSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  DOM.pdfShipping.textContent = `$${shippingFee.toFixed(2)}`;
  DOM.pdfTax.textContent = `$${tax.toFixed(2)}`;
  DOM.pdfTotal.textContent = `$${total.toFixed(2)}${hasCustom ? ' + Cotización Pendiente' : ''}`;

  // Execute PDF generation using html2pdf.js
  const proformaEl = DOM.proformaPrintTemplate;
  proformaEl.parentElement.style.display = 'block'; // Temporarily unhide container for extraction
  
  const opt = {
    margin:       10,
    filename:     `Proforma_La_Casa_del_Esparadrapo_${Date.now().toString().slice(-5)}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(proformaEl).save().then(() => {
    proformaEl.parentElement.style.display = 'none'; // Re-hide container
  });
}

// 7. COMPILA Y ENVÍA PEDIDO A WHATSAPP
function submitCheckoutOrder() {
  if (!validateBillingForm()) return;

  const name = DOM.customerName.value.trim();
  const docTypeLabel = DOM.docType.options[DOM.docType.selectedIndex].text;
  const docNum = DOM.docNum.value.trim();
  const email = DOM.customerEmail.value.trim();
  const phone = DOM.phone.value.trim();

  const selectedBranchCode = DOM.agencySelect.value;
  const branchInfo = branches[selectedBranchCode] || FALLBACK_BRANCHES['guayaquil'];

  // Compiler Message
  let message = `*ORDEN DE COMPRA OFICIAL - LA CASA DEL ESPARADRAPO*\n`;
  message += `===================================\n`;
  message += `*DATOS DE FACTURACIÓN:*\n`;
  message += `• *Cliente:* ${name}\n`;
  message += `• *Documento:* ${docTypeLabel}: ${docNum}\n`;
  message += `• *Celular/WhatsApp:* ${phone}\n`;
  message += `• *Correo:* ${email}\n\n`;

  message += `*DATOS DE DESPACHO:*\n`;
  const branchNameSelected = DOM.agencySelect.options[DOM.agencySelect.selectedIndex].text;
  if (selectedDeliveryType === 'pickup') {
    message += `• *Método:* Retiro en Agencia (${branchNameSelected})\n\n`;
  } else {
    message += `• *Método:* Envío por Servientrega\n`;
    message += `• *Provincia:* ${DOM.shipProvince.value}\n`;
    message += `• *Ciudad:* ${DOM.shipCity.value.trim()}\n`;
    message += `• *Dirección:* ${DOM.shipAddress.value.trim()}\n\n`;
  }

  message += `*MÉTODO DE PAGO:*\n`;
  message += selectedPaymentMethod === 'transfer'
    ? `• *Pago:* Transferencia Bancaria (Banco Pichincha)\n\n`
    : `• *Pago:* Contra Entrega (Efectivo / Tarjeta al retirar)\n\n`;

  message += `*DETALLE DE PRODUCTOS:*\n`;
  cart.forEach(item => {
    if (item.product.category === 'custom') {
      message += `• ${item.quantity}x [Pedido Especial] ${item.product.name} → *[A COTIZAR]*\n`;
    } else {
      const itemTotal = item.product.price * item.quantity;
      message += `• ${item.quantity}x ${item.product.name} _($${item.product.price.toFixed(2)} c/u)_ → *$${itemTotal.toFixed(2)}*\n`;
    }
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shippingFee = selectedDeliveryType === 'shipping' ? 5.00 : 0.00;
  const tax = (subtotal + shippingFee) * 0.15;
  const total = subtotal + shippingFee + tax;

  const hasCustom = cart.some(item => item.product.category === 'custom');

  message += `\n===================================\n`;
  message += `*Subtotal:* $${subtotal.toFixed(2)}\n`;
  message += `*Envío:* $${shippingFee.toFixed(2)}\n`;
  message += `*I.V.A. (15%):* $${tax.toFixed(2)}\n`;
  message += `*TOTAL ESTIMADO:* $${total.toFixed(2)}${hasCustom ? ' + Cotización Pendiente' : ''}\n\n`;
  
  if (hasCustom) {
    message += `*Nota:* Adjunto el comprobante e incluyo ítems especiales. Favor cotizar.\n\n`;
  }
  
  message += `Hola, acabo de generar mi proforma PDF y adjunto este pedido para coordinar el pago y el despacho de los insumos. ¡Gracias!`;

  const waUrl = `https://api.whatsapp.com/send?phone=${branchInfo.whatsapp}&text=${encodeURIComponent(message)}`;

  // Reset and redirect
  localStorage.setItem('cart', JSON.stringify([])); // Empty cart in storage
  window.open(waUrl, '_blank');
  
  alert('¡Felicidades! Tu orden ha sido enviada al asesor. Serás redirigido a la página principal.');
  window.location.href = 'index.html';
}

// 8. BIND EVENT LISTENERS
function initEventListeners() {
  // Delivery option changes
  DOM.deliveryRadioCards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    card.addEventListener('click', () => {
      DOM.deliveryRadioCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      radio.checked = true;
      selectedDeliveryType = radio.value;

      if (selectedDeliveryType === 'shipping') {
        DOM.shippingDetailsPanel.style.display = 'block';
        DOM.shipCity.required = true;
        DOM.shipAddress.required = true;
      } else {
        DOM.shippingDetailsPanel.style.display = 'none';
        DOM.shipCity.required = false;
        DOM.shipAddress.required = false;
      }
      recalculateTotals();
    });
  });

  // Payment tab changes
  DOM.payTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.payTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPaymentMethod = btn.dataset.method;

      if (selectedPaymentMethod === 'transfer') {
        DOM.payPanelTransfer.style.display = 'block';
        DOM.payPanelDelivery.style.display = 'none';
      } else {
        DOM.payPanelTransfer.style.display = 'none';
        DOM.payPanelDelivery.style.display = 'block';
      }
    });
  });

  // Action buttons
  DOM.downloadProformaBtn.addEventListener('click', downloadPDFProforma);
  DOM.submitOrderBtn.addEventListener('click', submitCheckoutOrder);
}

// 9. INITIALIZE
async function init() {
  loadCart();
  await loadBranches();
  renderCheckoutSummary();
  initEventListeners();
}

document.addEventListener('DOMContentLoaded', init);
init(); // Backwards fallback

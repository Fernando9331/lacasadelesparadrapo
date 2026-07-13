const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas HTML para la raíz y las páginas secundarias sin extensión (.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/product-detail', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/product-detail.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/checkout.html'));
});

// 1. PRODUCTS DATA
const products = [
  {
    id: 'im-1',
    name: 'Esparadrapo de Tela Impermeable 3"',
    category: 'insumos-medicos',
    categoryLabel: 'Insumos Médicos',
    desc: 'Esparadrapo de alta adherencia y resistencia al agua, ideal para fijar vendajes y sondas de forma segura.',
    price: 2.50,
    icon: 'ri-first-aid-kit-line'
  },
  {
    id: 'im-2',
    name: 'Gasa Estéril Premium 10x10cm (Caja x 100)',
    category: 'insumos-medicos',
    categoryLabel: 'Insumos Médicos',
    desc: 'Compresas de gasa esterilizadas de algodón puro. Gran capacidad de absorción y suavidad clínica.',
    price: 4.80,
    icon: 'ri-shield-cross-line'
  },
  {
    id: 'im-3',
    name: 'Vendaje Elástico Compresivo 4" x 5yd',
    category: 'insumos-medicos',
    categoryLabel: 'Insumos Médicos',
    desc: 'Diseñado para soporte muscular y articular. Ofrece una compresión uniforme y es reutilizable.',
    price: 1.90,
    icon: 'ri-heart-pulse-line'
  },
  {
    id: 'im-4',
    name: 'Jeringas Desechables 5ml con Aguja (Caja x 100)',
    category: 'insumos-medicos',
    categoryLabel: 'Insumos Médicos',
    desc: 'Jeringas estériles de tres partes con conexión luer slip y aguja ultra-fina para inyecciones sin fricción.',
    price: 8.50,
    icon: 'ri-syringe-line'
  },
  {
    id: 'mp-1',
    name: 'Glicerina USP Pura (1 Litro)',
    category: 'materia-prima',
    categoryLabel: 'Materia Prima',
    desc: 'Líquido viscoso neutro y dulce, grado USP. Materia prima base para cosmética, jabones y cremas.',
    price: 6.20,
    icon: 'ri-flask-line'
  },
  {
    id: 'mp-2',
    name: 'Alcohol Antiséptico 70% (1 Galón)',
    category: 'materia-prima',
    categoryLabel: 'Materia Prima',
    desc: 'Alcohol etílico al 70% de alta pureza. Excelente para desinfección general de manos y superficies.',
    price: 7.50,
    icon: 'ri-temp-cold-line'
  },
  {
    id: 'mp-3',
    name: 'Bicarbonato de Sodio USP (1 Kg)',
    category: 'materia-prima',
    categoryLabel: 'Materia Prima',
    desc: 'Polvo soluble de alta pureza. Utilizado en formulaciones farmacéuticas, del hogar y cuidado personal.',
    price: 3.80,
    icon: 'ri-test-tube-line'
  },
  {
    id: 'hl-1',
    name: 'Detergente Líquido Concentrado (1 Galón)',
    category: 'hogar-limpieza',
    categoryLabel: 'Hogar / Limpieza',
    desc: 'Fórmula activa de limpieza profunda. Remueve manchas difíciles protegiendo el color de las prendas.',
    price: 8.20,
    icon: 'ri-drop-line'
  },
  {
    id: 'hl-2',
    name: 'Desinfectante de Amonio Cuaternario (1 Galón)',
    category: 'hogar-limpieza',
    categoryLabel: 'Hogar / Limpieza',
    desc: 'Amonio de 5ta generación. Elimina bacterias, virus y hongos de pisos y mesones con agradable aroma floral.',
    price: 5.50,
    icon: 'ri-sparkling-fill'
  },
  {
    id: 'cp-1',
    name: 'Crema Hidratante Urea 10% (500ml)',
    category: 'cuidado-personal',
    categoryLabel: 'Cuidado Personal',
    desc: 'Emulsión dermatológica restauradora. Alivia la resequedad extrema y repara la barrera cutánea.',
    price: 12.00,
    icon: 'ri-hand-sanitizer-line'
  },
  {
    id: 'cp-2',
    name: 'Bloqueador Solar FPS 50+ Clínico (250ml)',
    category: 'cuidado-personal',
    categoryLabel: 'Cuidado Personal',
    desc: 'Protector solar hipoalergénico con filtros UVA/UVB físicos y químicos. Resistente al agua.',
    price: 14.50,
    icon: 'ri-sun-line'
  },
  {
    id: 'ev-1',
    name: 'Frasco Gotero Vidrio Ámbar 30ml (Caja x 50)',
    category: 'envases',
    categoryLabel: 'Envases',
    desc: 'Envase protector de luz UV para aceites, gotas oftálmicas y sueros cosméticos. Incluye pipeta de vidrio.',
    price: 15.00,
    icon: 'ri-cup-line'
  },
  {
    id: 'ev-2',
    name: 'Botella PET Transparente con Atomizador 250ml (Caja x 20)',
    category: 'envases',
    categoryLabel: 'Envases',
    desc: 'Envases plásticos livianos de alta resistencia con dispensador tipo spray. Ideal para líquidos desinfectantes.',
    price: 10.00,
    icon: 'ri-bubble-chart-line'
  }
];

// 2. AGENCY / BRANCHES DATA
const branches = {
  'guayaquil': {
    name: 'Agencia Matriz (Guayaquil)',
    address: 'Luis Urdaneta 1111 entre Av. Quito y Av. Machala',
    phone: '042-296410',
    whatsapp: '593999422969',
    link: 'https://wa.me/593999422969'
  },
  'primero-de-mayo': {
    name: 'Agencia Primero de Mayo',
    address: 'Primero de Mayo 212 entre Av. Quito y Av. Machala',
    phone: '042-294355',
    whatsapp: '593939063140',
    link: 'https://wa.me/593939063140'
  },
  'portoviejo': {
    name: 'Agencia Portoviejo',
    address: 'Calle Quito, entre Av. Manabí y Av. Chile',
    phone: '042-296410',
    whatsapp: '593983770907',
    link: 'https://wa.me/593983770907'
  }
};

// 3. API ENDPOINTS

// Get all products
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Get all branches
app.get('/api/branches', (req, res) => {
  res.json(branches);
});

// Chatbot NLP processing endpoint
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const qLower = message.toLowerCase();
  let responseText = '';

  if (qLower.includes('sucursal') || qLower.includes('ubicacion') || qLower.includes('donde') || qLower.includes('agencia')) {
    responseText = `📍 Contamos con **3 agencias** físicas:\n\n1. **Agencia Matriz (Guayaquil):** Luis Urdaneta 1111 entre Av. Quito y Av. Machala. (Telf: 042-296410)\n\n2. **Agencia Primero de Mayo:** Primero de Mayo 212 entre Av. Quito y Av. Machala. (Telf: 042-294355)\n\n3. **Agencia Portoviejo:** Calle Quito, entre Av. Manabí y Av. Chile. (Email: asesor@lacasadelesparadrapo-ec.com)\n\n¿Quieres que te guíe para ubicar alguna en el mapa de abajo?`;
  } else if (qLower.includes('pedido') || qLower.includes('comprar') || qLower.includes('carrito') || qLower.includes('como')) {
    responseText = `🛒 **Es muy fácil hacer tu pedido aquí:**\n\n1. Filtra los productos que deseas en el catálogo.\n2. Haz clic en el botón de **+** para agregarlos al carrito.\n3. Abre tu carrito, ingresa tu nombre y escoge tu sucursal favorita.\n4. Presiona **"Enviar Orden por WhatsApp"** y nuestro asesor coordinará el pago y despacho contigo inmediatamente.`;
  } else if (qLower.includes('registro') || qLower.includes('sanitario') || qLower.includes('permiso') || qLower.includes('anmat') || qLower.includes('arcsa')) {
    responseText = `🛡️ **¡Absolutamente!** Todos nuestros productos farmacéuticos y médicos (como el esparadrapo clínico, gasas, jeringas) cuentan con su respectivo **Registro Sanitario ecuatoriano** vigente, garantizando calidad clínica y seguridad legal para tu negocio.`;
  } else if (qLower.includes('telefono') || qLower.includes('whatsapp') || qLower.includes('llamar') || qLower.includes('contacto') || qLower.includes('hablar')) {
    responseText = `📞 Claro que sí, puedes escribir directamente a nuestros asesores:\n\n🟢 **Agencia Matriz:** +593 999 422 969\n🟢 **Agencia Portoviejo:** +593 983 770 907\n🟢 **Agencia Primero de Mayo:** +593 939 063 140\n\n¿Deseas algo más en lo que te pueda ayudar?`;
  } else {
    responseText = `Muchas gracias por tu mensaje. Como asistente virtual de **La Casa del Esparadrapo**, te sugiero agregar productos a tu carrito o contactar a un asesor real para pedidos específicos al por mayor al WhatsApp: **+593 999 422 969**. ¿En qué más te asisto?`;
  }

  res.json({ response: responseText });
});

// Export for Vercel serverless
module.exports = app;

// Start Express Server (local dev only)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`La Casa del Esparadrapo Backend running on port ${PORT}`);
  });
}

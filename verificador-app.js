// verificador-app.js

const CLOUD_NAME = "dz0nc28oj";
const UPLOAD_PRESET = "productos_unsigned";
let totalProductos = 0;
let productosVerificados = 0;
let productosFallidos = 0;
let codigoActual = "";
let primerProducto = true;
let scanner;
let modeloTM; // Modelo de Teachable Machine
let codigoYaEscaneado = false;


function cambiarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach(div => div.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function irAlMenu() {
  // Reiniciar variables de estado
  productosVerificados = 0;
  productosFallidos = 0;
  totalProductos = 0;
  codigoActual = "";

  // Limpiar campos
  document.getElementById('cantidadInput').value = "";
  document.getElementById('codigoLeido').innerText = "";

  cambiarPantalla('menu');
}

function mostrarProceso() {
  cambiarPantalla('proceso');
}

function volverProceso() {
  detenerEscaneo();
  codigoActual = null;
  document.getElementById('codigoLeido').innerText = "";
  cambiarPantalla('proceso');
}

function forzarSalirAlMenu() {
  detenerEscaneo();
  reiniciarVerificacion();
  irAlMenu();
}

function detenerEscaneo() {
  try {
    Quagga.stop();
  } catch (e) {
    console.warn("⚠ No se pudo detener Quagga:", e);
  }
  const scanner = document.getElementById('scanner-container');
  if (scanner) scanner.innerHTML = "";
}

function reiniciarVerificacion() {
  productosVerificados = 0;
  productosFallidos = 0;
  totalProductos = 0;
  codigoActual = null;
}

function pedirPIN() {
  cambiarPantalla('autenticacion');
}

function verificarPIN() {
  const pin = document.getElementById('pinInput').value;
  if (pin === '1234') {
    cambiarPantalla('subida');
  } else {
    alert('PIN incorrecto');
  }
}

function volverMenu() {
  cambiarPantalla('menu');
}

function iniciarProceso() {
  const cantidad = parseInt(document.getElementById('cantidadInput').value);
  if (cantidad > 0) {
    totalProductos = cantidad;
    productosVerificados = 0;
    productosFallidos = 0;
    codigoYaEscaneado = false;
    primerProducto = true;
    cambiarPantalla('camara');
    iniciarEscaneoBarras();
  } else {
    alert('Ingresa una cantidad válida');
  }
}


let escaneado = false;

function iniciarEscaneoBarras() {
  cambiarPantalla('camara');
  escaneado = false;

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector('#scanner-container'),
      constraints: {
        facingMode: "environment"
      }
    },
    decoder: {
      readers: ["ean_reader", "code_128_reader", "upc_reader"]
    },
    locate: true,
    numOfWorkers: navigator.hardwareConcurrency || 4
  }, function (err) {
    if (err) {
      console.error("❌ Error al iniciar Quagga:", err);
      alert("No se pudo iniciar el escáner.");
      return;
    }
    Quagga.start();
  });

  Quagga.onDetected(data => {
    const codigo = data.codeResult.code;

    if (!escaneado && codigo && codigo.length >= 12) {
      escaneado = true;
      setTimeout(() => {
        document.getElementById('codigoLeido').innerText = `Código escaneado: ${codigo}`;
        codigoActual = codigo;
        codigoYaEscaneado = true;
        Quagga.stop();
        mostrarResultadoProducto(codigoActual);
      }, 1000);
    }
  });
}

function mostrarResultadoProducto(codigo) {
  const imagenURL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${codigo}/referencia.jpg`;
  document.getElementById('imagenProducto').src = imagenURL;
  document.getElementById('textoResultado').innerText = `✅ Producto identificado: ${codigo}`;

  if (!document.getElementById('btnReescanear')) {
    const btn = document.createElement("button");
    btn.id = "btnReescanear";
    btn.innerText = "🔄 Reescanear código de barras";
    btn.onclick = () => {
      cambiarPantalla('camara');
      iniciarEscaneoBarras();
    };
    document.getElementById('resultado').appendChild(btn);
  }

  cambiarPantalla('resultado');
}

async function cargarModeloTeachable() {
  modeloTM = await tmImage.load('./modelo_productos/model.json', './modelo_productos/metadata.json');
  console.log("✅ Modelo cargado");
}

function iniciarComparacion() {
  cambiarPantalla('comparacion');

  // Eliminar botón de reintento anterior si existía
  document.getElementById('btnReintentarComparacion')?.remove();

  // Iniciar cámara
  const video = document.getElementById('camComparacion');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      video.srcObject = stream;
      video.play();
    })
    .catch(err => {
      alert("❌ No se pudo acceder a la cámara");
      console.error(err);
    });

  // Botón para volver al menú (se crea una sola vez)
  if (!document.getElementById('btnVolverMenu')) {
    const volverBtn = document.createElement("button");
    volverBtn.id = "btnVolverMenu";
    volverBtn.innerText = "🔙 Regresar al Menú";
    volverBtn.style.marginTop = "15px";
    volverBtn.style.display = "block";
    volverBtn.onclick = () => irAlMenu();
    document.getElementById('comparacion').appendChild(volverBtn);
  }

  // Botón para reiniciar la comparación (recargar cámara)
  if (!document.getElementById('btnRecargarComparacion')) {
    const recargarBtn = document.createElement("button");
    recargarBtn.id = "btnRecargarComparacion";
    recargarBtn.innerText = "♻️ Reiniciar Comparación";
    recargarBtn.style.marginTop = "10px";
    recargarBtn.style.marginLeft = "10px";
    recargarBtn.style.display = "block";
    recargarBtn.onclick = () => iniciarComparacion(); // reinicia todo
    document.getElementById('comparacion').appendChild(recargarBtn);
  }
}


async function capturarYComparar() {
  const video = document.getElementById('camComparacion');
  const canvas = document.getElementById('canvasComparacion');

  if (video.videoWidth === 0 || video.videoHeight === 0) {
    alert("⚠ La cámara no está lista.");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }

  const prediction = await modeloTM.predict(canvas);
  prediction.sort((a, b) => b.probability - a.probability);
  const mejor = prediction[0];
  const porcentaje = Math.round(mejor.probability * 100);

  // Mostrar barra y texto de similitud
  document.getElementById('similitudTexto').innerText = `Coincidencia: ${mejor.className} (${porcentaje}%)`;
  document.getElementById('barraSimilitud').style.width = `${porcentaje}%`;

  // Eliminar imagen anterior si había
  if (window.imagenRefMostrada) {
    window.imagenRefMostrada.remove();
  }

  // Mostrar mini imagen del producto predicho
  const refImg = new Image();
  refImg.src = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${mejor.className}/referencia.jpg`;
  refImg.style.width = "120px";
  refImg.style.marginTop = "10px";
  refImg.style.border = "2px solid #ccc";
  document.getElementById('comparacion').appendChild(refImg);
  window.imagenRefMostrada = refImg;

  // Validación lógica: solo aceptar si className === codigoActual
  const productoCorrecto = mejor.className === codigoActual;

  if (porcentaje >= 80 && productoCorrecto) {
    productosVerificados++;
    setTimeout(() => siguienteProducto(), 4000);
  } else {
    productosFallidos++;
    setTimeout(() => {
      alert(`❌ Producto incorrecto.
Detectado: ${mejor.className} (${porcentaje}%)
Esperado: ${codigoActual}`);
      
      const retryBtn = document.createElement("button");
      retryBtn.id = "btnReintentarComparacion";
      retryBtn.innerText = "🔁 Reintentar Comparación";
      retryBtn.onclick = () => iniciarComparacion();
      retryBtn.style.marginTop = "10px";
      document.getElementById('comparacion').appendChild(retryBtn);
    }, 1000);
  }


}

function siguienteProducto() {
  if (productosVerificados + productosFallidos >= totalProductos) {
    const resumen = `Listo, ya puedes cerrar esta caja.\nProductos correctos: ${productosVerificados} / Fallidos: ${productosFallidos}`;
    document.getElementById('resumenFinal').innerText = resumen;
    cambiarPantalla('finalizado');
    setTimeout(() => irAlMenu(), 10000);
  } else {
    if (codigoYaEscaneado) {
      // Ya se escaneó el código, ir directo a comparación
      iniciarComparacion();
    } else {
      cambiarPantalla('camara');
      iniciarEscaneoBarras();
    }
  }
}

async function subirProducto() {
  const codigo = document.getElementById('nuevoCodigo').value;
  const lote = document.getElementById('nuevoLote').value;
  const usuario = document.getElementById('nuevoUsuario').value;
  const archivo = document.getElementById('nuevaImagen').files[0];
  if (!codigo || !archivo || !usuario || !lote) {
    alert('Llena todos los campos');
    return;
  }
  const timestamp = Date.now();
  const publicId = `${codigo}/${timestamp}`;
  const formData = new FormData();
  formData.append("file", archivo);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("public_id", publicId);
  try {
    const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, formData);
    alert("✅ Imagen subida a Cloudinary\n" + res.data.secure_url);
  } catch (e) {
    console.error(e);
    alert("❌ Error al subir la imagen a Cloudinary");
  }
}

function reiniciarEscaner() {
  if (typeof Quagga !== 'undefined') {
    Quagga.stop();
  }
  iniciarEscaneoBarras();
}

// Cargar modelo cuando inicie la app
window.addEventListener("DOMContentLoaded", () => {
  cargarModeloTeachable();
});

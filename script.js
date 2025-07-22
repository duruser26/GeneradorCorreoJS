'use strict';

class Huesped {
  constructor(nombreHuesped, telefono, nombreHabitacion, idHabitacion, fechaCheckIn, horaLlegada) {
    this.nombreHuesped = nombreHuesped || 'No especificado';
    this.telefono = telefono || 'No especificado';
    this.nombreHabitacion = nombreHabitacion || 'No especificado';
    this.idHabitacion = idHabitacion;
    this.fechaCheckIn = fechaCheckIn;
    this.horaLlegada = horaLlegada || '15:00';
    this.metodoTransporte = 'Desconocido';
  }
}

class GeneradorTextoCorreo {
  constructor() {
    this.HORA_LIMITE = "20:00";
  }

  async generarTxt(archivoApartamentos, archivoHuespedes) {
    try {
      console.log("Iniciando procesamiento...");
      const mapaApartamentos = await this.procesarApartamentos(archivoApartamentos);
      const listaHuespedes = await this.procesarHuespedes(archivoHuespedes);

      if (listaHuespedes.length === 0) {
        throw new Error("No se encontraron huéspedes válidos después del procesamiento");
      }

      let resultado = "";
      let contador = 0;

      for (const huesped of listaHuespedes) {
        try {
          const direccion = mapaApartamentos.get(huesped.idHabitacion);

          if (!direccion) {
            console.warn(`No se encontró dirección para ID: ${huesped.idHabitacion}`);
            continue;
          }

          if (this.parseHora(huesped.horaLlegada) >= this.parseHora(this.HORA_LIMITE)) {
            resultado += this.formatearEntradaHuesped(huesped, direccion);
            contador++;
          }
        } catch (error) {
          console.error(`Error procesando huésped: ${error.message}`);
        }
      }

      console.log(`Proceso completado. ${contador} huéspedes válidos encontrados.`);
      return contador > 0 ? resultado : "No hay huéspedes con llegada después de las 20:00";
    } catch (error) {
      console.error("Error en generarTxt:", error);
      throw error;
    }
  }

  formatearEntradaHuesped(huesped, direccion) {
    return [
      `Nombre del huésped: ${huesped.nombreHuesped}`,
      `Teléfono del huésped: ${huesped.telefono}`,
      `Nombre del apartamento: ${huesped.nombreHabitacion}`,
      `Dirección del apartamento: ${direccion}`,
      `Método de transporte: ${huesped.metodoTransporte}`,
      `Día de llegada: ${huesped.fechaCheckIn}`,
      `Hora prevista de llegada: ${huesped.horaLlegada}`,
      "" // Línea en blanco
    ].join('\n');
  }

  parseHora(horaStr) {
    if (!horaStr) return 0;
    const [h, m] = horaStr.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  async procesarApartamentos(archivo) {
    try {
      const contenido = await this.leerArchivo(archivo);
      const lineas = this.parseCSV(contenido);

      if (lineas.length <= 1) throw new Error("Archivo de apartamentos vacío");

      const mapa = new Map();
      const cabeceras = lineas[0];
      console.log("Cabeceras de apartamentos:", cabeceras);

      for (let i = 1; i < lineas.length; i++) {
        const partes = lineas[i];
        if (partes.length >= 4) {
          const id = partes[0]?.trim();
          const direccion = partes[3]?.trim();
          if (id && direccion) {
            mapa.set(id, direccion);
          }
        }
      }

      if (mapa.size === 0) throw new Error("No se encontraron apartamentos válidos");
      return mapa;
    } catch (error) {
      console.error("Error en procesarApartamentos:", error);
      throw error;
    }
  }

  async procesarHuespedes(archivo) {
    try {
      const contenido = await this.leerArchivo(archivo);
      const lineas = this.parseCSV(contenido);

      if (lineas.length <= 1) throw new Error("Archivo de huéspedes vacío");

      const lista = [];
      const cabeceras = lineas[0];
      console.log("Cabeceras de huéspedes:", cabeceras);

      for (let i = 1; i < lineas.length; i++) {
        const partes = lineas[i];
        try {
          if (partes.length < 62) {
            console.warn(`Línea ${i} ignorada (columnas insuficientes)`);
            continue;
          }

          const idHabitacion = this.extraerIdHabitacion(partes[61]);
          if (!idHabitacion) {
            console.warn(`Línea ${i} ignorada (ID no válido): ${partes[61]}`);
            continue;
          }

          lista.push(new Huesped(
            partes[18]?.trim(),  // Nombre
            partes[14]?.trim(),  // Teléfono
            partes[6]?.trim(),   // Nombre apartamento
            idHabitacion,
            partes[2]?.trim(),   // Fecha check-in
            partes[47]?.trim()   // Hora llegada
          ));
        } catch (error) {
          console.error(`Error en línea ${i}:`, error);
        }
      }

      if (lista.length === 0) throw new Error("No se encontraron huéspedes válidos");
      return lista;
    } catch (error) {
      console.error("Error en procesarHuespedes:", error);
      throw error;
    }
  }

  parseCSV(contenido) {
    const lineas = [];
    let lineaActual = [];
    let entreComillas = false;
    let valorActual = '';

    for (let i = 0; i < contenido.length; i++) {
      const char = contenido[i];

      if (char === '"') {
        entreComillas = !entreComillas;
      } else if (char === ';' && !entreComillas) {
        lineaActual.push(valorActual);
        valorActual = '';
      } else if ((char === '\n' || char === '\r') && !entreComillas) {
        // Soporta saltos de línea Windows y Unix
        if (valorActual !== '' || lineaActual.length > 0) {
          lineaActual.push(valorActual);
          lineas.push(lineaActual);
          lineaActual = [];
          valorActual = '';
        }
      } else {
        valorActual += char;
      }
    }
    // Añadir última línea si queda pendiente
    if (valorActual !== '' || lineaActual.length > 0) {
      lineaActual.push(valorActual);
      lineas.push(lineaActual);
    }

    return lineas;
  }

  extraerIdHabitacion(idTipologie) {
    if (!idTipologie) return null;

    const ids = idTipologie.match(/{(\d+)}/g);
    if (!ids || ids.length === 0) return null;

    return ids[0].replace(/{|}/g, '');
  }

  leerArchivo(archivo) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(new Error(`Error leyendo archivo: ${e.target.error}`));
      reader.readAsText(archivo, 'UTF-8');
    });
  }
}

function actualizarEstadoSubida(inputFile, spanNombreArchivo, contenedor) {
  if (inputFile.files.length > 0) {
    spanNombreArchivo.textContent = inputFile.files[0].name;
    contenedor.classList.add('subido');
  } else {
    spanNombreArchivo.textContent = '';
    contenedor.classList.remove('subido');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const csvApartamentos = document.getElementById('csvApartamentos');
  const csvHuespedes = document.getElementById('csvHuespedes');
  const nombreApartamentos = document.getElementById('nombreArchivoApartamentos');
  const nombreHuespedes = document.getElementById('nombreArchivoHuespedes');
  const areaTexto = document.getElementById('areaTexto');
  const generarBtn = document.getElementById('generarBtn');
  const copiarBtn = document.getElementById('copiarBtn');
  const borrarBtn = document.getElementById('borrarBtn');

  let archivoApt = null;
  let archivoHsp = null;

  csvApartamentos.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      archivoApt = e.target.files[0];
      actualizarEstadoSubida(e.target, nombreApartamentos, e.target.closest('.boton-subir'));
      console.log("Archivo de apartamentos cargado:", archivoApt.name);
    }
  });

  csvHuespedes.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      archivoHsp = e.target.files[0];
      actualizarEstadoSubida(e.target, nombreHuespedes, e.target.closest('.boton-subir'));
      console.log("Archivo de huéspedes cargado:", archivoHsp.name);
    }
  });

  generarBtn.addEventListener('click', async () => {
    if (!archivoApt || !archivoHsp) {
      alert("Debes subir ambos archivos primero");
      console.error("Faltan archivos por subir");
      return;
    }

    try {
      console.log("Iniciando generación de texto...");
      areaTexto.value = "Procesando archivos...";

      const generador = new GeneradorTextoCorreo();
      const texto = await generador.generarTxt(archivoApt, archivoHsp);

      areaTexto.value = texto;
      areaTexto.scrollTop = areaTexto.scrollHeight;
      console.log("Texto generado con éxito");
    } catch (error) {
      console.error("Error en generación:", error);
      areaTexto.value = `Error: ${error.message}`;
    }
  });

  copiarBtn.addEventListener('click', () => {
    if (areaTexto.value.trim()) {
      navigator.clipboard.writeText(areaTexto.value)
        .then(() => {
          console.log("Texto copiado al portapapeles");
          copiarBtn.textContent = "Copiado!";
          setTimeout(() => copiarBtn.textContent = "Copiar texto", 2000);
        })
        .catch(err => {
          console.error("Error copiando al portapapeles:", err);
          alert("No se pudo copiar el texto");
        });
    }
  });

  borrarBtn.addEventListener('click', () => {
    areaTexto.value = "";
    archivoApt = null;
    archivoHsp = null;
    nombreApartamentos.textContent = "";
    nombreHuespedes.textContent = "";
    csvApartamentos.value = "";
    csvHuespedes.value = "";
    copiarBtn.textContent = "Copiar texto";
    console.log("Campos y archivos reseteados");
  });
});

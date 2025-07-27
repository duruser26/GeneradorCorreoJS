document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const csvInput = document.getElementById('csvInput');
    const generarBtn = document.getElementById('generar');
    const nombreInput = document.getElementById('nombreFinal');
    const nombreArchivoSpan = document.getElementById('nombreArchivo');
    const volverBtn = document.getElementById('volver');

    // Variables
    let datosCSV = [];
    let cargando = false;

    // Event Listeners
    csvInput.addEventListener('change', handleFile);
    generarBtn.addEventListener('click', generarArchivo);
    volverBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });

    // Mostrar alerta
    function mostrarAlerta(mensaje, tipo) {
        const alerta = document.createElement('div');
        alerta.className = `alert ${tipo}`;
        alerta.textContent = mensaje;
        document.body.appendChild(alerta);
        
        setTimeout(() => {
            alerta.remove();
        }, 3000);
    }

    // Manejar archivo CSV
    function handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        cargando = true;
        actualizarUI();

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                procesarCSV(e.target.result);
                nombreArchivoSpan.textContent = file.name;
                nombreArchivoSpan.classList.add('archivo-subido');
                generarNombreSugerido();
                mostrarAlerta(`Archivo cargado correctamente (${datosCSV.length} reservas)`, 'exito');
            } catch (error) {
                console.error('Error:', error);
                mostrarAlerta('Error al procesar el archivo CSV', 'error');
            } finally {
                cargando = false;
                actualizarUI();
            }
        };

        reader.onerror = function() {
            mostrarAlerta('Error al leer el archivo', 'error');
            cargando = false;
            actualizarUI();
        };

        reader.readAsText(file, 'UTF-8');
    }

    // Procesar contenido CSV - FILTRO POR TELÉFONO
    function procesarCSV(contenido) {
        datosCSV = [];
        const lineas = contenido.split(/\r\n|\n/);
        
        // Encontrar índice de la línea de encabezado
        let indiceEncabezado = -1;
        for (let i = 0; i < lineas.length; i++) {
            if (lineas[i].startsWith('ID;')) {
                indiceEncabezado = i;
                break;
            }
        }

        if (indiceEncabezado === -1) {
            throw new Error('No se encontró el encabezado del CSV');
        }

        // Procesar líneas después del encabezado
        for (let i = indiceEncabezado + 1; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (!linea) continue;

            const campos = linea.split(';').map(campo => campo.trim().replace(/^"|"$/g, ''));
            
            // Aplicar filtro: SOLO registros con teléfono no vacío
            const telefono = campos[14] || '';
            if (telefono.trim() !== "") {
                datosCSV.push(campos);
            }
        }

        if (datosCSV.length === 0) {
            throw new Error('No se encontraron reservas con número de teléfono');
        }
    }

    // Generar CSV para Google Contacts (VERSIÓN MEJORADA)
    function generarCSVSalida() {
        const cabecera = "Name,Given Name,Additional Name,Family Name,Yomi Name,Given Name Yomi,Additional Name Yomi,Family Name Yomi,Name Prefix,Name Suffix,Initials,Nickname,Short Name,Maiden Name,Birthday,Gender,Location,Billing Information,Directory Server,Mileage,Occupation,Hobby,Sensitivity,Priority,Subject,Notes,Language,Photo,Group Membership,Phone 1 - Type,Phone 1 - Value";
        const filas = [cabecera];
        const reservasAgrupadas = {};

        // Función que NO modifica el teléfono en absoluto (lo deja exactamente igual)
        const normalizarTelefono = (tel) => (tel || '').trim();

        // Procesar todas las reservas para agruparlas
        for (const fila of datosCSV) {
            const fechaCheckIn = formatearFecha(fila[2] || '');
            const apartamento = (fila[6] || 'Apartamento').trim();
            let nombreCompleto = (fila[18] || fila[3] || 'Huésped').trim();
            const telefono = normalizarTelefono(fila[14]);
            
            if (!telefono) continue;

            // Limpieza del nombre para clave única
            nombreCompleto = nombreCompleto.toLowerCase()
                               .replace(/[;,"]/g, '')
                               .replace(/\s+/g, ' ')
                               .trim();
            
            const clave = `${nombreCompleto}-${telefono}`;

            if (!reservasAgrupadas[clave]) {
                reservasAgrupadas[clave] = {
                    nombre: nombreCompleto,
                    telefono,
                    fechaCheckIn,
                    apartamentos: [apartamento]
                };
            } else {
                // Añadir apartamento si no está ya en la lista
                if (!reservasAgrupadas[clave].apartamentos.includes(apartamento)) {
                    reservasAgrupadas[clave].apartamentos.push(apartamento);
                }
                // Conservar la fecha de check-in más temprana
                if (fechaCheckIn < reservasAgrupadas[clave].fechaCheckIn) {
                    reservasAgrupadas[clave].fechaCheckIn = fechaCheckIn;
                }
            }
        }

        // Generar filas CSV agrupadas
        for (const clave in reservasAgrupadas) {
            const { nombre, telefono, fechaCheckIn, apartamentos } = reservasAgrupadas[clave];
            
            // Formatear nombre con capitalización correcta
            const nombreFormateado = nombre.split(' ')
                .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
                .join(' ');
            
            const nombreContacto = `${fechaCheckIn} - ${apartamentos.join(', ')} - ${nombreFormateado}`;
            filas.push(`"${nombreContacto}",,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,,Mobile,${telefono}`);
        }

        return filas.join('\n');
    }

    // Formatear fecha dd/mm/yyyy → yymmdd (sin cambios)
    function formatearFecha(fechaStr) {
        if (!fechaStr) return '';
        const soloFecha = fechaStr.split(' ')[0];
        const match = soloFecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (!match) return '';
        
        const dia = match[1].padStart(2, '0');
        const mes = match[2].padStart(2, '0');
        let anio = match[3];
        
        return anio.slice(-2) + mes + dia;
    }

    // Generar nombre sugerido basado en fechas (sin cambios)
    function generarNombreSugerido() {
        if (!datosCSV.length) return;

        let fechaMin = null;
        let fechaMax = null;

        for (let i = 0; i < datosCSV.length; i++) {
            const fila = datosCSV[i];
            if (fila.length < 3) continue;
            
            const fechaFormateada = formatearFecha(fila[2]);
            if (!fechaFormateada) continue;

            if (!fechaMin || fechaFormateada < fechaMin) fechaMin = fechaFormateada;
            if (!fechaMax || fechaFormateada > fechaMax) fechaMax = fechaFormateada;
        }

        if (fechaMin && fechaMax) {
            nombreInput.value = `${fechaMin}_contactos_${fechaMax}.csv`;
        } else {
            const hoy = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            nombreInput.value = `contactos_${hoy}.csv`;
        }
    }

    // Generar archivo final con codificación UTF-8 (sin cambios)
    function generarArchivo() {
        if (cargando) {
            mostrarAlerta('Espera a que termine la carga actual', 'error');
            return;
        }

        if (!datosCSV.length) {
            mostrarAlerta('Primero carga un archivo CSV válido', 'error');
            return;
        }

        try {
            const nombreFinal = nombreInput.value || 'contactos_generados.csv';
            const contenido = generarCSVSalida();

            // Añadir BOM para UTF-8
            const blob = new Blob(["\uFEFF" + contenido], { 
                type: 'text/csv;charset=utf-8;' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreFinal;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            mostrarAlerta(`¡Archivo generado correctamente! (${Object.keys(reservasAgrupadas).length} contactos únicos)`, 'exito');
        } catch (error) {
            console.error('Error:', error);
            mostrarAlerta('Error al generar el archivo', 'error');
        }
    }

    // Actualizar UI (sin cambios)
    function actualizarUI() {
        generarBtn.disabled = cargando || !datosCSV.length;
        
        if (cargando) {
            generarBtn.innerHTML = '<span class="spinner"></span> Procesando...';
        } else {
            generarBtn.textContent = 'Generar CSV para Google Contacts';
        }
    }
});
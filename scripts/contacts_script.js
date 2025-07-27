// contacts_script.js - Versión completa y corregida

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const csvInput = document.getElementById('csvInput');
    const generarBtn = document.getElementById('generar');
    const nombreInput = document.getElementById('nombreFinal');
    const nombreArchivoSpan = document.getElementById('nombreArchivo');
    const mensajeExito = document.getElementById('mensajeExito');
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
                mostrarMensaje('Archivo cargado correctamente', 'exito');
            } catch (error) {
                console.error('Error:', error);
                mostrarMensaje('Error al procesar el archivo CSV. Asegúrate de que es el formato correcto.', 'error');
            } finally {
                cargando = false;
                actualizarUI();
            }
        };

        reader.onerror = function() {
            mostrarMensaje('Error al leer el archivo', 'error');
            cargando = false;
            actualizarUI();
        };

        reader.readAsText(file, 'UTF-8');
    }

    // Procesar contenido CSV con punto y coma
    function procesarCSV(contenido) {
        datosCSV = [];
        const lineas = contenido.split(/\r\n|\n/);
        
        // Filtrar líneas vacías y encabezado
        const lineasValidas = lineas.filter(linea => {
            return linea.trim() && !linea.startsWith('ID;') && linea.split(';').length > 10;
        });
        
        // Procesar cada línea válida
        datosCSV = lineasValidas.map(linea => {
            // Dividir por punto y coma, manejando campos entre comillas
            return linea.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/)
                       .map(campo => campo.trim().replace(/^"|"$/g, ''));
        });

        if (datosCSV.length === 0) {
            throw new Error('No se encontraron datos válidos en el archivo');
        }
    }

    // Generar CSV para Google Contacts
    function generarCSVSalida() {
        const cabecera = "Name,Given Name,Additional Name,Family Name,Yomi Name,Given Name Yomi,Additional Name Yomi,Family Name Yomi,Name Prefix,Name Suffix,Initials,Nickname,Short Name,Maiden Name,Birthday,Gender,Location,Billing Information,Directory Server,Mileage,Occupation,Hobby,Sensitivity,Priority,Subject,Notes,Language,Photo,Group Membership,Phone 1 - Type,Phone 1 - Value";
        const filas = [cabecera];

        for (let i = 0; i < datosCSV.length; i++) {
            const fila = datosCSV[i];
            
            // Obtener campos con flexibilidad
            const fechaCheckIn = formatearFecha(fila[2] || ''); // Columna Check in (índice 2)
            const apartamento = (fila[6] || 'Sin apartamento').trim(); // Columna Habitaciones (índice 6)
            let nombreCompleto = (fila[18] || fila[3] || 'Sin nombre').trim(); // Referencia (índice 18) o Huéspedes (índice 3)
            let telefono = (fila[14] || '').trim(); // Columna Teléfono (índice 14)

            // Limpiar teléfono (mantener solo dígitos y +)
            telefono = telefono.replace(/[^\d+]/g, '');

            // Solo crear contacto si tenemos datos mínimos
            if (fechaCheckIn && apartamento && nombreCompleto !== 'Sin nombre') {
                const nombreContacto = `${fechaCheckIn} - ${apartamento} - ${nombreCompleto}`;
                const filaSalida = `"${nombreContacto}",,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,,Mobile,${telefono}`;
                filas.push(filaSalida);
            }
        }

        return filas.join('\n');
    }

    // Formatear fecha dd/mm/yyyy → yymmdd
    function formatearFecha(fechaStr) {
        if (!fechaStr) return '';
        
        // Extraer solo la parte de la fecha (ignorando hora si existe)
        const soloFecha = fechaStr.split(' ')[0];
        const match = soloFecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (!match) return '';
        
        const dia = match[1].padStart(2, '0');
        const mes = match[2].padStart(2, '0');
        let anio = match[3];
        
        return anio.slice(-2) + mes + dia;
    }

    // Generar nombre sugerido basado en fechas
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

    // Generar archivo final
    function generarArchivo() {
        if (cargando) {
            mostrarMensaje('Espera a que termine la carga actual', 'error');
            return;
        }

        if (!datosCSV.length) {
            mostrarMensaje('Primero carga un archivo CSV válido', 'error');
            return;
        }

        try {
            const nombreFinal = nombreInput.value || 'contactos_generados.csv';
            const contenido = generarCSVSalida();

            if (contenido.split('\n').length <= 1) {
                mostrarMensaje('No se encontraron contactos válidos', 'error');
                return;
            }

            const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreFinal;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            mostrarMensaje('¡Archivo generado correctamente!', 'exito');
        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje('Error al generar el archivo', 'error');
        }
    }

    // Mostrar mensajes
    function mostrarMensaje(texto, tipo) {
        mensajeExito.textContent = texto;
        mensajeExito.className = `mensaje-exito ${tipo}`;
        
        setTimeout(() => {
            mensajeExito.className = 'mensaje-exito';
        }, 5000);
    }

    // Actualizar UI
    function actualizarUI() {
        generarBtn.disabled = cargando || !datosCSV.length;
        
        if (cargando) {
            generarBtn.innerHTML = '<span class="spinner"></span> Procesando...';
        } else {
            generarBtn.textContent = 'Generar CSV para Google Contacts';
        }
    }
});
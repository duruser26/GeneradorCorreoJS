document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const arrivalsFileInput = document.getElementById('arrivalsFile');
    const departuresFileInput = document.getElementById('departuresFile');
    const monthSelector = document.getElementById('monthSelector');
    const yearSelector = document.getElementById('yearSelector');
    const loadBtn = document.getElementById('loadBtn');
    const calendarTable = document.querySelector('.calendar-table tbody');
    const arrivalsFileInfo = document.getElementById('arrivalsFileInfo');
    const departuresFileInfo = document.getElementById('departuresFileInfo');
    const emptyCalendarMsg = document.querySelector('.empty-calendar');
    const statusMessage = document.createElement('div');
    statusMessage.className = 'status-message';
    document.querySelector('.container').appendChild(statusMessage);

    // Variables de datos
    let arrivalsData = {};
    let departuresData = {};
    let processing = false;

    // Escala de colores completa
    const colorScales = {
        arrivals: [
            { min: 0, max: 4, color: '#e8f5e9' },
            { min: 5, max: 9, color: '#c8e6c9' },
            { min: 10, max: 14, color: '#a5d6a7' },
            { min: 15, max: 19, color: '#81c784' },
            { min: 20, max: 24, color: '#66bb6a' },
            { min: 25, max: 29, color: '#4caf50' },
            { min: 30, max: 34, color: '#388e3c' },
            { min: 35, max: Infinity, color: '#2e7d32' }
        ],
        departures: [
            { min: 0, max: 4, color: '#ffebee' },
            { min: 5, max: 9, color: '#ffcdd2' },
            { min: 10, max: 14, color: '#ef9a9a' },
            { min: 15, max: 19, color: '#e57373' },
            { min: 20, max: 24, color: '#ef5350' },
            { min: 25, max: 29, color: '#f44336' },
            { min: 30, max: 34, color: '#e53935' },
            { min: 35, max: Infinity, color: '#c62828' }
        ]
    };

    // Inicialización
    initDateSelectors();
    setupEventListeners();
    renderEmptyCalendar();

    function initDateSelectors() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const currentDay = currentDate.getDate();

        // Limpiar selectores
        monthSelector.innerHTML = '';
        yearSelector.innerHTML = '';

        // Configurar años (actual + 2 años siguientes)
        for (let year = currentYear; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            option.selected = year === currentYear;
            yearSelector.appendChild(option);
        }

        // Configurar meses disponibles
        updateMonthOptions(currentYear, currentMonth, currentDay);

        // Manejar cambio de año
        yearSelector.addEventListener('change', function() {
            const selectedYear = parseInt(this.value);
            updateMonthOptions(selectedYear, currentMonth, currentDay);
        });
    }

    function updateMonthOptions(selectedYear, currentMonth, currentDay) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        monthSelector.innerHTML = '';
        
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        // Determinar desde qué mes mostrar
        let startMonth = 1;
        if (selectedYear === currentYear) {
            startMonth = currentMonth;
            if (currentDay > 15) {
                startMonth = currentMonth + 1;
                if (startMonth > 12) {
                    startMonth = 1;
                    yearSelector.value = currentYear + 1;
                }
            }
        }

        // Mostrar los próximos 3 meses disponibles
        for (let i = 0; i < 3; i++) {
            const monthIndex = (startMonth + i - 1) % 12;
            const yearOffset = Math.floor((startMonth + i - 1) / 12);
            const yearForMonth = selectedYear + yearOffset;

            if (yearForMonth <= currentYear + 2) {
                const option = document.createElement('option');
                option.value = monthIndex + 1;
                option.textContent = months[monthIndex];
                if (i === 0) option.selected = true;
                monthSelector.appendChild(option);
            }
        }
    }

    function renderEmptyCalendar() {
        calendarTable.innerHTML = `
            <tr>
                <td colspan="7" class="empty-calendar">
                    Carga archivos y selecciona fecha para ver el calendario
                </td>
            </tr>
        `;
    }

    function setupEventListeners() {
        arrivalsFileInput.addEventListener('change', function() {
            if (this.files[0]) {
                arrivalsFileInfo.textContent = `✔️ ${this.files[0].name}`;
                arrivalsFileInfo.style.color = '#4CAF50';
                checkReadyState();
            } else {
                arrivalsFileInfo.textContent = 'No seleccionado';
                arrivalsFileInfo.style.color = '';
            }
        });

        departuresFileInput.addEventListener('change', function() {
            if (this.files[0]) {
                departuresFileInfo.textContent = `✔️ ${this.files[0].name}`;
                departuresFileInfo.style.color = '#4CAF50';
                checkReadyState();
            } else {
                departuresFileInfo.textContent = 'No seleccionado';
                departuresFileInfo.style.color = '';
            }
        });

        loadBtn.addEventListener('click', loadData);
        monthSelector.addEventListener('change', checkReadyState);
        yearSelector.addEventListener('change', checkReadyState);
    }

    function checkReadyState() {
        if (arrivalsFileInput.files[0] && departuresFileInput.files[0] && monthSelector.value && yearSelector.value) {
            loadBtn.disabled = false;
            loadBtn.textContent = 'Generar Calendario';
            statusMessage.textContent = '✅ Sistema listo. Haz clic en "Generar Calendario"';
            statusMessage.style.color = '#4CAF50';
        } else {
            loadBtn.disabled = true;
            statusMessage.textContent = 'ℹ️ Carga ambos archivos CSV y selecciona mes/año';
            statusMessage.style.color = '#FF9800';
        }
    }

    async function loadData() {
        if (processing) return;
        processing = true;

        const arrivalsFile = arrivalsFileInput.files[0];
        const departuresFile = departuresFileInput.files[0];
        const month = parseInt(monthSelector.value);
        const year = parseInt(yearSelector.value);

        loadBtn.disabled = true;
        loadBtn.innerHTML = '<span class="spinner">⏳</span> Procesando...';
        statusMessage.textContent = '⏳ Procesando archivos...';
        statusMessage.style.color = '#2196F3';

        try {
            arrivalsData = await processCSVFile(arrivalsFile, 'Check in');
            departuresData = await processCSVFile(departuresFile, 'Check-out');

            renderCalendar(month, year);
            
            emptyCalendarMsg.style.display = 'none';
            statusMessage.textContent = `✅ Calendario generado: ${Object.keys(arrivalsData).length} llegadas | ${Object.keys(departuresData).length} salidas`;
            statusMessage.style.color = '#4CAF50';
        } catch (error) {
            console.error('Error:', error);
            statusMessage.textContent = `❌ Error: ${error.message}`;
            statusMessage.style.color = '#F44336';
        } finally {
            processing = false;
            loadBtn.disabled = false;
            loadBtn.innerHTML = '<span class="button-icon">🔄</span> <span class="button-text">Actualizar Calendario</span>';
        }
    }

    function processCSVFile(file, dateField) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = {};
                    const lines = e.target.result.split('\n');
                    const headers = lines[0].split(';');

                    const dateIndex = headers.findIndex(h => h.trim() === dateField);
                    if (dateIndex === -1) throw new Error(`Campo '${dateField}' no encontrado`);

                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;

                        const values = lines[i].split(';');
                        const date = parseDate(values[dateIndex]);
                        if (!date) continue;

                        const dateStr = formatDate(date);
                        data[dateStr] = (data[dateStr] || 0) + 1;
                    }

                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file);
        });
    }

    function parseDate(dateStr) {
        if (!dateStr) return null;
        
        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;
        
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        
        return new Date(year, month, day);
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function renderCalendar(month, year) {
        const firstDay = new Date(year, month - 1, 1);
        const daysInMonth = new Date(year, month, 0).getDate();
        const firstDayOfWeek = firstDay.getDay();

        let calendarHTML = '';
        
        // Días vacíos iniciales
        calendarHTML += '<tr>';
        for (let i = 0; i < firstDayOfWeek; i++) {
            calendarHTML += '<td class="empty-day"></td>';
        }
        
        // Días del mes
        let currentDayOfWeek = firstDayOfWeek;
        for (let day = 1; day <= daysInMonth; day++) {
            if (currentDayOfWeek === 0 && day !== 1) {
                calendarHTML += '</tr><tr>';
            }
            
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const arrivalsCount = arrivalsData[dateStr] || 0;
            const departuresCount = departuresData[dateStr] || 0;
            
            const arrivalColor = getColorForCount(arrivalsCount, true);
            const departureColor = getColorForCount(departuresCount, false);
            
            // Resaltar día actual
            const today = new Date();
            const isToday = today.getFullYear() === year && 
                           today.getMonth() + 1 === month && 
                           today.getDate() === day;
            
            calendarHTML += `
                <td class="${isToday ? 'today' : ''}">
                    <div class="day-cell" data-date="${dateStr}">
                        <span class="day-number">${day}</span>
                        <div class="half-container arrival-container" style="background-color: ${arrivalColor}">
                            <div class="cell-content">
                                <span class="cell-count">${arrivalsCount > 0 ? arrivalsCount : ''}</span>
                                <span class="cell-label">${arrivalsCount > 0 ? 'Llegadas' : ''}</span>
                            </div>
                        </div>
                        <div class="half-container departure-container" style="background-color: ${departureColor}">
                            <div class="cell-content">
                                <span class="cell-count">${departuresCount > 0 ? departuresCount : ''}</span>
                                <span class="cell-label">${departuresCount > 0 ? 'Salidas' : ''}</span>
                            </div>
                        </div>
                    </div>
                </td>
            `;
            
            currentDayOfWeek = (currentDayOfWeek + 1) % 7;
        }
        
        // Días vacíos finales
        while (currentDayOfWeek > 0 && currentDayOfWeek < 7) {
            calendarHTML += '<td class="empty-day"></td>';
            currentDayOfWeek++;
        }
        
        calendarHTML += '</tr>';
        calendarTable.innerHTML = calendarHTML;
        
        addTooltips();
    }

    function getColorForCount(count, isArrival) {
        const scale = isArrival ? colorScales.arrivals : colorScales.departures;
        const range = scale.find(r => count >= r.min && count <= r.max);
        return range ? range.color : '#ffffff';
    }

    function addTooltips() {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);

        document.querySelectorAll('.day-cell').forEach(cell => {
            const arrivalContainer = cell.querySelector('.arrival-container');
            const departureContainer = cell.querySelector('.departure-container');
            
            [arrivalContainer, departureContainer].forEach((container, index) => {
                if (!container) return;
                
                const type = index === 0 ? 'Llegadas' : 'Salidas';
                const count = container.querySelector('.cell-count').textContent || '0';
                
                container.addEventListener('mouseenter', (e) => {
                    const dateStr = cell.getAttribute('data-date');
                    const date = new Date(dateStr);
                    const dateFormatted = date.toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    tooltip.textContent = `${dateFormatted}: ${type}: ${count}`;
                    tooltip.style.display = 'block';
                });
                
                container.addEventListener('mousemove', (e) => {
                    tooltip.style.left = `${e.pageX + 10}px`;
                    tooltip.style.top = `${e.pageY + 10}px`;
                });
                
                container.addEventListener('mouseleave', () => {
                    tooltip.style.display = 'none';
                });
            });
        });
    }
});
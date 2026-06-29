// public/js/analytics.js
// Handles view switching and Chart.js rendering for system analytics.

document.addEventListener('DOMContentLoaded', () => {
    const navDashboard = document.getElementById('nav-dashboard');
    const navAnalytics = document.getElementById('nav-analytics');
    const navMap = document.getElementById('nav-map');
    
    const heroMap = document.querySelector('.hero-map-section');
    const dashboardGrid = document.querySelector('.data-container'); // Original dashboard grid
    const analyticsContainer = document.getElementById('analytics-container');
    const mainWrapper = document.querySelector('.main-wrapper');

    // Stats elements
    const totalRidesEl = document.getElementById('analytics-total-rides');
    const peakHourEl = document.getElementById('analytics-peak-hour');
    const topHubEl = document.getElementById('analytics-top-hub');
    const doughnutCenterValEl = document.getElementById('doughnut-center-val');

    if (!navDashboard || !navAnalytics || !dashboardGrid || !analyticsContainer) {
        console.error('[analytics.js] Required navigation or container elements not found.');
        return;
    }

    let peakHoursChart = null;
    let popularStationsChart = null;

    // Station colors matching STATION_COLORS in map.js
    const stationColors = {
        'palma_hall': '#22d3ee',
        'chk': '#a78bfa',
        'eee': '#34d399',
        'engg': '#fb923c',
        'vinzons': '#f472b6',
        'nec': '#facc15',
        'ncpag': '#60a5fa'
    };

    const stationLabels = {
        'palma_hall': 'Palma Hall',
        'chk': 'CHK',
        'eee': 'EEE Building',
        'engg': 'Engineering',
        'vinzons': 'Vinzons Hall',
        'nec': 'NEC Building',
        'ncpag': 'NCPAG'
    };

    function getThemeColors() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        if (theme === 'light') {
            return {
                text: '#4b5563',
                grid: 'rgba(0, 0, 0, 0.06)',
                tooltipBg: '#ffffff',
                tooltipText: '#111827',
                borderColor: '#ffffff',
                lineBorder: '#7B1113', // Maroon
                lineFillStart: 'rgba(123, 17, 19, 0.35)',
                lineFillEnd: 'rgba(123, 17, 19, 0.0)'
            };
        } else {
            return {
                text: '#9ca3af',
                grid: 'rgba(255, 255, 255, 0.06)',
                tooltipBg: '#1f2937',
                tooltipText: '#f9fafb',
                borderColor: '#1f2937',
                lineBorder: '#e53e3e', // Light Maroon / Red
                lineFillStart: 'rgba(229, 62, 62, 0.35)',
                lineFillEnd: 'rgba(229, 62, 62, 0.0)'
            };
        }
    }

    function refreshMapSize() {
        if (window.leafletMap) {
            setTimeout(() => {
                window.leafletMap.invalidateSize();
            }, 100);
        }
    }

    // Switch to Dashboard View
    navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        
        navDashboard.classList.add('active');
        navAnalytics.classList.remove('active');
        if (navMap) navMap.classList.remove('active');
        document.body.classList.remove('non-map-view');

        if (heroMap) {
            heroMap.style.setProperty('display', 'block');
            heroMap.style.height = '450px';
        }
        if (mainWrapper) {
            mainWrapper.style.overflowY = 'auto';
        }
        dashboardGrid.style.display = 'grid';
        analyticsContainer.style.display = 'none';

        refreshMapSize();
    });

    // Switch to Map View (full screen tracking monitor)
    if (navMap) {
        navMap.addEventListener('click', (e) => {
            e.preventDefault();
            
            navMap.classList.add('active');
            navDashboard.classList.remove('active');
            navAnalytics.classList.remove('active');
            document.body.classList.remove('non-map-view');

            if (heroMap) {
                heroMap.style.setProperty('display', 'block');
                heroMap.style.height = '100%';
            }
            if (mainWrapper) {
                mainWrapper.style.overflowY = 'hidden';
            }
            dashboardGrid.style.display = 'none';
            analyticsContainer.style.display = 'none';

            refreshMapSize();
        });
    }

    // Switch to Analytics View
    navAnalytics.addEventListener('click', (e) => {
        e.preventDefault();

        navAnalytics.classList.add('active');
        navDashboard.classList.remove('active');
        if (navMap) navMap.classList.remove('active');
        document.body.classList.add('non-map-view');

        if (heroMap) heroMap.style.setProperty('display', 'none', 'important');
        if (mainWrapper) {
            mainWrapper.style.overflowY = 'auto';
        }
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        dashboardGrid.style.display = 'none';
        
        analyticsContainer.style.display = 'grid';

        loadAnalyticsData();
    });

    async function loadAnalyticsData() {
        try {
            const response = await fetch('/api/analytics');
            const data = await response.json();
            if (data.success) {
                updateStatsBanner(data.peakHours, data.popularStations);
                renderCharts(data.peakHours, data.popularStations);
            } else {
                console.error('[analytics.js] Backend error:', data.error);
            }
        } catch (err) {
            console.error('[analytics.js] Failed to fetch analytics:', err);
        }
    }

    function formatHour(hour) {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${displayHour}:00 ${ampm}`;
    }

    function updateStatsBanner(peakHoursData, popularStationsData) {
        // Compute total rides
        let total = 0;
        popularStationsData.forEach(s => total += s.count);
        if (totalRidesEl) totalRidesEl.textContent = total;
        if (doughnutCenterValEl) doughnutCenterValEl.textContent = total;

        // Compute peak hour
        let maxCount = -1;
        let peakHour = null;
        peakHoursData.forEach(item => {
            if (item.count > maxCount) {
                maxCount = item.count;
                peakHour = item.hour;
            }
        });
        if (peakHourEl) {
            peakHourEl.textContent = peakHour !== null ? formatHour(peakHour) : '--';
        }

        // Compute top hub
        if (popularStationsData.length > 0) {
            const top = popularStationsData[0];
            const key = top.station.toLowerCase().trim();
            const label = stationLabels[key] || top.station.toUpperCase();
            if (topHubEl) {
                topHubEl.textContent = `${label} (${top.count})`;
            }
        } else {
            if (topHubEl) topHubEl.textContent = '--';
        }
    }

    function renderCharts(peakHoursData, popularStationsData) {
        const theme = getThemeColors();

        // --- 1. Line Chart: Peak Usage Hours ---
        const hourlyCounts = Array(24).fill(0);
        peakHoursData.forEach(item => {
            if (item.hour >= 0 && item.hour < 24) {
                hourlyCounts[item.hour] = item.count;
            }
        });

        const hourLabels = Array.from({ length: 24 }, (_, i) => {
            const ampm = i >= 12 ? 'PM' : 'AM';
            const displayHour = i % 12 === 0 ? 12 : i % 12;
            return `${displayHour} ${ampm}`;
        });

        const ctxHours = document.getElementById('chart-peak-hours');
        if (ctxHours) {
            if (peakHoursChart) {
                peakHoursChart.destroy();
            }

            // Create gradient for modern area shading
            const ctx = ctxHours.getContext('2d');
            const fillGradient = ctx.createLinearGradient(0, 0, 0, ctxHours.offsetHeight || 300);
            fillGradient.addColorStop(0, theme.lineFillStart);
            fillGradient.addColorStop(1, theme.lineFillEnd);

            peakHoursChart = new Chart(ctxHours, {
                type: 'line',
                data: {
                    labels: hourLabels,
                    datasets: [{
                        label: 'Rides',
                        data: hourlyCounts,
                        borderColor: theme.lineBorder,
                        backgroundColor: fillGradient,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointBackgroundColor: theme.lineBorder,
                        pointBorderColor: theme.borderColor,
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: theme.lineBorder,
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: theme.tooltipBg,
                            titleColor: theme.tooltipText,
                            bodyColor: theme.tooltipText,
                            borderColor: 'rgba(255,255,255,0.08)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 10,
                            font: { family: 'Inter' }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: theme.grid, drawBorder: false },
                            ticks: { color: theme.text, font: { family: 'Inter', size: 10 } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: theme.grid, drawBorder: false },
                            ticks: { color: theme.text, precision: 0, font: { family: 'Inter', size: 10 } }
                        }
                    }
                }
            });
        }

        // --- 2. Doughnut Chart: Most Popular Stations ---
        const stationNames = [];
        const stationCounts = [];
        const backgroundColors = [];

        popularStationsData.forEach(item => {
            const key = item.station.toLowerCase().trim();
            const label = stationLabels[key] || item.station.toUpperCase();
            const color = stationColors[key] || '#10b981';

            stationNames.push(label);
            stationCounts.push(item.count);
            backgroundColors.push(color);
        });

        const ctxStations = document.getElementById('chart-popular-stations');
        if (ctxStations) {
            if (popularStationsChart) {
                popularStationsChart.destroy();
            }

            popularStationsChart = new Chart(ctxStations, {
                type: 'doughnut',
                data: {
                    labels: stationNames,
                    datasets: [{
                        data: stationCounts,
                        backgroundColor: backgroundColors,
                        borderWidth: 2,
                        borderColor: theme.borderColor,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%', // Thin modern ring layout
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: theme.text,
                                font: { family: 'Inter', size: 10, weight: '500' },
                                boxWidth: 10,
                                boxHeight: 10,
                                padding: 12
                            }
                        },
                        tooltip: {
                            backgroundColor: theme.tooltipBg,
                            titleColor: theme.tooltipText,
                            bodyColor: theme.tooltipText,
                            borderColor: 'rgba(255,255,255,0.08)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 10,
                            font: { family: 'Inter' }
                        }
                    }
                }
            });
        }
    }

    // Dynamic Chart Update on Theme Switch
    window.addEventListener('themeChanged', () => {
        const theme = getThemeColors();
        
        if (peakHoursChart) {
            // Re-generate line fill gradient based on new theme
            const ctxHours = document.getElementById('chart-peak-hours');
            if (ctxHours) {
                const ctx = ctxHours.getContext('2d');
                const fillGradient = ctx.createLinearGradient(0, 0, 0, ctxHours.offsetHeight || 300);
                fillGradient.addColorStop(0, theme.lineFillStart);
                fillGradient.addColorStop(1, theme.lineFillEnd);
                
                peakHoursChart.data.datasets[0].backgroundColor = fillGradient;
            }

            peakHoursChart.data.datasets[0].borderColor = theme.lineBorder;
            peakHoursChart.data.datasets[0].pointBackgroundColor = theme.lineBorder;
            peakHoursChart.data.datasets[0].pointBorderColor = theme.borderColor;
            
            peakHoursChart.options.scales.x.grid.color = theme.grid;
            peakHoursChart.options.scales.x.ticks.color = theme.text;
            peakHoursChart.options.scales.y.grid.color = theme.grid;
            peakHoursChart.options.scales.y.ticks.color = theme.text;
            
            peakHoursChart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
            peakHoursChart.options.plugins.tooltip.titleColor = theme.tooltipText;
            peakHoursChart.options.plugins.tooltip.bodyColor = theme.tooltipText;
            peakHoursChart.update();
        }

        if (popularStationsChart) {
            popularStationsChart.options.plugins.legend.labels.color = theme.text;
            popularStationsChart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
            popularStationsChart.options.plugins.tooltip.titleColor = theme.tooltipText;
            popularStationsChart.options.plugins.tooltip.bodyColor = theme.tooltipText;
            
            popularStationsChart.data.datasets[0].borderColor = theme.borderColor;
            popularStationsChart.update();
        }
    });
});

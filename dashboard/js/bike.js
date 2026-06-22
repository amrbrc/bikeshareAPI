// public/js/bike.js
// Fetches bicycle and location data, manages state, and renders the UI.

let allBikes = [];
let allLocations = [];
let currentFilterStation = null;

// =============================================================
// INITIALIZE DASHBOARD
// =============================================================
async function initDashboard() {
    await Promise.all([
        fetchBikes(),
        fetchLocations()
    ]);

    renderBikes();
    renderLocations();

    // Set last updated time
    const lastUpdatedEl = document.getElementById('stat-last-updated');
    if (lastUpdatedEl) {
        const now = new Date();
        lastUpdatedEl.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    }
}

// =============================================================
// LIVE CLOCK
// =============================================================
function startLiveClock() {
    const timeEl = document.getElementById('live-time');
    if (!timeEl) return;
    
    setInterval(() => {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    }, 1000);
}

// =============================================================
// FETCH DATA
// =============================================================
async function fetchBikes() {
    try {
        const response = await fetch('/api/bicycles');
        const result = await response.json();
        if (result.success) {
            allBikes = result.data;
        }
    } catch (err) {
        console.error('[bike.js] Failed to fetch bicycles:', err);
    }
}

async function fetchLocations() {
    try {
        const response = await fetch('/api/locations');
        const result = await response.json();
        if (result.success) {
            allLocations = result.data;
            window.allLocations = allLocations; // Expose globally for settings.js
        }
    } catch (err) {
        console.error('[bike.js] Failed to fetch locations:', err);
    }
}

// =============================================================
// RENDER BIKES
// =============================================================
function renderBikes() {
    const grid = document.getElementById('bikes-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Update hero stats early so they always show the grand total
    const statTotalBikes = document.getElementById('stat-total-bikes');
    if (statTotalBikes) statTotalBikes.textContent = allBikes.length;

    if (!currentFilterStation) {
        grid.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; grid-column: 1 / -1; padding: 10px;">Select a station from the list to view its parked bicycles.</p>';
        return;
    }

    // Filter bikes for the selected station
    const bikesToRender = allBikes.filter(b => b.new_location === currentFilterStation);

    if (bikesToRender.length === 0) {
        grid.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; grid-column: 1 / -1; padding: 10px;">No bicycles found at ${currentFilterStation}.</p>`;
        return;
    }

    bikesToRender.forEach((bike, index) => {
        const card = document.createElement('div');
        card.className = 'bike-card';
        card.style.animationDelay = `${index * 0.05}s`;

        card.innerHTML = `
            <span class="bike-icon">🚲</span>
            <div class="bike-num">${bike.bicycle_code}</div>
            <div class="bike-loc-wrap">
                <div class="bike-loc">${bike.new_location || 'Unknown'}</div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// =============================================================
// RENDER LOCATIONS (STATIONS)
// =============================================================
function renderLocations() {
    const grid = document.getElementById('stations-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (allLocations.length === 0) {
        grid.innerHTML = '<p class="placeholder-text">No stations found.</p>';
        return;
    }

    // Compute how many bikes are at each station
    const bikeCounts = {};
    allBikes.forEach(bike => {
        const loc = bike.new_location;
        if (loc) {
            bikeCounts[loc] = (bikeCounts[loc] || 0) + 1;
        }
    });

    allLocations.forEach((loc, index) => {
        const stationKey = loc.location_name;
        const count = bikeCounts[stationKey] || 0;
        const isDisabled = loc.is_disabled === 1 || loc.is_disabled === true;
        
        // Get color from map.js if available, default to green. Use red if disabled.
        const dotColor = isDisabled ? '#ef4444' : ((window.STATION_COLORS && window.STATION_COLORS[stationKey]) 
            ? window.STATION_COLORS[stationKey] 
            : '#34d399');

        const row = document.createElement('div');
        row.className = 'station-row';
        row.style.animationDelay = `${index * 0.05}s`;
        if (isDisabled) {
            row.style.opacity = '0.75';
        }
        
        // If this station is currently selected, highlight it
        if (currentFilterStation === stationKey) {
            row.style.background = 'rgba(255,255,255,0.08)';
            row.style.borderColor = dotColor;
        }

        row.innerHTML = `
            <div class="station-dot" style="background-color: ${dotColor}; box-shadow: 0 0 6px ${dotColor};"></div>
            <span class="station-name" style="${isDisabled ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
                ${stationKey} ${isDisabled ? '<span style="font-size:0.65rem; color:#ef4444; font-weight:600; margin-left:4px;">(Offline)</span>' : ''}
            </span>
            <span style="margin-left:auto; font-size:0.75rem; color:#8892a4; font-weight:600; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:12px;">
                ${count} bikes
            </span>
            <span class="station-arrow" style="margin-left: 8px;">›</span>
        `;

        // Interaction: Click to filter bikes and zoom map
        row.addEventListener('click', () => {
            // Toggle filter
            if (currentFilterStation === stationKey) {
                currentFilterStation = null; // Un-filter if clicked again
            } else {
                currentFilterStation = stationKey;
                // Zoom map (calls function in map.js)
                if (window.zoomToStation) {
                    window.zoomToStation(stationKey);
                }
            }
            
            // Re-render UI
            renderLocations(); // Re-render to update highlight state
            renderBikes();     // Re-render to show filtered bikes
        });

        grid.appendChild(row);
    });

    // Update hero stats if Developer B hasn't done it yet
    const statTotalStations = document.getElementById('stat-total-stations');
    if (statTotalStations) statTotalStations.textContent = allLocations.length;
}

// Expose initDashboard globally
window.initDashboard = initDashboard;

// =============================================================
// SELF-INITIALIZATION
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    startLiveClock();
});

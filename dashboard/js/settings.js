// public/js/settings.js
// Manages the Admin Settings Panel overlay and operations.

document.addEventListener('DOMContentLoaded', () => {
    const navSettings = document.getElementById('nav-settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsModalCard = document.getElementById('settings-modal-card');
    const closeSettings = document.getElementById('close-settings');
    
    const loginView = document.getElementById('settings-login-view');
    const adminView = document.getElementById('settings-admin-view');
    
    const loginUsername = document.getElementById('admin-username');
    const loginPassword = document.getElementById('admin-password');
    const loginError = document.getElementById('login-error');
    const btnLoginSubmit = document.getElementById('btn-login-submit');
    const btnLogout = document.getElementById('btn-admin-logout');

    const newBikeCode = document.getElementById('new-bike-code');
    const newBikeLock = document.getElementById('new-bike-lock');
    const newBikeLocation = document.getElementById('new-bike-location');
    const btnAddBike = document.getElementById('btn-add-bike');
    const addBikeMsg = document.getElementById('add-bike-msg');

    const newStationName = document.getElementById('new-station-name');
    const btnAddStation = document.getElementById('btn-add-station');
    const addStationMsg = document.getElementById('add-station-msg');

    const stationToggleList = document.getElementById('station-toggle-list');
    
    // Register Member elements
    const newMemberFirstname = document.getElementById('new-member-firstname');
    const newMemberLastname = document.getElementById('new-member-lastname');
    const newMemberPhone = document.getElementById('new-member-phone');
    const btnAddMember = document.getElementById('btn-add-member');
    const addMemberMsg = document.getElementById('add-member-msg');
    const membersList = document.getElementById('members-list');

    // Event handler for registering member
    btnAddMember.addEventListener('click', async () => {
        const firstname = newMemberFirstname.value.trim();
        const lastname = newMemberLastname.value.trim();
        let phone = newMemberPhone.value.trim();
        
        addMemberMsg.style.display = 'none';
        
        if (!firstname || !lastname || !phone) {
            addMemberMsg.textContent = 'All fields are required.';
            addMemberMsg.style.background = 'rgba(239, 68, 68, 0.1)';
            addMemberMsg.style.color = '#ef4444';
            addMemberMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
            addMemberMsg.style.display = 'block';
            return;
        }

        // Auto-formatting phone number to +639XXXXXXXXX
        if (phone.startsWith('09') && phone.length === 11) {
            phone = '+63' + phone.substring(1);
        } else if (phone.startsWith('9') && phone.length === 10) {
            phone = '+63' + phone;
        } else if (phone.startsWith('639') && phone.length === 12) {
            phone = '+' + phone;
        }

        // Validate final format: starts with +639 followed by exactly 9 digits
        const phPhoneRegex = /^\+639\d{9}$/;
        if (!phPhoneRegex.test(phone)) {
            addMemberMsg.textContent = 'Invalid phone number format. Must be like +639171234567 or 09171234567.';
            addMemberMsg.style.background = 'rgba(239, 68, 68, 0.1)';
            addMemberMsg.style.color = '#ef4444';
            addMemberMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
            addMemberMsg.style.display = 'block';
            return;
        }

        btnAddMember.disabled = true;
        btnAddMember.textContent = 'Registering...';
        try {
            const res = await fetch('/api/admin/members', {
                method: 'POST',
                headers: getAdminHeaders(),
                body: JSON.stringify({ 
                    firstname,
                    lastname,
                    phone_number: phone 
                })
            });
            const data = await res.json();
            if (data.success) {
                newMemberFirstname.value = '';
                newMemberLastname.value = '';
                newMemberPhone.value = '';
                addMemberMsg.textContent = data.message || 'User registered successfully!';
                addMemberMsg.style.background = 'rgba(0, 106, 78, 0.1)';
                addMemberMsg.style.color = 'var(--up-green)';
                addMemberMsg.style.border = '1px solid rgba(0, 106, 78, 0.2)';
                addMemberMsg.style.display = 'block';
                await renderMembersList();
            } else {
                addMemberMsg.textContent = data.error || 'Failed to register user.';
                addMemberMsg.style.background = 'rgba(239, 68, 68, 0.1)';
                addMemberMsg.style.color = '#ef4444';
                addMemberMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
                addMemberMsg.style.display = 'block';
            }
        } catch (e) {
            addMemberMsg.textContent = 'Connection error. Please try again.';
            addMemberMsg.style.background = 'rgba(239, 68, 68, 0.1)';
            addMemberMsg.style.color = '#ef4444';
            addMemberMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
            addMemberMsg.style.display = 'block';
        } finally {
            btnAddMember.disabled = false;
            btnAddMember.textContent = 'Register User';
        }
    });

    if (!navSettings || !settingsModal || !closeSettings) {
        console.error('[settings.js] Settings modal elements not found.');
        return;
    }

    // Modal display control
    navSettings.addEventListener('click', (e) => {
        e.preventDefault();
        settingsModal.style.display = 'flex';
        checkSession();
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.style.display = 'none';
        // Auto-logout when closing the modal
        sessionStorage.removeItem('adminToken');
        checkSession();
        
        // Reset states
        loginUsername.value = '';
        loginPassword.value = '';
        loginError.style.display = 'none';
        if (settingsModalCard) {
            settingsModalCard.classList.remove('admin-active');
        }
    });

    // Close on click outside modal-card
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
            // Auto-logout when closing the modal
            sessionStorage.removeItem('adminToken');
            checkSession();
            
            if (settingsModalCard) {
                settingsModalCard.classList.remove('admin-active');
            }
        }
    });

    // Check login state
    function checkSession() {
        const token = sessionStorage.getItem('adminToken');
        if (token === 'admin-logged-in-token') {
            loginView.style.display = 'none';
            adminView.style.display = 'block';
            if (settingsModalCard) {
                settingsModalCard.classList.add('admin-active');
            }
            loadAdminPanel();
        } else {
            loginView.style.display = 'block';
            adminView.style.display = 'none';
            if (settingsModalCard) {
                settingsModalCard.classList.remove('admin-active');
            }
        }
    }

    // Handle Login Submit
    async function handleLogin() {
        const username = loginUsername.value.trim();
        const password = loginPassword.value;
        loginError.style.display = 'none';

        if (!username || !password) {
            loginError.textContent = 'Username and password are required.';
            loginError.style.display = 'block';
            return;
        }

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                sessionStorage.setItem('adminToken', data.token);
                checkSession();
            } else {
                loginError.textContent = data.error || 'Authentication failed.';
                loginError.style.display = 'block';
            }
        } catch (err) {
            console.error('[settings.js] Login error:', err);
            loginError.textContent = 'Server connection error. Please try again.';
            loginError.style.display = 'block';
        }
    }

    btnLoginSubmit.addEventListener('click', handleLogin);
    
    // Support login on pressing Enter
    loginUsername.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    // Handle Logout (Legacy / Optional Button)
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('adminToken');
            checkSession();
        });
    }

    // Helper: Build Admin Headers
    function getAdminHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
        };
    }

    // Populate and refresh Admin Panel data
    async function loadAdminPanel() {
        console.log('[settings.js] loadAdminPanel called');
        addBikeMsg.style.display = 'none';
        addBikeMsg.className = '';
        addBikeMsg.style.background = 'none';
        addBikeMsg.style.border = 'none';
        
        addStationMsg.style.display = 'none';
        addStationMsg.className = '';
        addStationMsg.style.background = 'none';
        addStationMsg.style.border = 'none';
        
        await Promise.all([
            populateLocationDropdowns(),
            renderStationToggles(),
            renderMembersList()
        ]);
    }

    // Populate Initial Station dropdown for new bikes
    async function populateLocationDropdowns() {
        console.log('[settings.js] populateLocationDropdowns started');
        newBikeLocation.innerHTML = '';
        
        let locations = [];
        try {
            const res = await fetch('/api/locations');
            const data = await res.json();
            console.log('[settings.js] populateLocationDropdowns fetched:', data);
            if (data.success) locations = data.data;
        } catch (e) {
            console.error('[settings.js] Failed to fetch locations for dropdown:', e);
        }

        locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc.location_name;
            const displayName = loc.location_name.toUpperCase();
            opt.textContent = displayName;
            newBikeLocation.appendChild(opt);
        });
        console.log(`[settings.js] populateLocationDropdowns populated ${locations.length} options`);
    }

    // Render Station toggles inside admin dashboard
    async function renderStationToggles() {
        console.log('[settings.js] renderStationToggles started');
        stationToggleList.innerHTML = '';
        
        let locations = [];
        try {
            const res = await fetch('/api/locations');
            const data = await res.json();
            console.log('[settings.js] renderStationToggles fetched:', data);
            if (data.success) locations = data.data;
        } catch (e) {
            console.error('[settings.js] Failed to fetch locations for status panel:', e);
        }

        if (locations.length === 0) {
            stationToggleList.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); padding: 10px; text-align: center;">No locations found.</div>';
            console.log('[settings.js] renderStationToggles: locations list is empty');
            return;
        }

        locations.forEach(loc => {
            const stationName = loc.location_name;
            const isDisabled = loc.is_disabled === 1 || loc.is_disabled === true;
            
            const div = document.createElement('div');
            div.className = 'toggle-switch-container';

            const checkboxId = `toggle-${stationName.replace(/\s+/g, '-').toLowerCase()}`;

            div.innerHTML = `
                <div class="toggle-switch-info">
                    <span class="toggle-switch-name">${stationName.toUpperCase()}</span>
                    <span class="toggle-switch-status ${isDisabled ? 'offline' : 'online'}">
                        ● ${isDisabled ? 'Offline' : 'Online'}
                    </span>
                </div>
                <label class="switch-label" for="${checkboxId}">
                    <input type="checkbox" id="${checkboxId}" ${!isDisabled ? 'checked' : ''}>
                    <span class="switch-slider"></span>
                </label>
            `;

            const checkbox = div.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', async () => {
                checkbox.disabled = true;
                
                try {
                    const res = await fetch('/api/admin/locations/toggle', {
                        method: 'POST',
                        headers: getAdminHeaders(),
                        body: JSON.stringify({
                            location_name: stationName,
                            is_disabled: !checkbox.checked
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        await renderStationToggles();
                        if (window.initDashboard) {
                            await window.initDashboard();
                        }
                    } else {
                        alert(data.error || 'Failed to toggle station status.');
                        checkbox.checked = !checkbox.checked;
                        checkbox.disabled = false;
                    }
                } catch (e) {
                    console.error('[settings.js] Error toggling station:', e);
                    checkbox.checked = !checkbox.checked;
                    checkbox.disabled = false;
                }
            });

            stationToggleList.appendChild(div);
        });
    }

    // Render the list of registered members in the admin panel
    async function renderMembersList() {
        if (!membersList) return;
        membersList.innerHTML = '';
        
        let members = [];
        try {
            const res = await fetch('/api/admin/members', {
                headers: getAdminHeaders()
            });
            const data = await res.json();
            if (data.success) members = data.data;
        } catch (e) {
            console.error('[settings.js] Failed to fetch members list:', e);
        }

        if (members.length === 0) {
            membersList.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); padding: 10px; text-align: center;">No registered members.</div>';
            return;
        }

        members.forEach(mem => {
            const div = document.createElement('div');
            div.style.background = 'var(--bg-main)';
            div.style.padding = '10px 14px';
            div.style.borderRadius = 'var(--radius-sm)';
            div.style.border = '1px solid var(--border)';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            
            div.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-h);">${mem.lastname}, ${mem.firstname}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">${mem.phone_number}</span>
                </div>
            `;
            membersList.appendChild(div);
        });
    }

    // Add Bicycle Form Submit
    btnAddBike.addEventListener('click', async () => {
        const code = newBikeCode.value.trim();
        const lock = newBikeLock.value.trim();
        const loc = newBikeLocation.value;
        
        addBikeMsg.style.display = 'none';
        
        if (!code || !lock || !loc) {
            addBikeMsg.textContent = 'All fields are required.';
            addBikeMsg.style.background = 'rgba(239, 68, 68, 0.1)';
            addBikeMsg.style.color = '#ef4444';
            addBikeMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
            addBikeMsg.style.display = 'block';
            return;
        }

        btnAddBike.disabled = true;
        btnAddBike.textContent = 'Adding...';

        try {
            const res = await fetch('/api/admin/bicycles', {
                method: 'POST',
                headers: getAdminHeaders(),
                body: JSON.stringify({
                    bicycle_code: code,
                    combination_lock: lock,
                    initial_location: loc
                })
            });
            const data = await res.json();
            if (data.success) {
                newBikeCode.value = '';
                newBikeLock.value = '';
                addBikeMsg.textContent = data.message || 'Bicycle successfully added!';
                addBikeMsg.style.background = 'rgba(0, 106, 78, 0.1)';
                addBikeMsg.style.color = 'var(--up-green)';
                addBikeMsg.style.border = '1px solid rgba(0, 106, 78, 0.2)';
                addBikeMsg.style.display = 'block';

                if (window.initDashboard) {
                    await window.initDashboard();
                }
            } else {
                addBikeMsg.textContent = data.error || 'Failed to add bicycle.';
                addBikeMsg.style.background = 'rgba(239, 68, 68, 0.1)';
                addBikeMsg.style.color = '#ef4444';
                addBikeMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
                addBikeMsg.style.display = 'block';
            }
        } catch (err) {
            console.error('[settings.js] Error adding bike:', err);
            addBikeMsg.textContent = 'Connection error. Please try again.';
            addBikeMsg.style.background = 'rgba(239, 68, 68, 0.1)';
            addBikeMsg.style.color = '#ef4444';
            addBikeMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
            addBikeMsg.style.display = 'block';
        } finally {
            btnAddBike.disabled = false;
            btnAddBike.textContent = 'Add to Fleet';
        }
    });

    // Add Station Form Submit
    btnAddStation.addEventListener('click', async () => {
        const name = newStationName.value.trim();
        
        addStationMsg.style.display = 'none';
        
        if (!name) {
            addStationMsg.textContent = 'Station name is required.';
            addStationMsg.style.background = 'rgba(239, 68, 68, 0.1)';
            addStationMsg.style.color = '#ef4444';
            addStationMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
            addStationMsg.style.display = 'block';
            return;
        }

        btnAddStation.disabled = true;
        btnAddStation.textContent = 'Adding...';

        try {
            const res = await fetch('/api/admin/locations', {
                method: 'POST',
                headers: getAdminHeaders(),
                body: JSON.stringify({
                    location_name: name
                })
            });
            const data = await res.json();
            if (data.success) {
                newStationName.value = '';
                addStationMsg.textContent = data.message || 'Station successfully added!';
                addStationMsg.style.background = 'rgba(0, 106, 78, 0.1)';
                addStationMsg.style.color = 'var(--up-green)';
                addStationMsg.style.border = '1px solid rgba(0, 106, 78, 0.2)';
                addStationMsg.style.display = 'block';

                await loadAdminPanel();
                
                if (window.initDashboard) {
                    await window.initDashboard();
                }
            } else {
                addStationMsg.textContent = data.error || 'Failed to add station.';
                addStationMsg.style.background = 'rgba(239, 68, 68, 0.1)';
                addStationMsg.style.color = '#ef4444';
                addStationMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
                addStationMsg.style.display = 'block';
            }
        } catch (err) {
            console.error('[settings.js] Error adding station:', err);
            addStationMsg.textContent = 'Connection error. Please try again.';
            addStationMsg.style.background = 'rgba(239, 68, 68, 0.1)';
            addStationMsg.style.color = '#ef4444';
            addStationMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
            addStationMsg.style.display = 'block';
        } finally {
            btnAddStation.disabled = false;
            btnAddStation.textContent = 'Add Station';
        }
    });
});

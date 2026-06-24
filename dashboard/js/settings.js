// public/js/settings.js
// Manages the Admin Settings Panel overlay and operations.

document.addEventListener('DOMContentLoaded', () => {
    const navSettings = document.getElementById('nav-settings');
    const navRegistration = document.getElementById('nav-registration');
    const navLogs = document.getElementById('nav-logs');

    const registrationContainer = document.getElementById('registration-container');
    const settingsContainer = document.getElementById('settings-container');
    const logsContainer = document.getElementById('logs-container');

    const navDashboard = document.getElementById('nav-dashboard');
    const navAnalytics = document.getElementById('nav-analytics');
    const navMap = document.getElementById('nav-map');
    const dashboardGrid = document.getElementById('dashboard-container');
    const analyticsContainer = document.getElementById('analytics-container');
    const heroMap = document.querySelector('.hero-map-section');
    const mainWrapper = document.querySelector('.main-wrapper');

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

    function hideAllViews() {
        if (heroMap) heroMap.style.display = 'none';
        if (dashboardGrid) dashboardGrid.style.display = 'none';
        if (analyticsContainer) analyticsContainer.style.display = 'none';
        if (registrationContainer) registrationContainer.style.display = 'none';
        if (settingsContainer) settingsContainer.style.display = 'none';
        if (logsContainer) logsContainer.style.display = 'none';

        if (navDashboard) navDashboard.classList.remove('active');
        if (navMap) navMap.classList.remove('active');
        if (navAnalytics) navAnalytics.classList.remove('active');
        if (navRegistration) navRegistration.classList.remove('active');
        if (navSettings) navSettings.classList.remove('active');
        if (navLogs) navLogs.classList.remove('active');
    }

    // Intercept clicks on other nav items to hide our new containers
    [navDashboard, navMap, navAnalytics].forEach(nav => {
        if (nav) {
            nav.addEventListener('click', () => {
                if (registrationContainer) registrationContainer.style.display = 'none';
                if (settingsContainer) settingsContainer.style.display = 'none';
                if (logsContainer) logsContainer.style.display = 'none';
                if (navRegistration) navRegistration.classList.remove('active');
                if (navSettings) navSettings.classList.remove('active');
                if (navLogs) navLogs.classList.remove('active');
            });
        }
    });

    if (navRegistration) {
        navRegistration.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllViews();
            navRegistration.classList.add('active');
            if (registrationContainer) registrationContainer.style.display = 'block';
            if (mainWrapper) mainWrapper.style.overflowY = 'auto';
        });
    }

    if (navSettings) {
        navSettings.addEventListener('click', (e) => {
            e.preventDefault();
            checkSession(true);
        });
    }

    // Modal close logic
    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnCloseSettings) {
        btnCloseSettings.addEventListener('click', () => {
            if (settingsContainer) settingsContainer.style.display = 'none';
        });
    }

    // Close modal when clicking outside the modal card
    if (settingsContainer) {
        settingsContainer.addEventListener('click', (e) => {
            if (e.target === settingsContainer) {
                settingsContainer.style.display = 'none';
            }
        });
    }

    if (navLogs) {
        navLogs.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllViews();
            navLogs.classList.add('active');
            if (logsContainer) logsContainer.style.display = 'block';
            if (mainWrapper) mainWrapper.style.overflowY = 'auto';
            loadLogs();
        });
    }

    async function loadLogs() {
        const qList = document.getElementById('maintenance-queue-list');
        const hList = document.getElementById('honesty-logs-list');
        if (!qList || !hList) return;

        // Fetch Maintenance Queue
        try {
            const res = await fetch('/api/admin/maintenance', { headers: getAdminHeaders() });
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                qList.innerHTML = data.data.map(b => `<div class="card p-3 border shadow-sm mb-2">
                    <strong>🚲 Bike #${b.bicycle_code}</strong>
                    <div class="text-danger small mt-1">Status: ${b.condition_status}</div>
                    <div class="text-muted small">Location: ${b.new_location || 'Unknown'}</div>
                    ${b.last_user_phone ? `<div class="text-muted small">Reporter/User: ${b.last_user_phone}</div>` : ''}
                </div>`).join('');
            } else {
                qList.innerHTML = '<div class="text-muted small">No broken bikes.</div>';
            }
        } catch (e) { qList.innerHTML = 'Error loading.'; }

        // Fetch Honesty Logs
        try {
            const res = await fetch('/api/admin/honesty', { headers: getAdminHeaders() });
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                hList.innerHTML = data.data.map(log => {
                    const formattedDate = new Date(log.DateTime).toLocaleString();
                    return `<div class="card p-3 border shadow-sm mb-2">
                        <strong>👤 ${log.FirstName || ''} ${log.LastName || ''} (${log.MobileNumber || log.SenderNumber})</strong>
                        <div class="text-info fw-bold small mt-1">Action: ${log.Request}</div>
                        <div class="text-muted small">Time: ${formattedDate}</div>
                    </div>`;
                }).join('');
            } else {
                hList.innerHTML = '<div class="text-muted small">No honesty logs.</div>';
            }
        } catch (e) { hList.innerHTML = 'Error loading.'; }
    }

    // Check login state
    function checkSession(forceShowAdmin = false) {
        const token = sessionStorage.getItem('adminToken');
        const settingsModalCard = document.getElementById('settings-modal-card');
        const btnCloseSettings = document.getElementById('btn-close-settings');
        if (token === 'admin-logged-in-token') {
            if (loginView) {
                loginView.classList.add('d-none');
                loginView.classList.remove('d-flex');
            }
            if (adminView) {
                adminView.classList.remove('d-none');
                adminView.style.display = 'block';
            }
            if (btnLogout) {
                btnLogout.style.display = 'flex';
            }
            if (settingsModalCard) settingsModalCard.classList.add('admin-active');
            
            // If they clicked the settings tab explicitly, show the modal. Otherwise hide it.
            if (forceShowAdmin) {
                if (settingsContainer) {
                    settingsContainer.style.display = 'flex';
                    settingsContainer.style.background = 'rgba(11, 15, 25, 0.6)';
                    settingsContainer.style.backdropFilter = 'blur(8px)';
                }
                if (btnCloseSettings) btnCloseSettings.style.display = 'flex';
            } else {
                if (settingsContainer) settingsContainer.style.display = 'none';
            }
            
            loadAdminPanel();
        } else {
            if (loginView) {
                loginView.classList.remove('d-none');
                loginView.classList.add('d-flex');
            }
            if (adminView) {
                adminView.classList.add('d-none');
                adminView.style.display = 'none';
            }
            if (btnLogout) {
                btnLogout.style.display = 'none';
            }
            if (settingsModalCard) settingsModalCard.classList.remove('admin-active');
            
            // Force solid background full screen login and hide close button
            if (settingsContainer) {
                settingsContainer.style.display = 'flex';
                settingsContainer.style.background = 'var(--bg-main)';
                settingsContainer.style.backdropFilter = 'none';
            }
            if (btnCloseSettings) btnCloseSettings.style.display = 'none';
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

        const btnText = document.getElementById('login-btn-text');
        const btnIcon = document.getElementById('login-success-icon');
        const originalBtnText = btnText ? btnText.textContent : 'Sign In';

        try {
            if (btnLoginSubmit) {
                btnLoginSubmit.disabled = true;
                if (btnText) btnText.textContent = 'Authenticating...';
            }

            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (data.success) {
                sessionStorage.setItem('adminToken', data.token);
                // Success feedback
                if (btnLoginSubmit) {
                    btnLoginSubmit.style.backgroundColor = 'var(--up-green)';
                    if (btnText) btnText.textContent = 'Login Successful!';
                    if (btnIcon) btnIcon.style.display = 'block';
                }
                
                setTimeout(() => {
                    checkSession();
                    // Reset button for future logouts
                    if (btnLoginSubmit) {
                        btnLoginSubmit.disabled = false;
                        btnLoginSubmit.style.backgroundColor = '';
                        if (btnText) btnText.textContent = originalBtnText;
                        if (btnIcon) btnIcon.style.display = 'none';
                    }
                }, 800);
            } else {
                if (btnLoginSubmit) {
                    btnLoginSubmit.disabled = false;
                    if (btnText) btnText.textContent = originalBtnText;
                }
                loginError.textContent = data.error || 'Authentication failed.';
                loginError.style.display = 'block';
            }
        } catch (err) {
            console.error('[settings.js] Login error:', err);
            if (btnLoginSubmit) {
                btnLoginSubmit.disabled = false;
                if (btnText) btnText.textContent = originalBtnText;
            }
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
                <div class="d-flex align-items-center gap-2 w-100">
                    <div class="toggle-switch-info flex-grow-1">
                        <span class="toggle-switch-name">${stationName.toUpperCase()}</span>
                        <span class="toggle-switch-status ${isDisabled ? 'offline' : 'online'}">
                            ● ${isDisabled ? 'Offline' : 'Online'}
                        </span>
                    </div>
                    <label class="switch-label mb-0" for="${checkboxId}">
                        <input type="checkbox" id="${checkboxId}" ${!isDisabled ? 'checked' : ''}>
                        <span class="switch-slider"></span>
                    </label>
                    <button class="btn btn-sm btn-outline-danger ms-2 btn-delete-station" data-station="${stationName}">🗑️</button>
                </div>
            `;

            const btnDelete = div.querySelector('.btn-delete-station');
            btnDelete.addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete station ${stationName}?`)) {
                    try {
                        const res = await fetch('/api/admin/delete-location', {
                            method: 'POST',
                            headers: getAdminHeaders(),
                            body: JSON.stringify({ location_name: stationName })
                        });
                        const data = await res.json();
                        if (data.success) {
                            div.remove();
                            if (window.initDashboard) await window.initDashboard();
                        } else {
                            alert('Failed to delete station.');
                        }
                    } catch (e) {
                        alert('Error deleting station.');
                    }
                }
            });

            const checkbox = div.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', async () => {
                try {
                    const res = await fetch('/api/admin/locations/toggle', {
                        method: 'POST',
                        headers: getAdminHeaders(),
                        body: JSON.stringify({
                            location_name: stationName,
                            is_disabled: !checkbox.checked
                        })
                    });
                    
                    if (!res.ok && res.status !== 500 && res.status !== 400 && res.status !== 404) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    
                    const data = await res.json();
                    if (data.success) {
                        // Update the local visual state
                        const statusSpan = div.querySelector('.toggle-switch-status');
                        if (checkbox.checked) {
                            statusSpan.className = 'toggle-switch-status online';
                            statusSpan.innerHTML = '● Online';
                        } else {
                            statusSpan.className = 'toggle-switch-status offline';
                            statusSpan.innerHTML = '● Offline';
                        }
                        
                        if (window.initDashboard) {
                            await window.initDashboard();
                        }
                    } else {
                        alert(data.error || 'Failed to toggle station status.');
                        checkbox.checked = !checkbox.checked;
                    }
                } catch (e) {
                    console.error('[settings.js] Error toggling station:', e);
                    alert(`Server Error: ${e.message}\n\nPlease restart your Node.js backend server so it can load the new database logic we just pushed!`);
                    checkbox.checked = !checkbox.checked;
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
            const isFrozen = mem.points_frozen == 1 || mem.points_frozen === true || mem.points_frozen === 'true';
            const frozenBadge = isFrozen ? '<span style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; margin-left: 6px; font-weight: 600;">FROZEN</span>' : '';

            const div = document.createElement('div');
            div.style.background = 'var(--bg-main)';
            div.style.padding = '10px 14px';
            div.style.borderRadius = 'var(--radius-sm)';
            div.style.border = '1px solid var(--border)';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.flexWrap = 'wrap';
            div.style.gap = '10px';

            div.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 2px; width: 100%;">
                    <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-h);">
                        ${mem.lastname}, ${mem.firstname} ${frozenBadge}
                    </span>
                    <span style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">
                        ${mem.phone_number} | Trust Points: <strong style="color: ${mem.trust_points < 50 ? '#ef4444' : 'inherit'};">${mem.trust_points}</strong>
                    </span>
                </div>
            `;

            // If the user is frozen, we inject the Dispute Resolution UI directly into their card!
            if (isFrozen) {
                const actionDiv = document.createElement('div');
                actionDiv.style.display = 'flex';
                actionDiv.style.flexDirection = 'column';
                actionDiv.style.gap = '5px';
                actionDiv.style.width = '100%';
                actionDiv.style.marginTop = '4px';
                actionDiv.style.paddingTop = '8px';
                actionDiv.style.borderTop = '1px dashed var(--border)';

                actionDiv.innerHTML = `
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 2px;">Resolve Dispute (Enter Disputed Bike Code):</div>
                    <div style="display: flex; gap: 6px;">
                        <input type="text" class="form-control settings-input" placeholder="Bike Code" style="height: 28px; font-size: 0.75rem; width: 90px;">
                        <button class="btn btn-sm btn-success py-0 px-2 btn-innocent" style="font-size: 0.7rem; font-weight: 600;">Innocent</button>
                        <button class="btn btn-sm btn-danger py-0 px-2 btn-guilty" style="font-size: 0.7rem; font-weight: 600;">Guilty (-30 pts)</button>
                    </div>
                `;

                const bikeInput = actionDiv.querySelector('input');
                const btnInnocent = actionDiv.querySelector('.btn-innocent');
                const btnGuilty = actionDiv.querySelector('.btn-guilty');

                const handleResolve = async (verdict) => {
                    const bikeCode = bikeInput.value.trim();
                    if (!bikeCode) return alert("Please enter the Disputed Bike Code first!");

                    if (confirm(`Mark user ${mem.firstname} as ${verdict} for bike ${bikeCode}?`)) {
                        try {
                            const res = await fetch('/api/admin/resolve-dispute', {
                                method: 'POST',
                                headers: getAdminHeaders(),
                                body: JSON.stringify({ phone_number: mem.phone_number, verdict: verdict, bicycle_code: bikeCode })
                            });
                            const data = await res.json();
                            if (data.success) {
                                alert(data.message);
                                renderMembersList(); // Refresh member list to remove FROZEN badge
                                if (window.initDashboard) window.initDashboard(); // Refresh bikes grid to remove DISPUTED border
                            } else {
                                alert(data.error);
                            }
                        } catch (e) {
                            alert("Error resolving dispute.");
                        }
                    }
                };

                btnInnocent.addEventListener('click', () => handleResolve('innocent'));
                btnGuilty.addEventListener('click', () => handleResolve('guilty'));

                div.appendChild(actionDiv);
            }

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

    // Quick Bike Override Listeners (Real Database Connection)
    const btnOverrideLock = document.getElementById('btn-quick-override-lock');
    const btnOverrideStatus = document.getElementById('btn-quick-override-status');
    const targetBike = document.getElementById('override-target-bike');
    const newLock = document.getElementById('override-new-lock');
    const newStatus = document.getElementById('override-new-status');
    const overrideMsg = document.getElementById('quick-override-msg');

    const saveOverride = async (code, payload) => {
        try {
            const res = await fetch('/api/admin/bicycles/override', {
                method: 'POST',
                headers: getAdminHeaders(),
                body: JSON.stringify({ bicycle_code: code, ...payload })
            });
            const data = await res.json();
            if (data.success) {
                overrideMsg.textContent = 'Bike successfully updated!';
                overrideMsg.className = 'alert alert-success py-2 px-3 small mt-2';
            } else {
                overrideMsg.textContent = 'Failed to update.';
                overrideMsg.className = 'alert alert-danger py-2 px-3 small mt-2';
            }
            overrideMsg.style.display = 'block';
            if (window.initDashboard) await window.initDashboard();
        } catch (e) {
            overrideMsg.textContent = 'Network error.';
            overrideMsg.className = 'alert alert-danger py-2 px-3 small mt-2';
            overrideMsg.style.display = 'block';
        }
    };

    if (btnOverrideLock) {
        btnOverrideLock.addEventListener('click', () => {
            const code = targetBike.value.trim();
            const lock = newLock.value.trim();
            if (!code || !lock) return;
            saveOverride(code, { combination_lock: lock });
        });
    }

    if (btnOverrideStatus) {
        btnOverrideStatus.addEventListener('click', () => {
            const code = targetBike.value.trim();
            const stat = newStatus.value;
            if (!code) return;
            saveOverride(code, { condition_status: stat });
        });
    }

    const btnQuickDeleteBike = document.getElementById('btn-quick-delete-bike');
    if (btnQuickDeleteBike) {
        btnQuickDeleteBike.addEventListener('click', async () => {
            const code = targetBike.value.trim();
            if (!code) {
                overrideMsg.textContent = 'Please enter a target bike code.';
                overrideMsg.className = 'alert alert-danger py-2 px-3 small mt-2';
                overrideMsg.style.display = 'block';
                return;
            }
            if (confirm(`Are you absolutely sure you want to delete bike ${code}? This cannot be undone.`)) {
                btnQuickDeleteBike.disabled = true;
                try {
                    const res = await fetch('/api/admin/delete-bike', {
                        method: 'POST',
                        headers: getAdminHeaders(),
                        body: JSON.stringify({ bicycle_code: code })
                    });
                    const data = await res.json();
                    if (data.success) {
                        overrideMsg.textContent = data.message || 'Bike successfully deleted!';
                        overrideMsg.className = 'alert alert-success py-2 px-3 small mt-2';
                        targetBike.value = '';
                    } else {
                        overrideMsg.textContent = data.error || 'Failed to delete bike.';
                        overrideMsg.className = 'alert alert-danger py-2 px-3 small mt-2';
                    }
                    overrideMsg.style.display = 'block';
                    if (window.initDashboard) await window.initDashboard();
                } catch (e) {
                    overrideMsg.textContent = 'Connection error.';
                    overrideMsg.className = 'alert alert-danger py-2 px-3 small mt-2';
                    overrideMsg.style.display = 'block';
                } finally {
                    btnQuickDeleteBike.disabled = false;
                }
            }
        });
    }

    // Run initial session check to gate the dashboard on page load
    checkSession();
});

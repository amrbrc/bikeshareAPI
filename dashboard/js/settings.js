// public/js/settings.js
// Manages the Admin Settings Panel overlay and operations.

document.addEventListener('DOMContentLoaded', () => {
    // Login UI Elements
    const toggleLoginModeBtn = document.getElementById('toggle-login-mode');
    const studentLoginForm = document.getElementById('student-login-form');
    const adminLoginForm = document.getElementById('admin-login-form');
    const loginDescription = document.querySelector('#settings-login-view p.text-muted');

    let isStudentLogin = true; // Track which mode we are in

    // Handle toggling between Student and Admin login
    if (toggleLoginModeBtn) {
        toggleLoginModeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isStudentLogin = !isStudentLogin;

            if (isStudentLogin) {
                studentLoginForm.style.setProperty('display', 'flex', 'important');
                adminLoginForm.style.setProperty('display', 'none', 'important');
                toggleLoginModeBtn.textContent = "Admin Credentials Login";
                loginDescription.textContent = "Enter your registered mobile number to sign in.";
            } else {
                studentLoginForm.style.setProperty('display', 'none', 'important');
                adminLoginForm.style.setProperty('display', 'flex', 'important');
                toggleLoginModeBtn.textContent = "Student Mobile Login";
                loginDescription.textContent = "Please authenticate with admin credentials.";
            }
        });
    }

    const navSettings = document.getElementById('nav-settings');
    const navRegistration = document.getElementById('nav-registration');
    const navLogs = document.getElementById('nav-logs');
    const navPointsSettings = document.getElementById('nav-points-settings');

    const registrationContainer = document.getElementById('registration-container');
    const settingsContainer = document.getElementById('settings-container');
    const logsContainer = document.getElementById('logs-container');
    const pointsSettingsContainer = document.getElementById('points-settings-container');

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

    // Generic confirmation modal logic
    function confirmAction(title, text, onConfirm) {
        const modal = document.getElementById('action-confirm-modal');
        const titleEl = document.getElementById('action-confirm-title');
        const textEl = document.getElementById('action-confirm-text');
        const btnCancel = document.getElementById('btn-action-cancel');
        const btnConfirm = document.getElementById('btn-action-confirm');

        if (!modal) {
            if (confirm(text)) onConfirm();
            return;
        }

        titleEl.textContent = title;
        textEl.textContent = text;
        modal.style.display = 'flex';

        const newBtnCancel = btnCancel.cloneNode(true);
        const newBtnConfirm = btnConfirm.cloneNode(true);
        btnCancel.replaceWith(newBtnCancel);
        btnConfirm.replaceWith(newBtnConfirm);

        newBtnCancel.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        newBtnConfirm.addEventListener('click', () => {
            modal.style.display = 'none';
            onConfirm();
        });
    }

    // Event handler for registering member
    btnAddMember.addEventListener('click', () => {
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

        confirmAction('Register Member', `Are you sure you want to register ${firstname} ${lastname}?`, async () => {
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
    });

    function hideAllViews() {
        const studentDashboardContainer = document.getElementById('student-dashboard-container');
        if (studentDashboardContainer) studentDashboardContainer.style.display = 'none';
        if (heroMap) heroMap.style.display = 'none';
        if (dashboardGrid) dashboardGrid.style.display = 'none';
        if (analyticsContainer) analyticsContainer.style.display = 'none';
        if (registrationContainer) registrationContainer.style.display = 'none';
        if (settingsContainer) settingsContainer.style.display = 'none';
        if (logsContainer) logsContainer.style.display = 'none';
        if (pointsSettingsContainer) pointsSettingsContainer.style.display = 'none';
        if (mainWrapper) {
            mainWrapper.style.overflowY = 'auto';
            mainWrapper.scrollTop = 0;
        }

        if (navDashboard) navDashboard.classList.remove('active');
        if (navMap) navMap.classList.remove('active');
        if (navAnalytics) navAnalytics.classList.remove('active');
        if (navRegistration) navRegistration.classList.remove('active');
        if (navSettings) navSettings.classList.remove('active');
        if (navLogs) navLogs.classList.remove('active');
        if (navPointsSettings) navPointsSettings.classList.remove('active');
    }

    // Intercept clicks on other nav items to hide our new containers
    [navDashboard, navMap, navAnalytics].forEach(nav => {
        if (nav) {
            nav.addEventListener('click', () => {
                if (registrationContainer) registrationContainer.style.display = 'none';
                if (settingsContainer) settingsContainer.style.display = 'none';
                if (logsContainer) logsContainer.style.display = 'none';
                if (pointsSettingsContainer) pointsSettingsContainer.style.display = 'none';
                if (navRegistration) navRegistration.classList.remove('active');
                if (navSettings) navSettings.classList.remove('active');
                if (navLogs) navLogs.classList.remove('active');
                if (navPointsSettings) navPointsSettings.classList.remove('active');
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
            if (logsContainer) logsContainer.style.display = 'flex';
            if (mainWrapper) mainWrapper.style.overflowY = 'hidden';
            loadLogs();
        });
    }

    if (navPointsSettings) {
        navPointsSettings.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllViews();
            navPointsSettings.classList.add('active');
            if (pointsSettingsContainer) pointsSettingsContainer.style.display = 'block';
            if (mainWrapper) mainWrapper.style.overflowY = 'auto';
            loadPointsSettings();
        });
    }

    async function loadPointsSettings() {
        const grid = document.getElementById('points-settings-grid');
        if (!grid) return;
        
        try {
            const res = await fetch('/api/admin/settings', { headers: getAdminHeaders() });
            const data = await res.json();
            if (data.success) {
                grid.innerHTML = '';
                for (const [key, val] of Object.entries(data.data)) {
                    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const card = document.createElement('div');
                    card.className = 'col-md-6 col-lg-4';
                    card.innerHTML = `
                        <div class="card p-3 shadow-sm border-0" style="background-color: var(--bg-panel); border-radius: var(--radius-md);">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="fw-bold mb-1" style="color: var(--text-h); font-size: 0.9rem;">${formattedKey}</h6>
                                    <p class="small text-muted mb-0 font-monospace">${key}</p>
                                </div>
                                <span class="badge ${parseInt(val) < 0 ? 'bg-danger' : 'bg-success'}" style="font-size: 0.85rem;">${val}</span>
                            </div>
                            <div class="mt-3 d-flex gap-2">
                                <input type="number" class="form-control form-control-sm settings-val-input" value="${val}" style="max-width: 100px;">
                                <button class="btn btn-sm btn-primary btn-save-setting" data-key="${key}" style="background-color: var(--up-maroon); border: none;">Save</button>
                            </div>
                        </div>
                    `;
                    grid.appendChild(card);
                }

                grid.querySelectorAll('.btn-save-setting').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const k = e.target.getAttribute('data-key');
                        const input = e.target.previousElementSibling;
                        const v = parseInt(input.value);
                        
                        confirmAction('Update Setting', `Are you sure you want to change ${k} to ${v}?`, async () => {
                            try {
                                const saveRes = await fetch('/api/admin/settings', {
                                    method: 'POST',
                                    headers: getAdminHeaders(),
                                    body: JSON.stringify({ key: k, value: v })
                                });
                                const saveData = await saveRes.json();
                                if (saveData.success) {
                                    loadPointsSettings();
                                } else {
                                    alert(saveData.error || 'Failed to update setting.');
                                }
                            } catch(err) {
                                alert('Error updating setting.');
                            }
                        });
                    });
                });
            } else {
                grid.innerHTML = '<div class="col-12"><p class="text-danger small">Failed to load settings.</p></div>';
            }
        } catch (e) {
            grid.innerHTML = '<div class="col-12"><p class="text-danger small">Error connecting to server.</p></div>';
        }
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
                qList.innerHTML = data.data.map(b => `<div class="d-flex flex-column p-3 border rounded shadow-sm mb-2" style="background-color: var(--bg-panel); color: var(--text-h); border-color: var(--border) !important;">
                    <strong>Bike #${b.bicycle_code}</strong>
                    <div class="text-danger small mt-1">Status: ${b.condition_status}</div>
                    <div class="small mt-1" style="color: var(--text-muted);">Location: ${b.new_location || 'Unknown'}</div>
                    ${b.last_user_phone ? `<div class="small" style="color: var(--text-muted);">Reporter/User: ${b.last_user_phone}</div>` : ''}
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
                    return `<div class="d-flex flex-column p-3 border rounded shadow-sm mb-2" style="background-color: var(--bg-panel); color: var(--text-h); border-color: var(--border) !important;">
                        <strong>👤 ${log.FirstName || ''} ${log.LastName || ''} (${log.MobileNumber || log.SenderNumber})</strong>
                        <div class="text-info fw-bold small mt-1">Action: ${log.Request}</div>
                        <div class="small mt-1" style="color: var(--text-muted);">Time: ${formattedDate}</div>
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
        const role = sessionStorage.getItem('userRole') || 'admin';

        const settingsModalCard = document.getElementById('settings-modal-card');
        const btnCloseSettings = document.getElementById('btn-close-settings');
        const studentDashboardContainer = document.getElementById('student-dashboard-container');

        if (token) {
            if (loginView) {
                loginView.classList.add('d-none');
                loginView.classList.remove('d-flex');
            }
            if (btnLogout) {
                btnLogout.style.display = 'flex';
            }

            if (role === 'student') {
                // --- STUDENT ROUTING ---
                if (adminView) {
                    adminView.classList.add('d-none');
                    adminView.style.display = 'none';
                }
                if (settingsModalCard) settingsModalCard.classList.remove('admin-active');

                // Hide modal and show student dashboard
                if (settingsContainer) settingsContainer.style.display = 'none';
                hideAllViews();
                if (studentDashboardContainer) studentDashboardContainer.style.display = 'block';

                // Trigger fake gauge animation and dynamic color
                setTimeout(() => {
                    const circle = document.getElementById('trust-score-circle');
                    const text = document.getElementById('trust-score-text');
                    const msg = document.getElementById('trust-score-msg');
                    if(circle && text && msg) {
                        const fakeScore = 85;
                        const max = 120;
                        const offset = 283 - (283 * (fakeScore / max));
                        circle.style.strokeDashoffset = offset; 
                        text.textContent = fakeScore;
                        
                        // Dynamic coloring
                        if (fakeScore >= 90) {
                            circle.style.stroke = 'var(--up-green, #006a4e)';
                            msg.textContent = 'Excellent standing! Keep it up.';
                        } else if (fakeScore >= 60) {
                            circle.style.stroke = '#eab308'; // Yellow
                            msg.textContent = 'Great standing! You can borrow bikes anytime.';
                        } else {
                            circle.style.stroke = '#ef4444'; // Red
                            msg.textContent = 'Warning: Trust score is too low.';
                        }
                    }
                }, 500);

                // Fake Timer Interval (starts at 01:15:30)
                const timerEl = document.getElementById('active-ride-timer');
                if (timerEl) {
                    let seconds = 4530; 
                    if (window.studentTimerInterval) clearInterval(window.studentTimerInterval);
                    window.studentTimerInterval = setInterval(() => {
                        seconds++;
                        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
                        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
                        const s = String(seconds % 60).padStart(2, '0');
                        timerEl.textContent = `${h}:${m}:${s}`;
                    }, 1000);
                }

            } else {
                // --- ADMIN ROUTING ---
                if (adminView) {
                    adminView.classList.remove('d-none');
                    adminView.style.display = 'block';
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

                if (heroMap) heroMap.style.display = 'block';
                if (dashboardGrid) dashboardGrid.style.display = 'block';
                loadAdminPanel();
            }
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
        loginError.style.display = 'none';
        const btnText = document.getElementById('login-btn-text');
        const btnIcon = document.getElementById('login-success-icon');
        const originalBtnText = btnText ? btnText.textContent : 'Sign In';

        try {
            if (btnLoginSubmit) {
                btnLoginSubmit.disabled = true;
                if (btnText) btnText.textContent = 'Authenticating...';
            }

            let res, data;

            if (isStudentLogin) {
                // --- 1. STUDENT LOGIN LOGIC ---
                const studentPhoneInput = document.getElementById('student-phone');
                const phone = studentPhoneInput ? studentPhoneInput.value.trim() : '';

                if (!phone) {
                    throw new Error("Mobile number is required.");
                }

                // Auto-format phone number to +639XXXXXXXXX
                let formattedPhone = phone;
                if (formattedPhone.startsWith('09') && formattedPhone.length === 11) {
                    formattedPhone = '+63' + formattedPhone.substring(1);
                } else if (formattedPhone.startsWith('9') && formattedPhone.length === 10) {
                    formattedPhone = '+63' + formattedPhone;
                } else if (formattedPhone.startsWith('639') && formattedPhone.length === 12) {
                    formattedPhone = '+' + formattedPhone;
                }

                res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone_number: formattedPhone })
                });
                data = await res.json();
            } else {
                // --- 2. ADMIN CREDENTIALS LOGIC ---
                const username = loginUsername.value.trim();
                const password = loginPassword.value;

                if (!username || !password) {
                    throw new Error("Username and password are required.");
                }

                res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                data = await res.json();
            }

            if (data.success) {
                sessionStorage.setItem('adminToken', data.token);
                // Also save the role if the backend provided it, else default to 'admin'
                sessionStorage.setItem('userRole', data.role || 'admin');

                // Success feedback UI
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
                throw new Error(data.error || 'Authentication failed.');
            }
        } catch (err) {
            console.error('[settings.js] Login error:', err);
            if (btnLoginSubmit) {
                btnLoginSubmit.disabled = false;
                if (btnText) btnText.textContent = originalBtnText;
            }
            // Show the exact error message (e.g. "Mobile number is required.")
            loginError.textContent = err.message || 'Server connection error. Please try again.';
            loginError.style.display = 'block';
        }
    }

    btnLoginSubmit.addEventListener('click', handleLogin);

    // Support login on pressing Enter
    loginUsername.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    // Handle Logout (Custom Modal)
    if (btnLogout) {
        const logoutModal = document.getElementById('logout-confirm-modal');
        const btnLogoutCancel = document.getElementById('btn-logout-cancel');
        const btnLogoutConfirm = document.getElementById('btn-logout-confirm');

        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            if (logoutModal) {
                logoutModal.style.display = 'flex';
            } else {
                // Fallback to default confirm if modal is missing
                if (confirm("Are you sure you want to log out?")) {
                    sessionStorage.removeItem('adminToken');
                    checkSession();
                }
            }
        });

        if (btnLogoutCancel) {
            btnLogoutCancel.addEventListener('click', () => {
                if (logoutModal) logoutModal.style.display = 'none';
            });
        }

        if (btnLogoutConfirm) {
            btnLogoutConfirm.addEventListener('click', () => {
                if (logoutModal) logoutModal.style.display = 'none';
                sessionStorage.removeItem('adminToken');
                checkSession();
            });
        }
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
            renderBikeOverrides(),
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
            div.className = 'd-flex flex-column gap-2 p-3 border rounded mb-2';
            div.style.background = 'var(--bg-main)';

            const checkboxId = `toggle-${stationName.replace(/\s+/g, '-').toLowerCase()}`;

            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center pb-1">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold" style="font-size: 0.95rem;">${stationName.toUpperCase()}</span>
                        <span class="toggle-switch-status ${isDisabled ? 'offline' : 'online'}" style="font-size: 0.75rem; font-weight: 600;">
                            ${isDisabled ? '● Offline' : '● Online'}
                        </span>
                    </div>
                    <label class="switch-label mb-0" for="${checkboxId}">
                        <input type="checkbox" id="${checkboxId}" ${!isDisabled ? 'checked' : ''}>
                        <span class="switch-slider"></span>
                    </label>
                </div>

                <div class="mt-1 pt-2 border-top d-flex justify-content-end">
                    <button class="btn btn-sm btn-outline-danger fw-bold d-flex align-items-center gap-1 btn-delete-station" data-station="${stationName}">
                        Delete
                    </button>
                </div>
            `;

            const btnDelete = div.querySelector('.btn-delete-station');
            btnDelete.addEventListener('click', async () => {
                confirmAction('Delete Station', `Are you absolutely sure you want to delete station ${stationName}?`, async () => {
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
                });
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

    async function renderBikeOverrides() {
        const list = document.getElementById('bike-override-list');
        if (!list) return;
        list.innerHTML = '';

        let bikes = [];
        try {
            const res = await fetch('/api/bicycles', { cache: 'no-store' });
            const data = await res.json();
            if (data.success) bikes = data.data;
        } catch (e) {
            console.error('[settings.js] Error fetching bikes:', e);
            list.innerHTML = '<div class="text-danger small">Failed to load bicycles.</div>';
            return;
        }

        if (bikes.length === 0) {
            list.innerHTML = '<div class="text-muted small">No bicycles registered.</div>';
            return;
        }

        bikes.forEach(bike => {
            const code = bike.bicycle_code;
            const isDisabled = bike.is_disabled === 1;

            const div = document.createElement('div');
            div.className = 'd-flex flex-column gap-2 p-3 border rounded mb-2 bike-override-item';
            div.style.background = 'var(--bg-main)';
            div.dataset.bikeCode = code;

            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-2">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold" style="font-size: 0.95rem;">Bike ${code}</span>
                        <span class="toggle-switch-status ${!isDisabled ? 'online' : 'offline'}" style="font-size: 0.75rem; font-weight: 600;">
                            ${!isDisabled ? '● Online' : '● Offline'}
                        </span>
                    </div>
                    <label class="switch-label mb-0" for="toggle-bike-${code}">
                        <input type="checkbox" id="toggle-bike-${code}" ${!isDisabled ? 'checked' : ''}>
                        <span class="switch-slider"></span>
                    </label>
                </div>
                
                <div class="row g-2 align-items-end mt-1">
                    <div class="col-6 col-sm-5">
                        <label class="form-label small text-muted text-uppercase mb-1" style="font-size: 0.65rem;">New Lock Code</label>
                        <input type="text" class="form-control form-control-sm border-0 shadow-sm bike-lock-input" placeholder="0000">
                    </div>
                    <div class="col-6 col-sm-4">
                        <label class="form-label small text-muted text-uppercase mb-1" style="font-size: 0.65rem;">Status</label>
                        <select class="form-select form-select-sm border-0 shadow-sm bike-status-select">
                            <option value="Good" ${bike.condition_status === 'Good' ? 'selected' : ''}>Good</option>
                            <option value="Broken" ${bike.condition_status === 'Broken' ? 'selected' : ''}>Broken</option>
                            <option value="Disputed" ${bike.condition_status === 'Disputed' ? 'selected' : ''}>Disputed</option>
                            <option value="Missing" ${bike.condition_status === 'Missing' ? 'selected' : ''}>Missing</option>
                        </select>
                    </div>
                    <div class="col-12 col-sm-3 mt-2 mt-sm-0">
                        <button class="btn btn-sm btn-primary w-100 fw-bold border-0 btn-save-bike" style="background-color: var(--up-maroon); height: 31px;">Save</button>
                    </div>
                </div>

                <div class="mt-2 pt-2 border-top d-flex justify-content-end">
                    <button class="btn btn-sm btn-outline-danger fw-bold d-flex align-items-center gap-1 btn-delete-bike">
                        Delete
                    </button>
                </div>
            `;

            // Toggle logic
            const checkbox = div.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', async () => {
                try {
                    const res = await fetch('/api/admin/bicycles/toggle', {
                        method: 'POST',
                        headers: getAdminHeaders(),
                        body: JSON.stringify({
                            bicycle_code: code,
                            is_disabled: !checkbox.checked
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        const statusSpan = div.querySelector('.toggle-switch-status');
                        if (checkbox.checked) {
                            statusSpan.className = 'toggle-switch-status online';
                            statusSpan.innerHTML = '● Online';
                        } else {
                            statusSpan.className = 'toggle-switch-status offline';
                            statusSpan.innerHTML = '● Offline';
                        }
                    } else {
                        alert(data.error || 'Failed to toggle bike status.');
                        checkbox.checked = !checkbox.checked;
                    }
                } catch (e) {
                    console.error('[settings.js] Error toggling bike:', e);
                    alert('Network error toggling bike.');
                    checkbox.checked = !checkbox.checked;
                }
            });

            // Save logic
            const btnSave = div.querySelector('.btn-save-bike');
            const lockInput = div.querySelector('.bike-lock-input');
            const statusSelect = div.querySelector('.bike-status-select');
            btnSave.addEventListener('click', async () => {
                const payload = {};
                if (lockInput.value.trim() !== '') payload.combination_lock = lockInput.value.trim();
                if (statusSelect.value !== bike.condition_status) payload.condition_status = statusSelect.value;

                if (Object.keys(payload).length === 0) return alert('No changes to save.');

                confirmAction('Update Bicycle', `Are you sure you want to update bicycle ${code}?`, async () => {
                    btnSave.disabled = true;
                    btnSave.textContent = '...';
                    try {
                        const res = await fetch('/api/admin/bicycles/override', {
                            method: 'POST',
                            headers: getAdminHeaders(),
                            body: JSON.stringify({ bicycle_code: code, ...payload })
                        });
                        const data = await res.json();
                        if (data.success) {
                            lockInput.value = '';
                            bike.condition_status = statusSelect.value; // update local state
                            if (window.initDashboard) await window.initDashboard();
                        } else {
                            alert(data.error || 'Failed to update bike.');
                        }
                    } catch (e) {
                        alert('Network error.');
                    } finally {
                        btnSave.disabled = false;
                        btnSave.textContent = 'Save';
                    }
                });
            });

            // Delete logic
            const btnDelete = div.querySelector('.btn-delete-bike');
            btnDelete.addEventListener('click', async () => {
                confirmAction('Delete Bicycle', `Are you absolutely sure you want to delete bicycle ${code}?`, async () => {
                    btnDelete.disabled = true;
                    try {
                        const res = await fetch('/api/admin/delete-bike', {
                            method: 'POST',
                            headers: getAdminHeaders(),
                            body: JSON.stringify({ bicycle_code: code })
                        });
                        const data = await res.json();
                        if (data.success) {
                            div.remove();
                            if (window.initDashboard) await window.initDashboard();
                        } else {
                            alert(data.error || 'Failed to delete bike.');
                            btnDelete.disabled = false;
                        }
                    } catch (e) {
                        alert('Error deleting bike.');
                        btnDelete.disabled = false;
                    }
                });
            });

            list.appendChild(div);
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
            div.className = 'member-item';
            div.dataset.phone = mem.phone_number || '';
            div.dataset.name = `${mem.firstname} ${mem.lastname}`.toLowerCase();
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
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 4px;">Resolve Dispute (Enter Disputed Bike Code):</div>
                    <div class="d-flex flex-column flex-sm-row gap-2 align-items-stretch align-items-sm-center">
                        <input type="text" class="form-control settings-input flex-grow-1" placeholder="Bike Code" style="height: 32px; font-size: 0.75rem; min-width: 70px;">
                        <div class="d-flex gap-1 flex-grow-1">
                            <button class="btn btn-sm btn-success flex-fill btn-innocent" style="font-size: 0.7rem; font-weight: 700; height: 32px; padding: 2px 8px;">Innocent</button>
                            <button class="btn btn-sm btn-danger flex-fill btn-guilty" style="font-size: 0.7rem; font-weight: 700; height: 32px; padding: 2px 8px;">Guilty</button>
                            <button class="btn btn-sm btn-secondary flex-fill btn-neutral" style="font-size: 0.7rem; font-weight: 700; height: 32px; padding: 2px 8px;">Neutral</button>
                        </div>
                    </div>
                    <label class="d-flex align-items-center gap-2 mt-2" style="font-size: 0.7rem; color: var(--text-muted); cursor: pointer;">
                        <input type="checkbox" class="waive-penalty-checkbox">
                        Waive standard point penalty
                    </label>
                `;

                const bikeInput = actionDiv.querySelector('input[type="text"]');
                const waiveCheckbox = actionDiv.querySelector('.waive-penalty-checkbox');
                const btnInnocent = actionDiv.querySelector('.btn-innocent');
                const btnGuilty = actionDiv.querySelector('.btn-guilty');
                const btnNeutral = actionDiv.querySelector('.btn-neutral');

                const handleResolve = async (verdict) => {
                    const bikeCode = bikeInput.value.trim();
                    if (!bikeCode) return alert("Please enter the Disputed Bike Code first!");

                    confirmAction('Resolve Dispute', `Mark user ${mem.firstname} as ${verdict} for bike ${bikeCode}?`, async () => {
                        try {
                            const res = await fetch('/api/admin/resolve-dispute', {
                                method: 'POST',
                                headers: getAdminHeaders(),
                                body: JSON.stringify({ phone_number: mem.phone_number, verdict: verdict, bicycle_code: bikeCode, waive_penalty: waiveCheckbox.checked })
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
                    });
                };

                btnInnocent.addEventListener('click', () => handleResolve('innocent'));
                btnGuilty.addEventListener('click', () => handleResolve('guilty'));
                btnNeutral.addEventListener('click', () => handleResolve('neutral'));

                div.appendChild(actionDiv);
            }

            membersList.appendChild(div);
        });
    }

    // Add Bicycle Form Submit
    btnAddBike.addEventListener('click', () => {
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

        confirmAction('Add Bicycle', `Are you sure you want to add bicycle ${code} to ${loc}?`, async () => {
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
    });

    // Add Station Form Submit
    btnAddStation.addEventListener('click', () => {
        const name = newStationName.value.trim();
        const latInput = document.getElementById('new-station-lat');
        const lngInput = document.getElementById('new-station-lng');
        const lat = latInput ? parseFloat(latInput.value) : NaN;
        const lng = lngInput ? parseFloat(lngInput.value) : NaN;

        addStationMsg.style.display = 'none';

        if (!name || isNaN(lat) || isNaN(lng)) {
            addStationMsg.textContent = 'Station name, latitude, and longitude are required.';
            addStationMsg.style.background = 'rgba(239, 68, 68, 0.1)';
            addStationMsg.style.color = '#ef4444';
            addStationMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
            addStationMsg.style.display = 'block';
            return;
        }

        confirmAction('Add Station', `Are you sure you want to add the station "${name}"?`, async () => {
            btnAddStation.disabled = true;
            btnAddStation.textContent = 'Adding...';

            try {
                const res = await fetch('/api/admin/locations', {
                    method: 'POST',
                    headers: getAdminHeaders(),
                    body: JSON.stringify({
                        location_name: name,
                        latitude: lat,
                        longitude: lng
                    })
                });
                const data = await res.json();
                if (data.success) {
                    newStationName.value = '';
                    if (latInput) latInput.value = '';
                    if (lngInput) lngInput.value = '';
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

    // Run initial session check to gate the dashboard on page load
    checkSession();

    // Admin Settings Tab Switching Logic
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');

            const targetId = btn.dataset.target;
            tabContents.forEach(content => {
                if (content.id === targetId) {
                    content.classList.remove('d-none');
                } else {
                    content.classList.add('d-none');
                }
            });
        });
    });

    // Quick Bike Override Search Filter
    const searchBikeOverride = document.getElementById('search-bike-override');
    const btnSearchBikeOverride = document.getElementById('btn-search-bike-override');

    if (searchBikeOverride && btnSearchBikeOverride) {
        const executeSearch = () => {
            const query = searchBikeOverride.value.trim().toLowerCase();
            const items = document.querySelectorAll('.bike-override-item');

            items.forEach(item => {
                const code = item.dataset.bikeCode.toLowerCase();
                if (query === '' || code.includes(query)) {
                    item.classList.remove('d-none');
                } else {
                    item.classList.add('d-none');
                }
            });
        };

        btnSearchBikeOverride.addEventListener('click', executeSearch);
        searchBikeOverride.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') executeSearch();
        });
    }

    // Quick Member Search Filter
    const searchMemberOverride = document.getElementById('search-member-override');
    const btnSearchMemberOverride = document.getElementById('btn-search-member-override');

    if (searchMemberOverride && btnSearchMemberOverride) {
        const executeMemberSearch = () => {
            const query = searchMemberOverride.value.trim().toLowerCase();
            const items = document.querySelectorAll('.member-item');

            items.forEach(item => {
                const phone = (item.dataset.phone || '').toLowerCase();
                const name = (item.dataset.name || '').toLowerCase();
                if (query === '' || phone.includes(query) || name.includes(query)) {
                    item.classList.remove('d-none');
                } else {
                    item.classList.add('d-none');
                }
            });
        };

        btnSearchMemberOverride.addEventListener('click', executeMemberSearch);
        searchMemberOverride.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') executeMemberSearch();
        });
    }
});

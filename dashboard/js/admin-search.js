// public/js/admin-search.js

document.addEventListener('DOMContentLoaded', () => {
    const searchType = document.getElementById('admin-search-type');
    const searchInput = document.getElementById('admin-search-input');
    const btnSearch = document.getElementById('btn-admin-search');
    const searchResults = document.getElementById('admin-search-results');

    // UI Template: Bike Profile Card (Contains inputs to override lock/status)
    const renderBikeCard = (bike) => `
        <div class="card border p-3 shadow-sm">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="fw-bold h6 mb-0">🚲 Bike #${bike.code}</div>
                <span class="badge ${bike.status === 'Good' ? 'bg-success' : 'bg-danger'}">${bike.status}</span>
            </div>
            <div class="small text-muted mb-3">📍 Location: ${bike.location}</div>
            
            <div class="border-top pt-3 mt-1 d-flex flex-column gap-2">
                <div class="d-flex align-items-center justify-content-between">
                    <span class="small fw-semibold">Override Lock Code:</span>
                    <div class="input-group input-group-sm w-50">
                        <input type="text" class="form-control text-center fw-bold" id="override-lock-${bike.code}" value="${bike.lock_code}">
                        <button class="btn btn-outline-primary btn-override-lock" data-code="${bike.code}">Save</button>
                    </div>
                </div>
                <div class="d-flex align-items-center justify-content-between">
                    <span class="small fw-semibold">Update Status:</span>
                    <select class="form-select form-select-sm w-50 select-override-status" data-code="${bike.code}">
                        <option value="Good" ${bike.status === 'Good' ? 'selected' : ''}>Good</option>
                        <option value="Broken" ${bike.status === 'Broken' ? 'selected' : ''}>Broken</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    // UI Template: Member Result Card (Contains color-coded Trust Points and Adjust/Delete buttons)
    const renderMemberCard = (member) => {
        let trustColor = 'success';
        let trustPoints = parseInt(member.trust_points) || 100;

        // Color code logic based on trust points
        if (trustPoints < 50) trustColor = 'danger';
        else if (trustPoints < 80) trustColor = 'warning';

        return `
        <div class="card border p-3 shadow-sm">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="fw-bold h6 mb-0">👤 ${member.firstname} ${member.lastname}</div>
            </div>
            <div class="small text-muted mb-3">📱 ${member.phone_number}</div>
            
            <div class="border-top pt-3 mt-1 d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                    <span class="small fw-semibold">Trust Points:</span>
                    <span class="badge bg-${trustColor} fs-6">${trustPoints}</span>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-warning btn-adjust-points" data-phone="${member.phone_number}">Adjust</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-member" data-phone="${member.phone_number}">Delete</button>
                </div>
            </div>
        </div>
        `;
    };

    // Handle Search Button Click
    btnSearch.addEventListener('click', async () => {
        const type = searchType.value;
        const query = searchInput.value.trim();

        if (!query) {
            searchResults.innerHTML = `<div class="alert alert-warning py-2 small">Please enter a search query.</div>`;
            return;
        }

        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            searchResults.innerHTML = `<div class="alert alert-danger py-2 small border-0">Unauthorized: Please sign in under the "Settings" tab first.</div>`;
            return;
        }

        searchResults.innerHTML = `<div class="text-center small text-muted my-3">Searching database...</div>`;

        try {
            const res = await fetch(`/api/admin/search/${type === 'bike' ? 'bicycles' : 'members'}?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                searchResults.innerHTML = `<div class="alert alert-danger py-2 small border-0">Session expired or unauthorized. Please sign in under the "Settings" tab first.</div>`;
                return;
            }

            const data = await res.json();

            if (data.success && data.data.length > 0) {
                if (type === 'bike') {
                    searchResults.innerHTML = data.data.map(b => renderBikeCard({
                        code: b.bicycle_code,
                        lock_code: b.combination_lock,
                        status: b.condition_status,
                        location: b.new_location
                    })).join('');
                } else {
                    searchResults.innerHTML = data.data.map(m => renderMemberCard(m)).join('');
                }
            } else {
                searchResults.innerHTML = `<div class="alert alert-info py-2 small border-0">No results found for "${query}".</div>`;
            }
        } catch (e) {
            searchResults.innerHTML = `<div class="alert alert-danger py-2 small border-0">Error fetching database results.</div>`;
        }
    });

    // Event delegation for actions in search results
    searchResults.addEventListener('click', async (e) => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            alert('Please sign in under the "Settings" tab first.');
            return;
        }

        // 1. Save Lock Code override
        if (e.target.classList.contains('btn-override-lock')) {
            const code = e.target.getAttribute('data-code');
            const input = document.getElementById(`override-lock-${code}`);
            if (!input) return;
            const lock = input.value.trim();

            e.target.disabled = true;
            e.target.textContent = 'Saving...';
            try {
                const res = await fetch('/api/admin/bicycles/override', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ bicycle_code: code, combination_lock: lock })
                });
                const data = await res.json();
                if (data.success) {
                    alert('Lock code updated successfully!');
                } else {
                    alert(data.error || 'Failed to update lock code.');
                }
            } catch (err) {
                alert('Connection error.');
            } finally {
                e.target.disabled = false;
                e.target.textContent = 'Save';
            }
        }

        // 2. Adjust points
        if (e.target.classList.contains('btn-adjust-points')) {
            const phone = e.target.getAttribute('data-phone');
            const newPoints = prompt('Enter new trust points value for this member:');
            if (newPoints === null || newPoints.trim() === '') return;

            e.target.disabled = true;
            try {
                const res = await fetch('/api/admin/override-points', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ phone_number: phone, trust_points: parseInt(newPoints) })
                });
                const data = await res.json();
                if (data.success) {
                    alert('Trust points updated successfully!');
                    // Refresh search
                    btnSearch.click();
                } else {
                    alert(data.error || 'Failed to adjust points.');
                }
            } catch (err) {
                alert('Connection error.');
            } finally {
                e.target.disabled = false;
            }
        }

        // 3. Delete Member (soft-delete)
        if (e.target.classList.contains('btn-delete-member')) {
            const phone = e.target.getAttribute('data-phone');
            if (!confirm('Are you sure you want to delete/deactivate this member?')) return;

            e.target.disabled = true;
            try {
                const res = await fetch('/api/admin/delete-member', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ phone_number: phone })
                });
                const data = await res.json();
                if (data.success) {
                    alert('Member successfully deactivated!');
                    // Refresh search
                    btnSearch.click();
                } else {
                    alert(data.error || 'Failed to delete member.');
                }
            } catch (err) {
                alert('Connection error.');
            } finally {
                e.target.disabled = false;
            }
        }
    });

    // Event delegation for select dropdown change in search results
    searchResults.addEventListener('change', async (e) => {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            alert('Please sign in under the "Settings" tab first.');
            return;
        }

        // Update bike condition status
        if (e.target.classList.contains('select-override-status')) {
            const code = e.target.getAttribute('data-code');
            const status = e.target.value;

            e.target.disabled = true;
            try {
                const res = await fetch('/api/admin/bicycles/override', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ bicycle_code: code, condition_status: status })
                });
                const data = await res.json();
                if (data.success) {
                    alert('Bicycle condition status updated successfully!');
                    // Update badge color
                    const badge = e.target.closest('.card').querySelector('.badge');
                    if (badge) {
                        badge.textContent = status;
                        badge.className = `badge ${status === 'Good' ? 'bg-success' : 'bg-danger'}`;
                    }
                } else {
                    alert(data.error || 'Failed to update status.');
                }
            } catch (err) {
                alert('Connection error.');
            } finally {
                e.target.disabled = false;
            }
        }
    });
});
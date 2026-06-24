// public/js/admin-search.js

document.addEventListener('DOMContentLoaded', () => {
    const searchType = document.getElementById('admin-search-type');
    const searchInput = document.getElementById('admin-search-input');
    const btnSearch = document.getElementById('btn-admin-search');
    const searchResults = document.getElementById('admin-search-results');

    // UI Template: Bike Profile Card (Contains inputs to override lock/status)
    const renderBikeCard = (bike) => `
        <div class="card border p-3 shadow-sm bg-white">
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
        <div class="card border p-3 shadow-sm bg-white">
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

        searchResults.innerHTML = `<div class="text-center small text-muted my-3">Searching database...</div>`;

        try {
            const token = sessionStorage.getItem('adminToken');
            const res = await fetch(`/api/admin/search/${type === 'bike' ? 'bicycles' : 'members'}?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
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
});
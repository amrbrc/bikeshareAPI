const fs = require('fs');
let content = fs.readFileSync('dashboard/js/settings.js', 'utf8');

// Update renderMembersList HTML
content = content.replace(
    /onclick="deactivateMember\('\$\{mem\.phone_number\}'\)".*?>\s*Deactivate\s*<\/button>/s,
    `\${(mem.is_active === 0 || mem.is_active === false || mem.is_active === '0') ? \`
        <button class="btn btn-sm btn-outline-primary fw-bold" onclick="activateMember('\${mem.phone_number}')" style="font-size: 0.68rem; padding: 4px 8px; white-space: nowrap;">
            Activate
        </button>
    \` : \`
        <button class="btn btn-sm btn-outline-danger fw-bold" onclick="deactivateMember('\${mem.phone_number}')" style="font-size: 0.68rem; padding: 4px 8px; white-space: nowrap;">
            Deactivate
        </button>
    \`}`
);

// Add window.activateMember function
const activateFunc = `
    window.activateMember = async function(phone) {
        if (!confirm('Are you sure you want to reactivate this member?')) return;
        try {
            const res = await fetch('/api/admin/activate-member', {
                method: 'POST',
                headers: getAdminHeaders(),
                body: JSON.stringify({ phone_number: phone })
            });
            const data = await res.json();
            if (data.success) {
                alert('Member successfully reactivated!');
                await renderMembersList();
            } else {
                alert(data.error || 'Failed to reactivate member.');
            }
        } catch (err) {
            alert('Connection error.');
        }
    };
`;

content = content.replace(
    "window.deactivateMember = async function(phone) {",
    activateFunc + "\n    window.deactivateMember = async function(phone) {"
);

fs.writeFileSync('dashboard/js/settings.js', content);

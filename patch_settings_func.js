const fs = require('fs');
let content = fs.readFileSync('dashboard/js/settings.js', 'utf8');

const activateFunc = `
window.activateMember = function (phone) {
    confirmAction('Activate Member', 'Are you sure you want to reactivate this member?', async () => {
        try {
            const res = await fetch('/api/admin/activate-member', {
                method: 'POST',
                headers: getAdminHeaders(),
                body: JSON.stringify({ phone_number: phone })
            });
            const data = await res.json();
            if (data.success) {
                alert('Member successfully reactivated!');
                document.getElementById('nav-settings').click(); // Refresh by clicking tab or similar. We should call renderMembersList if it was global, but it's not. Wait, the user already clicks nav-settings to refresh.
                // Or just reload
                window.location.reload();
            } else {
                alert(data.error || 'Failed to reactivate member.');
            }
        } catch (err) {
            alert('Connection error.');
        }
    });
};
`;

content = content.replace(
    "window.deactivateMember = function (phone) {",
    activateFunc + "\nwindow.deactivateMember = function (phone) {"
);

fs.writeFileSync('dashboard/js/settings.js', content);

const fs = require('fs');
let content = fs.readFileSync('dashboard/js/admin-search.js', 'utf8');

// I'll add an activate button logic to event delegation just in case they add the UI for it later
content = content.replace(
    "// 2. Delete Member (soft-delete)",
    `// 3. Activate Member
        if (e.target.classList.contains('btn-activate-member')) {
            const phone = e.target.getAttribute('data-phone');
            if (!confirm('Are you sure you want to reactivate this member?')) return;

            e.target.disabled = true;
            try {
                const res = await fetch('/api/admin/activate-member', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${token}\`
                    },
                    body: JSON.stringify({ phone_number: phone })
                });
                const data = await res.json();
                if (data.success) {
                    alert('Member successfully reactivated!');
                    btnSearch.click();
                } else {
                    alert(data.error || 'Failed to reactivate member.');
                }
            } catch (err) {
                alert('Connection error.');
            } finally {
                e.target.disabled = false;
            }
        }

        // 2. Delete Member (soft-delete)`
);

fs.writeFileSync('dashboard/js/admin-search.js', content);

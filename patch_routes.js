const fs = require('fs');
let content = fs.readFileSync('worker-api/routes/api.js', 'utf8');

content = content.replace(
    "router.post('/admin/delete-member', authenticateAdmin, adminController.deleteMember);",
    "router.post('/admin/delete-member', authenticateAdmin, adminController.deleteMember);\nrouter.post('/admin/activate-member', authenticateAdmin, adminController.activateMember);"
);

fs.writeFileSync('worker-api/routes/api.js', content);

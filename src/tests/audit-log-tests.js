// Audit Log Tests

const AuditLogTests = {
    tests: [], passed: 0, failed: 0,
    test(name, fn) { this.tests.push({ name, fn }); },
    async run() {
        this.passed = 0; this.failed = 0;
        console.log('📋 Running Audit Log Tests...\n');
        for (const test of this.tests) {
            try { setupMockTauri(); await test.fn(); console.log(`✅ ${test.name}`); this.passed++; }
            catch (error) { console.error(`❌ ${test.name}: ${error.message}`); this.failed++; }
        }
        console.log(`\n📊 Audit Log Tests: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    },
    _createLog(userId, userName, action) {
        MockTauri.db.audit_logs.push({ id: ++MockTauri.db.autoIncrement.audit_logs, user_id: userId, username: userName, action, details: 'test', entity_id: null, entity_type: null, old_value: null, new_value: null, created_at: new Date().toISOString() });
    },
};

AuditLogTests.test('Load audit logs empty', async () => {
    const result = await MockTauri.invoke('get_audit_logs', { limit: 10, offset: 0 });
    if (result.data.length !== 0) throw new Error('Expected empty audit logs');
    if (result.total !== 0) throw new Error('Total should be 0');
});

AuditLogTests.test('Load audit logs with data', async () => {
    for (let i = 1; i <= 5; i++) AuditLogTests._createLog(1, 'superadmin', 'TEST');
    const result = await MockTauri.invoke('get_audit_logs', { limit: 10, offset: 0 });
    if (result.data.length !== 5) throw new Error('Expected 5 logs, got ' + result.data.length);
});

AuditLogTests.test('Audit log pagination', async () => {
    for (let i = 1; i <= 5; i++) AuditLogTests._createLog(1, 'superadmin', 'TEST');
    const page1 = await MockTauri.invoke('get_audit_logs', { limit: 2, offset: 0 });
    if (page1.data.length !== 2) throw new Error('Page 1 should have 2, got ' + page1.data.length);
    const page2 = await MockTauri.invoke('get_audit_logs', { limit: 2, offset: 2 });
    if (page2.data.length !== 2) throw new Error('Page 2 should have 2, got ' + page2.data.length);
    if (page1.data[0].id === page2.data[0].id) throw new Error('Different pages should have different data');
});

AuditLogTests.test('Filter audit logs by user', async () => {
    AuditLogTests._createLog(1, 'superadmin', 'LOGIN');
    AuditLogTests._createLog(2, 'testuser', 'CREATE');
    const result = await MockTauri.invoke('get_audit_logs', { limit: 10, offset: 0, filter_user_id: 2 });
    if (result.data.length !== 1) throw new Error('Expected 1 log for user 2, got ' + result.data.length);
    if (result.data[0].action !== 'CREATE') throw new Error('Action should be CREATE');
});

AuditLogTests.test('Count audit logs', async () => {
    for (let i = 1; i <= 3; i++) AuditLogTests._createLog(1, 'superadmin', 'TEST');
    const count = await MockTauri.invoke('count_audit_logs');
    if (count !== 3) throw new Error('Count should be 3, got ' + count);
});

AuditLogTests.test('Create user auto-generates audit log', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    await MockTauri.invoke('create_user', { token: login.token, user: { username: 'newuser', password: 'password123', full_name: null, role: 'admin' } });
    const logs = await MockTauri.invoke('get_audit_logs', { limit: 10, offset: 0, filter_action: 'CREATE_USER' });
    if (logs.data.length === 0) throw new Error('Create user should generate audit log');
});

window.AuditLogTests = AuditLogTests;

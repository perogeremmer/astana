// User Management Tests

const PenggunaTests = {
    tests: [],
    passed: 0,
    failed: 0,

    test(name, fn) {
        this.tests.push({ name, fn });
    },

    async run() {
        this.passed = 0;
        this.failed = 0;
        console.log('👥 Running Pengguna Tests...\n');
        for (const test of this.tests) {
            try {
                setupMockTauri();
                await test.fn();
                console.log(`✅ ${test.name}`);
                this.passed++;
            } catch (error) {
                console.error(`❌ ${test.name}`);
                console.error(`   Error: ${error.message}`);
                this.failed++;
            }
        }
        console.log(`\n📊 Pengguna Tests: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }
};

PenggunaTests.test('Load users includes default superadmin', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const result = await MockTauri.invoke('get_users', { token: login.token });
    if (!result.success) throw new Error('get_users should succeed');
    if (result.data.length !== 1) throw new Error('Expected 1 user (superadmin), got ' + result.data.length);
});

PenggunaTests.test('Create user', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const result = await MockTauri.invoke('create_user', { token: login.token, user: { username: 'newadmin', password: 'password123', full_name: 'New Admin', role: 'admin' } });
    if (!result.success) throw new Error('Create user should succeed: ' + JSON.stringify(result));
    const users = await MockTauri.invoke('get_users', { token: login.token });
    if (users.data.length !== 2) throw new Error('Expected 2 users, got ' + users.data.length);
});

PenggunaTests.test('Create user duplicate username fails', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    await MockTauri.invoke('create_user', { token: login.token, user: { username: 'dupuser', password: 'password123', full_name: null, role: 'admin' } });
    const result = await MockTauri.invoke('create_user', { token: login.token, user: { username: 'dupuser', password: 'password123', full_name: null, role: 'admin' } });
    if (result.success) throw new Error('Duplicate username should fail');
});

PenggunaTests.test('Create user validation - empty username', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const result = await MockTauri.invoke('create_user', { token: login.token, user: { username: '', password: 'pass123', full_name: null, role: 'admin' } });
    if (result.success) throw new Error('Empty username should fail');
});

PenggunaTests.test('Create user validation - short password', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const result = await MockTauri.invoke('create_user', { token: login.token, user: { username: 'testuser', password: '123', full_name: null, role: 'admin' } });
    if (result.success) throw new Error('Short password should fail');
});

PenggunaTests.test('Update user', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const create = await MockTauri.invoke('create_user', { token: login.token, user: { username: 'editable', password: 'password123', full_name: null, role: 'admin' } });
    await MockTauri.invoke('update_user', { token: login.token, user_id: create.data, user: { role: 'superadmin', is_active: false } });
    const users = await MockTauri.invoke('get_users', { token: login.token });
    const updated = users.data.find(u => u.id === create.data);
    if (updated.role !== 'superadmin') throw new Error('Role should be superadmin');
    if (updated.is_active !== false) throw new Error('User should be inactive');
});

PenggunaTests.test('Delete user', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const create = await MockTauri.invoke('create_user', { token: login.token, user: { username: 'todelete', password: 'password123', full_name: null, role: 'admin' } });
    const del = await MockTauri.invoke('delete_user', { token: login.token, user_id: create.data });
    if (!del.success) throw new Error('Delete should succeed');
    const users = await MockTauri.invoke('get_users', { token: login.token });
    if (users.data.length !== 1) throw new Error('Expected 1 user remaining, got ' + users.data.length);
});

PenggunaTests.test('Create user with 1-char username fails', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const result = await MockTauri.invoke('create_user', { token: login.token, user: { username: 'ab', password: 'password123', full_name: null, role: 'admin' } });
    if (result.success) throw new Error('1-char username should fail (min 3)');
});

PenggunaTests.test('Create user with empty password fails', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const result = await MockTauri.invoke('create_user', { token: login.token, user: { username: 'testuser', password: '', full_name: null, role: 'admin' } });
    if (result.success) throw new Error('Empty password should fail');
});

PenggunaTests.test('Create user with invalid role fails', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const result = await MockTauri.invoke('create_user', { token: login.token, user: { username: 'testuser', password: 'password123', full_name: null, role: 'invalid_role' } });
    if (result.success) throw new Error('Invalid role should fail');
});

PenggunaTests.test('Update non-existent user fails', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const result = await MockTauri.invoke('update_user', { token: login.token, user_id: 9999, user: { role: 'admin' } });
    if (result.success) throw new Error('Updating non-existent user should fail');
});

PenggunaTests.test('Delete non-existent user fails', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const result = await MockTauri.invoke('delete_user', { token: login.token, user_id: 9999 });
    if (result.success) throw new Error('Deleting non-existent user should fail');
});

PenggunaTests.test('Cannot delete superadmin_0', async () => {
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const result = await MockTauri.invoke('delete_user', { token: login.token, user_id: 1 });
    if (result.success) throw new Error('Deleting superadmin_0 should fail');
});

window.PenggunaTests = PenggunaTests;

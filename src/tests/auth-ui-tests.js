// UI Tests for Astana Authentication
// Uses shared MockTauri from mock-tauri.js

const AuthTests = {
    tests: [],
    passed: 0,
    failed: 0,

    test(name, fn) {
        this.tests.push({ name, fn });
    },

    async run() {
        this.passed = 0;
        this.failed = 0;
        console.log('🧪 Running Auth UI Tests...\n');

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

        console.log(`\n📊 Auth Tests: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    },

    assert(condition, message) {
        if (!condition) throw new Error(message || 'Assertion failed');
    },

    assertEquals(actual, expected, message) {
        if (actual !== expected) throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
};

// ==================== TEST CASES ====================

AuthTests.test('Login with valid credentials', async () => {
    const result = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    AuthTests.assert(result.success, 'Login should succeed');
    AuthTests.assertEquals(result.user.username, 'superadmin', 'Username should match');
    AuthTests.assert(result.token, 'Token should be present');
});

AuthTests.test('Login with invalid password', async () => {
    const result = await MockTauri.invoke('login', { username: 'superadmin', password: 'wrongpassword' });
    AuthTests.assert(!result.success, 'Login should fail');
    AuthTests.assert(result.message.includes('salah'), 'Should show error message');
});

AuthTests.test('Login with non-existent user', async () => {
    const result = await MockTauri.invoke('login', { username: 'nonexistent', password: 'password' });
    AuthTests.assert(!result.success, 'Login should fail');
});

AuthTests.test('Change password', async () => {
    const loginResult = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    AuthTests.assert(loginResult.success, 'Login should succeed');

    const changeResult = await MockTauri.invoke('change_password', { token: loginResult.token, new_password: 'newpassword123' });
    AuthTests.assert(changeResult.success, 'Password change should succeed');

    const oldLogin = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    AuthTests.assert(!oldLogin.success, 'Old password should not work');

    const newLogin = await MockTauri.invoke('login', { username: 'superadmin', password: 'newpassword123' });
    AuthTests.assert(newLogin.success, 'New password should work');
});

AuthTests.test('Session validation', async () => {
    const loginResult = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const isValid = await MockTauri.invoke('validate_session', { token: loginResult.token });
    AuthTests.assert(isValid, 'Session should be valid');
    await MockTauri.invoke('logout', { token: loginResult.token });
    const isValidAfterLogout = await MockTauri.invoke('validate_session', { token: loginResult.token });
    AuthTests.assert(!isValidAfterLogout, 'Session should be invalid after logout');
});

AuthTests.test('Create and delete user', async () => {
    const loginResult = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const createResult = await MockTauri.invoke('create_user', { token: loginResult.token, user: { username: 'testuser', password: 'testpass', full_name: 'Test User', role: 'admin' } });
    AuthTests.assert(createResult.success, 'User creation should succeed');
    const usersResult = await MockTauri.invoke('get_users', { token: loginResult.token });
    AuthTests.assertEquals(usersResult.data.length, 2, 'Should have 2 users');
    const deleteResult = await MockTauri.invoke('delete_user', { token: loginResult.token, user_id: 2 });
    AuthTests.assert(deleteResult.success, 'User deletion should succeed');
});

AuthTests.test('Cannot delete superadmin_0', async () => {
    const loginResult = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    const deleteResult = await MockTauri.invoke('delete_user', { token: loginResult.token, user_id: 1 });
    AuthTests.assert(!deleteResult.success, 'Should not be able to delete superadmin_0');
});

AuthTests.test('Login inactive user', async () => {
    setupMockTauri();
    const login = await MockTauri.invoke('login', { username: 'superadmin', password: 'test123' });
    MockTauri.db.users.push({ id: 2, username: 'inactive', password: 'password', full_name: null, role: 'admin', is_active: false, is_password_changed: true, created_by: 1 });
    MockTauri.db.autoIncrement.users = 2;
    const result = await MockTauri.invoke('login', { username: 'inactive', password: 'password' });
    AuthTests.assert(!result.success, 'Inactive user should not login');
    AuthTests.assert(result.message.includes('tidak aktif'), 'Should show inactive message');
});

window.runAuthTests = () => AuthTests.run();

// UI Tests for Astana Authentication
// Using Tauri API mocking for frontend testing

// Mock Tauri API for testing
const mockTauri = {
    users: [],
    currentUser: null,
    sessions: {},
    
    // Reset mock state
    reset() {
        this.users = [];
        this.currentUser = null;
        this.sessions = {};
    },
    
    // Mock invoke function
    async invoke(command, args) {
        console.log(`[MOCK] Invoking ${command}:`, args);
        
        switch(command) {
            case 'login':
                return this.mockLogin(args);
            case 'change_password':
                return this.mockChangePassword(args);
            case 'validate_session':
                return this.mockValidateSession(args);
            case 'logout':
                return this.mockLogout(args);
            case 'get_users':
                return this.mockGetUsers(args);
            case 'create_user':
                return this.mockCreateUser(args);
            case 'delete_user':
                return this.mockDeleteUser(args);
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    },
    
    mockLogin({ username, password }) {
        const user = this.users.find(u => u.username === username && u.password === password);
        
        if (!user) {
            return {
                success: false,
                message: 'Username atau password salah',
                user: null,
                must_change_password: false
            };
        }
        
        if (!user.is_active) {
            return {
                success: false,
                message: 'Akun tidak aktif. Hubungi administrator.',
                user: null,
                must_change_password: false
            };
        }
        
        const token = 'mock_token_' + Date.now();
        this.sessions[token] = { user_id: user.id, username: user.username };
        this.currentUser = user;
        
        return {
            success: true,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                is_active: user.is_active,
                is_password_changed: user.is_password_changed
            },
            message: 'Login berhasil',
            must_change_password: !user.is_password_changed
        };
    },
    
    mockChangePassword({ token, new_password }) {
        if (!this.sessions[token]) {
            return { success: false, message: 'Sesi tidak valid' };
        }
        
        const userId = this.sessions[token].user_id;
        const user = this.users.find(u => u.id === userId);
        
        if (user) {
            user.password = new_password;
            user.is_password_changed = true;
        }
        
        return { success: true };
    },
    
    mockValidateSession({ token }) {
        return !!this.sessions[token];
    },
    
    mockLogout({ token }) {
        delete this.sessions[token];
        this.currentUser = null;
        return {};
    },
    
    mockGetUsers({ token }) {
        if (!this.sessions[token]) {
            return { success: false, message: 'Sesi tidak valid' };
        }
        
        return {
            success: true,
            data: this.users.map(u => ({
                id: u.id,
                username: u.username,
                role: u.role,
                is_active: u.is_active,
                is_password_changed: u.is_password_changed
            }))
        };
    },
    
    mockCreateUser({ token, user }) {
        if (!this.sessions[token]) {
            return { success: false, message: 'Sesi tidak valid' };
        }
        
        const newUser = {
            id: this.users.length + 1,
            username: user.username,
            password: user.password,
            role: user.role,
            is_active: true,
            is_password_changed: false
        };
        
        this.users.push(newUser);
        return { success: true, data: newUser.id };
    },
    
    mockDeleteUser({ token, user_id }) {
        if (!this.sessions[token]) {
            return { success: false, message: 'Sesi tidak valid' };
        }
        
        const index = this.users.findIndex(u => u.id === user_id);
        if (index > -1) {
            const user = this.users[index];
            if (user.role === 'superadmin_0') {
                return { success: false, message: 'Superadmin_0 tidak dapat dihapus' };
            }
            this.users.splice(index, 1);
        }
        
        return { success: true };
    }
};

// Setup mock before tests
function setupMock() {
    // Replace window.__TAURI__ with mock
    window.__TAURI__ = {
        core: {
            invoke: (...args) => mockTauri.invoke(...args)
        }
    };
    
    // Reset mock state
    mockTauri.reset();
    
    // Add default test user
    mockTauri.users.push({
        id: 1,
        username: 'superadmin',
        password: 'test123',
        role: 'superadmin_0',
        is_active: true,
        is_password_changed: false
    });
}

// Test Suite
const AuthTests = {
    tests: [],
    passed: 0,
    failed: 0,
    
    test(name, fn) {
        this.tests.push({ name, fn });
    },
    
    async run() {
        console.log('🧪 Running UI Tests...\n');
        
        for (const test of this.tests) {
            try {
                setupMock();
                await test.fn();
                console.log(`✅ ${test.name}`);
                this.passed++;
            } catch (error) {
                console.error(`❌ ${test.name}`);
                console.error(`   Error: ${error.message}`);
                this.failed++;
            }
        }
        
        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    },
    
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    },
    
    assertEquals(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }
};

// ==================== TEST CASES ====================

// Test 1: Login with valid credentials
AuthTests.test('Login with valid credentials', async () => {
    const result = await mockTauri.invoke('login', {
        username: 'superadmin',
        password: 'test123'
    });
    
    AuthTests.assert(result.success, 'Login should succeed');
    AuthTests.assertEquals(result.user.username, 'superadmin', 'Username should match');
    AuthTests.assert(result.token, 'Token should be present');
});

// Test 2: Login with invalid password
AuthTests.test('Login with invalid password', async () => {
    const result = await mockTauri.invoke('login', {
        username: 'superadmin',
        password: 'wrongpassword'
    });
    
    AuthTests.assert(!result.success, 'Login should fail');
    AuthTests.assert(result.message.includes('salah'), 'Should show error message');
});

// Test 3: Login with non-existent user
AuthTests.test('Login with non-existent user', async () => {
    const result = await mockTauri.invoke('login', {
        username: 'nonexistent',
        password: 'password'
    });
    
    AuthTests.assert(!result.success, 'Login should fail');
});

// Test 4: Change password
AuthTests.test('Change password', async () => {
    // Login first
    const loginResult = await mockTauri.invoke('login', {
        username: 'superadmin',
        password: 'test123'
    });
    
    AuthTests.assert(loginResult.success, 'Login should succeed');
    
    // Change password
    const changeResult = await mockTauri.invoke('change_password', {
        token: loginResult.token,
        new_password: 'newpassword123'
    });
    
    AuthTests.assert(changeResult.success, 'Password change should succeed');
    
    // Verify old password doesn't work
    const oldLogin = await mockTauri.invoke('login', {
        username: 'superadmin',
        password: 'test123'
    });
    AuthTests.assert(!oldLogin.success, 'Old password should not work');
    
    // Verify new password works
    const newLogin = await mockTauri.invoke('login', {
        username: 'superadmin',
        password: 'newpassword123'
    });
    AuthTests.assert(newLogin.success, 'New password should work');
});

// Test 5: Session validation
AuthTests.test('Session validation', async () => {
    // Login
    const loginResult = await mockTauri.invoke('login', {
        username: 'superadmin',
        password: 'test123'
    });
    
    // Validate session
    const isValid = await mockTauri.invoke('validate_session', {
        token: loginResult.token
    });
    AuthTests.assert(isValid, 'Session should be valid');
    
    // Logout
    await mockTauri.invoke('logout', { token: loginResult.token });
    
    // Validate again
    const isValidAfterLogout = await mockTauri.invoke('validate_session', {
        token: loginResult.token
    });
    AuthTests.assert(!isValidAfterLogout, 'Session should be invalid after logout');
});

// Test 6: Create and delete user
AuthTests.test('Create and delete user', async () => {
    // Login as admin
    const loginResult = await mockTauri.invoke('login', {
        username: 'superadmin',
        password: 'test123'
    });
    
    // Create new user
    const createResult = await mockTauri.invoke('create_user', {
        token: loginResult.token,
        user: {
            username: 'testuser',
            password: 'testpass',
            role: 'admin'
        }
    });
    
    AuthTests.assert(createResult.success, 'User creation should succeed');
    AuthTests.assertEquals(createResult.data, 2, 'User ID should be 2');
    
    // Get users
    const usersResult = await mockTauri.invoke('get_users', {
        token: loginResult.token
    });
    AuthTests.assertEquals(usersResult.data.length, 2, 'Should have 2 users');
    
    // Delete user
    const deleteResult = await mockTauri.invoke('delete_user', {
        token: loginResult.token,
        user_id: 2
    });
    AuthTests.assert(deleteResult.success, 'User deletion should succeed');
});

// Test 7: Cannot delete superadmin_0
AuthTests.test('Cannot delete superadmin_0', async () => {
    const loginResult = await mockTauri.invoke('login', {
        username: 'superadmin',
        password: 'test123'
    });
    
    const deleteResult = await mockTauri.invoke('delete_user', {
        token: loginResult.token,
        user_id: 1
    });
    
    AuthTests.assert(!deleteResult.success, 'Should not be able to delete superadmin_0');
});

// Test 8: Login inactive user
AuthTests.test('Login inactive user', async () => {
    // Create inactive user
    mockTauri.users.push({
        id: 2,
        username: 'inactive',
        password: 'password',
        role: 'admin',
        is_active: false,
        is_password_changed: true
    });
    
    const result = await mockTauri.invoke('login', {
        username: 'inactive',
        password: 'password'
    });
    
    AuthTests.assert(!result.success, 'Inactive user should not login');
    AuthTests.assert(result.message.includes('tidak aktif'), 'Should show inactive message');
});

// Export test runner
window.runAuthTests = () => AuthTests.run();
window.setupMock = setupMock;

// Auto-run tests if URL has ?test parameter
if (window.location.search.includes('test')) {
    window.addEventListener('load', () => {
        setTimeout(() => AuthTests.run(), 1000);
    });
}

console.log('✅ UI Test suite loaded. Run window.runAuthTests() to execute tests.');

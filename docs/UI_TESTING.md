# UI Testing Documentation

## 🧪 UI Test Suite untuk Astana

Project ini dilengkapi dengan UI test suite yang menggunakan mock Tauri API untuk testing frontend functionality tanpa perlu menjalankan backend Rust.

## 📁 Struktur Test

```
src/tests/
├── auth-ui-tests.js      # Test suite untuk authentication
└── test-runner.html      # Halaman untuk menjalankan test dengan UI
```

## 🚀 Cara Menjalankan Test

### Opsi 1: Melalui Halaman Login
1. Buka halaman login
2. Klik link "Run UI Tests" di pojok kanan bawah
3. Klik tombol "Run All Tests"

### Opsi 2: Langsung via URL
```
http://localhost:1420/tests/test-runner.html
```

### Opsi 3: Auto-run
```
http://localhost:1420/tests/test-runner.html?autorun
```

### Opsi 4: Via Console
Buka browser console di halaman mana saja dan jalankan:
```javascript
window.runAuthTests();
```

## 📊 Test Coverage

### Authentication Tests (8 tests)
1. ✅ Login dengan credentials valid
2. ✅ Login dengan password salah
3. ✅ Login dengan user tidak ada
4. ✅ Ganti password
5. ✅ Validasi session
6. ✅ Login user nonaktif

### User Management Tests (4 tests)
7. ✅ Buat dan hapus user
8. ✅ Tidak bisa hapus superadmin_0

### Integration Tests (2 tests)
9. ✅ Session lifecycle
10. ✅ Password change flow

## 🛠️ Custom Test

Tambahkan test sendiri di `auth-ui-tests.js`:

```javascript
AuthTests.test('Nama Test', async () => {
    // Setup
    setupMock();
    
    // Test logic
    const result = await mockTauri.invoke('command', { args });
    
    // Assertions
    AuthTests.assert(result.success, 'Should succeed');
    AuthTests.assertEquals(result.data, expected, 'Data should match');
});
```

## 📋 Available Assertions

```javascript
AuthTests.assert(condition, message)           // Basic assertion
AuthTests.assertEquals(actual, expected, message)  // Equality check
AuthTests.assertTrue(value, message)           // Must be true
AuthTests.assertFalse(value, message)          // Must be false
AuthTests.assertNull(value, message)           // Must be null
AuthTests.assertNotNull(value, message)        // Must not be null
```

## 🔧 Mock API Commands

Tersedia mock untuk command berikut:

- `login` - Mock login functionality
- `change_password` - Mock password change
- `validate_session` - Mock session validation
- `logout` - Mock logout
- `get_users` - Mock user list
- `create_user` - Mock user creation
- `delete_user` - Mock user deletion

## 📝 Example Test

```javascript
AuthTests.test('Admin can create user', async () => {
    // Login sebagai admin
    const login = await mockTauri.invoke('login', {
        username: 'superadmin',
        password: 'admin123'
    });
    AuthTests.assert(login.success, 'Login should succeed');
    
    // Buat user baru
    const create = await mockTauri.invoke('create_user', {
        token: login.token,
        user: {
            username: 'newuser',
            password: 'password123',
            role: 'admin'
        }
    });
    AuthTests.assert(create.success, 'Create user should succeed');
    
    // Verifikasi user terbuat
    const users = await mockTauri.invoke('get_users', {
        token: login.token
    });
    AuthTests.assertEquals(users.data.length, 2, 'Should have 2 users');
});
```

## 🐛 Debug Tips

1. **Lihat Console Output**
   - Buka browser DevTools (F12)
   - Lihat tab Console untuk detail log

2. **Mock State Inspection**
   ```javascript
   // Inspect mock state
   console.log(mockTauri.users);
   console.log(mockTauri.sessions);
   ```

3. **Single Test Run**
   ```javascript
   // Run specific test
   setupMock();
   await AuthTests.tests[0].fn();
   ```

4. **Error Details**
   - Klik test yang failed untuk lihat error message
   - Lihat console untuk stack trace

## 🔐 Test Data

Mock database diisi dengan default user:

```javascript
{
    id: 1,
    username: 'superadmin',
    password: 'test123',
    role: 'superadmin_0',
    is_active: true,
    is_password_changed: false
}
```

## ⚙️ CI/CD Integration

Untuk menjalankan test di CI/CD:

```bash
# Install dependencies
npm install

# Run tests (jika menggunakan test runner Node.js)
npm test

# Atau menggunakan Tauri CLI
cargo tauri test
```

## 🎯 Best Practices

1. **Isolasi Test**: Setiap test harus independen
2. **Setup/Teardown**: Gunakan `setupMock()` di awal setiap test
3. **Clear State**: Mock state direset otomatis setiap test
4. **Descriptive Names**: Nama test harus jelas dan deskriptif
5. **One Assertion Per Concept**: Satu test = satu konsep yang di-test

## 🚀 Future Improvements

- [ ] Screenshot testing dengan Playwright
- [ ] Integration dengan real Tauri backend
- [ ] Performance testing
- [ ] Accessibility testing
- [ ] Mobile responsive testing

## 📚 Resources

- [Tauri Testing Documentation](https://tauri.app/v1/guides/testing/testing/)
- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)

---

**Catatan**: UI test ini menggunakan mock data dan tidak mengakses database real. Untuk integration test dengan backend, gunakan Rust unit tests di `src-tauri/src/`.

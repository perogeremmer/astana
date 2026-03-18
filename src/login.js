// Login JavaScript for Astana
// Handles authentication and password change

// Debug: Check if Tauri is available
console.log('Login.js loaded');

// Helper function to call invoke (avoid duplicate declaration)
async function callInvoke(command, args) {
    try {
        console.log(`Invoking ${command} with args:`, args);
        const result = await window.__TAURI__?.core?.invoke(command, args);
        console.log(`${command} result:`, result);
        return result;
    } catch (error) {
        console.error(`Error invoking ${command}:`, error);
        throw error;
    }
}

// Toggle password visibility
function initPasswordToggle() {
    console.log('Initializing password toggle...');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeOffIcon = document.getElementById('eyeOffIcon');
    
    console.log('togglePassword element:', togglePassword);
    console.log('passwordInput element:', passwordInput);
    
    if (!togglePassword || !passwordInput) {
        console.error('Password toggle elements not found!');
        return;
    }
    
    togglePassword.addEventListener('click', (e) => {
        console.log('Toggle password clicked');
        e.preventDefault();
        e.stopPropagation();
        
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Logic: 
        // - eyeIcon (normal eye) = password is VISIBLE
        // - eyeOffIcon (crossed eye) = password is HIDDEN
        if (type === 'text') {
            // Password VISIBLE -> show normal eye icon
            eyeIcon?.classList.remove('hidden');
            eyeOffIcon?.classList.add('hidden');
        } else {
            // Password HIDDEN -> show crossed eye icon
            eyeIcon?.classList.add('hidden');
            eyeOffIcon?.classList.remove('hidden');
        }
    });
    console.log('Password toggle initialized successfully');
}

// Show error message
function showError(message, isChangePassword = false) {
    const errorText = document.getElementById('errorText');
    const errorMessage = document.getElementById('errorMessage');
    const cpErrorText = document.getElementById('cpErrorText');
    const cpErrorMessage = document.getElementById('cpErrorMessage');
    
    if (isChangePassword) {
        if (cpErrorText) cpErrorText.textContent = message;
        if (cpErrorMessage) cpErrorMessage.classList.remove('hidden');
    } else {
        if (errorText) errorText.textContent = message;
        if (errorMessage) errorMessage.classList.remove('hidden');
    }
}

// Hide error message
function hideError(isChangePassword = false) {
    const errorMessage = document.getElementById('errorMessage');
    const cpErrorMessage = document.getElementById('cpErrorMessage');
    
    if (isChangePassword) {
        if (cpErrorMessage) cpErrorMessage.classList.add('hidden');
    } else {
        if (errorMessage) errorMessage.classList.add('hidden');
    }
}

// Set loading state
function setLoading(loading, isChangePassword = false) {
    const loginButton = document.getElementById('loginButton');
    const loginText = document.getElementById('loginText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const changePasswordButton = document.getElementById('changePasswordButton');
    const cpButtonText = document.getElementById('cpButtonText');
    const cpLoadingSpinner = document.getElementById('cpLoadingSpinner');
    
    if (isChangePassword) {
        if (changePasswordButton) changePasswordButton.disabled = loading;
        if (loading) {
            if (cpButtonText) cpButtonText.textContent = 'Menyimpan...';
            if (cpLoadingSpinner) cpLoadingSpinner.classList.remove('hidden');
        } else {
            if (cpButtonText) cpButtonText.textContent = 'Simpan Password';
            if (cpLoadingSpinner) cpLoadingSpinner.classList.add('hidden');
        }
    } else {
        if (loginButton) loginButton.disabled = loading;
        if (loading) {
            if (loginText) loginText.textContent = 'Memuat...';
            if (loadingSpinner) loadingSpinner.classList.remove('hidden');
        } else {
            if (loginText) loginText.textContent = 'Masuk';
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
        }
    }
}

// Handle login form submission
function initLoginForm() {
    console.log('Initializing login form...');
    const loginFormElement = document.getElementById('loginFormElement');
    console.log('loginFormElement:', loginFormElement);
    
    if (!loginFormElement) {
        console.error('Login form element not found!');
        return;
    }
    
    loginFormElement.addEventListener('submit', async (e) => {
        console.log('Form submitted!');
        e.preventDefault();
        hideError();
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        console.log('Username input:', usernameInput);
        console.log('Password input:', passwordInput);
        
        const username = usernameInput?.value?.trim();
        const password = passwordInput?.value;
        
        console.log('Username:', username);
        console.log('Password length:', password?.length);
        
        if (!username || !password) {
            showError('Username dan password harus diisi');
            return;
        }
        
        if (!callInvoke) {
            console.error('Tauri invoke not available!');
            showError('Aplikasi tidak dapat terhubung ke backend. Mohon muat ulang.');
            return;
        }
        
        setLoading(true);
        
        try {
            console.log('Calling login command...');
            const result = await callInvoke('login', { username, password });
            console.log('Login result:', result);
            
            if (result.success) {
                // Save session
                if (window.astanaApp) {
                    window.astanaApp.saveSession(result.token, result.user);
                }
                
                if (result.must_change_password) {
                    // Show change password form
                    window.currentToken = result.token;
                    window.isFirstChange = true;
                    const loginForm = document.getElementById('loginForm');
                    const changePasswordForm = document.getElementById('changePasswordForm');
                    if (loginForm) loginForm.classList.add('hidden');
                    if (changePasswordForm) changePasswordForm.classList.remove('hidden');
                } else {
                    // Redirect to dashboard
                    window.location.href = 'index.html';
                }
            } else {
                showError(result.message || 'Login gagal');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Terjadi kesalahan saat login: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    });
    console.log('Login form initialized successfully');
}

// Handle change password form submission
function initChangePasswordForm() {
    console.log('Initializing change password form...');
    const changePasswordFormElement = document.getElementById('changePasswordFormElement');
    if (!changePasswordFormElement) {
        console.log('Change password form not found (might be hidden)');
        return;
    }
    
    changePasswordFormElement.addEventListener('submit', async (e) => {
        console.log('Change password form submitted!');
        e.preventDefault();
        hideError(true);
        
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        
        if (!newPassword || !confirmPassword) {
            showError('Password baru dan konfirmasi password harus diisi', true);
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showError('Password baru dan konfirmasi password tidak cocok', true);
            return;
        }
        
        if (!callInvoke) {
            showError('Aplikasi tidak dapat terhubung ke backend', true);
            return;
        }
        
        setLoading(true, true);
        
        try {
            console.log('Calling change_password with:', {
                token: window.currentToken ? 'present' : 'missing',
                newPassword: newPassword ? 'present' : 'missing',
                isFirstChange: window.isFirstChange
            });
            
            const result = await callInvoke('change_password', {
                token: window.currentToken,
                old_password: null,
                new_password: newPassword,
                is_first_change: window.isFirstChange
            });
            
            console.log('Change password result:', result);
            
            if (result && result.success) {
                // Update user in session
                const user = window.astanaApp?.getCurrentUser();
                if (user) {
                    user.is_password_changed = true;
                    window.astanaApp?.saveSession(window.currentToken, user);
                }
                
                // Redirect to dashboard
                window.location.href = 'index.html';
            } else {
                const errorMsg = result?.message || result?.Err || 'Gagal mengganti password';
                console.error('Change password failed:', result);
                showError(errorMsg, true);
            }
        } catch (error) {
            console.error('Change password error:', error);
            showError('Terjadi kesalahan saat mengganti password: ' + (error?.message || error || 'Unknown error'), true);
        } finally {
            setLoading(false, true);
        }
    });
    console.log('Change password form initialized successfully');
}

// Check if already logged in
async function checkSession() {
    console.log('Checking session...');
    if (!window.astanaApp) {
        console.log('astanaApp not available');
        return;
    }
    
    try {
        const isValid = await window.astanaApp.validateSession();
        console.log('Session valid:', isValid);
        if (isValid) {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// Initialize when DOM is ready
function init() {
    console.log('Initializing login page...');
    initPasswordToggle();
    initLoginForm();
    initChangePasswordForm();
    checkSession();
    console.log('Login page initialization complete');
}

// Wait for both DOM and scripts to be ready
if (document.readyState === 'loading') {
    console.log('Document still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', init);
} else {
    console.log('Document already loaded, initializing now...');
    // Small delay to ensure main.js is loaded
    setTimeout(init, 100);
}

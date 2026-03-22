// Login JavaScript for Astana
// Handles authentication and password change

// Check database status on page load
async function checkDatabaseStatus() {
    try {
        if (!invoke) {
            return;
        }
        
        const status = await window.__TAURI__?.core?.invoke('check_database_status');
        
        // If no database or empty database, redirect to first-run page
        if (!status.exists || status.is_empty) {
            window.location.href = 'first-run.html';
        }
    } catch (error) {
        console.error('Error checking database status:', error);
    }
}

// Run database check immediately
checkDatabaseStatus();

// Helper function to call invoke (avoid duplicate declaration)
async function callInvoke(command, args) {
    try {
        const result = await window.__TAURI__?.core?.invoke(command, args);
        return result;
    } catch (error) {
        console.error(`Error invoking ${command}:`, error);
        throw error;
    }
}

// Toggle password visibility
function initPasswordToggle() {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeOffIcon = document.getElementById('eyeOffIcon');
    
    if (!togglePassword || !passwordInput) {
        return;
    }
    
    togglePassword.addEventListener('click', (e) => {
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
        
        const username = usernameInput?.value?.trim();
        const password = passwordInput?.value;
        
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
            const result = await callInvoke('login', { username, password });
            
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
    const changePasswordFormElement = document.getElementById('changePasswordFormElement');
    if (!changePasswordFormElement) {
        return;
    }
    
    changePasswordFormElement.addEventListener('submit', async (e) => {
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
            const result = await callInvoke('change_password', {
                token: window.currentToken,
                oldPassword: null,
                newPassword: newPassword,
                isFirstChange: window.isFirstChange
            });
            
            // Handle Result<Result<(), String>, String> structure
            let success = false;
            let errorMsg = null;
            
            if (result && typeof result === 'object') {
                if (result.Ok !== undefined) {
                    // Outer Result is Ok
                    if (result.Ok === null || result.Ok === undefined) {
                        // Inner Result is Ok (unit type)
                        success = true;
                    } else if (typeof result.Ok === 'string') {
                        // Inner Result is Err with message
                        errorMsg = result.Ok;
                    } else if (result.Ok.Err !== undefined) {
                        // Inner Result is Err
                        errorMsg = result.Ok.Err;
                    } else if (result.Ok.Ok !== undefined) {
                        // Double nested - success
                        success = true;
                    }
                } else if (result.Err !== undefined) {
                    // Outer Result is Err
                    errorMsg = result.Err;
                } else if (result.success !== undefined) {
                    // Legacy format
                    success = result.success;
                    if (!success) {
                        errorMsg = result.message || 'Gagal mengganti password';
                    }
                }
            }
            
            if (success) {
                // Update user in session
                const user = window.astanaApp?.getCurrentUser();
                if (user) {
                    user.is_password_changed = true;
                    window.astanaApp?.saveSession(window.currentToken, user);
                }
                
                // Redirect to dashboard
                window.location.href = 'index.html';
            } else {
                const msg = errorMsg || result?.message || result?.Err || 'Gagal mengganti password';
                console.error('Change password failed:', result);
                showError(msg, true);
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

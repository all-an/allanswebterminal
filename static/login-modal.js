// Login Modal Functionality

let loginRedirectPath = '/projects'; // Default redirect

// DOM Elements
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const closeBtn = loginModal?.querySelector('.close');

// Open login modal
function openLoginModal(redirectTo = '/projects') {
    loginRedirectPath = redirectTo;
    if (loginModal) {
        loginModal.style.display = 'block';
        // Focus on username field
        const usernameField = document.getElementById('loginUsername');
        if (usernameField) {
            setTimeout(() => usernameField.focus(), 100);
        }
    }
}

// Close login modal
function closeLoginModal() {
    if (loginModal) {
        loginModal.style.display = 'none';
        // Clear form and messages
        if (loginForm) {
            loginForm.reset();
        }
        if (loginMessage) {
            loginMessage.innerHTML = '';
        }
    }
}

// Handle login form submission
async function handleLoginSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    // Clear previous messages
    if (loginMessage) {
        loginMessage.innerHTML = '';
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (loginMessage) {
                loginMessage.innerHTML = '<div class="success">Login successful! Redirecting...</div>';
            }
            setTimeout(() => {
                closeLoginModal();
                // Redirect to the specified path
                if (loginRedirectPath.startsWith('/')) {
                    window.location.href = loginRedirectPath;
                } else {
                    window.location.href = `/${loginRedirectPath}`;
                }
            }, 1000);
        } else {
            if (loginMessage) {
                loginMessage.innerHTML = '<div class="error">' + result.message + '</div>';
            }
        }
    } catch (error) {
        if (loginMessage) {
            loginMessage.innerHTML = '<div class="error">Network error. Please try again.</div>';
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLoginModal);
    }
    
    // Click outside modal to close
    if (loginModal) {
        loginModal.addEventListener('click', function(event) {
            if (event.target === loginModal) {
                closeLoginModal();
            }
        });
    }
    
    // Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    // ESC key to close modal
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && loginModal && loginModal.style.display === 'block') {
            closeLoginModal();
        }
    });
});

// Export functions for global use
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
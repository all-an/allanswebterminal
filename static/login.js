let currentStep = 'username';
let usernameValue = '';

function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('loginMessage');
    messageDiv.innerHTML = `<div class="${type}">${message}</div>`;
}

function clearMessage() {
    document.getElementById('loginMessage').innerHTML = '';
}

function showPasswordStep() {
    document.getElementById('usernameStep').style.display = 'none';
    document.getElementById('passwordStep').style.display = 'block';
    document.getElementById('password').focus();
    clearMessage();
    currentStep = 'password';
}

function showUsernameStep() {
    document.getElementById('passwordStep').style.display = 'none';
    document.getElementById('usernameStep').style.display = 'block';
    document.getElementById('username').focus();
    clearMessage();
    currentStep = 'username';
}

async function checkUsername(username) {
    try {
        const response = await fetch('/api/check-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: username })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        throw new Error('Network error. Please try again.');
    }
}

async function performLogin(username, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        throw new Error('Network error. Please try again.');
    }
}

async function handleUsernameNext() {
    const username = document.getElementById('username').value.trim();
    
    if (!username) {
        showMessage('Please enter your username');
        return;
    }
    
    usernameValue = username;
    
    try {
        const result = await checkUsername(username);
        
        if (result.exists) {
            showPasswordStep();
        } else {
            showMessage('Account not found. <a href="/register">Register for a new account</a>');
        }
    } catch (error) {
        showMessage(error.message);
    }
}

function handleBack() {
    showUsernameStep();
}

async function handleLogin(e) {
    e.preventDefault();
    
    if (currentStep !== 'password') {
        return;
    }
    
    const password = document.getElementById('password').value;
    
    if (!password) {
        showMessage('Please enter your password');
        return;
    }
    
    try {
        const result = await performLogin(usernameValue, password);
        
        if (result.success) {
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                const redirect = document.querySelector('script[src*="login.js"]')?.getAttribute('data-redirect');
                window.location.href = redirect || '/projects';
            }, 1000);
        } else {
            showMessage(result.message);
        }
    } catch (error) {
        showMessage(error.message);
    }
}

function handleUsernameEnter(e) {
    if (e.key === 'Enter') {
        handleUsernameNext();
    }
}

function initializeLogin() {
    document.getElementById('nextBtn').addEventListener('click', handleUsernameNext);
    document.getElementById('backBtn').addEventListener('click', handleBack);
    document.getElementById('username').addEventListener('keypress', handleUsernameEnter);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('username').focus();
}

document.addEventListener('DOMContentLoaded', initializeLogin);
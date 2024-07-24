const API_URL = 'http://localhost:3000';

function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}



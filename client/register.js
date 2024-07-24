
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const API_URL = 'http://localhost:3000';

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    window.location.href = 'index.html';
                } else {
                    throw new Error(data.message || 'Registration failed. Please check your details.');
                }
            } catch (error) {
                console.error('Error registering:', error);
                errorMessage.textContent = error.message;
                errorMessage.classList.remove('hidden');
            }
        });
    }
});

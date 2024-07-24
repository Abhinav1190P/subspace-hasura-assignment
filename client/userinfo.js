document.addEventListener('DOMContentLoaded', () => {

    const fetchUserInfo = async () => {
        const token = localStorage.getItem('token');

        if (!token) {
            console.error('No token found in local storage');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/user-info', {
                method: 'GET',
                headers: {
                    'Authorization': token
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const userData = await response.json();
            updateHeading(userData.name);
            fetchUserAccounts(userData.id);

        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    };

    const fetchUserAccounts = async (userId) => {
        try {
            const response = await fetch(`http://localhost:3000/users/${userId}/accounts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const accountsData = await response.json();
            updateAccountsSection(accountsData);
            populateAccountSelect(accountsData);

        } catch (error) {
            console.error('Error fetching user accounts:', error);
        }
    };

    const updateHeading = (userName) => {
        const titleElement = document.getElementById('dashboard-title');
        titleElement.innerHTML = `Fintech Dashboard - Welcome, ${userName}`;
    };

    const updateAccountsSection = (accounts) => {
        const accountsElement = document.getElementById('accounts');
        accountsElement.innerHTML = accounts.map(account => `
            <div class="account-item">
                <p>Account Number: ${account.account_number}</p>
                <p>Balance: ${account.balance}</p>
            </div>
        `).join('');
    };
    const populateAccountSelect = (accounts) => {
        const accountSelect = document.getElementById('account-select');
        accountSelect.innerHTML = '<option value="">Select an account</option>';
        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.account_number}`;
            option.dataset.balance = account.balance;
            accountSelect.appendChild(option);
        });
    };

    fetchUserInfo();
});

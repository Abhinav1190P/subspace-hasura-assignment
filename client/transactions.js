document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'index.html';
    }

    const accountSelect = document.getElementById('account-select');
    const transactionForm = document.getElementById('transaction-form');
    const errorDisplay = document.getElementById('error-display');
    
    const handleTransactionSubmit = async (e) => {
        e.preventDefault();
        errorDisplay.textContent = '';

        const accountId = accountSelect.value;
        const transactionType = document.getElementById('transaction-type').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const pinInput = document.getElementById('transaction-account-pin');
        const pin = pinInput.value;

        if (!accountId || isNaN(amount) || amount <= 0 || pin.length !== 6 || isNaN(pin)) {
            errorDisplay.textContent = 'Please select a valid account, enter a valid amount, and provide a 6-digit PIN.';
            return;
        }

        const selectedOption = accountSelect.selectedOptions[0];
        const currentBalance = parseFloat(selectedOption.dataset.balance);

        if (transactionType === 'withdrawal' && amount > currentBalance) {
            errorDisplay.textContent = 'Insufficient funds for this withdrawal.';
            return;
        }

        try {
            const pinResponse = await fetch('http://localhost:3000/verify-pin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    account_id: accountId,
                    pin: pin
                }),
            });

            if (!pinResponse.ok) {
                const errorData = await pinResponse.json();
                throw new Error(errorData.error || 'PIN verification failed');
            }

            const transactionDate = new Date().toISOString();
            const transactionResponse = await fetch('http://localhost:3000/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    account_id: accountId,
                    transaction_type: transactionType,
                    amount: amount,
                    transaction_date: transactionDate
                }),
            });

            if (!transactionResponse.ok) {
                const errorData = await transactionResponse.json();
                throw new Error(errorData.error || 'Failed to submit transaction');
            }

            alert('Transaction successful!');

        } catch (error) {
            console.error('Error submitting transaction:', error);
            errorDisplay.textContent = 'Failed to submit transaction. Please try again. Wrong pin';
        }
    };

    transactionForm.addEventListener('submit', handleTransactionSubmit);
});

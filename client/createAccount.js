document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
  
    document.getElementById('create-account-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Form submission prevented');
  
      const name = document.getElementById('account-name').value;
      const initialBalance = document.getElementById('initial-balance').value;
      const pin = document.getElementById('account-pin').value;
  

      if (pin.length !== 6 || isNaN(pin)) {
        alert('PIN must be exactly 6 digits');
        return;
      }
  
      try {
        const response = await fetch('http://localhost:3000/accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${localStorage.getItem('token')}` 
          },
          body: JSON.stringify({
            name,
            initialBalance,
            pin
          }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to create account');
        }
  
        const newAccount = await response.json();
        alert(`Account created successfully! Your account number is: ${newAccount.account_number}`);
  
        fetchAccounts();
      } catch (error) {
        console.error('Error creating account:', error.message);
        alert('Failed to create account. Please try again.');
      }
    });
  });
  
  function fetchAccounts() {
  
  }
  
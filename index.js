require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { GraphQLClient, gql } = require('graphql-request');
const cors = require('cors')
const app = express();
app.use(express.json());
app.use(cors())

const JWT_SECRET = 'abhinav';
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

const client = new GraphQLClient(HASURA_ENDPOINT, {
  headers: {
    'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
  },
});



app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  const saltRounds = 10;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const mutation = gql`
        mutation CreateUser($name: String!, $email: String!, $password: String!) {
          insert_users_one(object: {name: $name, email: $email, password_hash: $password}) {
            id
            name
            email
            created_at
          }
        }
      `;

    const data = await client.request(mutation, { name, email, password: hashedPassword });
    res.json({ success: true, user: data.insert_users_one });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const query = gql`
    query GetUser($email: String!) {
      users(where: {email: {_eq: $email}}) {
        id
        name
        email
        password_hash
      }
    }
  `;

  try {
    const data = await client.request(query, { email });
    const user = data.users[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.get('/users', async (req, res) => {
  const query = gql`
    query GetUsers {
      users {
        id
        name
        email
        created_at
      }
    }
  `;

  try {
    const data = await client.request(query);
    res.json(data.users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(403).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to authenticate token' });
    }

    req.userId = decoded.id;
    next();
  });
};

app.get('/user-info', verifyToken, async (req, res) => {
  const userId = req.userId;

  const query = gql`
      query GetUserById($userId: uuid!) {
        users_by_pk(id: $userId) {
          id
          name
          email
          created_at
        }
      }
    `;

  try {
    const data = await client.request(query, { userId });
    res.json(data.users_by_pk);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/accounts', verifyToken, async (req, res) => {
  const { name, initialBalance, pin } = req.body;
  const user_id = req.userId;

  if (!pin || pin.length !== 6 || isNaN(pin)) {
    return res.status(400).json({ error: 'PIN must be a 6-digit number' });
  }

  try {
    const hashedPin = await bcrypt.hash(pin, 10);
    const account_number = generateAccountNumber();
    const createAccountMutation = gql`
      mutation CreateAccount($name: String!, $balance: numeric!, $pin_hash: String!, $user_id: uuid!, $account_number: String!) {
        insert_accounts_one(object: { name: $name, balance: $balance, pin_hash: $pin_hash, user_id: $user_id, account_number: $account_number }) {
          id
          name
          balance
          pin_hash
          user_id
          account_number
        }
      }
    `;

    const response = await client.request(createAccountMutation, {
      name,
      balance: initialBalance,
      pin_hash: hashedPin,
      user_id,
      account_number
    });

    if (!response || !response.insert_accounts_one) {
      throw new Error('Failed to create account');
    }

    const newAccount = response.insert_accounts_one;
    res.json({ success: true, account_number: newAccount.account_number });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: error.message });
  }
});

function generateAccountNumber() {
  return 'ACC' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
}


app.post('/verify-pin', verifyToken, async (req, res) => {
  const { account_id, pin } = req.body;

  if (!pin || pin.length !== 6 || isNaN(pin)) {
      return res.status(400).json({ error: 'Invalid PIN' });
  }

  try {
      const accountQuery = gql`
          query GetAccountPin($account_id: uuid!) {
              accounts_by_pk(id: $account_id) {
                  pin_hash
              }
          }
      `;

      const { accounts_by_pk } = await client.request(accountQuery, { account_id });

      if (!accounts_by_pk) {
          return res.status(404).json({ error: 'Account not found' });
      }

      const pinMatch = await bcrypt.compare(pin, accounts_by_pk.pin_hash);

      if (!pinMatch) {
          return res.status(400).json({ error: 'Invalid PIN' });
      }

      res.json({ success: true });
  } catch (error) {
      console.error('Error verifying PIN:', error);
      res.status(500).json({ error: error.message });
  }
});



app.get('/users/:userId/accounts', async (req, res) => {
  const { userId } = req.params;
  const query = gql`
    query GetUserAccounts($userId: uuid!) {
      accounts(where: {user_id: {_eq: $userId}}) {
        id
        account_number
        balance
        created_at
      }
    }
  `;

  try {
    const data = await client.request(query, { userId });
    res.json(data.accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/accounts/:accountId', verifyToken, async (req, res) => {
  const { accountId } = req.params;
  const query = gql`
    query GetAccount($accountId: uuid!) {
      accounts_by_pk(id: $accountId) {
        id
        account_number
        balance
        created_at
        user_id
      }
    }
  `;

  try {
    const data = await client.request(query, { accountId });
    if (data.accounts_by_pk) {
      res.json(data.accounts_by_pk);
    } else {
      res.status(404).json({ error: 'Account not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




app.post('/transactions', verifyToken, async (req, res) => {
  const { account_id, transaction_type, amount } = req.body;

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const transaction_date = new Date().toISOString();

    const createTransactionMutation = gql`
      mutation CreateTransaction(
        $account_id: uuid!,
        $transaction_type: String!,
        $amount: numeric!,
        $transaction_date: timestamptz!
      ) {
        insert_transactions_one(
          object: {
            account_id: $account_id,
            transaction_type: $transaction_type,
            amount: $amount,
            transaction_date: $transaction_date
          }
        ) {
          id
          transaction_type
          amount
          transaction_date
        }
      }
    `;

    const createTransactionResponse = await client.request(createTransactionMutation, {
      account_id,
      transaction_type,
      amount,
      transaction_date
    });

    if (!createTransactionResponse || !createTransactionResponse.insert_transactions_one) {
      throw new Error('Failed to create transaction');
    }

    const updateBalanceMutation = gql`
      mutation UpdateBalance(
        $account_id: uuid!,
        $amount: numeric!
      ) {
        update_accounts(
          where: { id: { _eq: $account_id } },
          _inc: { balance: $amount }
        ) {
          affected_rows
        }
      }
    `;

    const updateBalanceResponse = await client.request(updateBalanceMutation, {
      account_id,
      amount: transaction_type === 'deposit' ? amount : -amount
    });

    if (!updateBalanceResponse || !updateBalanceResponse.update_accounts) {
      throw new Error('Failed to update balance');
    }

    if (transaction_type === 'withdrawal') {
      const balanceQuery = gql`
        query GetAccountBalance($account_id: uuid!) {
          accounts_by_pk(id: $account_id) {
            balance
          }
        }
      `;

      const balanceResponse = await client.request(balanceQuery, { account_id });

      if (!balanceResponse || !balanceResponse.accounts_by_pk) {
        throw new Error('Failed to retrieve account balance');
      }

      if (balanceResponse.accounts_by_pk.balance < amount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }
    }

    res.json({ success: true, message: 'Transaction processed successfully' });
  } catch (error) {
    console.error('Error processing transaction:', error);
    res.status(500).json({ error: error.message });
  }
});







app.get('/transactions/:accountId', async (req, res) => {
  const { accountId } = req.params;
  const query = gql`
    query GetAccountTransactions($accountId: uuid!) {
      transactions(where: {account_id: {_eq: $accountId}}, order_by: {transaction_date: desc}) {
        id
        transaction_type
        amount
        transaction_date
      }
    }
  `;

  try {
    const data = await client.request(query, { accountId });
    res.json(data.transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
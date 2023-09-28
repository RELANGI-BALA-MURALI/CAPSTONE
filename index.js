const express = require('express');
const app = express();
const port = 3000;
const axios = require('axios');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const session = require('express-session');
const crypto = require('crypto'); // Include the crypto module

// Replace 'firebase-admin/app' with just 'firebase-admin' for simplicity.
const serviceAccount = require('./serviceaccountkey (2).json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Generate a strong, random secret key for session management
const sessionSecretKey = crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: sessionSecretKey,
  resave: false,
  saveUninitialized: true,
}));

app.get('/', (req, res) => {
  res.render('homepage');
});

app.get('/signup', (req, res) => {
  res.render('signup');
});


// Use POST method for sign-up
app.post('/signupsubmit', async (req, res) => {
  const { Entername, Enteremail, Password } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // Check if the email already exists
    const userSnapshot = await db.collection("users").where('email', '==', Enteremail).get();

    if (!userSnapshot.empty) {
      return res.send("This email already exists");
    }

    // Store the hashed password in the database
    await db.collection("users").add({
      userName: Entername,
      email: Enteremail,
      password: hashedPassword,
    });

    res.render("login");
  } catch (error) {
    console.error("Error during sign-up:", error);
    res.status(500).send("Internal server error");
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

// Use POST method for login
app.post('/loginsubmit', async (req, res) => {
  const { Enteremail, Password } = req.body;

  try {
    // Find the user by email
    const userSnapshot = await db.collection("users").where('email', '==', Enteremail).get();

    if (userSnapshot.empty) {
      return res.send("User not found");
    }

    const userData = userSnapshot.docs[0].data();
    const isPasswordValid = await bcrypt.compare(Password, userData.password);

    if (isPasswordValid) {
      // Start a session
      req.session.user = userData;

      res.redirect("/dashboard");
    } else {
      res.send("Please enter valid details");
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Internal server error");
  }
});

app.get('/dashboard', async (req, res) => {
  try {
    // Check if the user is authenticated
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        ids: 'bitcoin,ethereum,ripple',
        order: 'market_cap_desc',
        per_page: 10,
        page: 1,
        sparkline: false
      }
    });

    const cryptoData = response.data;
    res.render('dashboard', { cryptoData });
  } catch (error) {
    console.error("Error fetching crypto data:", error);
    res.render('dashboard', { error: 'Error fetching crypto data' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

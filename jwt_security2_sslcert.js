const express = require('express');
const https = require('https');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Read the SSL certificate and private key
const options = {
    cert: fs.readFileSync('./ssl_eh.pem'),
    key: fs.readFileSync('./privatekey_eh.pem'),
    passphrase: 'easyheals'
  };

// Secret key for generating JWT
const secretKey = process.env.SECRET_KEY;

// Users data (usually this would be stored in a database)
let users = JSON.parse(process.env.USERS).users;

//sample json data
const sampleData = JSON.parse(process.env.SAMPLE_DATA).sampleData;

//homepage route showing doctors without security
router.get('/', async (req, res) => {
    try {
        // Make a GET request to the API
        const response = await axios.get('https://development.easyheals.com/wp-json/doctor/v1/search?term=eye&origin=mumbai');
        // Send the response data back to the client
        res.json(response.data);
    } catch (error) {
        // If there was an error fetching the data, return a 500 status code with the error message
        res.status(500).json({ message: error.message });
    }
});
// app.get('/', (req, res, next) => {
//     res.status(200).send('Hello world!');
//   });

// Registration route
router.post('/register', async (req, res) => {
    // Hash the user's password
    const hashedPassword = await bcrypt.hash(req.headers.password, 10);
    // Generate a new id for the user
    const newId = users.length + 1;

    // Add the new user to the users array
    users.push({ id: newId, username: req.headers.username, password: hashedPassword });
    //printing updated users array
    console.log(users);
    // Send a success message in the response
    res.json({ message: 'User registeration successful' });
});

// Login route
router.post('/login', async (req, res) => {
    // Find the user with the provided username
    const user = users.find(u => u.username === req.headers.username);

    // If the user doesn't exist or the password is incorrect
    if (!user || !await bcrypt.compare(req.headers.password, user.password)) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id }, secretKey);

    // Send the JWT in the response
    res.json({ token });
});

// Protected data route
router.get('/data', (req, res) => {
  // Get the token from the authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  // If no token is found in the header
  if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
  }

  // Verify the JWT
  jwt.verify(token, secretKey, (err, decoded) => {

      // If the JWT is invalid
      if (err) {
          return res.status(401).json({ message: 'Unauthorized' });
      }
      // Send the sample data in the response
      res.json(sampleData);
  });
});
    
  
// surgury route with security
    router.get('/surgury', (req, res) => {
        // Verify the JWT
        jwt.verify(req.headers.auth_token, secretKey, (err, decoded) => {
          // If the JWT is invalid
          if (err) {
            return res.status(401).json({ message: 'Unauthorized' });
          }
          // Make a GET request to the API
          axios.get('https://development.easyheals.com/wp-json/surgery/v1/search?term=heart')
            .then(response => {
              // Send the response data back to the client
              res.json(response.data);
            })
            .catch(error => {
              // If there was an error fetching the data, return a 500 status code with the error message
              res.status(500).json({ message: error.message });
            });
        });
      });

app.use(router);
// Start the HTTPS server
https.createServer(options, app).listen(3001, () => {
    console.log('HTTPS server running on port 3001');
  });
// Start the server
// app.use(express.json()); // for parsing application/json

// app.listen(3000, () => console.log('Server running on port 3000'));

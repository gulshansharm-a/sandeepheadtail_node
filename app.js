const express = require('express');
const app = express();
const port = 3000; // You can change this to any port you prefer

// Middleware to parse JSON requests
app.use(express.json());

// Define a sample route
app.get('/releaseComission', (req, res) => {
  res.json({ message: 'Hello, API!' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

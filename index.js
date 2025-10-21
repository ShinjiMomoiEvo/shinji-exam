const express = require('express');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy so req.protocol and req.secure are correct behind ELB
app.set('trust proxy', true);

// Serve static files (public/index.html will be served automatically)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Optional: test route
app.get('/check', (req, res) => {
  res.send(`protocol: ${req.protocol}, secure: ${req.secure}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

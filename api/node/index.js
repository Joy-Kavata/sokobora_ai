const express = require('express');
const cors = require('cors');

const apiRoutes = require('../../routes/api');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'active', message: 'SokoBora AI API is operational' });
});

module.exports = app;
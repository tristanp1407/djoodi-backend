const express = require('express');
const fs = require('fs');
const path = require('path');
const { PKPass } = require('passkit-generator');

const app = express();
app.use(express.json());

// Certificate paths
const certPath = path.join(__dirname, 'certs', 'pass.pem');
const keyPath = path.join(__dirname, 'certs', 'pass.key');
const wwdrPath = path.join(__dirname, 'certs', 'wwdr.pem');

// Load certificate contents. In production, use environment variables or secure storage
let certificate, privateKey, wwdrCert;
try {
  certificate = fs.readFileSync(certPath);
  privateKey = fs.readFileSync(keyPath);
  wwdrCert = fs.readFileSync(wwdrPath);
} catch (err) {
  console.warn('Warning: failed to load certificates. Pass generation will fail until certificates are provided.');
}

const keyPassphrase = process.env.PASSKEY_PASSPHRASE || '<Your-Key-Passphrase>'; // replace in real use

// Simple in-memory user data store
const userData = {};

async function generatePass(userId, loyaltyData) {
  if (!loyaltyData) throw new Error('No loyalty data for user ' + userId);

  const pass = await PKPass.from(
    {
      model: path.join(__dirname, 'passTemplate/loyalty.pass'),
      certificates: {
        wwdr: wwdrCert,
        signerCert: certificate,
        signerKey: privateKey,
        signerKeyPassphrase: keyPassphrase
      }
    },
    {
      serialNumber: userId
    }
  );

  pass.type = 'generic';
  pass.primaryFields = [
    {
      key: 'currentPoints',
      label: 'Current Points',
      value: loyaltyData.currentPoints
    }
  ];
  pass.secondaryFields = [
    {
      key: 'totalPoints',
      label: 'Total Points',
      value: loyaltyData.totalPoints
    },
    {
      key: 'prizes',
      label: 'Prizes Earned',
      value: loyaltyData.prizes
    }
  ];

  pass.setBarcodes({
    message: userId,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
    altText: userId
  });

  return pass;
}

app.get('/pass/:userId', async (req, res) => {
  const userId = req.params.userId;
  const loyaltyData = userData[userId];
  if (!loyaltyData) return res.status(404).json({ error: 'User not found or no data available' });
  try {
    const pass = await generatePass(userId, loyaltyData);
    const buffer = await pass.getAsBuffer();
    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename="${userId}-loyalty.pkpass"`
    });
    res.send(buffer);
    console.log(`Generated pass for user ${userId}`);
  } catch (err) {
    console.error('Error generating pass:', err);
    res.status(500).send('Failed to generate pass');
  }
});

app.put('/pass/:userId', async (req, res) => {
  const userId = req.params.userId;
  const newData = req.body;
  if (!newData || newData.currentPoints === undefined) {
    return res.status(400).json({ error: 'Please provide currentPoints, totalPoints, and prizes in request body' });
  }
  userData[userId] = {
    currentPoints: Number(newData.currentPoints),
    totalPoints: Number(newData.totalPoints),
    prizes: Number(newData.prizes)
  };
  console.log(`Updated data for user ${userId}:`, userData[userId]);
  try {
    const pass = await generatePass(userId, userData[userId]);
    const buffer = await pass.getAsBuffer();
    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename="${userId}-loyalty.pkpass"`
    });
    res.send(buffer);
    console.log(`Generated updated pass for user ${userId}`);
  } catch (err) {
    console.error('Error generating updated pass:', err);
    res.status(500).send('Failed to generate updated pass');
  }
});

app.post('/pass/:userId', (req, res) => {
  const userId = req.params.userId;
  const initData = req.body || {};
  userData[userId] = {
    currentPoints: Number(initData.currentPoints || 0),
    totalPoints: Number(initData.totalPoints || 0),
    prizes: Number(initData.prizes || 0)
  };
  console.log(`Created user ${userId} with data:`, userData[userId]);
  res.status(201).json({ message: `User ${userId} created`, data: userData[userId] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\u2705 Apple Wallet Pass server is running on http://localhost:${PORT}`);
});

# Apple Wallet Pass Backend Example

This project demonstrates a simple Node.js backend for generating Apple Wallet
passes. It uses **Express** for the HTTP API and **passkit-generator** to build
`.pkpass` files. Passes show loyalty data for a user and can be updated via API
calls.

## Features
- Generate a generic pass with a logo, text fields (current points, total
  points, prizes) and a QR barcode.
- Sign passes using your Apple Wallet certificates.
- Endpoints to create a user, retrieve a pass and update the pass data.

## Setup
1. Install Node.js (v16 or later recommended).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Place your Apple Wallet certificates inside the `certs/` directory:
   - `pass.pem` – Pass Type ID certificate
   - `pass.key` – Private key for the certificate
   - `wwdr.pem` – Apple WWDR intermediate certificate
4. Adjust the values in `passTemplate/loyalty.pass/pass.json` to match your Pass
   Type ID and team identifier. Set the `PASSKEY_PASSPHRASE` environment
   variable if your private key is encrypted.

5. Add your icon and logo images (`icon.png`, `icon@2x.png`, `logo.png`, `logo@2x.png`) inside `passTemplate/loyalty.pass/`. These files are not included in the repo.

## Running
Start the server with:
```bash
node server.js
```
It will run on `http://localhost:3000` by default.

## API
- `POST /pass/:userId` – create a user with optional initial data.
- `GET /pass/:userId` – download the `.pkpass` file for the user.
- `PUT /pass/:userId` – update a user's points and return an updated pass.

This example stores user data in memory and is intended for demonstration
purposes only. In a real deployment you would use a database and secure the
endpoints.

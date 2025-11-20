# MidatoPay - Web3 Payment Solution for Merchants

**The first merchant wallet that allows charging with interoperable QR and receiving payments directly in cryptocurrencies**

[![Starknet](https://img.shields.io/badge/Starknet-Sepolia-orange)](https://starknet.io)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org)

## 📋 Table of Contents

- [🎯 Project Description](#-project-description)
- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🔧 Technologies Used](#-technologies-used)
- [📦 Installation and Configuration](#-installation-and-configuration)
- [🚀 Complete User Flow](#-complete-user-flow)
- [💼 Dashboard Overview](#-dashboard-overview)
- [🔑 Wallet Creation with ChipiPay](#-wallet-creation-with-chipipay)
- [💎 Smart Contracts on Starknet](#-smart-contracts-on-starknet)
- [💱 ARS to USDT Conversion](#-ars-to-usdt-conversion)
- [📊 Payment Flow and Percentages](#-payment-flow-and-percentages)
- [🔗 API Endpoints](#-api-endpoints)
- [🔐 Security](#-security)
- [📊 Database Schema](#-database-schema)
- [🚀 Deployment](#-deployment)

## 🎯 Project Description

MidatoPay is a revolutionary Web3 payment solution designed specifically for Argentine merchants seeking protection from inflation. The platform allows merchants to receive payments in cryptocurrencies (USDT) through interoperable QR codes, while maintaining the simplicity of traditional payments.

### 🎪 Problem it Solves

- **Argentine Inflation**: Merchants lose value of their income due to inflation
- **Entry Barriers**: Existing crypto solutions are complex for traditional merchants
- **Interoperability**: Lack of interoperable QR standards in the crypto ecosystem
- **Currency Conversion**: Difficulty converting ARS to crypto efficiently

### 💡 Proposed Solution

MidatoPay offers a complete platform that includes:
- **ChipiPay Integration**: Wallet creation using ChipiPay SDK (wallet creation only)
- **Starknet Smart Contracts**: Custom payment gateway contracts for transaction processing
- **Automatic Wallet**: Merchant wallet generation and management
- **Interoperable QR Codes**: EMVCo TLV standard implementation
- **Real-time Price Oracle**: ARS ↔ USDT conversion using Starknet Oracle
- **Intuitive Dashboard**: User-friendly interface with QR generation as the primary feature
- **Flexible Conversion**: Merchants can choose what percentage of payment to convert to crypto

## ✨ Key Features

### 🛡️ Inflation Protection
- Automatic ARS → USDT conversion using Starknet Oracle
- Real-time prices updated every 30 seconds
- Protection of merchant income value
- Flexible conversion percentages (100%, 90%, 80%, 70%)

### ⚡ Instant Transactions
- Direct integration with Starknet L2
- Fast confirmations (< 2 minutes)
- Minimal gas fees compared to Ethereum
- Custom smart contracts for payment processing

### 🔗 Interoperable QR
- EMVCo TLV standard implemented
- Compatible with any wallet that supports the standard
- Structured data: merchant address, amount, payment ID
- QR code displayed prominently in dashboard

### 🎯 Simplified User Experience
- Intuitive dashboard with QR generation as the first card
- One-click QR generation
- Easy scanning from any device
- Real-time notifications
- Percentage-based conversion selection

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │ QR Generator │  │ QR Scanner   │     │
│  │  (Intuitive) │  │  (Primary)   │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend (Bun/Express)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ MidatoPay    │  │   Oracle     │  │   Payment    │     │
│  │   Service    │  │   Service    │  │   Gateway    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌──────────────┐                      ┌──────────────┐
│   ChipiPay   │                      │   Starknet   │
│  (Wallet     │                      │  (Smart     │
│  Creation)   │                      │  Contracts) │
└──────────────┘                      └──────────────┘
        │                                       │
        ▼                                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Blockchain (Starknet Sepolia)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Oracle     │  │   Payment    │  │   USDT       │     │
│  │   Contract   │  │   Gateway    │  │   Token      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Users     │  │   Payments   │  │ Transactions │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Technologies Used

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Static typing
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animations
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **ChipiPay SDK** - Wallet creation (`@chipi-stack/nextjs`)

### Backend
- **Bun** - JavaScript runtime
- **Express.js** - Web framework
- **Prisma** - Database ORM
- **WebSocket** - Real-time communication
- **Starkli** - CLI for Starknet interactions

### Blockchain
- **Starknet Sepolia** - Test network
- **Cairo** - Smart contract language
- **OpenZeppelin** - Contract libraries
- **ChipiPay SDK** - Wallet creation only (`@chipi-stack/backend`)

### Database
- **PostgreSQL** - Relational database
- **Prisma Migrate** - Schema migrations

## 📦 Installation and Configuration

### Prerequisites
- Bun 1.1+
- PostgreSQL 15+
- Git
- Starkli CLI
- ChipiPay API credentials

### Environment Variables

#### Frontend (`.env.local`)
```env
# ChipiPay - Wallet Creation Only
NEXT_PUBLIC_CHIPI_API_KEY=your_chipipay_api_key
NEXT_PUBLIC_CHIPI_SECRET_KEY=your_chipipay_secret_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Starknet Configuration
NEXT_PUBLIC_STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io/rpc/v0_9
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8
NEXT_PUBLIC_USDT_CONTRACT_ADDRESS=0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c7b7f451cd475
```

#### Backend (`.env`)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/midatopay

# JWT
JWT_SECRET=your_jwt_secret

# Clerk
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_webhook_secret

# ChipiPay (for wallet creation)
CHIPI_API_KEY=your_chipipay_api_key
CHIPI_SECRET_KEY=your_chipipay_secret_key

# Starknet
STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io/rpc/v0_9
PAYMENT_GATEWAY_ADDRESS=your_payment_gateway_contract_address
ORACLE_CONTRACT_ADDRESS=your_oracle_contract_address
```

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/midatopay.git
cd midatopay
```

2. **Install frontend dependencies**
```bash
cd frontend
bun install
```

3. **Install backend dependencies**
```bash
cd ../backend
bun install
```

4. **Set up the database**
```bash
bunx prisma migrate dev
bunx prisma generate
```

5. **Start the development servers**
```bash
# Terminal 1 - Backend
cd backend
bun run dev

# Terminal 2 - Frontend
cd frontend
bun run dev
```

## 🚀 Complete User Flow

### 1. 🏠 Homepage
- Landing page with product information
- Call-to-action for registration
- Statistics and key features

### 2. 🔐 Registration and Login
- **Registration**: Email, name, phone, business name
- **Login**: JWT authentication or Clerk OAuth (Google)
- **Roles**: MERCHANT, ADMIN
- **Onboarding**: Business name collection for new users

### 3. 🔑 Wallet Creation with ChipiPay
- **ChipiPay Integration**: Uses ChipiPay SDK exclusively for wallet creation
- **PIN Setup**: User creates a 4+ character PIN for wallet encryption
- **Automatic Generation**: Wallet is created on Starknet Sepolia
- **Storage**: Wallet address and encrypted private key stored in database
- **Note**: After wallet creation, all transactions use our custom Starknet contracts

### 4. 💼 Merchant Dashboard
The dashboard is designed to be intuitive with the QR generation as the primary feature:

#### Dashboard Layout:
1. **Welcome Section**: Personalized greeting with merchant name
2. **Total Balance Card**: Shows USDT balance prominently
3. **QR Generation Card** (First Card - Primary Feature):
   - Quick access to generate payment QR codes
   - One-click QR generation
   - Displays current balance
4. **Wallet Information**: ChipiPay wallet status and balance
5. **Recent Transactions**: Transaction history

### 5. 💰 Payment Management with Percentage Selection

#### Before Generating QR:
1. **Enter Amount**: Merchant enters amount in ARS
2. **Select Conversion Percentage**: 
   - **100%**: Entire amount converted to USDT
   - **90%**: 90% converted to USDT, 10% remains in ARS
   - **80%**: 80% converted to USDT, 20% remains in ARS
   - **70%**: 70% converted to USDT, 30% remains in ARS
3. **Real-time Conversion**: System calculates USDT amount based on:
   - Oracle exchange rate (ARS → USDT)
   - Selected percentage
   - Shows remaining ARS amount if percentage < 100%
4. **Generate QR**: Creates interoperable QR code with payment details

#### QR Code Contains:
- Merchant wallet address (normalized to 66 characters)
- Amount in USDT (after percentage conversion)
- Payment ID (unique identifier)
- EMVCo TLV format for interoperability

### 6. 📱 QR Scanning
- **Camera**: Automatic QR scanning
- **Validation**: EMVCo TLV data verification
- **Processing**: Starknet transaction execution using our custom contracts
- **Confirmation**: Transaction hash and link to Starkscan

### 7. ✅ Transaction Result
- **Status**: Pending → Completed
- **Hash**: Link to blockchain explorer
- **Details**: Amount, merchant, timestamp
- **Actions**: Copy hash, scan another QR

## 💼 Dashboard Overview

The dashboard is the central hub for merchants, designed with simplicity and efficiency in mind:

### Main Features:

1. **QR Generation Card** (Primary - First Card):
   - Large, prominent card for quick QR generation
   - Shows current USDT balance
   - Direct link to create payment QR
   - One-click access to payment creation

2. **Balance Display**:
   - Real-time USDT balance from Starknet
   - ChipiPay USDC balance (if wallet created)
   - Total revenue statistics

3. **Wallet Management**:
   - ChipiPay wallet status
   - Wallet address (normalized to 66 characters)
   - Balance information

4. **Transaction History**:
   - Recent payments
   - Transaction status
   - Quick access to details

### Dashboard Flow:
```
Dashboard → QR Generation Card → Create Payment → 
Select Amount → Choose Percentage → Generate QR → 
Display QR → Customer Scans → Transaction Processed
```

## 🔑 Wallet Creation with ChipiPay

### Important: ChipiPay is Used ONLY for Wallet Creation and Integration

**ChipiPay helps us with:**
- ✅ Wallet creation on Starknet
- ✅ Wallet integration and setup
- ✅ Initial wallet generation process

**After wallet creation, everything else is our own implementation:**
- ✅ All payment transactions use **our custom Starknet smart contracts**
- ✅ Our own payment gateway contract
- ✅ Our own Oracle integration for ARS/USDT conversion
- ✅ Our own QR code generation system
- ✅ Our own transaction processing
- ✅ Our own dashboard and user interface

### Wallet Creation Process:

1. **User Registration**: Merchant registers and logs in
2. **ChipiPay Integration** (Only for wallet creation):
   - Frontend uses `@chipi-stack/nextjs` SDK
   - Backend uses `@chipi-stack/backend` SDK
   - ChipiPay handles wallet generation on Starknet
3. **PIN Setup**: User creates a PIN (minimum 4 characters)
4. **Wallet Generation**:
   - ChipiPay creates wallet on Starknet Sepolia
   - Returns wallet address and encrypted private key
   - Address is normalized to 66 characters (0x + 64 hex)
5. **Storage**: 
   - Wallet address saved to database
   - Encrypted private key stored securely
   - Wallet ready for transactions

### After Wallet Creation - Our Own Implementation:

- **All transactions** use our custom Starknet payment gateway contract
- **No ChipiPay dependency** for transaction processing
- **Direct Starknet integration** for payment execution
- **Our Oracle-based conversion** for ARS to USDT
- **Our QR code system** with EMVCo TLV standard
- **Our dashboard** with intuitive interface

### Address Normalization:

Starknet addresses must be exactly 66 characters (0x + 64 hexadecimal characters). If a wallet address has fewer characters, it's automatically padded with leading zeros:

```
Example:
Original:  0x9f87f07fa85eb9ae6d50812ccb8afb389a83cf6bfbe5a5a0fce4da70aad87d (65 chars)
Normalized: 0x009f87f07fa85eb9ae6d50812ccb8afb389a83cf6bfbe5a5a0fce4da70aad87d (66 chars)
```

## 💎 Smart Contracts on Starknet

After wallet creation with ChipiPay, MidatoPay uses **custom smart contracts** deployed on Starknet for all payment processing:

### Payment Gateway Contract

```cairo
#[contract]
mod PaymentGateway {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    
    #[storage]
    struct Storage {
        admin: ContractAddress,
        usdt_token: ContractAddress,
        oracle: ContractAddress,
    }
    
    #[external(v0)]
    fn pay(
        ref self: ContractState,
        merchant_address: ContractAddress,
        amount: u256,
        token_address: ContractAddress,
        payment_id: felt252
    ) {
        // Transfer USDT to merchant using our contract
        // Register transaction
        // Emit payment event
    }
}
```

### Oracle Contract

```cairo
#[contract]
mod PriceOracle {
    use starknet::ContractAddress;
    
    #[storage]
    struct Storage {
        scale: u256,
        price_feed: ContractAddress,
    }
    
    #[external(v0)]
    fn quote_ars_to_usdt(ref self: ContractState, amount_ars: u256) -> u256 {
        // Oracle implementation for ARS → USDT conversion
        let scaled_amount = amount_ars * self.scale.read();
        // Return USDT amount
    }
}
```

### Contract Features:
- **Gas Optimized**: Efficient use of storage and compute
- **Security**: Validations and security checks
- **Scalability**: Designed for high transaction volume
- **Interoperability**: Compatible with ERC-20 standards

## 💱 ARS to USDT Conversion

### Conversion Process:

1. **Oracle Query**: System queries Starknet Oracle contract for current ARS/USDT rate
2. **Real-time Rate**: Oracle provides up-to-date exchange rate
3. **Percentage Application**: Selected percentage (100%, 90%, 80%, 70%) is applied
4. **Calculation**: 
   ```
   USDT Amount = (ARS Amount × Exchange Rate) × (Percentage / 100)
   Remaining ARS = ARS Amount × (100 - Percentage) / 100
   ```
5. **QR Generation**: QR code contains calculated USDT amount

### Example Conversion:

```
Merchant enters: 10,000 ARS
Oracle rate: 1 USDT = 1,000 ARS
Selected percentage: 90%

Calculation:
- USDT to receive: (10,000 / 1,000) × 0.90 = 9 USDT
- Remaining ARS: 10,000 × 0.10 = 1,000 ARS

QR contains: 9 USDT payment
```

### Oracle Integration:

- **Source**: Starknet Oracle contract on Sepolia
- **Update Frequency**: Every 30 seconds
- **Fallback**: Default rate if Oracle unavailable
- **Margin**: 2% safety margin applied

## 📊 Payment Flow and Percentages

### Complete Payment Flow:

```
1. Merchant Dashboard
   ↓
2. Click "Generate QR" (First Card)
   ↓
3. Enter Amount in ARS
   ↓
4. Select Conversion Percentage:
   - 100%: Full conversion to USDT
   - 90%: 90% USDT, 10% ARS
   - 80%: 80% USDT, 20% ARS
   - 70%: 70% USDT, 30% ARS
   ↓
5. System Calculates:
   - USDT amount (based on Oracle rate × percentage)
   - Remaining ARS (if percentage < 100%)
   ↓
6. Generate QR Code:
   - Contains merchant address
   - USDT amount (after percentage)
   - Payment ID
   - EMVCo TLV format
   ↓
7. Customer Scans QR
   ↓
8. Transaction Executed:
   - Uses our Starknet payment gateway contract
   - Transfers USDT to merchant
   - Records transaction
   ↓
9. Confirmation:
   - Transaction hash displayed
   - Link to Starkscan
   - Status updated
```

### Percentage Selection UI:

The percentage selection is displayed prominently before QR generation:

- **Visual Buttons**: 100%, 90%, 80%, 70% options
- **Real-time Preview**: Shows USDT amount and remaining ARS
- **Clear Indication**: "You will receive X% (Y ARS) of the total amount"
- **Default**: 100% (full conversion)

## 🔗 API Endpoints

### Authentication
```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
PUT  /api/auth/profile
```

### Wallet (ChipiPay - Creation Only)
```http
POST /api/chipipay/create-wallet
POST /api/chipipay/save-wallet
```

### Payments
```http
POST /api/midatopay/generate-qr
POST /api/midatopay/scan-qr
GET  /api/midatopay/history/:merchantId
GET  /api/midatopay/stats/:merchantId
```

### Oracle
```http
GET /api/oracle/price/ars-usdt
GET /api/oracle/quote/:amount
GET /api/prices/latest?currency=USDT&baseCurrency=ARS
```

### Transactions
```http
POST /api/chipipay/transactions
GET  /api/chipipay/transactions
GET  /api/chipipay/transactions/:txHash
```

## 🔐 Security

### Encryption
- **Private Keys**: Encrypted with AES-256 (via ChipiPay)
- **JWT Tokens**: Signed with secure secret
- **HTTPS**: Encrypted communication
- **PIN Protection**: User PIN encrypts wallet private key

### Validations
- **Input Validation**: Input sanitization
- **Rate Limiting**: Protection against spam
- **CORS**: Allowed domains configuration
- **Address Normalization**: Ensures valid Starknet addresses

### Database
- **Prisma**: ORM with SQL injection protection
- **Migrations**: Schema version control
- **Backups**: Automatic backups
- **Encrypted Storage**: Sensitive data encrypted at rest

## 📊 Database Schema

### Main Tables

```sql
-- Users (Merchants)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  walletAddress TEXT, -- ChipiPay wallet address (normalized)
  publicKey TEXT,
  privateKey TEXT, -- Encrypted private key
  walletCreatedAt TIMESTAMP,
  clerkId TEXT, -- For Clerk OAuth users
  role TEXT DEFAULT 'MERCHANT',
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  amount DECIMAL(18,8) NOT NULL,
  currency TEXT DEFAULT 'ARS',
  concept TEXT,
  orderId TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'PENDING',
  qrCode TEXT UNIQUE NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  userId TEXT REFERENCES users(id),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- ChipiPay Transactions
CREATE TABLE chipi_pay_transactions (
  id TEXT PRIMARY KEY,
  sessionId TEXT,
  amountARS DECIMAL(18,8),
  amountUSDC DECIMAL(18,8),
  txHash TEXT UNIQUE,
  fromAddress TEXT,
  toAddress TEXT,
  status TEXT DEFAULT 'pending',
  userId TEXT REFERENCES users(id),
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Price Oracle
CREATE TABLE price_oracle (
  id TEXT PRIMARY KEY,
  currency TEXT NOT NULL,
  baseCurrency TEXT NOT NULL,
  price DECIMAL(18,8) NOT NULL,
  source TEXT DEFAULT 'STARKNET_ORACLE',
  timestamp TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)

1. **Build the application**:
```bash
cd frontend
bun run build
```

2. **Set environment variables** in deployment platform
3. **Deploy** to Vercel or Netlify

### Backend Deployment

1. **Set up PostgreSQL database** (AWS RDS, Heroku, etc.)
2. **Run migrations**:
```bash
cd backend
bunx prisma migrate deploy
```

3. **Deploy** to platform (Heroku, Railway, AWS, etc.)
4. **Set environment variables**

### Smart Contracts Deployment

1. **Compile contracts**:
```bash
cd cairo-contracts
scarb build
```

2. **Deploy to Starknet Sepolia**:
```bash
starkli deploy payment_gateway.sierra.json --account your_account
starkli deploy oracle.sierra.json --account your_account
```

3. **Update contract addresses** in backend `.env`

## 📝 Key Points for Hackathon Judges

### What Makes MidatoPay Unique:

1. **Hybrid Approach**: 
   - Uses ChipiPay **only** for wallet creation and integration (simplifies onboarding)
   - **Everything else** is our own implementation:
     - Custom Starknet contracts for transactions (full control)
     - Our own Oracle integration
     - Our own payment processing system
     - Our own QR code generation

2. **Inflation Protection**: 
   - Real-time ARS to USDT conversion
   - Flexible percentage selection (merchants choose conversion rate)

3. **User Experience**:
   - Intuitive dashboard with QR generation as primary feature
   - One-click payment creation
   - Simple percentage selection

4. **Starknet Integration**:
   - Custom smart contracts for payment processing
   - Oracle-based price conversion
   - Gas-efficient transactions

5. **Interoperability**:
   - EMVCo TLV standard QR codes
   - Compatible with any wallet supporting the standard

### Technical Highlights:

- **Address Normalization**: Ensures all Starknet addresses are 66 characters
- **Real-time Oracle**: Updates every 30 seconds
- **Percentage-based Conversion**: Merchants control how much to convert
- **Secure Storage**: Encrypted private keys
- **Scalable Architecture**: Ready for production deployment

---

**🚀 MidatoPay - Protecting merchants from inflation with Web3 technology**

Built with ❤️ for the Starknet Hackathon

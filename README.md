# Trolley App

A trolley rental management system — monorepo with a React Native mobile client, an Express REST API server, and shared TypeScript types.

---

## Project Structure

```
trolley-app/
├── client/          # React Native (Expo) mobile app
├── server/          # Express.js REST API
├── shared/          # Shared TypeScript types (@trolley/shared)
└── package.json     # npm workspaces root
```

### `client/` — React Native App

Built with Expo and Expo Router (file-based routing).

```
client/
├── app/             # Screens (Expo Router)
│   ├── (tabs)/      # Tab navigator: Clients, Expenses, Trolleys, Pendings, P&L
│   ├── client/      # Client detail + return payment screens
│   └── trolleys/    # Trolley detail + rent-to-client screens
├── src/
│   ├── api/         # Axios wrappers calling the Express server
│   ├── store/       # React Context providers (reads via Firestore onSnapshot, writes via API)
│   └── components/  # Reusable UI components and modals
└── config/
    └── firebaseConfig.js   # Firebase Client SDK (auth + real-time reads)
```

### `server/` — Express REST API

All business logic and Firebase writes go through here.

```
server/src/
├── app.ts           # Express entry point
├── config/
│   └── firebase.ts  # Firebase Admin SDK initialisation
├── pipeline/
│   ├── pipeline.ts          # execute({ validate, run }) — the request pipeline
│   ├── middleware/
│   │   ├── auth.middleware.ts   # Verifies Firebase ID token
│   │   └── error.middleware.ts  # Global error handler
│   └── validators/          # Per-entity input validation
├── repositories/    # Firebase Admin CRUD — no business logic
├── services/        # All business logic (rent cycles, FIFO payments, etc.)
└── routes/          # Thin Express route handlers
```

**Request flow:**
```
Client (axios) → Route → pipeline.execute() → validate → Service → Repository → Firestore
                                                              ↑
                                           Real-time reads stay on onSnapshot (client-side)
```

### `shared/` — Shared Types

TypeScript interfaces imported by both `client` and `server`.

```
shared/src/types/
├── client.types.ts   # Client, ActiveRental, PastRental, RentHistory
├── trolley.types.ts  # Trolley, TrolleyHistory
├── payment.types.ts  # Payment, PaymentType
└── expense.types.ts  # Expense
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+ (workspaces support)
- Firebase project with Firestore enabled
- Firebase service account key (for the server)

### 1. Install all dependencies

```bash
npm install
```

### 2. Configure the server

Copy the example env file and fill in your Firebase Admin credentials (download from Firebase Console → Project Settings → Service accounts → Generate new private key):

```bash
cp server/.env.example server/.env
```

```env
PORT=3000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Configure the client

Set the server URL in `client/.env`:

```env
EXPO_PUBLIC_SERVER_URL=http://localhost:3000
```

For a physical device replace `localhost` with your machine's local IP (e.g. `http://192.168.1.10:3000`).

### 4. Run

Start the server:

```bash
npm run server
```

Start the mobile app (in a separate terminal):

```bash
npm run client
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/clients` | Add client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |
| POST | `/api/clients/:id/sync-rent` | Sync monthly rent |
| POST | `/api/clients/:id/rent-history` | Edit rent cycle amount |
| POST | `/api/trolleys` | Add trolley |
| PATCH | `/api/trolleys/:id/toggle` | Toggle availability |
| PATCH | `/api/trolleys/:id/assign` | Assign to client |
| PATCH | `/api/trolleys/:id/return` | Mark returned |
| PATCH | `/api/trolleys/history/:clientId` | Sync trolley history |
| POST | `/api/clients/:clientId/payments` | Record payment |
| PUT | `/api/clients/:clientId/payments/:id` | Edit payment |
| DELETE | `/api/clients/:clientId/payments/:id` | Delete payment |
| POST | `/api/expenses` | Add expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |

All endpoints require a Firebase ID token in the `Authorization: Bearer <token>` header.

---

## Adding a Web Client (Future)

The monorepo is structured to support a web app alongside the mobile client:

```bash
# Add a new web package
mkdir client-web
# client-web calls the same server/ API and imports types from shared/
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, Expo, Expo Router |
| Server | Express.js, TypeScript, Node.js |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| State | React Context API |
| Types | TypeScript (shared package) |

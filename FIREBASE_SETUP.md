# Firebase Setup Checklist

Everything you need to configure in Firebase before running this app.

---

## 1. Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**
3. Name it (e.g. `trolley-rental-app`)
4. Disable Google Analytics (not needed) → **Create project**

---

## 2. Enable Email/Password Authentication

1. In the Firebase console, go to **Build → Authentication**
2. Click **Get started**
3. Under **Sign-in method**, click **Email/Password**
4. Toggle **Enable** → **Save**

> This allows users to sign up and log in with an email and password.

---

## 3. Create the Firestore Database

1. Go to **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** (you'll set rules in step 4)
4. Select a region close to your users (e.g. `asia-south1` for India) → **Enable**

---

## 4. Set Firestore Security Rules

Go to **Firestore → Rules** and replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Each user can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click **Publish**.

> These rules ensure each logged-in user can only access their own clients, trolleys, expenses, and payments.

---

## 5. Add Your App to Firebase (Client SDK Config)

The client app already has a Firebase config in `client/config/firebaseConfig.js`.
If you created a new project, update those values:

1. In Firebase console, click the **gear icon → Project settings**
2. Scroll to **Your apps** → Click **Add app** → Choose **Web** (`</>`)
3. Register the app (name it anything)
4. Copy the `firebaseConfig` object and paste it into `client/config/firebaseConfig.js`

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

---

## 6. Generate a Service Account Key (for the Server)

The Express server (`server/`) uses the Firebase Admin SDK, which needs a service account key.

1. Go to **Project settings → Service accounts**
2. Click **Generate new private key** → **Generate key**
3. A JSON file will download — open it
4. Fill in `server/.env` using the values from the JSON:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR KEY HERE\n-----END PRIVATE KEY-----\n"
```

> Keep this file private. Never commit it to git. The `.gitignore` should exclude `server/.env`.

---

## 7. Add a .gitignore Entry for .env Files

Make sure your root `.gitignore` contains:

```
# Environment files
.env
server/.env
client/.env
*.env
```

---

## 8. (Optional) Create an Initial Admin User

Since the app now has a signup screen, you can create the first account directly from the app.

Alternatively, create one manually in Firebase:
1. Go to **Authentication → Users**
2. Click **Add user**
3. Enter an email and password → **Add user**

---

## 9. (Optional) Add Firestore Indexes

If you run queries that combine filtering and ordering on the same collection, Firestore will show an error in the console with a direct link to create the required index. Click the link to auto-create it.

For this app the main query is `onSnapshot` on collections without compound queries, so **no manual indexes are needed** at this stage.

---

## Summary Checklist

| Step | What | Done? |
|------|------|-------|
| 1 | Create Firebase project | [ ] |
| 2 | Enable Email/Password auth | [ ] |
| 3 | Create Firestore database | [ ] |
| 4 | Set Firestore security rules | [ ] |
| 5 | Add app config to `client/config/firebaseConfig.js` | [ ] |
| 6 | Generate service account key → fill `server/.env` | [ ] |
| 7 | Add `.env` to `.gitignore` | [ ] |
| 8 | Create first user (via app signup or Firebase console) | [ ] |

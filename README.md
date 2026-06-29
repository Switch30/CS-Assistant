# CS Assistant

Web app internal untuk menghitung harga customer service, menyimpan customer ke Firestore, menampilkan customer list, dan membuka detail customer.

## Stack

- Vite
- React
- TypeScript
- Firebase Hosting
- Cloud Firestore

## Struktur Project

```text
.
├── dist/                    # hasil build, tidak di-commit
├── src/
│   ├── components/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── index.html
├── package.json
└── vite.config.ts
```

## Route

- `/`: kalkulator harga dan input customer.
- `/customers`: customer list dengan search, filter, sort, dan pagination.
- `/customers/:id`: detail customer.

## Setup Lokal

```bash
npm install
npm run dev
```

Copy `.env.example` ke `.env.local`, lalu isi Firebase config jika setup di mesin baru.

## Build

```bash
npm run build
```

## Deploy

```bash
npm run deploy
```

Command tersebut akan build app lalu deploy Firebase Hosting, Firestore rules, dan Firestore indexes.

## Firebase

Project Firebase: `cs-assistant-2708`

Firestore:
- Database: `(default)`
- Region: `asia-southeast1`
- Collection utama: `customers`

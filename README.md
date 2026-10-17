# Flatmate Expense Tracker 🏠💳

A modern, mobile-first web application designed for shared apartments and roommates to track personal and communal expenses, automatically calculate pairwise debts, settle balances, and interact via voice assistance.

---

## ✨ Features

- **📱 Mobile-First Responsive Design**:
  - Touch-optimized bottom navigation dock with safe area inset support.
  - Compact spending overview cards designed specifically for Android and mobile screens.
  - Numeric badge wrapping protection (`white-space: nowrap`) ensuring currency figures remain clean and readable.
- **🎨 Dynamic Theme Palettes**:
  - Live color palette switcher featuring 5 curated themes: **Caribbean Teal** (default neo-bank), **Emerald Luxe**, **Royal Indigo**, **Sunset Amber**, and **Rose Quartz**.
  - Full Dark Mode and Light Mode support with smooth transitions.
- **⚖️ Smart Balances & Pairwise Settlement**:
  - Simplifies debts across flatmates so you only settle net owed amounts.
  - Generates UPI / payment QR codes for fast, zero-friction repayments.
- **🎙️ AI Voice Assistant**:
  - Natural language voice expense entry powered by Google Gemini.
- **🔒 Secure & Stateless Authentication**:
  - JWT-based authentication with bcrypt password hashing and PostgreSQL session persistence.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + CSS Custom Properties (Theme tokens)
- **UI Primitives**: Radix UI (Dialog, Dropdown Menu, Select, Tabs, Avatar)
- **Data Fetching**: TanStack React Query v5
- **Icons**: Lucide React & Flaticon UIcons

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Framework**: [Express 5](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) / [Neon Serverless Postgres](https://neon.tech/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: Stateless JWT + HTTP-only cookies
- **AI**: `@google/genai` (Gemini API)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL database (or Neon serverless instance)
- npm or pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/Virendra-Phirke/Flatmate_expense_tracker.git
cd Flatmate_expense_tracker
```

### 2. Install Dependencies
Install dependencies for both root, frontend, and backend workspaces:
```bash
npm install
```

### 3. Environment Variables
Copy the example environment files and configure your secrets:
```bash
# In backend
cp backend/.env.example backend/.env
```

Configure your `backend/.env` with your database credentials and secrets:
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/flatmate_db
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Push Database Schema
```bash
npm run db:push
```

### 5. Run Development Server
Run both the frontend and backend concurrently:
```bash
npm run dev
```

- Frontend runs at: `http://localhost:5173` (or `http://localhost:5174`)
- Backend API runs at: `http://localhost:5000`

---

## 📦 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs backend and frontend concurrently in development mode |
| `npm run build` | Builds both backend and frontend for production |
| `npm run build:frontend` | Builds frontend production bundle |
| `npm run typecheck` | Validates TypeScript types across both workspaces |
| `npm run db:push` | Pushes Drizzle schema migrations to PostgreSQL |
| `npm run db:studio` | Launches Drizzle Studio GUI for database inspection |

---

## 👥 Contributors

- **Virendra Phirke** ([@Virendra-Phirke](https://github.com/Virendra-Phirke)) - Initial architecture & backend services
- **Saurav H Shelke** ([@Saurav-Shelke](https://github.com/Saurav-Shelke)) - Responsive mobile UI/UX, dock navigation, theme design system, typography & conflict resolutions

---

## 📄 License

This project is licensed under the ISC License.

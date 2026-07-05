# AURA: Professional Wedding Album Management SaaS Platform

A premium, modern, responsive full-stack SaaS platform designed for wedding photographers and photo studios. Built with **React.js, Tailwind CSS, Node.js, Express.js, MongoDB, Socket.io, and Cloudinary**.

## Key Features

1. **Luxury Theme UI**: Designed with a high-end wedding color palette (White, Burnished Gold, Charcoal Black, glassmorphism, Google Fonts pairing: *Playfair Display* & *Outfit*).
2. **Predefined System Roles**:
   - **Administrator**: Dedicated dashboard to toggle visibility of standard wedding services, block/activate studio accounts, delete studios, and handle customer support chats.
   - **Studio Photographer**: Dashboard to update studio profile, manage services, build flipbook albums, set up client-proofing links, check selection statistics, and chat with platform support.
3. **Wedding Album Creator (Flipbook)**:
   - Compile double-page spreads (12x36 layouts) into a 3D page-flip interactive album.
   - Zoom controls, fullscreen mode, background soundtrack player (website romantic instrumental tracks or custom MP3 uploads), and thumbnail navigation strip.
   - Auto-generates share links and scan QR codes.
4. **Client Proofing & Selection System (High Security)**:
   - Multi-photo folder uploader.
   - Secure sharing portal serving watermarked assets only.
   - **Anti-Download Safeguards**: Serves images exclusively inside HTML5 Canvas covered by absolute transparent pointer blocker layers. Disables right-clicks context menus, drag-and-drops, print screenshots, and image URL copies.
5. **Real-time Client Updates**:
   - Photographer dashboards update in real time (via Socket.io channels) on client action flags (client opened link, started selection, completed review).
   - Live counters and categorizations for *Selected*, *Rejected*, and *Remaining* images.
   - Persistent typing status indicators and online indicators on admin support lines.

---

## Directory Structure

* `/backend`: Node.js API server and web sockets.
* `/frontend`: React client build with Tailwind CSS.

---

## Configuration & Fallbacks

Both servers are designed to run **out-of-the-box** without strict dependency setups:
* **Database Fallback**: If the `MONGODB_URI` environment variable is not defined, the server automatically mounts a JSON-file data access layer in `/backend/data/`.
* **Storage Fallback**: If the `CLOUDINARY_URL` keys are not defined, uploads (covers, album sheets, custom audio, chat files) automatically fallback to the local static directory `/backend/public/uploads`.

---

## Installation & Running

### 1. Prerequisites
Make sure [Node.js](https://nodejs.org) is installed on your machine.

### 2. Startup Backend
1. Open a terminal, go to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
   *The API server launches on [http://localhost:5000](http://localhost:5000).*

### 3. Startup Frontend
1. Open a new terminal, go to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
   *The React web app launches on [http://localhost:5173](http://localhost:5173).*

---

## Pre-seeded Credentials

* **System Administrator**:
  - Email: `admin@wedding.com`
  - Password: `Admin@123`
* **Photographer Studio**:
  - To log in as a studio photographer, simply switch to the **Create Account** tab on the home page, enter your email and phone number, and you will be immediately created and logged in.

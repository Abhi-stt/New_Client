# Client Portal

A full-stack client portal for managing tasks, documents, calendar events, and more, with role-based access for Admin, Manager, Team Member, and Client.

---

## Features
- **Google Calendar-like UI** for all roles (custom React component, no external calendar library)
- **Task management** with priority and due dates
- **Document upload, view, and download** for all roles
  - DOCX preview in-browser using mammoth.js
  - PDF/image preview in-browser
  - Office files (doc, xls, ppt, etc.) use Microsoft Office Online Viewer if public
- **Role-based dashboards** (Admin, Manager, Team Member, Client)
- **Firm and client management**
- **Real-time data from backend (MongoDB)**
- **Modern, responsive UI** (Next.js, Tailwind CSS)

---

## Tech Stack
- **Frontend:** Next.js (React, TypeScript, Tailwind CSS)
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **Document Preview:** mammoth.js (for .docx), browser/PDF viewer, Office Online Viewer

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd client-portal (2)
```

### 2. Install Dependencies
#### Backend
```bash
cd backend
  npm install
```
#### Frontend
```bash
cd ..
npm install
```

### 3. Environment Variables
Create a `.env` file in `backend/` with:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/client-portal
```

### 4. Run the App
#### Start Backend
```bash
cd backend
npm start
```
#### Start Frontend
```bash
cd ..
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:5000](http://localhost:5000)

---

## Document Preview & Download
- **.docx:** Previewed in-browser using mammoth.js (even on localhost)
- **PDF, images:** Open directly in a new tab
- **Other Office files:** Use Microsoft Office Online Viewer (requires public URL)
- **All other files:** Downloaded automatically

### Note
- For Office Online Viewer/Google Docs Viewer, files must be accessible via a public URL. On localhost, only .docx preview and direct download are guaranteed.

---

## Contribution
Pull requests are welcome! Please open an issue first to discuss major changes.

## License
[MIT](LICENSE)

## Contact
For questions or support, contact: [abhishek@thecodingstudio.in] 
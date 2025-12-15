# LockedChat – Technical Blueprint

## 1. Overview

LockedChat is a secure, one-to-one real-time chat application inspired by WhatsApp-style UX, enhanced with:
- JWT-based authentication
- Real-time delivery & read receipts
- AI-assisted message suggestions
- Single file sharing
- Online/offline presence tracking

The system is designed with a modern full-stack architecture using React/Next.js, Node.js, Socket.IO, and MongoDB/PostgreSQL.

---

## 2. Tech Stack Requirements

### Frontend
- React.js or Next.js
- TypeScript
- Tailwind CSS
- Shadcn UI
- React Query or Redux Toolkit
- Socket.IO Client
- Axios

### Backend
- Node.js
- Express.js
- Socket.IO
- JWT Authentication
- Multer (file uploads)

### Database
- MongoDB  
OR  
- PostgreSQL (Prisma ORM mandatory)

### AI Integration
- OpenAI API or Gemini API

### File Storage
- AWS S3 or Local Storage

---

## 3. Core Features

### 1. User Authentication
- Register / Login
- JWT-based auth
- Protected chat routes

### 2. One-to-One Real-Time Chat
- Socket.IO based
- Private user rooms
- Instant message delivery

### 3. Delivery Receipt
- Single tick when delivered
- Socket delivery tracking

### 4. Read Receipt
- Double tick when read
- Stored in database

### 5. AI Assisted Message Suggestion
- Auto suggestion on input focus
- Editable suggestion
- Sent if unchanged

### 6. Message Encryption
- Encrypt messages at rest
- Decrypt on access

### 7. Single File Upload
- Image, PDF, Text only
- One file at a time
- Preview & download support

### 8. UI / UX
- WhatsApp-like layout
- User list left, chat right
- Message bubbles & status icons

### 9. Online / Offline Status
- Real-time presence
- Socket-based updates

---

## 4. Database Schema (High Level)

### User
- id
- name
- email
- passwordHash
- onlineStatus

### Chat
- id
- user1Id
- user2Id

### Message
- id
- chatId
- senderId
- encryptedContent
- fileMetadata
- status
- createdAt

---

## 5. Security
- JWT expiry
- Encrypted messages
- File validation
- Socket authentication

---

## 6. Future Enhancements
- Typing indicator
- Message edit/delete
- Message locking
- Push notifications

---

End of Blueprint

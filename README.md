# SpamSnare Extension

SpamSnare is a Chrome extension designed to help users identify and prevent spam by generating unique email addresses for different websites. It tracks which websites leak or sell your data.

## Project Structure

- `backend/`: Node.js server with Express, PostgreSQL, and Prisma ORM.
- `Frontend/`: Chrome Extension.

---

## 🚀 Backend Setup

The backend handles user authentication, email generation tracking, health monitoring, and automated email verification using Gemini AI.

### Prerequisites
- Node.js (v14+)
- PostgreSQL Database
- Google Gemini API Key

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run Prisma migrations / generate client:
   ```bash
   npx prisma migrate dev
   ```

### 🔑 Environment Variables

Create a `.env` file in the `backend/` directory and add the following:

```env
# PostgreSQL Connection String
DATABASE_URL=postgresql://user:password@localhost:5432/spamsnare?schema=public

# JWT Secret for Authentication
JWT_SECRET=your_jwt_secret

# Google Gemini API Key for Email Verification
GEMINI_API_KEY=your_gemini_api_key
```

### Running the Server

```bash
npm start
```
The server will be running on `http://localhost:3000`.

### 🩺 Health Check
Check backend status at:
`GET http://localhost:3000/api/health`

---

## 🐳 Docker Deployment

SpamSnare Backend is containerized and available on Docker Hub. You can pull the latest image and run it with minimal configuration.

### 🌐 Docker Hub
The official image can be found here: [paulbchv/spamsnare](https://hub.docker.com/r/paulbchv/spamsnare)

### 🚀 Running with Docker
You can run the backend container using the following command (replace with your actual credentials):

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/spamsnare" \
  -e GEMINI_API_KEY="your_gemini_api_key" \
  -e JWT_SECRET="your_jwt_secret" \
  paulbchv/spamsnare
```

### 🛠️ Running with Docker Compose
To run using the local `docker-compose.yml` file:
```bash
docker-compose up --build
```
This will automatically load environment variables from the `backend/.env` file.

---


## 🧩 Chrome Extension (Frontend) Setup

The frontend is a Chrome extension designed following Apple Human Interface Guidelines that interacts with the backend to generate emails and show flagged sites.

### Development Installation

1. Open your Chrome browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle switch in the top right corner).
3. Click on the **Load unpacked** button.
4. Select the `Frontend/` folder from this project directory.
5. The SpamSnare icon should now appear in your extension list.

### Features
- **Auto-generate Email**: Automatically detects the website you're on and suggests a unique email.
- **Inbox Management**: View emails received at your generated addresses.
- **Leak Detection**: Automated verification of whether a site has leaked your email using AI.

---



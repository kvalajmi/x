# WhatsApp Bulk Messaging System

A full-stack application for sending bulk WhatsApp messages using Excel files.

## 🚀 Features

- **WhatsApp Web Integration**: Connect via QR code
- **Excel File Processing**: Upload and parse Excel files with customer data
- **Bulk Messaging**: Send messages to multiple recipients with queue management
- **Real-time Updates**: Live status updates via Socket.IO
- **Message Logging**: Track sent/failed messages
- **Drag & Drop UI**: Modern file upload interface
- **Arabic RTL Support**: Fully supports Arabic language and RTL layout

## 📁 Project Structure

```
project-root/
├── frontend/          # React + Vite frontend
│   ├── src/
│   ├── dist/         # Built frontend (served by backend)
│   └── package.json
├── backend/          # Express.js backend
│   ├── src/
│   ├── index.js      # Main server entry point
│   └── package.json
├── package.json      # Root package.json
└── README.md
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+ 
- npm

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd project-root
   npm run install:all
   ```

2. **Build frontend:**
   ```bash
   npm run build
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Open http://localhost:3000
   - The backend serves both API and frontend

## 🌐 Server Deployment

### Deployment Settings

- **Root Directory**: `project-root`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18+

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com
API_KEY=your-secret-api-key
```

### Deployment Steps

1. **Prepare for deployment:**
   ```bash
   # Install dependencies
   npm install

   # Build frontend
   npm run build
   ```

2. **Deploy to your server:**
   - Upload project files
   - Set environment variables
   - Run `npm start`

### Render/Railway Deployment

1. **Connect your repository**
2. **Set build command**: `npm install && npm run build`
3. **Set start command**: `npm start`
4. **Add environment variables**
5. **Deploy**

## 📊 Excel File Format

The system expects Excel files with these columns:

| Column | Description | Required |
|--------|-------------|----------|
| A | Customer Name | Yes |
| B | Civil ID | Optional |
| C | Phone 1 | Required |
| D | Phone 2 | Optional |
| E | Phone 3 | Optional |
| G | Message Text | Required |

## 🔧 API Endpoints

- `GET /` - Frontend application
- `GET /api/health` - Health check
- `GET /api/status` - System status
- `POST /api/upload` - Upload Excel file
- `GET /api/upload/info` - Upload requirements

## 🔌 Socket.IO Events

### Client → Server
- `connect_whatsapp` - Initialize WhatsApp connection
- `start_messaging` - Start bulk messaging
- `pause_messaging` - Pause messaging
- `resume_messaging` - Resume messaging
- `cancel_messaging` - Cancel messaging

### Server → Client
- `qr` - QR code for WhatsApp authentication
- `ready` - WhatsApp client ready
- `message_sent` - Message sent successfully
- `message_failed` - Message failed to send
- `stats_update` - Updated statistics
- `status_update` - System status update

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO
- **WhatsApp**: whatsapp-web.js with Puppeteer
- **File Processing**: multer + xlsx
- **Queue Management**: p-queue with retry logic
- **Phone Validation**: libphonenumber-js
- **Security**: helmet + cors + rate limiting

## 📝 License

MIT License - see LICENSE file for details.

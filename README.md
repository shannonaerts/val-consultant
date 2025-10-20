# VAL - Virtual AI Consultant

A lightweight, end-to-end prototype of a Virtual AI Consultant that demonstrates the complete flow from client research to task execution. Built by GemSquash as a functional MVP showcasing AI-powered consulting capabilities.

## 🚀 Features

VAL demonstrates four core capabilities:

### 1. **Preparation** 🔍
- **Web Scraping**: Automatically scrape and summarize public client data from multiple sources
- **Research Integration**: Store and organize research findings in searchable knowledge base
- **Source Selection**: Choose from websites, LinkedIn profiles, news articles, and financial data

### 2. **Engagement** 📹
- **Meeting Recording**: Record and transcribe meetings with automatic speaker identification
- **Audio Upload**: Support for various audio/video formats (MP3, WAV, M4A, MP4)
- **Transcript Storage**: Store transcripts in per-client vector databases for easy retrieval

### 3. **Knowledge Base** 💬
- **RAG-powered Chat**: Chat with VAL across all stored client information
- **Contextual Responses**: Get answers based on meetings, research, and tasks
- **Source Attribution**: See exactly where VAL's information comes from

### 4. **Execution** ✅
- **Task Management**: Create, assign, and track tasks with priorities and due dates
- **Smart Reminders**: Automated reminders with email/webhook notifications
- **Dashboard Analytics**: Track progress, KPIs, and client interaction metrics

## 🏗️ Architecture

VAL is built with a modular microservices architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Node.js        │    │  Python         │
│   (Port 3000)   │◄──►│  Orchestrator   │◄──►│  Microservices  │
│                 │    │  (Port 3001)    │    │  (Ports 8001-8004)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │  WebSocket      │
                       │  (Port 3002)    │
                       └─────────────────┘
```

### Components

**Frontend (React + Tailwind)**
- Modern, responsive UI with multi-tab interface
- Real-time updates via WebSocket
- Interactive dashboard with Chart.js visualizations

**Backend Services**
- **Node.js Orchestrator**: Main API gateway and WebSocket server
- **Python Microservices**: Specialized services for specific functions

**Data Storage**
- **SQLite**: Lightweight relational database for metadata
- **In-memory Vector Store**: Semantic search and document retrieval
- **File Storage**: Audio files and documents

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js + Recharts** - Data visualization
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client

### Backend
- **Node.js + Express** - Main orchestration service
- **FastAPI (Python)** - High-performance microservices
- **Socket.IO** - Real-time WebSocket communication
- **SQLite** - Lightweight database
- **APScheduler** - Task scheduling

### Microservices (Python FastAPI)
1. **Scraper Service** (Port 8001) - Web data extraction
2. **Transcriber Service** (Port 8002) - Audio transcription
3. **Vector Store Service** (Port 8003) - Semantic search
4. **Task Engine Service** (Port 8004) - Task management & reminders

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **Python 3.8+**
- **npm** or **yarn**
- **uvicorn** (Python ASGI server)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd val-consultant
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Install Backend Node.js Dependencies**
   ```bash
   cd backend/node-services
   npm install
   cd ../..
   ```

4. **Install Python Dependencies**
   ```bash
   cd backend/python-services
   pip install -r requirements.txt
   cd ../..
   ```

### Running the Application

1. **Start Python Microservices** (run in separate terminals)

   ```bash
   # Terminal 1: Scraper Service
   cd backend/python-services/scraper
   python main.py

   # Terminal 2: Transcriber Service
   cd backend/python-services/transcriber
   python main.py

   # Terminal 3: Vector Store Service
   cd backend/python-services/vector-store
   python main.py

   # Terminal 4: Task Engine Service
   cd backend/python-services/task-engine
   python main.py
   ```

2. **Start Node.js Services** (run in separate terminals)

   ```bash
   # Terminal 5: Main Orchestrator
   cd backend/node-services
   npm start

   # Terminal 6: WebSocket Server
   cd backend/node-services
   npm run websocket
   ```

3. **Start the Frontend**

   ```bash
   # Terminal 7: React Frontend
   cd frontend
   npm start
   ```

### Access the Application

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3001
- **WebSocket**: ws://localhost:3002
- **Microservices**:
  - Scraper: http://localhost:8001
  - Transcriber: http://localhost:8002
  - Vector Store: http://localhost:8003
  - Task Engine: http://localhost:8004

## 📋 Demo Walkthrough

VAL comes pre-loaded with sample data for immediate demonstration:

### Sample Clients
1. **Acme Corporation** - Technology company seeking operational efficiency
2. **Global Tech Solutions** - Software development company
3. **Innovate Labs** - AI/ML research startup

### Demo Flow

1. **Select a Client** - Choose "Acme Corporation" from the dropdown
2. **Research Tab** - Click "Start Research" to see simulated web scraping
3. **Meetings Tab** - View pre-loaded meetings with transcripts
4. **Chat Tab** - Ask VAL questions like:
   - "What did we discuss in our last meeting?"
   - "What are the main pain points for this client?"
   - "What tasks are pending?"
5. **Tasks Tab** - View and manage client tasks
6. **Dashboard Tab** - See analytics and KPIs

### Sample Questions for Chat

Try these questions to test VAL's capabilities:

- "What did we discuss in our last meeting with Acme?"
- "What are the main pain points for this client?"
- "What tasks are pending for this client?"
- "Summarize the client's business model"
- "Who did we meet with from the client's team?"

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend/node-services` directory:

```env
# API Configuration
PORT=3001
WS_PORT=3002
FRONTEND_URL=http://localhost:3000

# Database
DB_PATH=./val_consultant.db

# JWT Secret (change in production)
JWT_SECRET=your-secret-key-here

# Microservice URLs
SCRAPER_URL=http://localhost:8001
TRANSCRIBER_URL=http://localhost:8002
VECTOR_STORE_URL=http://localhost:8003
TASK_ENGINE_URL=http://localhost:8004
```

### Authentication (Demo Mode)

VAL includes a placeholder authentication system:

**Demo Users:**
- **Consultant**: `john@gemsquash.com` / `password123`
- **Manager**: `sarah@gemsquash.com` / `password123`
- **Admin**: `admin@gemsquash.com` / `admin123`

## 📊 API Documentation

### Main API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

#### Clients
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create new client

#### Research
- `POST /api/scrape/:clientId` - Scrape client data
- `GET /api/research/:clientId` - Get research data

#### Meetings
- `GET /api/meetings/:clientId` - List client meetings
- `POST /api/meetings/upload` - Upload meeting audio
- `GET /api/meetings/:meetingId/transcript` - Get transcript

#### Chat
- `POST /api/chat` - Send chat message

#### Tasks
- `GET /api/tasks/:clientId` - List client tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:taskId` - Update task
- `DELETE /api/tasks/:taskId` - Delete task

#### Dashboard
- `GET /api/dashboard/:clientId` - Get dashboard data

### Microservice APIs

Each microservice exposes its own API:

- **Scraper**: `/scrape`, `/status`, `/sources`
- **Transcriber**: `/transcribe`, `/transcripts/:id`, `/status`
- **Vector Store**: `/query`, `/add-document`, `/embed`, `/status`
- **Task Engine**: `/tasks`, `/tasks/:id/reminders`, `/tasks/:id/statistics`, `/status`

## 🧪 Testing

### Health Checks

All services include health check endpoints:

```bash
# Main services
curl http://localhost:3001/api/health

# Microservices
curl http://localhost:8001/status  # Scraper
curl http://localhost:8002/status  # Transcriber
curl http://localhost:8003/status  # Vector Store
curl http://localhost:8004/status  # Task Engine
```

### Sample API Calls

```bash
# Get clients
curl http://localhost:3001/api/clients

# Send chat message
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"clientId": "acme-corp", "message": "What did we discuss?"}'

# Create task
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "acme-corp",
    "title": "Follow up with client",
    "priority": "high"
  }'
```

## 🔐 Security Notes

**Important**: VAL is an MVP prototype and includes placeholder security:

- Authentication uses mock users and simple JWT tokens
- No password hashing (in demo mode)
- No HTTPS/SSL configuration
- Open CORS policy for development
- Mock API keys and external service integration

**For production use**, implement:
- Proper password hashing (bcrypt)
- Secure JWT configuration
- HTTPS/SSL certificates
- Rate limiting and input validation
- Real API keys and secure credential storage
- Audit logging and monitoring

## 🚀 Production Deployment

### Docker Support

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - orchestrator

  orchestrator:
    build: ./backend/node-services
    ports:
      - "3001:3001"
      - "3002:3002"
    environment:
      - NODE_ENV=production
    depends_on:
      - scraper
      - transcriber
      - vector-store
      - task-engine

  scraper:
    build: ./backend/python-services/scraper
    ports:
      - "8001:8001"

  transcriber:
    build: ./backend/python-services/transcriber
    ports:
      - "8002:8002"

  vector-store:
    build: ./backend/python-services/vector-store
    ports:
      - "8003:8003"

  task-engine:
    build: ./backend/python-services/task-engine
    ports:
      - "8004:8004"
```

### Environment Configuration

For production deployment:

1. Set up proper environment variables
2. Configure real database (PostgreSQL recommended)
3. Set up production-ready vector store (Pinecone, Weaviate)
4. Configure real API keys for external services
5. Set up monitoring and logging
6. Configure SSL certificates
7. Set up backup and recovery procedures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary to GemSquash. All rights reserved.

## 🆘 Troubleshooting

### Common Issues

**1. Port Conflicts**
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :3001
# Kill processes if needed
kill -9 <PID>
```

**2. Python Dependencies**
```bash
# Install requirements in virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**3. Database Issues**
```bash
# Reset database
rm backend/node-services/val_consultant.db
# Restart the orchestrator service
```

**4. Microservice Connection**
- Ensure all microservices are running before starting the orchestrator
- Check firewall settings if services can't communicate
- Verify microservice URLs in environment variables

### Logs

Check logs for debugging:

```bash
# Frontend logs
cd frontend && npm start

# Backend logs
cd backend/node-services && npm start

# Microservice logs (run each in separate terminal)
cd backend/python-services/scraper && python main.py
cd backend/python-services/transcriber && python main.py
cd backend/python-services/vector-store && python main.py
cd backend/python-services/task-engine && python main.py
```

## 📞 Support

For support or questions:
- Contact the GemSquash development team
- Create an issue in the project repository
- Check the troubleshooting section above

---

**VAL Virtual AI Consultant** - Built with ❤️ by GemSquash
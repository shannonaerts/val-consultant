const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const VectorService = require('./services/vectorService');
const { findRelevantContent, generateResponse } = require('./mock-vector-data');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Database initialization
const db = new sqlite3.Database('./val_consultant.db');

// Vector service initialization
const vectorService = new VectorService();

// Initialize database tables
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Clients table
      db.run(`CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        industry TEXT,
        website TEXT,
        key_contact_name TEXT,
        key_contact_linkedin TEXT,
        key_contact_email TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Add new columns to existing clients table if they don't exist
      db.run(`ALTER TABLE clients ADD COLUMN key_contact_name TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding key_contact_name column:', err);
        }
      });

      db.run(`ALTER TABLE clients ADD COLUMN key_contact_linkedin TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding key_contact_linkedin column:', err);
        }
      });

      db.run(`ALTER TABLE clients ADD COLUMN key_contact_email TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding key_contact_email column:', err);
        }
      });

      // Meetings table
      db.run(`CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        duration TEXT,
        participants TEXT,
        transcript_url TEXT,
        status TEXT DEFAULT 'processing',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id)
      )`);

      // Tasks table
      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        assignee TEXT,
        due_date TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        reminder BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id)
      )`);

      // Research data table
      db.run(`CREATE TABLE IF NOT EXISTS research_data (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        source TEXT NOT NULL,
        data_type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id)
      )`);

      // Documents table
      db.run(`CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        type TEXT,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        file_path TEXT,
        uploaded_by TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (client_id) REFERENCES clients (id)
      )`);

      // Notes table
      db.run(`CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id)
      )`, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};

// Initialize sample data
const initializeSampleData = () => {
  const sampleClients = [
    {
      id: 'acme-corp',
      name: 'Acme Corporation',
      industry: 'Technology',
      website: 'https://acme.com',
      status: 'active'
    },
    {
      id: 'global-tech',
      name: 'Global Tech Solutions',
      industry: 'Software',
      website: 'https://globaltech.com',
      status: 'active'
    },
    {
      id: 'innovate-labs',
      name: 'Innovate Labs',
      industry: 'AI/ML',
      website: 'https://innovatelabs.com',
      status: 'active'
    }
  ];

  sampleClients.forEach(client => {
    db.run(
      `INSERT OR IGNORE INTO clients (id, name, industry, website, status) VALUES (?, ?, ?, ?, ?)`,
      [client.id, client.name, client.industry, client.website, client.status]
    );
  });

  const sampleTasks = [
    {
      id: 'task-1',
      client_id: 'acme-corp',
      title: 'Prepare project proposal draft',
      description: 'Create comprehensive proposal for Phase 1 implementation',
      assignee: 'John Smith',
      due_date: '2024-01-20',
      priority: 'high',
      status: 'pending',
      reminder: 1
    },
    {
      id: 'task-2',
      client_id: 'acme-corp',
      title: 'Review technical requirements',
      description: 'Go through technical specifications and identify potential challenges',
      assignee: 'Sarah Johnson',
      due_date: '2024-01-18',
      priority: 'medium',
      status: 'completed',
      reminder: 0
    }
  ];

  sampleTasks.forEach(task => {
    db.run(
      `INSERT OR IGNORE INTO tasks (id, client_id, title, description, assignee, due_date, priority, status, reminder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [task.id, task.client_id, task.title, task.description, task.assignee, task.due_date, task.priority, task.status, task.reminder]
    );
  });
};

// Service URLs
const MICROSERVICES = {
  scraper: process.env.SCRAPER_URL || 'http://localhost:8001',
  transcriber: process.env.TRANSCRIBER_URL || 'http://localhost:8002',
  vectorStore: process.env.VECTOR_STORE_URL || 'http://localhost:8003',
  taskEngine: process.env.TASK_ENGINE_URL || 'http://localhost:8004'
};

// Utility functions
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Client Management
app.get('/api/clients', asyncHandler(async (req, res) => {
  db.all('SELECT * FROM clients ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
}));

app.post('/api/clients', asyncHandler(async (req, res) => {
  const { name, industry, website, key_contact_name, key_contact_linkedin, key_contact_email } = req.body;
  const id = uuidv4();

  db.run(
    'INSERT INTO clients (id, name, industry, website, key_contact_name, key_contact_linkedin, key_contact_email) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, industry, website, key_contact_name, key_contact_linkedin, key_contact_email],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id,
        name,
        industry,
        website,
        key_contact_name,
        key_contact_linkedin,
        key_contact_email,
        status: 'active'
      });
    }
  );
}));

app.put('/api/clients/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, industry, website, key_contact_name, key_contact_linkedin, key_contact_email } = req.body;

  db.run(
    'UPDATE clients SET name = ?, industry = ?, website = ?, key_contact_name = ?, key_contact_linkedin = ?, key_contact_email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, industry, website, key_contact_name, key_contact_linkedin, key_contact_email, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json({
        id,
        name,
        industry,
        website,
        key_contact_name,
        key_contact_linkedin,
        key_contact_email,
        status: 'active'
      });
    }
  );
}));

app.delete('/api/clients/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM clients WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deleted successfully' });
  });
}));

// Research/Scraping
app.post('/api/scrape/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { sources } = req.body;

  console.log(`=== SCRAPING REQUEST ===`);
  console.log(`Client ID: ${clientId}`);
  console.log(`Sources: ${JSON.stringify(sources)}`);

  try {
    // Get client information including website URL and key contact info
    console.log(`Querying database for client: ${clientId}`);
    const client = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM clients WHERE id = ?', [clientId], (err, row) => {
        if (err) {
          console.error(`Database error: ${err.message}`);
          reject(err);
        } else {
          console.log(`Database query result: ${JSON.stringify(row)}`);
          resolve(row);
        }
      });
    });

    if (!client) {
      console.log(`Client not found: ${clientId}`);
      return res.status(404).json({ error: 'Client not found' });
    }

    console.log(`Found client: ${JSON.stringify(client)}`);
    console.log(`Website to scrape: ${client.website}`);

    // Call Python microservice for scraping with website URL and key contact info
    const requestData = {
      client_id: clientId,
      website_url: client?.website || null,
      key_contact_linkedin: client?.key_contact_linkedin || null,
      sources: sources || ['website', 'linkedin']
    };

    console.log(`Sending request to scraper: ${JSON.stringify(requestData)}`);
    const response = await axios.post(`${MICROSERVICES.scraper}/scrape`, requestData);

    // Store research data in database
    const researchData = response.data.data || response.data;

    // Insert into research_data table
    db.run(`INSERT INTO research_data (id, client_id, source, data_type, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), clientId, 'website', 'company_overview', JSON.stringify(researchData), new Date().toISOString()],
      function(err) {
        if (err) {
          console.error('Failed to store research data:', err);
        }
      }
    );

    console.log(`Scraping successful for client ${clientId}`);
    res.json({
      success: true,
      data: researchData,
      message: 'Scraping completed successfully'
    });

  } catch (error) {
    console.error('=== SCRAPING ERROR ===');
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);

    // Return mock data for demo
    const mockData = {
      overview: 'Acme Corporation is a leading technology company specializing in innovative software solutions for enterprise clients.',
      industry: 'Technology',
      size: '1000-5000 employees',
      founded: '2010',
      location: 'San Francisco, CA',
      funding: '$50M Series C',
      recentNews: 'Recently launched new AI-powered platform',
      executives: 'John Smith (CEO), Sarah Johnson (CTO)',
      products: 'Enterprise Software, AI Solutions, Cloud Platform',
      sources: {
        website: 'completed',
        linkedin: 'completed',
        news: 'completed',
        financial: 'completed'
      }
    };

    res.json({
      success: true,
      data: mockData,
      message: 'Mock data returned for demonstration'
    });
  }
}));

app.get('/api/research/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  // Try to get real research data from database first
  db.get(
    'SELECT * FROM research_data WHERE client_id = ? ORDER BY created_at DESC LIMIT 1',
    [clientId],
    (err, row) => {
      if (err) {
        console.error('Error fetching research data:', err);
        return res.status(500).json({ error: err.message });
      }

      if (row) {
        try {
          // Return the actual scraped research data
          const researchData = JSON.parse(row.content);

          // Extract recent news from the news data if available
          if (researchData.additional_data && researchData.additional_data.news) {
            const newsData = researchData.additional_data.news;
            if (Array.isArray(newsData) && newsData.length > 0) {
              // Use the first news article as the recent news
              const topNews = newsData[0];
              researchData.recentNews = `${topNews.title} - ${topNews.summary}`;
            } else if (newsData.summary && newsData.summary !== 'No recent news found') {
              researchData.recentNews = newsData.summary;
            }
          }

          // Extract latest financials from the financial data if available
          if (researchData.additional_data && researchData.additional_data.financial) {
            const financialData = researchData.additional_data.financial;

            // Create the "Latest Financials" field with revenue and profit info
            let latestFinancials = "Latest Financials: ";

            if (financialData.revenue && financialData.revenue !== "Not found on website") {
              const revenueText = financialData.revenue_period
                ? `Revenue: ${financialData.revenue} (${financialData.revenue_period})`
                : `Revenue: ${financialData.revenue}`;
              latestFinancials += revenueText;
            }

            if (financialData.profit && financialData.profit !== "Not found on website") {
              if (latestFinancials !== "Latest Financials: ") {
                latestFinancials += "; ";
              }
              const profitText = financialData.profit_period
                ? `Profit: ${financialData.profit} (${financialData.profit_period})`
                : `Profit: ${financialData.profit}`;
              latestFinancials += profitText;
            }

            if (latestFinancials === "Latest Financials: ") {
              latestFinancials += "Not found on website";
            }

            researchData.latestFinancials = latestFinancials;
          } else {
            researchData.latestFinancials = "Latest Financials: Not found on website";
          }

          // Ensure we have sources information
          if (!researchData.sources && researchData.scraped_sources) {
            researchData.sources = {};
            researchData.scraped_sources.forEach(source => {
              researchData.sources[source] = 'completed';
            });
          }

          res.json(researchData);
        } catch (parseError) {
          console.error('Error parsing research data:', parseError);
          // Return mock data as fallback
          return res.json(getMockResearchData());
        }
      } else {
        // No research data found, return mock data for demo
        console.log(`No research data found for client ${clientId}, returning mock data`);
        res.json(getMockResearchData());
      }
    }
  );
}));

// Helper function to generate mock research data
const getMockResearchData = () => {
  return {
    overview: 'Acme Corporation is a leading technology company specializing in innovative software solutions for enterprise clients.',
    industry: 'Technology',
    size: '1000-5000 employees',
    founded: '2010',
    location: 'San Francisco, CA',
    funding: '$50M Series C',
    recentNews: 'Recently launched new AI-powered platform',
    executives: 'John Smith (CEO), Sarah Johnson (CTO)',
    products: 'Enterprise Software, AI Solutions, Cloud Platform',
    sources: {
      website: 'completed',
      linkedin: 'completed',
      news: 'completed',
      financial: 'completed'
    }
  };
};

// Meetings
app.post('/api/meetings/upload', upload.single('audio'), asyncHandler(async (req, res) => {
  const { clientId } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  try {
    // Call transcription microservice
    const response = await axios.post(`${MICROSERVICES.transcriber}/transcribe`, {
      audio_path: req.file.path,
      client_id: clientId
    });

    const meeting = {
      id: uuidv4(),
      client_id: clientId,
      title: 'Uploaded Meeting',
      date: new Date().toISOString().split('T')[0],
      duration: '60 min',
      participants: ['Various'],
      transcript_url: response.data.transcript_url,
      status: 'completed'
    };

    // Store meeting in database
    db.run(
      `INSERT INTO meetings (id, client_id, title, date, duration, participants, transcript_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [meeting.id, meeting.client_id, meeting.title, meeting.date, meeting.duration,
       JSON.stringify(meeting.participants), meeting.transcript_url, meeting.status],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(meeting);
      }
    );
  } catch (error) {
    console.error('Transcription error:', error);

    // Return mock meeting data
    const mockMeeting = {
      id: uuidv4(),
      client_id: clientId,
      title: 'Uploaded Meeting',
      date: new Date().toISOString().split('T')[0],
      duration: '60 min',
      participants: ['John Smith', 'Sarah Johnson'],
      status: 'completed'
    };

    res.status(201).json(mockMeeting);
  }
}));

app.get('/api/meetings/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  db.all('SELECT * FROM meetings WHERE client_id = ? ORDER BY date DESC', [clientId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Return mock data if no meetings found
    if (rows.length === 0) {
      const mockMeetings = [
        {
          id: 'meeting-1',
          client_id: clientId,
          title: 'Initial Discovery Call',
          date: '2024-01-15',
          duration: '45 min',
          participants: JSON.stringify(['John Smith (CEO)', 'Sarah Johnson (CTO)']),
          status: 'completed'
        },
        {
          id: 'meeting-2',
          client_id: clientId,
          title: 'Technical Requirements Review',
          date: '2024-01-22',
          duration: '60 min',
          participants: JSON.stringify(['Sarah Johnson (CTO)', 'Mike Chen (Lead Developer)']),
          status: 'completed'
        }
      ];
      res.json(mockMeetings);
    } else {
      res.json(rows);
    }
  });
}));

app.get('/api/meetings/:meetingId/transcript', asyncHandler(async (req, res) => {
  const { meetingId } = req.params;

  // Return mock transcript data
  const mockTranscript = {
    segments: [
      {
        speaker: 'client',
        text: 'We\'re looking for a comprehensive solution that can help us streamline our operations.',
        timestamp: '00:00:30'
      },
      {
        speaker: 'val',
        text: 'I understand. Can you tell me more about your current operational challenges?',
        timestamp: '00:00:45'
      },
      {
        speaker: 'client',
        text: 'Our main issues are around data silos and inefficient communication between departments.',
        timestamp: '00:01:15'
      },
      {
        speaker: 'val',
        text: 'Thank you for sharing that. Based on what you\'ve described, I believe we have several solutions that could help.',
        timestamp: '00:01:30'
      }
    ],
    summary: 'Client expressed interest in operational efficiency solutions, mentioned data silos and communication issues as primary pain points.'
  };

  res.json(mockTranscript);
}));

// Chat/RAG
app.post('/api/chat', asyncHandler(async (req, res) => {
  const { clientId, message } = req.body;

  try {
    console.log(`Chat request for client ${clientId}: ${message}`);

    // Try vector service for semantic search first
    let searchResults = [];
    try {
      searchResults = await vectorService.semanticSearch(clientId, message, 5);
      console.log(`Found ${searchResults.length} vector search results`);
    } catch (vectorError) {
      console.log('Vector search failed, using mock data:', vectorError.message);
    }

    // If we have vector search results, use them
    if (searchResults.length > 0) {
      // Combine relevant content for context
      const context = searchResults.slice(0, 3).map(result =>
        `[${result.type}: ${result.source}] ${result.content}`
      ).join('\n\n');

      // Generate response using context (in a real implementation, you'd use an LLM here)
      const response = generateResponseFromContext(message, searchResults);

      const sources = searchResults.slice(0, 5).map(result => ({
        type: result.type,
        name: result.source,
        similarity: result.similarity
      }));

      res.json({
        id: uuidv4(),
        message: response,
        sources: sources
      });
    } else {
      // Use mock data as fallback
      console.log('Using mock data for response');
      const mockResults = findRelevantContent(message, clientId, 5);
      const response = generateResponse(message, mockResults, clientId);

      const sources = mockResults.slice(0, 5).map(result => ({
        type: result.type,
        name: result.source,
        similarity: result.similarity
      }));

      res.json({
        id: uuidv4(),
        message: response,
        sources: sources
      });
    }
  } catch (error) {
    console.error('Chat error:', error);

    // Ultimate fallback to generic response
    res.json({
      id: uuidv4(),
      message: 'I apologize, but I encountered an error processing your request. Please try again.',
      sources: []
    });
  }
}));

// Helper function to generate response from context
function generateResponseFromContext(query, searchResults) {
  const topResults = searchResults.slice(0, 3);

  // Simple response generation based on query type and results
  if (query.toLowerCase().includes('meeting') || query.toLowerCase().includes('discuss')) {
    const meetingResults = topResults.filter(r => r.type === 'meeting');
    if (meetingResults.length > 0) {
      return `Based on meeting records, ${meetingResults[0].content.substring(0, 200)}...`;
    }
  }

  if (query.toLowerCase().includes('task') || query.toLowerCase().includes('pending')) {
    const taskResults = topResults.filter(r => r.type === 'task');
    if (taskResults.length > 0) {
      return `Regarding tasks, ${taskResults[0].content.substring(0, 200)}...`;
    }
  }

  if (query.toLowerCase().includes('research') || query.toLowerCase().includes('company')) {
    const researchResults = topResults.filter(r => r.type === 'research');
    if (researchResults.length > 0) {
      return `According to research data, ${researchResults[0].content.substring(0, 200)}...`;
    }
  }

  // Default response using top result
  if (topResults.length > 0) {
    return `Based on available information, ${topResults[0].content.substring(0, 200)}...`;
  }

  return `I found some relevant information in the ${topResults[0]?.type || 'documents'} that might help with your question about "${query}".`;
}

// Helper function for fallback responses
function getFallbackResponse(clientId, message) {
  const mockResponses = [
    'Based on our previous meetings, they mentioned being interested in streamlining their operations. The main challenges they discussed were data silos and inter-departmental communication.',
    'According to the research data, this is a technology company focused on innovative software solutions for enterprise clients.',
    'In our last technical review, we discussed the requirements for their new platform implementation.',
    'There are several pending tasks that need attention, with project proposal preparation being the highest priority.',
    'The client has expressed satisfaction with our progress and is looking forward to the next phase of implementation.'
  ];

  const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

  return {
    message: randomResponse,
    sources: [
      { type: 'meeting', name: 'Requirements Review' },
      { type: 'research', name: 'Company Overview' },
      { type: 'task', name: 'Project Tasks' }
    ]
  };
}

// Tasks
app.get('/api/tasks/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  db.all('SELECT * FROM tasks WHERE client_id = ? ORDER BY created_at DESC', [clientId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
}));

app.post('/api/tasks', asyncHandler(async (req, res) => {
  const { clientId, title, description, assignee, dueDate, priority, reminder } = req.body;
  const id = uuidv4();

  db.run(
    `INSERT INTO tasks (id, client_id, title, description, assignee, due_date, priority, reminder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, clientId, title, description, assignee, dueDate, priority, reminder ? 1 : 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id,
        client_id: clientId,
        title,
        description,
        assignee,
        due_date: dueDate,
        priority,
        status: 'pending',
        reminder: reminder ? 1 : 0
      });
    }
  );
}));

app.put('/api/tasks/:taskId', asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const updates = req.body;

  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);

  db.run(
    `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...values, taskId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'Task updated successfully' });
    }
  );
}));

app.delete('/api/tasks/:taskId', asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  db.run('DELETE FROM tasks WHERE id = ?', [taskId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  });
}));

// Dashboard
app.get('/api/dashboard/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  // Get statistics from database
  db.get(
    'SELECT COUNT(*) as total_meetings FROM meetings WHERE client_id = ?',
    [clientId],
    (err, meetingRow) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get(
        'SELECT COUNT(*) as completed_tasks FROM tasks WHERE client_id = ? AND status = "completed"',
        [clientId],
        (err, completedRow) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          db.get(
            'SELECT COUNT(*) as pending_tasks FROM tasks WHERE client_id = ? AND status = "pending"',
            [clientId],
            (err, pendingRow) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              const dashboardData = {
                kpis: {
                  totalMeetings: meetingRow.total_meetings || 12,
                  completedTasks: completedRow.completed_tasks || 8,
                  pendingTasks: pendingRow.pending_tasks || 5,
                  totalInteractions: 45,
                  interactionRate: 78,
                  clientSatisfaction: 4.5
                },
                meetingTrend: [
                  { date: '2024-01-01', meetings: 2, interactions: 8 },
                  { date: '2024-01-08', meetings: 3, interactions: 12 },
                  { date: '2024-01-15', meetings: 1, interactions: 6 },
                  { date: '2024-01-22', meetings: 4, interactions: 15 },
                  { date: '2024-01-29', meetings: 2, interactions: 9 }
                ],
                taskCompletion: [
                  { name: 'Completed', value: completedRow.completed_tasks || 8, color: '#10b981' },
                  { name: 'In Progress', value: 3, color: '#f59e0b' },
                  { name: 'Pending', value: pendingRow.pending_tasks || 5, color: '#6b7280' },
                  { name: 'Overdue', value: 1, color: '#ef4444' }
                ],
                topTopics: [
                  { topic: 'Technical Requirements', count: 12 },
                  { topic: 'Project Timeline', count: 8 },
                  { topic: 'Budget Discussion', count: 6 },
                  { topic: 'Team Structure', count: 4 },
                  { topic: 'Risk Assessment', count: 3 }
                ]
              };

              res.json(dashboardData);
            }
          );
        }
      );
    }
  );
}));

// Documents
app.get('/api/documents/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  db.all(
    'SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC',
    [clientId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Return mock data if no documents found
      if (rows.length === 0) {
        const mockDocuments = [
          {
            id: 'doc-1',
            client_id: clientId,
            title: 'Project Proposal Draft',
            type: 'proposal',
            file_name: 'project_proposal_v2.pdf',
            file_size: 2516582,
            file_path: '/uploads/documents/project_proposal_v2.pdf',
            uploaded_by: 'John Consultant',
            uploaded_at: '2024-01-15T10:30:00Z',
            notes: 'Initial proposal draft for Phase 1 implementation'
          },
          {
            id: 'doc-2',
            client_id: clientId,
            title: 'Meeting Notes - Discovery Call',
            type: 'meeting_notes',
            file_name: 'discovery_call_notes.docx',
            file_size: 159744,
            file_path: '/uploads/documents/discovery_call_notes.docx',
            uploaded_by: 'John Consultant',
            uploaded_at: '2024-01-12T14:15:00Z',
            notes: 'Key points from initial client discovery call'
          }
        ];
        res.json(mockDocuments);
      } else {
        res.json(rows);
      }
    }
  );
}));

app.post('/api/documents/upload', upload.single('document'), asyncHandler(async (req, res) => {
  const { clientId, title, notes, uploadedBy } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const document = {
      id: uuidv4(),
      client_id: clientId,
      title: title,
      type: req.file.mimetype.split('/')[0] || 'document',
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_path: req.file.path,
      uploaded_by: uploadedBy || 'John Consultant',
      uploaded_at: new Date().toISOString(),
      notes: notes || ''
    };

    // Store document in database
    db.run(
      `INSERT INTO documents (id, client_id, title, type, file_name, file_size, file_path, uploaded_by, uploaded_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document.id,
        document.client_id,
        document.title,
        document.type,
        document.file_name,
        document.file_size,
        document.file_path,
        document.uploaded_by,
        document.uploaded_at,
        document.notes
      ],
      async function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Process document for vector storage in background
        try {
          console.log(`Processing document for vector storage: ${document.file_name}`);

          await vectorService.processDocument(
            clientId,
            document.id,
            req.file.path,
            req.file.mimetype,
            {
              filename: document.file_name,
              title: document.title,
              uploadedBy: document.uploaded_by,
              uploadedAt: document.uploaded_at,
              notes: document.notes
            }
          );

          console.log(`Document processed successfully for vector storage: ${document.file_name}`);
        } catch (vectorError) {
          console.error('Error processing document for vector storage:', vectorError.message);
          // Don't fail the upload if vector processing fails - document is still saved
          console.log(`Document uploaded successfully but vector processing failed for: ${document.file_name}`);
        }

        res.status(201).json(document);
      }
    );
  } catch (error) {
    console.error('Document upload error:', error);

    // Return mock document for demo
    const mockDocument = {
      id: uuidv4(),
      client_id: clientId,
      title: title,
      type: 'document',
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_path: req.file.path,
      uploaded_by: uploadedBy || 'John Consultant',
      uploaded_at: new Date().toISOString(),
      notes: notes || ''
    };
    res.status(201).json(mockDocument);
  }
}));

app.get('/api/documents/:documentId/download', asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  // In a real implementation, you would fetch the file from storage
  // For demo, we'll just return a mock response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="document.pdf"`);
  res.send('Mock document content');
}));

app.delete('/api/documents/:documentId', asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  db.run('DELETE FROM documents WHERE id = ?', [documentId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Document deleted successfully' });
  });
}));

// Notes
app.get('/api/notes/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  db.all(
    'SELECT * FROM notes WHERE client_id = ? ORDER BY created_at DESC',
    [clientId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Return mock data if no notes found
      if (rows.length === 0) {
        const mockNotes = [
          {
            id: 'note-1',
            client_id: clientId,
            content: 'Client expressed concerns about timeline for Q2 deliverables. Need to follow up with revised project plan.',
            created_by: 'John Consultant',
            created_at: '2024-01-16T09:15:00Z'
          },
          {
            id: 'note-2',
            client_id: clientId,
            content: 'Key decision point: Client prefers monthly billing over quarterly. Update contract accordingly.',
            created_by: 'John Consultant',
            created_at: '2024-01-14T16:30:00Z'
          }
        ];
        res.json(mockNotes);
      } else {
        res.json(rows);
      }
    }
  );
}));

app.post('/api/notes', asyncHandler(async (req, res) => {
  const { clientId, content, createdBy } = req.body;
  const id = uuidv4();

  db.run(
    `INSERT INTO notes (id, client_id, content, created_by, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, clientId, content, createdBy || 'John Consultant', new Date().toISOString()],
    async function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const noteData = {
        id,
        client_id: clientId,
        content,
        created_by: createdBy || 'John Consultant',
        created_at: new Date().toISOString()
      };

      // Store note in vector storage in background
      try {
        console.log(`Processing note for vector storage: ${id}`);

        const embedding = await vectorService.generateEmbedding(content);

        await vectorService.storeNote({
          clientId,
          noteId: id,
          content,
          metadata: {
            createdBy: createdBy || 'John Consultant',
            createdAt: noteData.created_at,
            noteType: 'user_note'
          },
          embedding
        });

        console.log(`Note processed successfully for vector storage: ${id}`);
      } catch (vectorError) {
        console.error('Error processing note for vector storage:', vectorError);
        // Don't fail the note creation if vector processing fails
      }

      res.status(201).json(noteData);
    }
  );
}));

app.delete('/api/notes/:noteId', asyncHandler(async (req, res) => {
  const { noteId } = req.params;

  db.run('DELETE FROM notes WHERE id = ?', [noteId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Note deleted successfully' });
  });
}));

// Vector Migration - Process existing data for vector storage
app.post('/api/migrate-to-vector/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  try {
    console.log(`Starting vector migration for client: ${clientId}`);
    let migrationStats = {
      documents: 0,
      notes: 0,
      tasks: 0,
      meetings: 0,
      research: 0,
      errors: []
    };

    // Migrate existing documents
    db.all('SELECT * FROM documents WHERE client_id = ?', [clientId], async (err, documents) => {
      if (err) {
        console.error('Error fetching documents for migration:', err);
        migrationStats.errors.push('Failed to fetch documents');
      } else {
        for (const doc of documents) {
          try {
            if (doc.file_path && fs.existsSync(doc.file_path)) {
              await vectorService.processDocument(
                clientId,
                doc.id,
                doc.file_path,
                'application/pdf', // Default to PDF, could be improved with stored mime type
                {
                  filename: doc.file_name,
                  title: doc.title,
                  uploadedBy: doc.uploaded_by,
                  uploadedAt: doc.uploaded_at,
                  notes: doc.notes
                }
              );
              migrationStats.documents++;
            }
          } catch (error) {
            console.error(`Error migrating document ${doc.id}:`, error);
            migrationStats.errors.push(`Document ${doc.id}: ${error.message}`);
          }
        }
      }

      // Migrate existing notes
      db.all('SELECT * FROM notes WHERE client_id = ?', [clientId], async (err, notes) => {
        if (err) {
          console.error('Error fetching notes for migration:', err);
          migrationStats.errors.push('Failed to fetch notes');
        } else {
          for (const note of notes) {
            try {
              const embedding = await vectorService.generateEmbedding(note.content);
              await vectorService.storeNote({
                clientId,
                noteId: note.id,
                content: note.content,
                metadata: {
                  createdBy: note.created_by,
                  createdAt: note.created_at,
                  noteType: 'migrated_note'
                },
                embedding
              });
              migrationStats.notes++;
            } catch (error) {
              console.error(`Error migrating note ${note.id}:`, error);
              migrationStats.errors.push(`Note ${note.id}: ${error.message}`);
            }
          }
        }

        // Migrate existing tasks
        db.all('SELECT * FROM tasks WHERE client_id = ?', [clientId], async (err, tasks) => {
          if (err) {
            console.error('Error fetching tasks for migration:', err);
            migrationStats.errors.push('Failed to fetch tasks');
          } else {
            for (const task of tasks) {
              try {
                const taskContent = `${task.title}. ${task.description || ''} Status: ${task.status}. Priority: ${task.priority}. Assignee: ${task.assignee || 'Unassigned'}. Due date: ${task.due_date || 'Not set'}.`;
                const embedding = await vectorService.generateEmbedding(taskContent);
                await vectorService.storeTask({
                  clientId,
                  taskId: task.id,
                  content: taskContent,
                  metadata: {
                    title: task.title,
                    status: task.status,
                    priority: task.priority,
                    assignee: task.assignee,
                    dueDate: task.due_date,
                    createdAt: task.created_at,
                    updatedAt: task.updated_at,
                    taskType: 'migrated_task'
                  },
                  embedding
                });
                migrationStats.tasks++;
              } catch (error) {
                console.error(`Error migrating task ${task.id}:`, error);
                migrationStats.errors.push(`Task ${task.id}: ${error.message}`);
              }
            }
          }

          // Migrate existing research data
          db.all('SELECT * FROM research_data WHERE client_id = ?', [clientId], async (err, researchData) => {
            if (err) {
              console.error('Error fetching research data for migration:', err);
              migrationStats.errors.push('Failed to fetch research data');
            } else {
              for (const research of researchData) {
                try {
                  let content = '';
                  if (typeof research.content === 'string') {
                    try {
                      const parsedContent = JSON.parse(research.content);
                      content = JSON.stringify(parsedContent);
                    } catch {
                      content = research.content;
                    }
                  } else {
                    content = JSON.stringify(research.content);
                  }

                  const embedding = await vectorService.generateEmbedding(content);
                  await vectorService.storeResearchData({
                    clientId,
                    source: research.source,
                    content: content,
                    metadata: {
                      dataType: research.data_type,
                      createdAt: research.created_at,
                      sourceType: 'migrated_research'
                    },
                    embedding
                  });
                  migrationStats.research++;
                } catch (error) {
                  console.error(`Error migrating research ${research.id}:`, error);
                  migrationStats.errors.push(`Research ${research.id}: ${error.message}`);
                }
              }
            }

          console.log(`Vector migration completed for client ${clientId}:`, migrationStats);
          res.json({
            success: true,
            message: 'Vector migration completed',
            stats: migrationStats
          });
        });
      });
    });
  });
} catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Authentication (placeholder)
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Mock authentication
  if (email && password) {
    res.json({
      success: true,
      token: 'mock-jwt-token',
      user: {
        id: 'user-1',
        email,
        name: 'John Consultant',
        role: 'consultant'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}));

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized successfully');

    initializeSampleData();
    console.log('Sample data loaded');

    app.listen(PORT, () => {
      console.log(`VAL Orchestrator service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
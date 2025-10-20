import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('val_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  // Client Management
  async getClients() {
    const response = await this.client.get('/api/clients');
    return response.data;
  }

  async createClient(clientData) {
    const response = await this.client.post('/api/clients', clientData);
    return response.data;
  }

  async updateClient(clientId, clientData) {
    const response = await this.client.put(`/api/clients/${clientId}`, clientData);
    return response.data;
  }

  async deleteClient(clientId) {
    const response = await this.client.delete(`/api/clients/${clientId}`);
    return response.data;
  }

  // Research/Scraping
  async scrapeClientData(clientId, sources) {
    const response = await this.client.post(`/api/scrape/${clientId}`, { sources });
    return response.data;
  }

  async getResearchData(clientId) {
    const response = await this.client.get(`/api/research/${clientId}`);
    return response.data;
  }

  // Meetings
  async uploadMeetingAudio(clientId, audioFile) {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('clientId', clientId);

    const response = await this.client.post('/api/meetings/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getMeetings(clientId) {
    const response = await this.client.get(`/api/meetings/${clientId}`);
    return response.data;
  }

  async getTranscript(meetingId) {
    const response = await this.client.get(`/api/meetings/${meetingId}/transcript`);
    return response.data;
  }

  // Chat/RAG
  async sendChatMessage(clientId, message) {
    const response = await this.client.post('/api/chat', {
      clientId,
      message,
    });
    return response.data;
  }

  // Tasks
  async getTasks(clientId) {
    const response = await this.client.get(`/api/tasks/${clientId}`);
    return response.data;
  }

  async createTask(taskData) {
    const response = await this.client.post('/api/tasks', taskData);
    return response.data;
  }

  async updateTask(taskId, updates) {
    const response = await this.client.put(`/api/tasks/${taskId}`, updates);
    return response.data;
  }

  async deleteTask(taskId) {
    const response = await this.client.delete(`/api/tasks/${taskId}`);
    return response.data;
  }

  // Dashboard
  async getDashboardData(clientId) {
    const response = await this.client.get(`/api/dashboard/${clientId}`);
    return response.data;
  }

  // Documents
  async getDocuments(clientId) {
    const response = await this.client.get(`/api/documents/${clientId}`);
    return response.data;
  }

  async getNotes(clientId) {
    const response = await this.client.get(`/api/notes/${clientId}`);
    return response.data;
  }

  async uploadDocument(formData) {
    const response = await this.client.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async downloadDocument(documentId) {
    const response = await this.client.get(`/api/documents/${documentId}/download`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // Get filename from response headers or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'document';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) filename = filenameMatch[1];
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async deleteDocument(documentId) {
    const response = await this.client.delete(`/api/documents/${documentId}`);
    return response.data;
  }

  // Notes
  async createNote(noteData) {
    const response = await this.client.post('/api/notes', noteData);
    return response.data;
  }

  async deleteNote(noteId) {
    const response = await this.client.delete(`/api/notes/${noteId}`);
    return response.data;
  }

  // Authentication
  async login(credentials) {
    const response = await this.client.post('/api/auth/login', credentials);
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/api/auth/logout');
    return response.data;
  }
}

export const apiClient = new ApiClient();
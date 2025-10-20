import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Brain, Users, MessageSquare, CheckSquare, BarChart3, Settings, Plus, X, FileText, Minimize2, Maximize2 } from 'lucide-react';
import ResearchTab from './components/ResearchTab';
import MeetingsTab from './components/MeetingsTab';
import ChatTab from './components/ChatTab';
import TasksTab from './components/TasksTab';
import DashboardTab from './components/DashboardTab';
import DocumentsTab from './components/DocumentsTab';
import SettingsTab from './components/SettingsTab';
import { apiClient } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentClient, setCurrentClient] = useState(null);
  const [clientsList, setClientsList] = useState([]);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    industry: '',
    website: '',
    key_contact_name: '',
    key_contact_linkedin: ''
  });
  const userRole = 'consultant'; // Always consultant role

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'research', name: 'Research', icon: Brain },
    { id: 'meetings', name: 'Meetings', icon: Users },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare },
    { id: 'documents', name: 'Documents', icon: FileText },
  ];

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const clients = await apiClient.getClients();
      console.log('Loaded clients:', clients);
      setClientsList(clients);

      // Set first client as current if none selected
      if (clients.length > 0 && !currentClient) {
        setCurrentClient(clients[0]);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
      // Fallback to sample clients
      const sampleClients = [
        { id: 'acme-corp', name: 'Acme Corporation', industry: 'Technology' },
        { id: 'global-tech', name: 'Global Tech Solutions', industry: 'Software' },
        { id: 'innovate-labs', name: 'Innovate Labs', industry: 'AI/ML' },
      ];
      setClientsList(sampleClients);
      if (!currentClient && sampleClients.length > 0) {
        setCurrentClient(sampleClients[0]);
      }
    }
  };

  const handleClientSelect = (client) => {
    setCurrentClient(client);
  };

  const handleCreateClient = async () => {
    if (!newClientForm.name.trim()) {
      return;
    }

    try {
      const newClient = await apiClient.createClient({
        name: newClientForm.name,
        industry: newClientForm.industry || 'Technology',
        website: newClientForm.website,
        key_contact_name: newClientForm.key_contact_name,
        key_contact_linkedin: newClientForm.key_contact_linkedin,
        status: 'active'
      });

      setClientsList(prev => [...prev, newClient]);
      setCurrentClient(newClient);
      setShowNewClientModal(false);
      setNewClientForm({
        name: '',
        industry: '',
        website: '',
        key_contact_name: '',
        key_contact_linkedin: ''
      });
    } catch (error) {
      console.error('Failed to create client:', error);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                {/* VAL Logo */}
                <img
                  src={require('./assets/val-logo.png')}
                  alt="VAL - Virtual AI Consultant"
                  className="h-10 w-auto"
                />

                {/* Client Selection Dropdown */}
                <div className="ml-8 flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Current Client:</span>
                  <div className="flex items-center space-x-1">
                    <select
                      value={currentClient?.id || ''}
                      onChange={(e) => {
                        const selected = clientsList.find(c => c.id === e.target.value);
                        if (selected) handleClientSelect(selected);
                      }}
                      className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                    >
                      {clientsList.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowNewClientModal(true)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-md border border-primary-300 hover:border-primary-400 transition-colors"
                      title="Add New Client"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setActiveTab('settings')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  title="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
                <span className="px-3 py-1 text-xs font-medium text-white bg-primary-600 rounded">
                  Consultant
                </span>
                <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">C</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  >
                    <Icon
                      className={`${
                        activeTab === tab.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                      } -ml-0.5 mr-2 h-5 w-5`}
                      aria-hidden="true"
                    />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {activeTab === 'research' && (
              <ResearchTab
                client={currentClient}
                userRole={userRole}
              />
            )}
            {activeTab === 'meetings' && (
              <MeetingsTab client={currentClient} userRole={userRole} />
            )}
            {activeTab === 'tasks' && (
              <TasksTab client={currentClient} userRole={userRole} />
            )}
            {activeTab === 'documents' && (
              <DocumentsTab client={currentClient} userRole={userRole} />
            )}
            {activeTab === 'dashboard' && (
              <DashboardTab client={currentClient} userRole={userRole} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab userRole={userRole} />
            )}
          </div>
        </main>

        {/* Bottom Chat Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-900">
                  Chat with Val
                </span>
                {showChatPopup && !isChatMinimized && (
                  <span className="text-xs text-gray-500">
                    - {currentClient?.name || 'selected client'} data source
                  </span>
                )}
                <div className="hidden md:flex items-center space-x-3 text-xs text-gray-500">
                  <span className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer" title="Upload documents or images for AI analysis">
                    📎 <span className="hidden lg:inline ml-1">File</span>
                  </span>
                  <span className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer" title="Search previous chat conversations with this client">
                    🔍 <span className="hidden lg:inline ml-1">Search</span>
                  </span>
                  <span className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer" title="Generate AI summary of conversations and key insights">
                    📊 <span className="hidden lg:inline ml-1">Summary</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!showChatPopup ? (
                  <button
                    onClick={() => {
                      setShowChatPopup(true);
                      setIsChatMinimized(false);
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Open Chat
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsChatMinimized(!isChatMinimized)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                      title={isChatMinimized ? "Expand" : "Minimize"}
                    >
                      {isChatMinimized ? (
                        <Maximize2 className="h-4 w-4" />
                      ) : (
                        <Minimize2 className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowChatPopup(false);
                        setIsChatMinimized(false);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                      title="Close Chat"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Popup */}
        {showChatPopup && (
          <div className={`fixed bottom-20 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 transition-all duration-300 ${
            isChatMinimized ? 'w-80 h-12' : 'w-96 h-[500px]'
          }`}>
            {!isChatMinimized && (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 rounded-t-lg bg-primary-600 text-white">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <h3 className="font-medium">AI Assistant</h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setIsChatMinimized(true)}
                      className="p-1 text-white hover:bg-primary-700 rounded transition-colors"
                      title="Minimize"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setShowChatPopup(false);
                        setIsChatMinimized(false);
                      }}
                      className="p-1 text-white hover:bg-primary-700 rounded transition-colors"
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Chat Content */}
                <div className="h-[380px] overflow-hidden">
                  <ChatTab
                    client={currentClient}
                    userRole={userRole}
                    isPopup={true}
                  />
                </div>
              </>
            )}

            {/* Minimized State */}
            {isChatMinimized && (
              <div className="flex items-center justify-between p-3 bg-primary-600 text-white rounded-lg">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm font-medium">AI Assistant</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsChatMinimized(false)}
                    className="p-1 text-white hover:bg-primary-700 rounded transition-colors"
                    title="Expand"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowChatPopup(false);
                      setIsChatMinimized(false);
                    }}
                    className="p-1 text-white hover:bg-primary-700 rounded transition-colors"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add padding to main content to avoid overlap with bottom bar */}
        <style jsx>{`
          main {
            padding-bottom: 4rem;
          }
        `}</style>

        {/* New Client Modal */}
        {showNewClientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Client</h3>
                <button
                  onClick={() => setShowNewClientModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={newClientForm.name}
                    onChange={(e) => setNewClientForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter client name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={newClientForm.industry}
                    onChange={(e) => setNewClientForm(prev => ({ ...prev, industry: e.target.value }))}
                    placeholder="e.g., Technology, Healthcare, Finance"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={newClientForm.website}
                    onChange={(e) => setNewClientForm(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Key Contact Information */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Key Client Contact</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={newClientForm.key_contact_name}
                        onChange={(e) => setNewClientForm(prev => ({ ...prev, key_contact_name: e.target.value }))}
                        placeholder="John Smith"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        LinkedIn Profile
                      </label>
                      <input
                        type="url"
                        value={newClientForm.key_contact_linkedin}
                        onChange={(e) => setNewClientForm(prev => ({ ...prev, key_contact_linkedin: e.target.value }))}
                        placeholder="https://linkedin.com/in/johnsmith"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewClientModal(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateClient}
                    disabled={!newClientForm.name.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Client
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;
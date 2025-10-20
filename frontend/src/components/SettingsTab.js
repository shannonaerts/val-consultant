import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Database, Globe, Key, LogOut, Save, Building, Edit, Trash2, Plus, X } from 'lucide-react';
import { apiClient } from '../services/api';

const SettingsTab = ({ userRole }) => {
  const [activeSection, setActiveSection] = useState('clients');
  const [clients, setClients] = useState([]);
  const [editingClient, setEditingClient] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    industry: '',
    website: '',
    key_contact_name: '',
    key_contact_linkedin: ''
  });
  const [settings, setSettings] = useState({
    // Profile Settings
    profile: {
      name: 'John Consultant',
      email: 'john@gemsquash.com',
      role: userRole,
      timezone: 'UTC-5 (Eastern)',
      language: 'English'
    },
    // Notification Settings
    notifications: {
      emailNotifications: true,
      taskReminders: true,
      meetingAlerts: true,
      weeklyReports: false,
      clientUpdates: true
    },
    // API Settings
    api: {
      openaiKey: 'sk-••••••••••••••••••••••••••••••••',
      whisperKey: 'sk-••••••••••••••••••••••••••••••••',
      scrapingEnabled: true,
      transcriptionEnabled: true,
      vectorStore: 'chroma'
    },
    // System Settings
    system: {
      dataRetention: '365',
      backupFrequency: 'weekly',
      logLevel: 'info',
      maintenanceMode: false
    }
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const clientsData = await apiClient.getClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Failed to load clients:', error);
      // Fallback to sample clients
      setClients([
        { id: 'acme-corp', name: 'Acme Corporation', industry: 'Technology' },
        { id: 'global-tech', name: 'Global Tech Solutions', industry: 'Software' },
      ]);
    }
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setEditForm({
      name: client.name,
      industry: client.industry || '',
      website: client.website || '',
      key_contact_name: client.key_contact_name || '',
      key_contact_linkedin: client.key_contact_linkedin || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateClient = async () => {
    if (!editingClient || !editForm.name.trim()) return;

    try {
      await apiClient.updateClient(editingClient.id, {
        name: editForm.name,
        industry: editForm.industry,
        website: editForm.website,
        key_contact_name: editForm.key_contact_name,
        key_contact_linkedin: editForm.key_contact_linkedin
      });

      setClients(prev => prev.map(client =>
        client.id === editingClient.id
          ? { ...client, ...editForm }
          : client
      ));

      setShowEditModal(false);
      setEditingClient(null);
      setEditForm({
        name: '',
        industry: '',
        website: '',
        key_contact_name: '',
        key_contact_linkedin: ''
      });
    } catch (error) {
      console.error('Failed to update client:', error);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.deleteClient(clientId);
      setClients(prev => prev.filter(client => client.id !== clientId));
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const sections = [
    { id: 'clients', name: 'Clients', icon: Building },
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'api', name: 'API Configuration', icon: Key },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'system', name: 'System', icon: Database },
  ];

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    // Save settings to backend
    console.log('Saving settings:', settings);
    // Show success message
  };

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={settings.profile.name}
            onChange={(e) => handleSettingChange('profile', 'name', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={settings.profile.email}
            onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <input
            type="text"
            value="Consultant"
            readOnly
            className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={settings.profile.timezone}
            onChange={(e) => handleSettingChange('profile', 'timezone', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="UTC-8 (Pacific)">UTC-8 (Pacific)</option>
            <option value="UTC-5 (Eastern)">UTC-5 (Eastern)</option>
            <option value="UTC+0 (GMT)">UTC+0 (GMT)</option>
            <option value="UTC+1 (CET)">UTC+1 (CET)</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Password</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientsSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Client Management</h3>
        <span className="text-sm text-gray-500">{clients.length} total clients</span>
      </div>

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Industry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Key Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {client.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      <div className="text-sm text-gray-500">
                        {client.website ? (
                          <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-900">
                            Visit Website
                          </a>
                        ) : (
                          'No website'
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    {client.industry || 'Not specified'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {client.key_contact_name || 'No contact specified'}
                  {client.key_contact_linkedin && (
                    <div className="mt-1">
                      <a
                        href={client.key_contact_linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900 text-xs"
                      >
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    {client.status || 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleEditClient(client)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit client"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete client"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                  No clients found. Create your first client to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Edit Client
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
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
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={editForm.industry}
                  onChange={(e) => setEditForm(prev => ({ ...prev, industry: e.target.value }))}
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
                  value={editForm.website}
                  onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Contact Name
                </label>
                <input
                  type="text"
                  value={editForm.key_contact_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, key_contact_name: e.target.value }))}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  value={editForm.key_contact_linkedin}
                  onChange={(e) => setEditForm(prev => ({ ...prev, key_contact_linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/in/johnsmith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateClient}
                disabled={!editForm.name.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-4">
      {Object.entries(settings.notifications).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </label>
            <p className="text-sm text-gray-500">
              {key === 'emailNotifications' && 'Receive email notifications for important updates'}
              {key === 'taskReminders' && 'Get reminded about upcoming task deadlines'}
              {key === 'meetingAlerts' && 'Receive alerts for scheduled meetings'}
              {key === 'weeklyReports' && 'Get weekly summary reports'}
              {key === 'clientUpdates' && 'Notifications for client activity updates'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </div>
      ))}
    </div>
  );

  const renderAPISettings = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-4">External API Keys</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key
            </label>
            <div className="flex space-x-2">
              <input
                type="password"
                value={settings.api.openaiKey}
                onChange={(e) => handleSettingChange('api', 'openaiKey', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                Test
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Whisper API Key
            </label>
            <div className="flex space-x-2">
              <input
                type="password"
                value={settings.api.whisperKey}
                onChange={(e) => handleSettingChange('api', 'whisperKey', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                Test
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Service Configuration</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Web Scraping</label>
              <p className="text-sm text-gray-500">Enable automatic data scraping from client websites</p>
            </div>
            <input
              type="checkbox"
              checked={settings.api.scrapingEnabled}
              onChange={(e) => handleSettingChange('api', 'scrapingEnabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Audio Transcription</label>
              <p className="text-sm text-gray-500">Enable meeting audio transcription</p>
            </div>
            <input
              type="checkbox"
              checked={settings.api.transcriptionEnabled}
              onChange={(e) => handleSettingChange('api', 'transcriptionEnabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vector Store Provider
            </label>
            <select
              value={settings.api.vectorStore}
              onChange={(e) => handleSettingChange('api', 'vectorStore', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="chroma">ChromaDB</option>
              <option value="faiss">FAISS</option>
              <option value="pinecone">Pinecone</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-4">Access Control</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Two-Factor Authentication</label>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
              Enable 2FA
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Session Timeout</label>
              <p className="text-sm text-gray-500">Automatically log out after period of inactivity</p>
            </div>
            <select className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500">
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="480">8 hours</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Data Privacy</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Data Encryption</label>
              <p className="text-sm text-gray-500">Encrypt sensitive data at rest and in transit</p>
            </div>
            <input
              type="checkbox"
              defaultChecked={true}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Audit Logging</label>
              <p className="text-sm text-gray-500">Log all system access and modifications</p>
            </div>
            <input
              type="checkbox"
              defaultChecked={true}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Retention Period (days)
          </label>
          <input
            type="number"
            value={settings.system.dataRetention}
            onChange={(e) => handleSettingChange('system', 'dataRetention', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Backup Frequency
          </label>
          <select
            value={settings.system.backupFrequency}
            onChange={(e) => handleSettingChange('system', 'backupFrequency', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Log Level
          </label>
          <select
            value={settings.system.logLevel}
            onChange={(e) => handleSettingChange('system', 'logLevel', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            System Status
          </label>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-sm text-gray-600">All systems operational</span>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
            <p className="text-sm text-gray-500">Temporarily disable user access for system maintenance</p>
          </div>
          <input
            type="checkbox"
            checked={settings.system.maintenanceMode}
            onChange={(e) => handleSettingChange('system', 'maintenanceMode', e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'clients':
        return renderClientsSettings();
      case 'profile':
        return renderProfileSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'api':
        return renderAPISettings();
      case 'security':
        return renderSecuritySettings();
      case 'system':
        return renderSystemSettings();
      default:
        return renderClientsSettings();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`${
                    activeSection === section.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  <Icon className={`${
                    activeSection === section.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  } -ml-0.5 mr-2 h-5 w-5`} />
                  {section.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {renderSection()}

          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={() => console.log('Cancel settings changes')}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-3 text-left border border-gray-300 rounded-md hover:bg-gray-50">
            <Database className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Export Data</p>
              <p className="text-xs text-gray-500">Download all client data</p>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-3 text-left border border-gray-300 rounded-md hover:bg-gray-50">
            <Shield className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Security Audit</p>
              <p className="text-xs text-gray-500">Review security settings</p>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-3 text-left border border-gray-300 rounded-md hover:bg-gray-50">
            <LogOut className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Sign Out</p>
              <p className="text-xs text-gray-500">End current session</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
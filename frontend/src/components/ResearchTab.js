import React, { useState, useEffect } from 'react';
import { Search, Globe, Linkedin, FileText, Plus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../services/api';

const ResearchTab = ({ client, userRole }) => {
  const [isScraping, setIsScraping] = useState(false);
  const [researchData, setResearchData] = useState(null);
  const [selectedSources, setSelectedSources] = useState({
    website: true,
    linkedin: true,
    news: false,
  });

  useEffect(() => {
    if (client) {
      loadResearchData();
    }
  }, [client]);

  const loadResearchData = async () => {
    try {
      const data = await apiClient.getResearchData(client.id);
      setResearchData(data);
    } catch (error) {
      console.error('Failed to load research data:', error);
      // Clear research data if none exists (e.g., for newly created clients)
      setResearchData(null);
    }
  };

  const handleScrape = async () => {
    if (!client) return;

    setIsScraping(true);
    try {
      const sources = Object.keys(selectedSources).filter(key => selectedSources[key]);
      const result = await apiClient.scrapeClientData(client.id, sources);
      // Extract the actual research data from the response
      setResearchData(result.data || result);

      // Also reload research data from the research endpoint to get processed data
      setTimeout(async () => {
        try {
          const freshData = await apiClient.getResearchData(client.id);
          setResearchData(freshData);
        } catch (error) {
          console.error('Failed to reload research data:', error);
        }
      }, 1000); // Wait 1 second for backend to process and store data
    } catch (error) {
      console.error('Scraping failed:', error);
    } finally {
      setIsScraping(false);
    }
  };

  
  return (
    <div className="space-y-6">
      {/* Research Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Research Controls</h2>

        {/* Source Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Data Sources</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'website', label: 'Company Website', icon: Globe },
              { key: 'linkedin', label: 'LinkedIn Profile', icon: Linkedin },
              { key: 'news', label: 'News & Press', icon: FileText },
            ].map(({ key, label, icon: Icon }) => (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources[key]}
                  onChange={(e) => setSelectedSources(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleScrape}
            disabled={!client || isScraping}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScraping ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                Scraping...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Start Research
              </>
            )}
          </button>
        </div>
      </div>

      {/* No Research Data Message */}
      {client && !researchData && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Research Data Yet</h3>
            <p className="text-gray-600 mb-4">
              {client.name} doesn't have any research data yet. Click "Start Research" to gather information about this client.
            </p>
          </div>
        </div>
      )}

      {/* Research Results */}
      {researchData && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Research Results</h3>

          <div className="space-y-4">
            {/* Company Overview */}
            <div className="border-l-4 border-primary-500 pl-4">
              <h4 className="font-medium text-gray-900 mb-2">Company Overview</h4>
              <p className="text-gray-600">{researchData.overview || 'No overview available'}</p>
            </div>

            {/* Key Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="font-medium text-gray-900 mb-2">Key Facts</h5>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Industry: {researchData.industry || 'N/A'}</li>
                  <li>• Size: {researchData.size || 'N/A'}</li>
                  <li>• Founded: {researchData.founded || 'N/A'}</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="font-medium text-gray-900 mb-2">Recent Activity</h5>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Funding: {researchData.funding || 'N/A'}</li>
                  <li>• Recent News: {researchData.recentNews || 'N/A'}</li>
                  <li>• Key Executives: {researchData.executives || 'N/A'}</li>
                  <li>• Products: {researchData.products || 'N/A'}</li>
                </ul>
              </div>
            </div>

            {/* Data Source Status */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-gray-900 mb-3">Data Collection Status</h5>
              <div className="space-y-2">
                {Object.entries(researchData.sources || {}).map(([source, status]) => (
                  <div key={source} className="flex items-center space-x-2">
                    {status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : status === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
                    )}
                    <span className="text-sm text-gray-600 capitalize">
                      {source}: {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchTab;
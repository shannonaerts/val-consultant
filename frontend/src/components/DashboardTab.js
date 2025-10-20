import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, CheckCircle, Clock, MessageSquare, Activity, Calendar, DollarSign } from 'lucide-react';
import { apiClient } from '../services/api';

const DashboardTab = ({ client, userRole }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [timeRange, setTimeRange] = useState('30'); // 7, 30, 90 days
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (client) {
      loadDashboardData();
    }
  }, [client, timeRange]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getDashboardData(client.id);
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock data for demonstration
  const mockData = {
    kpis: {
      totalMeetings: 12,
      completedTasks: 8,
      pendingTasks: 5,
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
      { name: 'Completed', value: 8, color: '#10b981' },
      { name: 'In Progress', value: 3, color: '#f59e0b' },
      { name: 'Pending', value: 5, color: '#6b7280' },
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

  const data = dashboardData || mockData;

  const kpiCards = [
    {
      title: 'Total Meetings',
      value: data.kpis.totalMeetings,
      icon: Users,
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Completed Tasks',
      value: data.kpis.completedTasks,
      icon: CheckCircle,
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Pending Tasks',
      value: data.kpis.pendingTasks,
      icon: Clock,
      change: '-2%',
      changeType: 'positive'
    },
    {
      title: 'Interaction Rate',
      value: `${data.kpis.interactionRate}%`,
      icon: Activity,
      change: '+5%',
      changeType: 'positive'
    },
    {
      title: 'Client Satisfaction',
      value: `${data.kpis.clientSatisfaction}/5`,
      icon: MessageSquare,
      change: '+0.3',
      changeType: 'positive'
    },
    {
      title: 'Total Interactions',
      value: data.kpis.totalInteractions,
      icon: TrendingUp,
      change: '+15%',
      changeType: 'positive'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500">
              {client ? `${client.name} Performance Metrics` : 'Select a client to view dashboard'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">{kpi.value}</p>
                </div>
                <div className={`p-3 rounded-full ${
                  kpi.changeType === 'positive' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    kpi.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  kpi.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpi.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">vs last period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meeting & Interaction Trend */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Meeting & Interaction Trend</h3>
          <div className="space-y-3">
            {data.meetingTrend.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">{item.date}</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">{item.meetings} meetings</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">{item.interactions} interactions</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Status Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Task Status Distribution</h3>
          <div className="space-y-3">
            {data.taskCompletion.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Discussion Topics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Discussion Topics</h3>
          <div className="space-y-3">
            {data.topTopics.map((topic, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">{topic.topic}</span>
                <span className="text-sm font-bold text-blue-600">{topic.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              {
                icon: Users,
                title: 'Meeting completed',
                description: 'Technical Requirements Review',
                time: '2 hours ago',
                color: 'blue'
              },
              {
                icon: CheckCircle,
                title: 'Task completed',
                description: 'Prepare project proposal draft',
                time: '5 hours ago',
                color: 'green'
              },
              {
                icon: MessageSquare,
                title: 'Chat session',
                description: 'Discussed budget considerations',
                time: '1 day ago',
                color: 'purple'
              },
              {
                icon: Calendar,
                title: 'Meeting scheduled',
                description: 'Demo with stakeholders',
                time: '2 days ago',
                color: 'orange'
              }
            ].map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full bg-${activity.color}-100`}>
                    <Icon className={`h-4 w-4 text-${activity.color}-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Client Insights */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Client Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Engagement Level</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">High</p>
            <p className="text-sm text-blue-700 mt-1">
              Client shows consistent engagement across all touchpoints
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Revenue Potential</span>
            </div>
            <p className="text-2xl font-bold text-green-900">$125K</p>
            <p className="text-sm text-green-700 mt-1">
              Based on project scope and discussions
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">Risk Score</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">Low</p>
            <p className="text-sm text-purple-700 mt-1">
              Minimal risks identified in current engagement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
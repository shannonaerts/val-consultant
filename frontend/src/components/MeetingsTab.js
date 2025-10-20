import React, { useState, useRef } from 'react';
import { Upload, Play, Pause, FileText, Clock, Calendar, Mic, MicOff } from 'lucide-react';
import { apiClient } from '../services/api';

const MeetingsTab = ({ client, userRole }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !client) return;

    setIsUploading(true);
    try {
      const result = await apiClient.uploadMeetingAudio(client.id, file);
      setMeetings(prev => [result, ...prev]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMeetingSelect = async (meeting) => {
    setSelectedMeeting(meeting);
    try {
      const transcriptData = await apiClient.getTranscript(meeting.id);
      setTranscript(transcriptData);
    } catch (error) {
      console.error('Failed to load transcript:', error);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real implementation, this would start/stop audio recording
    console.log(isRecording ? 'Stopping recording' : 'Starting recording');
  };

  const mockMeetings = [
    {
      id: 'meeting-1',
      title: 'Initial Discovery Call',
      date: '2024-01-15',
      duration: '45 min',
      participants: ['John Smith (CEO)', 'Sarah Johnson (CTO)'],
      status: 'completed'
    },
    {
      id: 'meeting-2',
      title: 'Technical Requirements Review',
      date: '2024-01-22',
      duration: '60 min',
      participants: ['Sarah Johnson (CTO)', 'Mike Chen (Lead Developer)'],
      status: 'completed'
    },
    {
      id: 'meeting-3',
      title: 'Proposal Presentation',
      date: '2024-01-29',
      duration: '90 min',
      participants: ['John Smith (CEO)', 'Sarah Johnson (CTO)', 'Lisa Wang (Product Manager)'],
      status: 'completed'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Meeting Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Meeting Management</h2>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Recording Controls */}
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleRecording}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Start Recording
                  </>
                )}
              </button>

              {isRecording && (
                <div className="flex items-center space-x-2 text-red-600">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Recording...</span>
                </div>
              )}
            </div>
          </div>

          {/* File Upload */}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Audio/Video
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Meetings</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {(meetings.length > 0 ? meetings : mockMeetings).map((meeting) => (
            <div
              key={meeting.id}
              className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedMeeting?.id === meeting.id ? 'bg-primary-50' : ''
              }`}
              onClick={() => handleMeetingSelect(meeting)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-base font-medium text-gray-900">{meeting.title}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      meeting.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {meeting.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{meeting.date}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{meeting.duration}</span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      Participants: {meeting.participants.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMeetingSelect(meeting);
                    }}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    View Transcript
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transcript View */}
      {selectedMeeting && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Transcript: {selectedMeeting.title}
            </h3>
            <button
              onClick={() => setSelectedMeeting(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {transcript ? (
            <div className="space-y-4">
              {transcript.segments?.map((segment, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-600">
                        {segment.speaker === 'client' ? 'C' : 'V'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {segment.speaker === 'client' ? 'Client' : 'VAL'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {segment.timestamp}
                      </span>
                    </div>
                    <p className="text-gray-700">{segment.text}</p>
                  </div>
                </div>
              )) || (
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-600">
                    Meeting discussed project requirements, timeline, and budget considerations.
                    Client expressed interest in a phased approach with initial MVP delivery.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Transcript processing...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingsTab;
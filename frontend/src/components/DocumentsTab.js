import React, { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2, Calendar, User, Eye, Plus, X, Edit3 } from 'lucide-react';
import { apiClient } from '../services/api';

const DocumentsTab = ({ client, userRole }) => {
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentNotes, setDocumentNotes] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);

  useEffect(() => {
    if (client) {
      loadDocuments();
      loadNotes();
    }
  }, [client]);

  const loadDocuments = async () => {
    try {
      const docs = await apiClient.getDocuments(client.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      // Mock data for demo
      setDocuments([
        {
          id: 'doc-1',
          title: 'Project Proposal Draft',
          type: 'proposal',
          fileName: 'project_proposal_v2.pdf',
          fileSize: '2.4 MB',
          uploadedBy: 'John Consultant',
          uploadedAt: '2024-01-15T10:30:00Z',
          notes: 'Initial proposal draft for Phase 1 implementation'
        },
        {
          id: 'doc-2',
          title: 'Meeting Notes - Discovery Call',
          type: 'meeting_notes',
          fileName: 'discovery_call_notes.docx',
          fileSize: '156 KB',
          uploadedBy: 'John Consultant',
          uploadedAt: '2024-01-12T14:15:00Z',
          notes: 'Key points from initial client discovery call'
        },
        {
          id: 'doc-3',
          title: 'Technical Requirements',
          type: 'requirements',
          fileName: 'tech_requirements.pdf',
          fileSize: '890 KB',
          uploadedBy: 'John Consultant',
          uploadedAt: '2024-01-10T09:45:00Z',
          notes: 'Detailed technical specifications and requirements'
        }
      ]);
    }
  };

  const loadNotes = async () => {
    try {
      const notesData = await apiClient.getNotes(client.id);
      setNotes(notesData);
    } catch (error) {
      console.error('Failed to load notes:', error);
      setNotes([]);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Auto-generate title from filename if not set
      if (!documentTitle) {
        const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setDocumentTitle(title.charAt(0).toUpperCase() + title.slice(1));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentTitle.trim()) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('title', documentTitle);
      formData.append('notes', documentNotes);
      formData.append('clientId', client.id);
      formData.append('uploadedBy', 'John Consultant'); // In real app, get from user context

      const newDocument = await apiClient.uploadDocument(formData);
      setDocuments(prev => [newDocument, ...prev]);

      // Reset form
      setSelectedFile(null);
      setDocumentTitle('');
      setDocumentNotes('');
      setShowUploadModal(false);
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await apiClient.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;

    setIsSavingNote(true);
    try {
      const newNote = {
        clientId: client.id,
        content: noteContent,
        createdBy: 'John Consultant'
      };

      const savedNote = await apiClient.createNote(newNote);
      setNotes(prev => [savedNote, ...prev]);
      setNoteContent('');
      setShowNoteModal(false);
    } catch (error) {
      console.error('Failed to save note:', error);
      // For now, add mock note to show immediate feedback
      const mockNote = {
        id: `note-${Date.now()}`,
        content: noteContent,
        createdBy: 'John Consultant',
        createdAt: new Date().toISOString(),
        clientId: client.id
      };
      setNotes(prev => [mockNote, ...prev]);
      setNoteContent('');
      setShowNoteModal(false);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await apiClient.deleteNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
      // For now, just remove from UI
      setNotes(prev => prev.filter(note => note.id !== noteId));
    }
  };

  const handleDownload = async (document) => {
    try {
      await apiClient.downloadDocument(document.id);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    if (!fileName) {
      const iconClass = 'h-8 w-8 rounded p-1.5 flex items-center justify-center';
      return <div className={`${iconClass} bg-gray-100 text-gray-600`}><FileText className="h-5 w-5" /></div>;
    }

    const extension = fileName.split('.').pop().toLowerCase();
    const iconClass = 'h-8 w-8 rounded p-1.5 flex items-center justify-center';

    if (['pdf'].includes(extension)) {
      return <div className={`${iconClass} bg-red-100 text-red-600`}><FileText className="h-5 w-5" /></div>;
    } else if (['doc', 'docx'].includes(extension)) {
      return <div className={`${iconClass} bg-blue-100 text-blue-600`}><FileText className="h-5 w-5" /></div>;
    } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return <div className={`${iconClass} bg-green-100 text-green-600`}><FileText className="h-5 w-5" /></div>;
    } else if (['ppt', 'pptx'].includes(extension)) {
      return <div className={`${iconClass} bg-orange-100 text-orange-600`}><FileText className="h-5 w-5" /></div>;
    } else {
      return <div className={`${iconClass} bg-gray-100 text-gray-600`}><FileText className="h-5 w-5" /></div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Upload and Add Note Buttons */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Documents & Notes</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload documents and add notes for {client?.name || 'selected client'}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowNoteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Add Note
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </button>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Notes</h3>
          <p className="text-sm text-gray-500 mt-1">
            Add and manage quick notes for {client?.name || 'selected client'}
          </p>
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-8">
            <Edit3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
            <p className="text-gray-600 mb-4">
              Add your first note to capture important information
            </p>
            <button
              onClick={() => setShowNoteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Add Note
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notes.map((note) => (
              <div key={note.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="flex items-center mt-3 text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(note.createdAt)}
                      <User className="h-3 w-3 ml-3 mr-1" />
                      {note.createdBy}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="bg-white shadow rounded-lg">
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-500 mb-4">
              Upload your first document to get started
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {documents.map((document) => (
              <div key={document.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  {getFileIcon(document.fileName)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {document.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {document.fileName} • {formatFileSize(document.fileSize || 0)}
                        </p>
                        {document.notes && (
                          <p className="text-sm text-gray-600 mt-2">
                            {document.notes}
                          </p>
                        )}
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(document.uploadedAt)}
                          <User className="h-3 w-3 ml-3 mr-1" />
                          {document.uploadedBy}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleDownload(document)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(document.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">
                      {selectedFile ? selectedFile.name : 'Click to select a file'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, Word, Excel, PowerPoint, or text files
                    </p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Enter document title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={documentNotes}
                  onChange={(e) => setDocumentNotes(e.target.value)}
                  placeholder="Add any notes about this document"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setDocumentTitle('');
                    setDocumentNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || !documentTitle.trim() || isUploading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Note</h3>
              <button
                onClick={() => setShowNoteModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Content *
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter your note here..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setNoteContent('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={!noteContent.trim() || isSavingNote}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;
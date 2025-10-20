import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Search, FileText } from 'lucide-react';
import { apiClient } from '../services/api';

const ChatTab = ({ client, userRole, isPopup = false }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "What did we discuss in our last meeting?",
    "What are the main pain points for this client?",
    "What tasks are pending for this client?",
    "Summarize the client's business model"
  ]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Add welcome message
    if (client && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'bot',
        content: `Hello! I'm VAL, your Virtual AI Consultant. I have access to all information about ${client.name}. How can I help you today?`,
        timestamp: new Date()
      }]);
    }
  }, [client]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !client || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await apiClient.sendChatMessage(client.id, inputMessage);

      const botMessage = {
        id: response.id || Date.now().toString(),
        type: 'bot',
        content: response.message,
        sources: response.sources,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedQuestion = (question) => {
    setInputMessage(question);
    inputRef.current?.focus();
  };

  return (
    <div className={`${isPopup ? 'h-full flex flex-col' : 'h-full flex flex-col'}`}>
      <div className={`${isPopup ? 'flex-1 flex flex-col h-full' : 'bg-white shadow rounded-lg flex-1 flex flex-col'}`}>
        {/* Chat Header - Only show in non-popup mode */}
        {!isPopup && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">VAL Assistant</h3>
                  <p className="text-sm text-gray-500">
                    {client ? `Discussing ${client.name}` : 'Select a client to begin'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-600">Online</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto ${isPopup ? 'px-4 py-3' : 'px-6 py-4'}`}>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
              <p className="text-gray-600 mb-6">Ask me anything about your client, meetings, or tasks</p>

              {/* Suggested Questions */}
              <div className="max-w-2xl mx-auto">
                <p className="text-sm text-gray-500 mb-3">Suggested questions:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedQuestion(question)}
                      className="text-left p-3 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.type === 'user' ? 'justify-end' : ''
                  }`}
                >
                  {message.type === 'bot' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary-600" />
                      </div>
                    </div>
                  )}

                  <div className={`max-w-2xl ${
                    message.type === 'user' ? 'order-1' : ''
                  }`}>
                    <div className={`rounded-lg px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-primary-600 text-white'
                        : message.isError
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Sources */}
                    {message.sources && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-800">Sources</span>
                        </div>
                        <ul className="space-y-1">
                          {message.sources.map((source, index) => (
                            <li key={index} className="text-xs text-blue-700">
                              • {source.type}: {source.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {message.type === 'user' && (
                    <div className="flex-shrink-0 order-2">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                      <span className="text-sm text-gray-600">VAL is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`${isPopup ? 'px-4 py-3' : 'px-6 py-4'} border-t border-gray-200`}>
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  client
                    ? "Ask VAL about your client, meetings, or tasks..."
                    : "Please select a client first"
                }
                disabled={!client || isLoading}
                rows={1}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !client || isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Quick Actions */}
          <div className={`mt-3 flex items-center ${isPopup ? 'space-x-2' : 'space-x-4'} text-xs text-gray-500`}>
            {isPopup ? (
              <>
                <button className="hover:text-gray-700" title="Attach file">📎</button>
                <button className="hover:text-gray-700" title="Search previous conversations">🔍</button>
                <button className="hover:text-gray-700" title="Generate summary">📊</button>
              </>
            ) : (
              <>
                <button className="hover:text-gray-700">📎 Attach file</button>
                <button className="hover:text-gray-700">🔍 Search previous conversations</button>
                <button className="hover:text-gray-700">📊 Generate summary</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatTab;
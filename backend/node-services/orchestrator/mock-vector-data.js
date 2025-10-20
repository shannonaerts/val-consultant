// Mock vector data organized by client
const mockVectorData = {
  // Trafigura client data
  'fecaacea-1f97-4b2d-aafe-547a0c7e8d73': {
    clientName: 'Trafigura',
    data: {
      notes: [
        {
          content: 'Important note about asset transfer: Trafigura needs to transfer all intellectual property assets, including patents, trademarks, and copyrights. Additionally, all physical assets such as shipping vessels, storage facilities, and trading equipment must be properly documented and transferred. The transfer should comply with legal requirements and include proper valuation.',
          type: 'note',
          source: 'Asset Transfer Planning',
          similarity: 0.95
        },
        {
          content: 'Key decision point: Asset transfer timeline set for Q2 2024. High-priority items include shipping vessels, storage facilities, trading algorithms, and client databases. Legal team leading documentation process.',
          type: 'note',
          source: 'Planning Meeting Notes',
          similarity: 0.88
        },
        {
          content: 'Weekly operational review: Shipping fleet performance metrics need to be compiled by end of week. Risk management team to provide compliance updates.',
          type: 'note',
          source: 'Operational Review',
          similarity: 0.82
        }
      ],
      tasks: [
        {
          content: 'Task: Asset Transfer Documentation. Description: Compile comprehensive list of all Trafigura assets to be transferred to new company. Priority: HIGH. Status: IN PROGRESS. Assignee: Legal Team. Due date: 2024-02-15.',
          type: 'task',
          source: 'Asset Management',
          similarity: 0.92
        },
        {
          content: 'Task: Obtain independent valuation of all Trafigura assets including physical assets (shipping vessels, facilities) and intellectual property (trading algorithms, software systems). Status: PENDING. Priority: HIGH. Due: 2024-02-20.',
          type: 'task',
          source: 'Asset Valuation',
          similarity: 0.87
        },
        {
          content: 'Task: Weekly compliance report for commodity trading regulations. Status: IN PROGRESS. Priority: MEDIUM. Assignee: Compliance Team. Due: 2024-01-25.',
          type: 'task',
          source: 'Compliance',
          similarity: 0.75
        },
        {
          content: 'Task: Review shipping vessel maintenance schedules. Status: PENDING. Priority: MEDIUM. Assignee: Operations Team. Due: 2024-01-26.',
          type: 'task',
          source: 'Operations',
          similarity: 0.73
        },
        {
          content: 'Task: Prepare Q1 financial statements for trading division. Status: PENDING. Priority: HIGH. Assignee: Finance Team. Due: 2024-02-01.',
          type: 'task',
          source: 'Finance',
          similarity: 0.78
        }
      ],
      research: [
        {
          content: 'Company research indicates Trafigura has significant physical and intellectual property assets. Physical assets include: shipping vessels, storage facilities, trading equipment. Intellectual property includes: trading algorithms, client databases, proprietary software systems. Total estimated asset value exceeds $10B.',
          type: 'research',
          source: 'Company Asset Analysis',
          similarity: 0.90
        }
      ],
      meetings: [
        {
          content: 'Meeting Transcript: Asset Transfer Planning Meeting. Date: 2024-01-20. Participants: CEO, CFO, Legal Counsel. Key discussion points: 1) Timeline for asset transfer - Q2 2024 target. 2) Legal requirements for international asset transfer. 3) Valuation methodology for tangible and intangible assets. 4) Tax implications of asset transfer.',
          type: 'meeting',
          source: 'Asset Transfer Planning Meeting',
          similarity: 0.93
        }
      ]
    }
  },

  // Generic client data for other clients
  'default': {
    clientName: 'Generic Client',
    data: {
      notes: [
        {
          content: 'General project management notes: Team coordination and regular status updates are essential for project success.',
          type: 'note',
          source: 'Project Management',
          similarity: 0.80
        }
      ],
      tasks: [
        {
          content: 'Task: Complete project documentation. Status: IN PROGRESS. Priority: MEDIUM. Due: End of week.',
          type: 'task',
          source: 'Project Tasks',
          similarity: 0.75
        }
      ],
      research: [],
      meetings: []
    }
  }
};

// Function to find relevant content based on query and client
function findRelevantContent(query, clientId, limit = 5) {
  const queryLower = query.toLowerCase();
  const allContent = [];

  // Get client-specific data
  const clientData = mockVectorData[clientId] || mockVectorData['default'];

  // Collect all content for the specific client
  Object.values(clientData.data).forEach(contentType => {
    contentType.forEach(item => allContent.push(item));
  });

  // Score and filter based on query relevance
  const scoredContent = allContent.map(item => {
    let score = 0;
    const content = item.content.toLowerCase();

    // Keyword matching
    if (queryLower.includes('asset') && content.includes('asset')) score += 0.5;
    if (queryLower.includes('transfer') && content.includes('transfer')) score += 0.5;
    if (queryLower.includes('company') && content.includes('company')) score += 0.3;
    if (queryLower.includes('need') && (content.includes('need') || content.includes('require'))) score += 0.3;
    if (queryLower.includes('what') && (content.includes('list') || content.includes('includes'))) score += 0.3;
    if (queryLower.includes('week') && (content.includes('week') || content.includes('weekly'))) score += 0.4;
    if (queryLower.includes('due') && (content.includes('due') || content.includes('deadline'))) score += 0.4;
    if (queryLower.includes('task') && content.includes('task')) score += 0.5;
    if (queryLower.includes('schedule') && (content.includes('schedule') || content.includes('maintenance'))) score += 0.4;
    if (queryLower.includes('compliance') && content.includes('compliance')) score += 0.5;
    if (queryLower.includes('financial') && content.includes('financial')) score += 0.5;
    if (queryLower.includes('shipping') && content.includes('shipping')) score += 0.5;
    if (queryLower.includes('vessel') && content.includes('vessel')) score += 0.5;

    // Type-specific matching
    if (queryLower.includes('note') && item.type === 'note') score += 0.4;
    if (queryLower.includes('task') && item.type === 'task') score += 0.4;
    if (queryLower.includes('research') && item.type === 'research') score += 0.4;
    if (queryLower.includes('meeting') && item.type === 'meeting') score += 0.4;

    // Client-specific bonus
    if (clientData.clientName && content.includes(clientData.clientName)) score += 0.3;

    // Similarity bonus
    score += item.similarity * 0.3;

    return { ...item, score };
  });

  // Sort by score and return top results
  return scoredContent
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Function to generate response from context
function generateResponse(query, relevantResults, clientId) {
  if (relevantResults.length === 0) {
    return "I don't have specific information about that topic in the current data.";
  }

  const topResult = relevantResults[0];
  const clientData = mockVectorData[clientId] || mockVectorData['default'];
  const clientName = clientData.clientName;

  if (query.toLowerCase().includes('what') && query.toLowerCase().includes('asset')) {
    const assets = [];
    relevantResults.forEach(result => {
      if (result.content.includes('intellectual property')) {
        assets.push('intellectual property (patents, trademarks, copyrights)');
      }
      if (result.content.includes('physical')) {
        assets.push('physical assets (office equipment, inventory, real estate)');
      }
      if (result.content.includes('shipping vessels')) {
        assets.push('shipping vessels and storage facilities');
      }
      if (result.content.includes('trading algorithms')) {
        assets.push('trading algorithms and proprietary software');
      }
      if (result.content.includes('client databases')) {
        assets.push('client databases');
      }
    });

    if (assets.length > 0) {
      return `Based on the available information for ${clientName}, the assets that need to be transferred include: ${assets.join(', ')}. The transfer should comply with legal requirements and include proper valuation. The total estimated value exceeds $10B.`;
    }
  }

  if (query.toLowerCase().includes('timeline') || query.toLowerCase().includes('when')) {
    return `According to the planning meeting notes for ${clientName}, the asset transfer timeline is set for Q2 2024. This is a high-priority initiative with the legal team leading the documentation process.`;
  }

  if (query.toLowerCase().includes('task') || query.toLowerCase().includes('todo') ||
      query.toLowerCase().includes('due') || query.toLowerCase().includes('week') ||
      query.toLowerCase().includes('schedule')) {

    // Filter for task-related results
    const taskResults = relevantResults.filter(result => result.type === 'task');

    if (taskResults.length > 0) {
      let response = `Based on ${clientName}'s current tasks:\n\n`;

      taskResults.forEach((task, index) => {
        response += `${index + 1}. ${task.content}\n\n`;
      });

      return response;
    } else {
      return `I don't find any specific tasks for ${clientName} matching your query about "${query}".`;
    }
  }

  if (query.toLowerCase().includes('value') || query.toLowerCase().includes('worth')) {
    return `Based on the research data for ${clientName}, the total estimated value of the assets to be transferred exceeds $10B. This includes both physical assets like shipping vessels and storage facilities, as well as intellectual property like trading algorithms and client databases.`;
  }

  // Default response using top result
  return `Based on ${topResult.type} information for ${clientName}: ${topResult.content.substring(0, 200)}...`;
}

module.exports = {
  findRelevantContent,
  generateResponse,
  mockVectorData
};
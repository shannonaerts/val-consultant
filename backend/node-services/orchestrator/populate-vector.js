const VectorService = require('./services/vectorService');

async function populateVectorData() {
  console.log('📝 Populating Vector Database with Sample Data...\n');

  const vectorService = new VectorService();
  const clientId = 'fecaacea-1f97-4b2d-aafe-547a0c7e8d73'; // Using Trafigura client ID

  try {
    // Sample data for asset transfer scenario
    const sampleData = [
      {
        type: 'note',
        content: 'Important note about asset transfer: The company needs to transfer all intellectual property assets, including patents, trademarks, and copyrights. Additionally, all physical assets such as office equipment, inventory, and real estate holdings must be properly documented and transferred. The transfer should comply with legal requirements and include proper valuation.',
        metadata: {
          createdBy: 'John Consultant',
          createdAt: new Date().toISOString(),
          noteType: 'asset_transfer_note'
        }
      },
      {
        type: 'task',
        content: 'Task: Asset Transfer Documentation. Description: Compile comprehensive list of all assets to be transferred to new company. Priority: HIGH. Status: IN PROGRESS. Assignee: Legal Team. Due date: 2024-02-15.',
        metadata: {
          title: 'Asset Transfer Documentation',
          status: 'in_progress',
          priority: 'high',
          assignee: 'Legal Team',
          dueDate: '2024-02-15',
          taskType: 'asset_transfer'
        }
      },
      {
        type: 'research',
        content: 'Company research indicates Trafigura has significant physical and intellectual property assets. Physical assets include: shipping vessels, storage facilities, trading equipment. Intellectual property includes: trading algorithms, client databases, proprietary software systems. Total estimated asset value exceeds $10B.',
        metadata: {
          source: 'Company Research Analysis',
          dataType: 'asset_inventory',
          createdAt: new Date().toISOString()
        }
      },
      {
        type: 'document',
        content: 'Meeting Transcript: Asset Transfer Planning Meeting. Date: 2024-01-20. Participants: CEO, CFO, Legal Counsel. Key discussion points: 1) Timeline for asset transfer - Q2 2024 target. 2) Legal requirements for international asset transfer. 3) Valuation methodology for tangible and intangible assets. 4) Tax implications of asset transfer. Action items: Obtain independent valuation, prepare legal transfer documentation, coordinate with tax advisors.',
        metadata: {
          documentName: 'Asset Transfer Planning Meeting',
          meetingDate: '2024-01-20',
          documentType: 'meeting_transcript'
        }
      }
    ];

    console.log(`Processing ${sampleData.length} sample items...`);

    for (let i = 0; i < sampleData.length; i++) {
      const item = sampleData[i];
      console.log(`\n${i + 1}. Processing ${item.type}...`);

      try {
        const embedding = await vectorService.generateEmbedding(item.content);
        console.log(`   ✅ Embedding generated (${embedding.length} dimensions)`);

        // Store in appropriate vector table
        if (item.type === 'note') {
          await vectorService.storeNote({
            clientId,
            noteId: `sample-note-${i}`,
            content: item.content,
            metadata: item.metadata,
            embedding
          });
          console.log(`   ✅ Note stored in vector database`);
        } else if (item.type === 'task') {
          await vectorService.storeTask({
            clientId,
            taskId: `sample-task-${i}`,
            content: item.content,
            metadata: item.metadata,
            embedding
          });
          console.log(`   ✅ Task stored in vector database`);
        } else if (item.type === 'research') {
          await vectorService.storeResearchData({
            clientId,
            source: item.metadata.source,
            content: item.content,
            metadata: item.metadata,
            embedding
          });
          console.log(`   ✅ Research data stored in vector database`);
        } else if (item.type === 'document') {
          await vectorService.storeDocumentChunk({
            clientId,
            documentId: `sample-doc-${i}`,
            chunkId: `chunk-0`,
            content: item.content,
            metadata: item.metadata,
            embedding
          });
          console.log(`   ✅ Document chunk stored in vector database`);
        }

      } catch (error) {
        console.error(`   ❌ Error processing ${item.type}:`, error.message);
      }
    }

    console.log('\n🎉 Vector database populated successfully!');
    console.log('\n📝 Sample data added:');
    console.log('   • Asset transfer notes and documentation');
    console.log('   • High-priority tasks for asset transfer');
    console.log('   • Research data on company assets');
    console.log('   • Meeting transcripts about asset transfer');

    console.log('\n🧪 Testing semantic search...');

    const testQuery = "What assets need to transfer to the new company?";
    const searchResults = await vectorService.semanticSearch(clientId, testQuery, 5);

    console.log(`\nQuery: "${testQuery}"`);
    console.log(`Found ${searchResults.length} relevant results:`);

    searchResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.type.toUpperCase()} - ${result.source}`);
      console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`   Content: ${result.content.substring(0, 200)}...`);
    });

    console.log('\n✅ Vector search is working! Try asking this question in the chat UI.');

  } catch (error) {
    console.error('❌ Error populating vector database:', error);
  }
}

populateVectorData();
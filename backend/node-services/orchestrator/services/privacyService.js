const { createClient } = require('@supabase/supabase-js');

class PrivacyService {
  constructor() {
    // Initialize Supabase client for privacy management
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  // Initialize privacy settings for a new client
  async initializeClientPrivacy(clientId, options = {}) {
    const defaultSettings = {
      client_id: clientId,
      data_retention_days: 365,
      encryption_enabled: true,
      audit_logging_enabled: true,
      access_restrictions: {
        allowDataExport: true,
        allowDataSharing: false,
        requireExplicitConsent: false,
        minAccessLevel: 'basic'
      }
    };

    const privacySettings = { ...defaultSettings, ...options };

    try {
      const { data, error } = await this.supabase
        .from('client_privacy_settings')
        .upsert([privacySettings], { onConflict: 'client_id' })
        .select()
        .single();

      if (error) throw error;

      console.log(`Privacy settings initialized for client: ${clientId}`);
      return data;
    } catch (error) {
      console.error('Error initializing client privacy:', error);
      throw error;
    }
  }

  // Get privacy settings for a client
  async getClientPrivacy(clientId) {
    try {
      const { data, error } = await this.supabase
        .from('client_privacy_settings')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      // If no settings exist, initialize with defaults
      if (!data) {
        return await this.initializeClientPrivacy(clientId);
      }

      return data;
    } catch (error) {
      console.error('Error getting client privacy settings:', error);
      throw error;
    }
  }

  // Update privacy settings for a client
  async updateClientPrivacy(clientId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('client_privacy_settings')
        .update(updates)
        .eq('client_id', clientId)
        .select()
        .single();

      if (error) throw error;

      console.log(`Privacy settings updated for client: ${clientId}`);
      return data;
    } catch (error) {
      console.error('Error updating client privacy settings:', error);
      throw error;
    }
  }

  // Check if data access is allowed for a client
  async canAccessClientData(clientId, accessType = 'read') {
    try {
      const privacySettings = await this.getClientPrivacy(clientId);

      if (!privacySettings) {
        console.warn(`No privacy settings found for client: ${clientId}, allowing access`);
        return true;
      }

      // Check access restrictions
      const restrictions = privacySettings.access_restrictions || {};

      switch (accessType) {
        case 'export':
          return restrictions.allowDataExport !== false;
        case 'share':
          return restrictions.allowDataSharing === true;
        case 'read':
        default:
          return true; // Basic read access is generally allowed
      }
    } catch (error) {
      console.error('Error checking data access permissions:', error);
      return false;
    }
  }

  // Log data access for audit purposes
  async logDataAccess(clientId, operation, tableName, userId = null, metadata = {}) {
    try {
      const privacySettings = await this.getClientPrivacy(clientId);

      // Only log if audit logging is enabled
      if (!privacySettings?.audit_logging_enabled) {
        return;
      }

      const logEntry = {
        table_name: tableName,
        operation,
        client_id: clientId,
        user_id: userId || 'system',
        metadata
      };

      const { error } = await this.supabase
        .from('vector_access_log')
        .insert([logEntry]);

      if (error) {
        console.error('Error logging access:', error);
      }
    } catch (error) {
      console.error('Error in logDataAccess:', error);
    }
  }

  // Clean up old data based on retention policy
  async cleanupExpiredData(clientId = null) {
    try {
      const clientsToClean = clientId ? [clientId] : await this.getAllClientIds();
      let totalDeleted = 0;

      for (const currentClientId of clientsToClean) {
        const privacySettings = await this.getClientPrivacy(currentClientId);
        const retentionDays = privacySettings?.data_retention_days || 365;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const tables = [
          'document_chunks',
          'meeting_transcripts',
          'vector_notes',
          'vector_tasks',
          'research_data'
        ];

        for (const table of tables) {
          const { data, error } = await this.supabase
            .from(table)
            .delete()
            .eq('client_id', currentClientId)
            .lt('created_at', cutoffDate.toISOString());

          if (error) {
            console.error(`Error cleaning ${table} for client ${currentClientId}:`, error);
          } else {
            totalDeleted += (data?.length || 0);
            console.log(`Cleaned ${data?.length || 0} records from ${table} for client ${currentClientId}`);
          }
        }
      }

      console.log(`Data cleanup complete. Total records deleted: ${totalDeleted}`);
      return totalDeleted;
    } catch (error) {
      console.error('Error in data cleanup:', error);
      throw error;
    }
  }

  // Get all client IDs that have privacy settings
  async getAllClientIds() {
    try {
      const { data, error } = await this.supabase
        .from('client_privacy_settings')
        .select('client_id');

      if (error) throw error;
      return data.map(row => row.client_id);
    } catch (error) {
      console.error('Error getting all client IDs:', error);
      return [];
    }
  }

  // Get privacy compliance report
  async getPrivacyReport(clientId = null) {
    try {
      const clientsToReport = clientId ? [clientId] : await this.getAllClientIds();
      const report = {
        generated_at: new Date().toISOString(),
        clients: []
      };

      for (const currentClientId of clientsToReport) {
        const privacySettings = await this.getClientPrivacy(currentClientId);
        const dataStats = await this.getClientDataStats(currentClientId);

        report.clients.push({
          client_id: currentClientId,
          privacy_settings: privacySettings,
          data_statistics: dataStats,
          compliance_status: this.assessComplianceStatus(privacySettings, dataStats)
        });
      }

      return report;
    } catch (error) {
      console.error('Error generating privacy report:', error);
      throw error;
    }
  }

  // Get data statistics for a client
  async getClientDataStats(clientId) {
    const tables = [
      'document_chunks',
      'meeting_transcripts',
      'vector_notes',
      'vector_tasks',
      'research_data'
    ];

    const stats = {};

    for (const table of tables) {
      try {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId);

        stats[table] = {
          total_records: count || 0,
          oldest_record: null,
          newest_record: null
        };

        // Get date range
        if (count > 0) {
          const { data: dateData, error: dateError } = await this.supabase
            .from(table)
            .select('created_at')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!dateError && dateData.length > 0) {
            stats[table].newest_record = dateData[0].created_at;
          }

          const { data: oldestData, error: oldestError } = await this.supabase
            .from(table)
            .select('created_at')
            .eq('client_id', clientId)
            .order('created_at', { ascending: true })
            .limit(1);

          if (!oldestError && oldestData.length > 0) {
            stats[table].oldest_record = oldestData[0].created_at;
          }
        }
      } catch (error) {
        console.error(`Error getting stats for ${table}:`, error);
        stats[table] = { error: error.message };
      }
    }

    return stats;
  }

  // Assess privacy compliance status
  assessComplianceStatus(privacySettings, dataStats) {
    const issues = [];
    const warnings = [];

    // Check if audit logging is enabled
    if (!privacySettings?.audit_logging_enabled) {
      warnings.push('Audit logging is disabled');
    }

    // Check if encryption is enabled
    if (!privacySettings?.encryption_enabled) {
      warnings.push('Encryption is not explicitly enabled');
    }

    // Check data retention
    const retentionDays = privacySettings?.data_retention_days || 365;
    if (retentionDays > 730) { // 2 years
      warnings.push(`Data retention period (${retentionDays} days) exceeds 2 years`);
    }

    // Check for data older than retention policy
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    for (const [table, stats] of Object.entries(dataStats)) {
      if (stats.oldest_record) {
        const oldestDate = new Date(stats.oldest_record);
        if (oldestDate < cutoffDate) {
          issues.push(`Table ${table} contains data older than retention policy`);
        }
      }
    }

    return {
      status: issues.length > 0 ? 'non_compliant' : warnings.length > 0 ? 'warning' : 'compliant',
      issues,
      warnings
    };
  }

  // Export client data (with privacy checks)
  async exportClientData(clientId, format = 'json') {
    try {
      const canExport = await this.canAccessClientData(clientId, 'export');
      if (!canExport) {
        throw new Error('Data export is not allowed for this client');
      }

      const tables = [
        'document_chunks',
        'meeting_transcripts',
        'vector_notes',
        'vector_tasks',
        'research_data'
      ];

      const exportData = {
        client_id: clientId,
        exported_at: new Date().toISOString(),
        format,
        tables: {}
      };

      for (const table of tables) {
        try {
          const { data, error } = await this.supabase
            .from(table)
            .select('*')
            .eq('client_id', clientId);

          if (error) throw error;
          exportData.tables[table] = data || [];
        } catch (error) {
          console.error(`Error exporting ${table}:`, error);
          exportData.tables[table] = { error: error.message };
        }
      }

      // Log the export
      await this.logDataAccess(clientId, 'export', 'multiple_tables', 'system', { format });

      return exportData;
    } catch (error) {
      console.error('Error exporting client data:', error);
      throw error;
    }
  }
}

module.exports = PrivacyService;
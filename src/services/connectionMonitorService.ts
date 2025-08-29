import { supabase } from '@/integrations/supabase/client';

// Monitor database connections to detect leaks
export class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }

  // Start monitoring connections (only in development)
  startMonitoring(): void {
    if (this.isMonitoring || import.meta.env.PROD) {
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting database connection monitoring...');

    // Check connections every 2 minutes
    this.connectionCheckInterval = setInterval(() => {
      this.auditConnections();
    }, 120000);

    // Initial check
    this.auditConnections();
  }

  stopMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Database connection monitoring stopped');
  }

  // Audit active connections using pg_stat_activity
  private async auditConnections(): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('monitor_connections');
      
      if (error) {
        console.warn('⚠️ Could not audit connections:', error.message);
        return;
      }

      if (data && Array.isArray(data)) {
        const activeConnections = data.length;
        const appConnections = data.filter((conn: any) => 
          conn.application_name?.includes('ottoman-collection')
        ).length;

        console.log(`📊 Database connections - Total: ${activeConnections}, App: ${appConnections}`);

        // Alert if too many connections from our app
        if (appConnections > 50) {
          console.warn(`⚠️ High connection count from app: ${appConnections}`);
        }

        // Check for long-running idle connections
        const idleConnections = data.filter((conn: any) => 
          conn.state === 'idle' && 
          conn.application_name?.includes('ottoman-collection') &&
          this.getConnectionAgeMinutes(conn.backend_start) > 30
        );

        if (idleConnections.length > 0) {
          console.warn(`⚠️ Found ${idleConnections.length} long-running idle connections`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Connection monitoring error:', error);
    }
  }

  private getConnectionAgeMinutes(backendStart: string): number {
    const start = new Date(backendStart);
    const now = new Date();
    return (now.getTime() - start.getTime()) / (1000 * 60);
  }
}

// Create monitoring RPC function if it doesn't exist
export async function createMonitoringFunction(): Promise<void> {
  try {
    const { error } = await supabase.rpc('create_monitoring_function');
    if (error) {
      console.warn('Monitoring function setup:', error.message);
    }
  } catch (error) {
    console.warn('Could not create monitoring function:', error);
  }
}

// Initialize monitoring in development
if (import.meta.env.DEV) {
  const monitor = ConnectionMonitor.getInstance();
  
  // Start monitoring after a short delay
  setTimeout(() => {
    createMonitoringFunction().then(() => {
      monitor.startMonitoring();
    });
  }, 5000);

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    monitor.stopMonitoring();
  });
}

export default ConnectionMonitor;
"""
Shared database configuration and utilities for VAL microservices
"""

import sqlite3
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    """SQLite database manager for VAL application"""

    def __init__(self, db_path: str = "val_consultant.db"):
        self.db_path = Path(db_path)
        self.connection = None
        self._initialize_database()

    def _initialize_database(self):
        """Initialize database connection and create tables"""
        try:
            self.connection = sqlite3.connect(str(self.db_path), check_same_thread=False)
            self.connection.row_factory = sqlite3.Row  # Enable dict-like row access
            self._create_tables()
            logger.info(f"Database initialized at {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise

    def _create_tables(self):
        """Create all necessary tables"""
        cursor = self.connection.cursor()

        # Clients table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                industry TEXT,
                website TEXT,
                status TEXT DEFAULT 'active',
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Meetings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                duration TEXT,
                participants TEXT,
                transcript TEXT,
                status TEXT DEFAULT 'completed',
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients (id)
            )
        """)

        # Tasks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                assignee TEXT,
                due_date TEXT,
                priority TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'pending',
                reminder BOOLEAN DEFAULT 0,
                reminder_time TEXT,
                tags TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                FOREIGN KEY (client_id) REFERENCES clients (id)
            )
        """)

        # Research data table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS research_data (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                source TEXT NOT NULL,
                data_type TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients (id)
            )
        """)

        # Chat history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                user_id TEXT,
                message TEXT NOT NULL,
                response TEXT NOT NULL,
                sources TEXT,
                session_id TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients (id)
            )
        """)

        # Vector documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vector_documents (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                content TEXT NOT NULL,
                embedding BLOB,
                document_type TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients (id)
            )
        """)

        # Users table (for authentication)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                role TEXT DEFAULT 'consultant',
                password_hash TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login TEXT
            )
        """)

        # Sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                client_id TEXT,
                token TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (client_id) REFERENCES clients (id)
            )
        """)

        # Create indexes for better performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_meetings_client_id ON meetings(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_research_client_id ON research_data(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_client_id ON chat_history(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_vector_client_id ON vector_documents(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)")

        self.connection.commit()
        logger.info("Database tables created successfully")

    def load_sample_data(self, sample_data_path: str = "../seed/sample-data.json"):
        """Load sample data from JSON file"""
        try:
            sample_path = Path(sample_data_path)
            if not sample_path.exists():
                logger.warning(f"Sample data file not found: {sample_path}")
                return

            with open(sample_path, 'r') as f:
                data = json.load(f)

            cursor = self.connection.cursor()

            # Load clients
            for client in data.get('clients', []):
                cursor.execute("""
                    INSERT OR REPLACE INTO clients (id, name, industry, website, status, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    client['id'], client['name'], client['industry'], client['website'],
                    client['status'], json.dumps(client), client['created_at']
                ))

            # Load meetings
            for meeting in data.get('meetings', []):
                cursor.execute("""
                    INSERT OR REPLACE INTO meetings (id, client_id, title, date, duration, participants, transcript, status, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    meeting['id'], meeting['client_id'], meeting['title'], meeting['date'],
                    meeting['duration'], json.dumps(meeting['participants']),
                    json.dumps(meeting.get('transcript')), meeting['status'],
                    json.dumps(meeting)
                ))

            # Load tasks
            for task in data.get('tasks', []):
                cursor.execute("""
                    INSERT OR REPLACE INTO tasks (id, client_id, title, description, assignee, due_date, priority, status, reminder, tags, metadata, created_at, completed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    task['id'], task['client_id'], task['title'], task['description'],
                    task['assignee'], task['due_date'], task['priority'], task['status'],
                    int(task.get('reminder', False)), json.dumps(task.get('tags', [])),
                    json.dumps(task), task['created_at'], task.get('completed_at')
                ))

            # Load research data
            for client_id, research in data.get('research_data', {}).items():
                research_id = f"research-{client_id}"
                cursor.execute("""
                    INSERT OR REPLACE INTO research_data (id, client_id, source, data_type, content, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    research_id, client_id, 'multiple_sources', 'company_overview',
                    json.dumps(research), json.dumps(research)
                ))

            # Create sample user
            cursor.execute("""
                INSERT OR REPLACE INTO users (id, email, name, role, metadata)
                VALUES (?, ?, ?, ?, ?)
            """, (
                'user-1', 'john@gemsquash.com', 'John Consultant', 'consultant',
                json.dumps({'department': 'Consulting', 'level': 'Senior'})
            ))

            self.connection.commit()
            logger.info("Sample data loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load sample data: {e}")
            self.connection.rollback()

    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results"""
        try:
            cursor = self.connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)

            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            return []

    def execute_update(self, query: str, params: tuple = None) -> bool:
        """Execute an INSERT/UPDATE/DELETE query"""
        try:
            cursor = self.connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)

            self.connection.commit()
            return True
        except Exception as e:
            logger.error(f"Update query failed: {e}")
            self.connection.rollback()
            return False

    def get_client(self, client_id: str) -> Optional[Dict[str, Any]]:
        """Get client by ID"""
        query = "SELECT * FROM clients WHERE id = ?"
        results = self.execute_query(query, (client_id,))
        return results[0] if results else None

    def get_clients(self) -> List[Dict[str, Any]]:
        """Get all clients"""
        query = "SELECT * FROM clients ORDER BY created_at DESC"
        return self.execute_query(query)

    def create_client(self, client_data: Dict[str, Any]) -> Optional[str]:
        """Create a new client"""
        query = """
            INSERT INTO clients (id, name, industry, website, status, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        params = (
            client_data.get('id'),
            client_data.get('name'),
            client_data.get('industry'),
            client_data.get('website'),
            client_data.get('status', 'active'),
            json.dumps(client_data)
        )

        if self.execute_update(query, params):
            return client_data.get('id')
        return None

    def get_tasks(self, client_id: str = None, status: str = None) -> List[Dict[str, Any]]:
        """Get tasks with optional filters"""
        query = "SELECT * FROM tasks WHERE 1=1"
        params = []

        if client_id:
            query += " AND client_id = ?"
            params.append(client_id)

        if status:
            query += " AND status = ?"
            params.append(status)

        query += " ORDER BY created_at DESC"

        return self.execute_query(query, tuple(params) if params else None)

    def create_task(self, task_data: Dict[str, Any]) -> Optional[str]:
        """Create a new task"""
        query = """
            INSERT INTO tasks (id, client_id, title, description, assignee, due_date, priority, status, reminder, tags, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            task_data.get('id'),
            task_data.get('client_id'),
            task_data.get('title'),
            task_data.get('description'),
            task_data.get('assignee'),
            task_data.get('due_date'),
            task_data.get('priority', 'medium'),
            task_data.get('status', 'pending'),
            int(task_data.get('reminder', False)),
            json.dumps(task_data.get('tags', [])),
            json.dumps(task_data)
        )

        if self.execute_update(query, params):
            return task_data.get('id')
        return None

    def update_task(self, task_id: str, updates: Dict[str, Any]) -> bool:
        """Update a task"""
        set_clauses = []
        params = []

        for key, value in updates.items():
            if key in ['title', 'description', 'assignee', 'due_date', 'priority', 'status']:
                set_clauses.append(f"{key} = ?")
                params.append(value)
            elif key == 'reminder':
                set_clauses.append("reminder = ?")
                params.append(int(value))
            elif key == 'tags':
                set_clauses.append("tags = ?")
                params.append(json.dumps(value))
            elif key == 'completed_at':
                set_clauses.append("completed_at = ?")
                params.append(value)

        if not set_clauses:
            return False

        set_clauses.append("updated_at = CURRENT_TIMESTAMP")
        params.append(task_id)

        query = f"UPDATE tasks SET {', '.join(set_clauses)} WHERE id = ?"
        return self.execute_update(query, tuple(params))

    def get_meetings(self, client_id: str = None) -> List[Dict[str, Any]]:
        """Get meetings with optional client filter"""
        query = "SELECT * FROM meetings WHERE 1=1"
        params = []

        if client_id:
            query += " AND client_id = ?"
            params.append(client_id)

        query += " ORDER BY date DESC"

        return self.execute_query(query, tuple(params) if params else None)

    def create_meeting(self, meeting_data: Dict[str, Any]) -> Optional[str]:
        """Create a new meeting"""
        query = """
            INSERT INTO meetings (id, client_id, title, date, duration, participants, transcript, status, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            meeting_data.get('id'),
            meeting_data.get('client_id'),
            meeting_data.get('title'),
            meeting_data.get('date'),
            meeting_data.get('duration'),
            json.dumps(meeting_data.get('participants', [])),
            json.dumps(meeting_data.get('transcript')),
            meeting_data.get('status', 'completed'),
            json.dumps(meeting_data)
        )

        if self.execute_update(query, params):
            return meeting_data.get('id')
        return None

    def get_chat_history(self, client_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get chat history for a client"""
        query = """
            SELECT * FROM chat_history
            WHERE client_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        """
        return self.execute_query(query, (client_id, limit))

    def save_chat_message(self, client_id: str, user_id: str, message: str, response: str, sources: List[Dict] = None) -> Optional[str]:
        """Save a chat message"""
        import uuid
        chat_id = str(uuid.uuid4())

        query = """
            INSERT INTO chat_history (id, client_id, user_id, message, response, sources)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        params = (
            chat_id, client_id, user_id, message, response,
            json.dumps(sources) if sources else None
        )

        if self.execute_update(query, params):
            return chat_id
        return None

    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")

# Global database instance
db_manager = DatabaseManager()

# Initialize sample data on import
def initialize_database():
    """Initialize database with sample data"""
    try:
        db_manager.load_sample_data()
        logger.info("Database initialization completed")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

if __name__ == "__main__":
    # Test database functionality
    initialize_database()
    print("Database test completed successfully")
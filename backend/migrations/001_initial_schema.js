import { pool } from '../src/config/database.js';

const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Running database migrations...\n');

    // Departments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        sla_days INTEGER DEFAULT 7,
        contact_email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Created departments table');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin', 'reviewer')),
        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created users table');

    // Complaints table
    await client.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        text TEXT NOT NULL,
        category VARCHAR(100),
        urgency VARCHAR(50) CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
        location VARCHAR(255),
        intent VARCHAR(255),
        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'escalated', 'closed')),
        explanation TEXT,
        confidence_score DECIMAL(3,2),
        assigned_by VARCHAR(50) DEFAULT 'llm' CHECK (assigned_by IN ('llm', 'manual')),
        sla_deadline TIMESTAMP,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Created complaints table');

    // Routing Rules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS routing_rules (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100),
        urgency VARCHAR(50),
        location VARCHAR(255),
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        priority INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Created routing_rules table');

    // Escalations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS escalations (
        id SERIAL PRIMARY KEY,
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
        reason TEXT,
        escalated_from INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        escalated_to INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        genai_explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created escalations table');

    // Manual Review Queue table
    await client.query(`
      CREATE TABLE IF NOT EXISTS manual_review_queue (
        id SERIAL PRIMARY KEY,
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE UNIQUE,
        flagged_reason TEXT,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        override_status VARCHAR(50) DEFAULT 'pending' CHECK (override_status IN ('pending', 'approved', 'rejected', 'modified')),
        override_notes TEXT,
        original_category VARCHAR(100),
        original_department_id INTEGER,
        original_urgency VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP
      );
    `);
    console.log('Created manual_review_queue table');

    // S3 Files table
    await client.query(`
      CREATE TABLE IF NOT EXISTS s3_files (
        id SERIAL PRIMARY KEY,
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255),
        file_type VARCHAR(100),
        file_size INTEGER,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created s3_files table');

    // Audit Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(100) NOT NULL,
        entity_id INTEGER,
        action VARCHAR(50) NOT NULL,
        old_value JSONB,
        new_value JSONB,
        performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Created audit_logs table');

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
      CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(department_id);
      CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
      CREATE INDEX IF NOT EXISTS idx_complaints_urgency ON complaints(urgency);
      CREATE INDEX IF NOT EXISTS idx_complaints_sla ON complaints(sla_deadline);
      CREATE INDEX IF NOT EXISTS idx_routing_rules_lookup ON routing_rules(category, urgency, location);
      CREATE INDEX IF NOT EXISTS idx_manual_review_status ON manual_review_queue(override_status);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
    `);
    console.log('Created indexes');

    await client.query('COMMIT');
    console.log('\nAll migrations completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

const dropTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Dropping all tables...\n');

    await client.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS s3_files CASCADE;
      DROP TABLE IF EXISTS manual_review_queue CASCADE;
      DROP TABLE IF EXISTS escalations CASCADE;
      DROP TABLE IF EXISTS routing_rules CASCADE;
      DROP TABLE IF EXISTS complaints CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    await client.query('COMMIT');
    console.log('All tables dropped successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Drop tables failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

export { createTables, dropTables };

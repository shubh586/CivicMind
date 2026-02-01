import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { pool } from '../src/config/database.js';
import bcrypt from 'bcryptjs';

const seedData = async () => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('Seeding database...\n');

        // Seed Departments
        const departments = [
            { name: 'Public Works', description: 'Handles roads, drainage, and infrastructure', sla_days: 7, contact_email: 'publicworks@city.gov' },
            { name: 'Water Supply', description: 'Handles water supply and pipeline issues', sla_days: 3, contact_email: 'water@city.gov' },
            { name: 'Sanitation', description: 'Handles garbage, sewage, and cleanliness', sla_days: 2, contact_email: 'sanitation@city.gov' },
            { name: 'Electricity', description: 'Handles power supply and streetlights', sla_days: 1, contact_email: 'electricity@city.gov' },
            { name: 'Health', description: 'Handles public health and medical services', sla_days: 1, contact_email: 'health@city.gov' },
            { name: 'Transport', description: 'Handles public transport and traffic', sla_days: 5, contact_email: 'transport@city.gov' },
            { name: 'Environment', description: 'Handles pollution and environmental issues', sla_days: 7, contact_email: 'environment@city.gov' },
            { name: 'General Administration', description: 'Handles miscellaneous complaints', sla_days: 10, contact_email: 'generaladministration@city.gov' },
        ];

        for (const dept of departments) {
            await client.query(
                `INSERT INTO departments (name, description, sla_days, contact_email) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT DO NOTHING`,
                [dept.name, dept.description, dept.sla_days, dept.contact_email]
            );
        }
        console.log('Seeded departments');

        // Seed Admin User
        const adminPassword = await bcrypt.hash('admin123', 10);
        await client.query(
            `INSERT INTO users (email, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) DO UPDATE SET password = $2`,
            ['admin@city.gov', adminPassword, 'System Admin', 'admin']
        );
        console.log('Seeded admin user');

        // Seed Department Users (Reviewers)
        const deptUserPassword = await bcrypt.hash('dept123', 10);

        // Get all departments to map IDs
        const dbDepts = await client.query('SELECT id, name FROM departments');

        for (const dept of dbDepts.rows) {

            let email = '';
            const nameLower = dept.name.toLowerCase().replace(/\s+/g, '');

           
            if (dept.name === 'Water Supply') email = 'watersupply@city.gov';
            else if (dept.name === 'General Administration') email = 'generaladministration@city.gov';
            else email = `${nameLower}@city.gov`;

            await client.query(
                `INSERT INTO users (email, password, name, role, department_id) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (email) DO UPDATE SET department_id = $5, password = $2`,
                [email, deptUserPassword, `${dept.name} Staff`, 'reviewer', dept.id]
            );
            console.log(`Created/Updated User: ${email}`);
        }
        console.log('Seeded department users');

        // Seed Routing Rules
        const routingRules = [
           
            { category: 'sewage', urgency: 'critical', location: null, department: 'Sanitation', priority: 10 },
            { category: 'sewage', urgency: 'high', location: null, department: 'Sanitation', priority: 5 },
            { category: 'sewage', urgency: null, location: null, department: 'Sanitation', priority: 1 },
            { category: 'drainage', urgency: null, location: null, department: 'Public Works', priority: 1 },

          
            { category: 'water', urgency: 'critical', location: null, department: 'Water Supply', priority: 10 },
            { category: 'water', urgency: null, location: null, department: 'Water Supply', priority: 1 },

        
            { category: 'electricity', urgency: 'critical', location: null, department: 'Electricity', priority: 10 },
            { category: 'electricity', urgency: null, location: null, department: 'Electricity', priority: 1 },
            { category: 'streetlight', urgency: null, location: null, department: 'Electricity', priority: 2 },

          
            { category: 'road', urgency: null, location: null, department: 'Public Works', priority: 1 },
            { category: 'pothole', urgency: null, location: null, department: 'Public Works', priority: 2 },

         
            { category: 'garbage', urgency: null, location: null, department: 'Sanitation', priority: 1 },
            { category: 'cleanliness', urgency: null, location: null, department: 'Sanitation', priority: 1 },

          
            { category: 'health', urgency: null, location: null, department: 'Health', priority: 1 },
            { category: 'mosquito', urgency: null, location: null, department: 'Health', priority: 2 },
            { category: 'disease', urgency: 'critical', location: null, department: 'Health', priority: 10 },

            
            { category: 'transport', urgency: null, location: null, department: 'Transport', priority: 1 },
            { category: 'traffic', urgency: null, location: null, department: 'Transport', priority: 1 },

            
            { category: 'pollution', urgency: null, location: null, department: 'Environment', priority: 1 },
            { category: 'noise', urgency: null, location: null, department: 'Environment', priority: 1 },
            { category: 'tree', urgency: null, location: null, department: 'Environment', priority: 1 },

          
            { category: 'other', urgency: null, location: null, department: 'General Administration', priority: 0 },
        ];

        for (const rule of routingRules) {
            const deptResult = await client.query(
                'SELECT id FROM departments WHERE name = $1',
                [rule.department]
            );

            if (deptResult.rows.length > 0) {
                await client.query(
                    `INSERT INTO routing_rules (category, urgency, location, department_id, priority) 
           VALUES ($1, $2, $3, $4, $5)`,
                    [rule.category, rule.urgency, rule.location, deptResult.rows[0].id, rule.priority]
                );
            }
        }
        console.log('Seeded routing rules');

        await client.query('COMMIT');
        console.log('\nDatabase seeding completed!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Seeding failed:', error.message);
        throw error;
    } finally {
        client.release();
    }
};

export { seedData };

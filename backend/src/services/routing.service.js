import { query } from '../config/database.js';


class RoutingService {
   
    async findDepartment(classification) {
        const { category, urgency, location } = classification;

        try {
            // Try to find the most specific matching rule
            // Priority order: category + urgency + location > category + urgency > category > fallback

            // 1. Try exact match with all fields
            if (location) {
                const exactMatch = await query(`
          SELECT r.*, d.name as department_name, d.sla_days, d.contact_email
          FROM routing_rules r
          JOIN departments d ON r.department_id = d.id
          WHERE r.is_active = true 
            AND d.is_active = true
            AND r.category = $1 
            AND r.urgency = $2 
            AND r.location ILIKE $3
          ORDER BY r.priority DESC
          LIMIT 1
        `, [category, urgency, `%${location}%`]);

                if (exactMatch.rows.length > 0) {
                    return this.formatRouteResult(exactMatch.rows[0], 'exact_match');
                }
            }

            // 2. Try category + urgency match
            const urgencyMatch = await query(`
        SELECT r.*, d.name as department_name, d.sla_days, d.contact_email
        FROM routing_rules r
        JOIN departments d ON r.department_id = d.id
        WHERE r.is_active = true 
          AND d.is_active = true
          AND r.category = $1 
          AND r.urgency = $2
          AND r.location IS NULL
        ORDER BY r.priority DESC
        LIMIT 1
      `, [category, urgency]);

            if (urgencyMatch.rows.length > 0) {
                return this.formatRouteResult(urgencyMatch.rows[0], 'category_urgency_match');
            }

            // 3. Try category-only match
            const categoryMatch = await query(`
        SELECT r.*, d.name as department_name, d.sla_days, d.contact_email
        FROM routing_rules r
        JOIN departments d ON r.department_id = d.id
        WHERE r.is_active = true 
          AND d.is_active = true
          AND r.category = $1
          AND r.urgency IS NULL
          AND r.location IS NULL
        ORDER BY r.priority DESC
        LIMIT 1
      `, [category]);

            if (categoryMatch.rows.length > 0) {
                return this.formatRouteResult(categoryMatch.rows[0], 'category_match');
            }

            // 4. Fallback to "other" category or General Administration
            const fallbackMatch = await query(`
        SELECT r.*, d.name as department_name, d.sla_days, d.contact_email
        FROM routing_rules r
        JOIN departments d ON r.department_id = d.id
        WHERE r.is_active = true 
          AND d.is_active = true
          AND r.category = 'other'
        ORDER BY r.priority DESC
        LIMIT 1
      `);

            if (fallbackMatch.rows.length > 0) {
                return this.formatRouteResult(fallbackMatch.rows[0], 'fallback');
            }

            // 5. Ultimate fallback - General Administration
            const generalAdmin = await query(`
        SELECT id, name as department_name, sla_days, contact_email
        FROM departments
        WHERE name = 'General Administration' AND is_active = true
        LIMIT 1
      `);

            if (generalAdmin.rows.length > 0) {
                return {
                    departmentId: generalAdmin.rows[0].id,
                    departmentName: generalAdmin.rows[0].department_name,
                    slaDays: generalAdmin.rows[0].sla_days,
                    contactEmail: generalAdmin.rows[0].contact_email,
                    ruleId: null,
                    matchType: 'default_fallback',
                    ruleDescription: 'Default routing to General Administration'
                };
            }

            throw new Error('No department available for routing');

        } catch (error) {
            console.error('Routing error:', error.message);
            throw error;
        }
    }

    /**
     * Format the route result
     * @param {Object} row - Database row
     * @param {string} matchType - Type of match found
     * @returns {Object} - Formatted route result
     */
    formatRouteResult(row, matchType) {
        return {
            departmentId: row.department_id,
            departmentName: row.department_name,
            slaDays: row.sla_days,
            contactEmail: row.contact_email,
            ruleId: row.id,
            matchType: matchType,
            ruleDescription: this.describeRule(row, matchType)
        };
    }

  
    describeRule(rule, matchType) {
        let description = `Rule #${rule.id}: `;

        switch (matchType) {
            case 'exact_match':
                description += `Category '${rule.category}' + Urgency '${rule.urgency}' + Location '${rule.location}'`;
                break;
            case 'category_urgency_match':
                description += `Category '${rule.category}' + Urgency '${rule.urgency}'`;
                break;
            case 'category_match':
                description += `Category '${rule.category}'`;
                break;
            case 'fallback':
                description += `Fallback rule for unmatched category`;
                break;
            default:
                description += `Priority-based routing`;
        }

        return description + ` → ${rule.department_name}`;
    }


    calculateSLADeadline(slaDays, urgency) {
        // Adjust SLA based on urgency
        let adjustedDays = slaDays;

        switch (urgency) {
            case 'critical':
                adjustedDays = Math.max(1, Math.floor(slaDays * 0.25)); // 25% of normal SLA
                break;
            case 'high':
                adjustedDays = Math.max(1, Math.floor(slaDays * 0.5)); // 50% of normal SLA
                break;
            case 'medium':
                adjustedDays = slaDays; // Normal SLA
                break;
            case 'low':
                adjustedDays = Math.ceil(slaDays * 1.5); // 150% of normal SLA
                break;
        }

        const deadline = new Date();
        deadline.setDate(deadline.getDate() + adjustedDays);

        return deadline;
    }

 
    async getAllRules() {
        const result = await query(`
      SELECT r.*, d.name as department_name
      FROM routing_rules r
      JOIN departments d ON r.department_id = d.id
      ORDER BY r.category, r.priority DESC
    `);
        return result.rows;
    }


    async createRule(rule) {
        const { category, urgency, location, department_id, priority, is_active } = rule;

        const result = await query(`
      INSERT INTO routing_rules (category, urgency, location, department_id, priority, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [category, urgency || null, location || null, department_id, priority || 0, is_active !== false]);

        return result.rows[0];
    }

 
    async updateRule(id, updates) {
        const { category, urgency, location, department_id, priority, is_active } = updates;

        const result = await query(`
      UPDATE routing_rules
      SET category = COALESCE($1, category),
          urgency = $2,
          location = $3,
          department_id = COALESCE($4, department_id),
          priority = COALESCE($5, priority),
          is_active = COALESCE($6, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [category, urgency, location, department_id, priority, is_active, id]);

        return result.rows[0];
    }


    async deleteRule(id) {
        const result = await query('DELETE FROM routing_rules WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
}

export default new RoutingService();

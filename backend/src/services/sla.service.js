import { query, getClient } from '../config/database.js';
import explanationService from './explanation.service.js';

class SLAService {

  async calculateDeadline(departmentId, urgency) {
    // Get department SLA
    const deptResult = await query(
      'SELECT sla_days FROM departments WHERE id = $1',
      [departmentId]
    );

    if (deptResult.rows.length === 0) {
      throw new Error('Department not found');
    }

    const baseSLA = deptResult.rows[0].sla_days;

    // Adjust SLA based on urgency
    let adjustedDays = baseSLA;

    switch (urgency) {
      case 'critical':
        adjustedDays = Math.max(1, Math.floor(baseSLA * 0.25));
        break;
      case 'high':
        adjustedDays = Math.max(1, Math.floor(baseSLA * 0.5));
        break;
      case 'medium':
        adjustedDays = baseSLA;
        break;
      case 'low':
        adjustedDays = Math.ceil(baseSLA * 1.5);
        break;
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + adjustedDays);

    return deadline;
  }

  /**
   * Find all complaints that have breached SLA
   * @returns {Promise<Array>} - Array of breached complaints
   */
  async findBreachedComplaints() {
    const result = await query(`
      SELECT 
        c.*,
        d.name as department_name,
        d.sla_days as original_sla,
        d.contact_email as department_email,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.sla_deadline)) / 86400 as days_overdue,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.created_at)) / 86400 as total_age_days
      FROM complaints c
      JOIN departments d ON c.department_id = d.id
      WHERE c.status NOT IN ('resolved', 'closed', 'escalated')
        AND c.sla_deadline < CURRENT_TIMESTAMP
      ORDER BY c.sla_deadline ASC
    `);

    return result.rows;
  }

  /**
   * Escalate a complaint due to SLA breach
   * @param {Object} complaint - Complaint to escalate
   * @returns {Promise<Object>} - Escalation record
   */
  async escalateComplaint(complaint) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Find escalation target (for now, General Administration or next priority dept)
      const escalationTarget = await this.findEscalationTarget(complaint.department_id);

      // Generate AI explanation for escalation
      const explanation = await explanationService.generateEscalationExplanation({
        complaintText: complaint.text,
        originalDepartment: complaint.department_name,
        escalatedTo: escalationTarget.name,
        daysOverdue: Math.ceil(complaint.days_overdue),
        originalSLA: complaint.original_sla,
        complaintAge: Math.ceil(complaint.total_age_days)
      });

      // Create escalation record
      const escalationResult = await client.query(`
        INSERT INTO escalations (
          complaint_id, reason, escalated_from, escalated_to, genai_explanation
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        complaint.id,
        `SLA breached by ${Math.ceil(complaint.days_overdue)} days`,
        complaint.department_id,
        escalationTarget.id,
        explanation
      ]);

      // Update complaint status
      await client.query(`
        UPDATE complaints
        SET status = 'escalated',
            department_id = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [escalationTarget.id, complaint.id]);

      // Log to audit
      await client.query(`
        INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'complaint',
        complaint.id,
        'escalated',
        JSON.stringify({
          department_id: complaint.department_id,
          status: complaint.status
        }),
        JSON.stringify({
          department_id: escalationTarget.id,
          status: 'escalated',
          reason: `SLA breach - ${Math.ceil(complaint.days_overdue)} days overdue`
        })
      ]);

      await client.query('COMMIT');

      return {
        escalation: escalationResult.rows[0],
        explanation,
        escalatedTo: escalationTarget
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Escalation error:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

 
  async findEscalationTarget(currentDepartmentId) {

    const result = await query(`
      SELECT id, name, sla_days, contact_email
      FROM departments
      WHERE name = 'General Administration' AND is_active = true
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    const fallback = await query(`
      SELECT id, name, sla_days, contact_email
      FROM departments
      WHERE id != $1 AND is_active = true
      LIMIT 1
    `, [currentDepartmentId]);

    return fallback.rows[0] || null;
  }

  async getStatistics(departmentId = null) {
    let text = `
      SELECT 
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed')) as open_complaints,
        COUNT(*) FILTER (WHERE status = 'escalated') as escalated_count,
        COUNT(*) FILTER (
          WHERE status NOT IN ('resolved', 'closed', 'escalated') 
          AND sla_deadline < CURRENT_TIMESTAMP
        ) as breached,
        COUNT(*) FILTER (
          WHERE status NOT IN ('resolved', 'closed', 'escalated') 
          AND sla_deadline >= CURRENT_TIMESTAMP
          AND sla_deadline < CURRENT_TIMESTAMP + INTERVAL '1 day'
        ) as approaching,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_count,
        ROUND(
          AVG(
            CASE 
              WHEN resolved_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400
              ELSE NULL
            END
          )::numeric, 1
        ) as avg_resolution_days
      FROM complaints
    `;

    const params = [];
    if (departmentId) {
      text += ' WHERE department_id = $1';
      params.push(departmentId);
    }

    const stats = await query(text, params);
    return stats.rows[0];
  }

 
  async getApproachingDeadline(hoursThreshold = 24) {
    const result = await query(`
      SELECT 
        c.*,
        d.name as department_name,
        EXTRACT(EPOCH FROM (c.sla_deadline - CURRENT_TIMESTAMP)) / 3600 as hours_remaining
      FROM complaints c
      JOIN departments d ON c.department_id = d.id
      WHERE c.status NOT IN ('resolved', 'closed', 'escalated')
        AND c.sla_deadline > CURRENT_TIMESTAMP
        AND c.sla_deadline < CURRENT_TIMESTAMP + INTERVAL '${hoursThreshold} hours'
      ORDER BY c.sla_deadline ASC
    `);

    return result.rows;
  }
}

export default new SLAService();

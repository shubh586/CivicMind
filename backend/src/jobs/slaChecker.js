import cron from 'node-cron';
import slaService from '../services/sla.service.js';


class SLACheckerJob {
    constructor() {
        this.isRunning = false;
        this.lastRun = null;
        this.stats = {
            totalRuns: 0,
            totalEscalations: 0,
            lastEscalations: 0
        };
    }


    start() {
     
        cron.schedule('*/15 * * * *', async () => {
            await this.run();
        });

        console.log('⏰ SLA Checker job scheduled (every 15 minutes)');

        setTimeout(() => {
            this.run();
        }, 5000);
    }

    async run() {
        if (this.isRunning) {
            console.log('⚠️ SLA Checker already running, skipping...');
            return;
        }

        this.isRunning = true;
        this.stats.totalRuns++;
        this.lastRun = new Date();

        console.log('\n🔍 Running SLA breach check...');

        try {
            const breachedComplaints = await slaService.findBreachedComplaints();

            if (breachedComplaints.length === 0) {
                console.log('No SLA breaches found');
                this.stats.lastEscalations = 0;
                return;
            }

            console.log(`Found ${breachedComplaints.length} complaints with SLA breach`);

            let escalatedCount = 0;

            for (const complaint of breachedComplaints) {
                try {
                    console.log(`Escalating complaint #${complaint.id} (${Math.ceil(complaint.days_overdue)} days overdue)`);

                    await slaService.escalateComplaint(complaint);
                    escalatedCount++;

                } catch (error) {
                    console.error(`Failed to escalate complaint #${complaint.id}:`, error.message);
                }
            }

            this.stats.lastEscalations = escalatedCount;
            this.stats.totalEscalations += escalatedCount;

            console.log(`Escalated ${escalatedCount}/${breachedComplaints.length} complaints`);

        } catch (error) {
            console.error('SLA Checker error:', error.message);
        } finally {
            this.isRunning = false;
        }
    }


    getStats() {
        return {
            ...this.stats,
            lastRun: this.lastRun,
            isRunning: this.isRunning
        };
    }


    async forceRun() {
        console.log('🔄 Force running SLA check...');
        await this.run();
    }
}

const slaCheckerJob = new SLACheckerJob();

export default slaCheckerJob;

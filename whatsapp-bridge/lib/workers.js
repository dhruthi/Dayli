import { getRedis, isRedisConfigured, isRedisAvailable } from './redis.js';
import { logger } from './logger.js';

let _messageWorker = null;
let _reminderWorker = null;
let WorkerClass = null;

async function getWorkerClass() {
  if (WorkerClass) return WorkerClass;
  try {
    const mod = await import('bullmq');
    WorkerClass = mod.Worker || mod.default?.Worker;
    return WorkerClass;
  } catch {
    return null;
  }
}

/**
 * Initializes BullMQ background workers if Redis is available.
 * @param {Function} handleInboundMessage - Async function to process an inbound message job
 * @param {Function} handleReminder - Async function to process a scheduled reminder job
 */
export async function initWorkers(handleInboundMessage, handleReminder) {
  if (process.env.DISABLE_QUEUE === 'true') {
    logger.info('BullMQ workers explicitly disabled via DISABLE_QUEUE=true — running in inline mode.');
    return { messageWorker: null, reminderWorker: null };
  }

  if (!isRedisConfigured() || !isRedisAvailable()) {
    logger.info('Redis not available or quota exceeded — running inline processing mode without BullMQ workers.');
    return { messageWorker: null, reminderWorker: null };
  }

  const redis = await getRedis();
  const Worker = await getWorkerClass();
  if (!redis || !Worker) {
    logger.info('Redis or BullMQ not available — running inline processing mode.');
    return { messageWorker: null, reminderWorker: null };
  }

  try {
    if (handleInboundMessage && !_messageWorker) {
      _messageWorker = new Worker(
        'dayli-messages',
        async (job) => {
          logger.info(`[WORKER] Processing queued message job: ${job.id}`);
          return handleInboundMessage(job.data);
        },
        {
          connection: redis,
          concurrency: 10,
        }
      );

      _messageWorker.on('completed', (job) => {
        logger.debug(`[WORKER] Message job ${job.id} completed successfully`);
      });

      _messageWorker.on('failed', (job, err) => {
        logger.error(`[WORKER] Message job ${job?.id} failed:`, { error: err.message });
      });

      _messageWorker.on('error', (err) => {
        logger.warn(`[WORKER] Message worker transient error: ${err?.message || err}`);
      });
    }

    if (handleReminder && !_reminderWorker) {
      _reminderWorker = new Worker(
        'dayli-reminders',
        async (job) => {
          logger.info(`[WORKER] Processing reminder job: ${job.id}`);
          return handleReminder(job.data);
        },
        {
          connection: redis,
          concurrency: 20,
        }
      );

      _reminderWorker.on('completed', (job) => {
        logger.debug(`[WORKER] Reminder job ${job.id} completed`);
      });

      _reminderWorker.on('failed', (job, err) => {
        logger.error(`[WORKER] Reminder job ${job?.id} failed:`, { error: err.message });
      });

      _reminderWorker.on('error', (err) => {
        logger.warn(`[WORKER] Reminder worker transient error: ${err?.message || err}`);
      });
    }

    logger.info('✅ [WORKER] BullMQ workers initialized successfully');
    return { messageWorker: _messageWorker, reminderWorker: _reminderWorker };
  } catch (err) {
    logger.warn('Failed to start BullMQ workers:', { error: err.message });
    return { messageWorker: null, reminderWorker: null };
  }
}

export async function closeWorkers() {
  const promises = [];
  if (_messageWorker) {
    promises.push(_messageWorker.close());
    _messageWorker = null;
  }
  if (_reminderWorker) {
    promises.push(_reminderWorker.close());
    _reminderWorker = null;
  }
  if (promises.length > 0) {
    await Promise.all(promises);
    logger.info('🛑 [WORKER] BullMQ workers closed cleanly');
  }
}

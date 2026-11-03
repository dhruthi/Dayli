import { getRedis, isRedisConfigured, isRedisAvailable } from './redis.js';
import { logger } from './logger.js';

let _messageQueue = null;
let _reminderQueue = null;
let QueueClass = null;

async function getQueueClass() {
  if (QueueClass) return QueueClass;
  try {
    const mod = await import('bullmq');
    QueueClass = mod.Queue || mod.default?.Queue;
    return QueueClass;
  } catch {
    return null;
  }
}

export async function getMessageQueue() {
  if (process.env.DISABLE_QUEUE === 'true' || !isRedisConfigured() || !isRedisAvailable()) return null;
  if (_messageQueue) return _messageQueue;

  const redis = await getRedis();
  const Queue = await getQueueClass();
  if (!redis || !Queue) return null;

  try {
    _messageQueue = new Queue('dayli-messages', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });
    return _messageQueue;
  } catch (err) {
    logger.warn('Failed to initialize BullMQ messageQueue:', { err: err.message });
    return null;
  }
}

export async function getReminderQueue() {
  if (process.env.DISABLE_QUEUE === 'true' || !isRedisConfigured() || !isRedisAvailable()) return null;
  if (_reminderQueue) return _reminderQueue;

  const redis = await getRedis();
  const Queue = await getQueueClass();
  if (!redis || !Queue) return null;

  try {
    _reminderQueue = new Queue('dayli-reminders', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });
    return _reminderQueue;
  } catch (err) {
    logger.warn('Failed to initialize BullMQ reminderQueue:', { err: err.message });
    return null;
  }
}

export async function closeQueues() {
  if (_messageQueue) {
    await _messageQueue.close();
    _messageQueue = null;
  }
  if (_reminderQueue) {
    await _reminderQueue.close();
    _reminderQueue = null;
  }
}

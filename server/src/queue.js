import EventEmitter from 'node:events';
import { pool } from './db.js';
import { judgeSubmission } from './judge.js';

export class JudgeQueue extends EventEmitter {
  constructor(concurrency = Number(process.env.JUDGE_CONCURRENCY) || 2) {
    super();
    this.concurrency = concurrency;
    this.queue = [];
    this.runningCount = 0;
    this.subscribers = new Map(); // submissionId -> Set of SSE response objects
    this.activeJobs = new Map();  // submissionId -> current state snapshot
  }

  /**
   * Adds a submission to the queue and starts processing if workers are available.
   */
  enqueue(submission) {
    const { submissionId } = submission;
    const initialStatus = {
      submissionId,
      status: 'queued',
      verdict: 'Queued',
      position: this.queue.length + 1,
      message: `In queue (position #${this.queue.length + 1})`
    };

    this.activeJobs.set(submissionId, initialStatus);
    this.queue.push(submission);
    this.emitEvent(submissionId, 'queued', initialStatus);

    this.processNext();
    return initialStatus;
  }

  /**
   * Subscribes an HTTP SSE response stream to live updates for a specific submission.
   */
  subscribe(submissionId, res) {
    const id = Number(submissionId);
    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, new Set());
    }
    this.subscribers.get(id).add(res);

    // If job already has active state, emit immediately to the new client
    const current = this.activeJobs.get(id);
    if (current) {
      this.sendSSE(res, current.status || 'status', current);
    }

    res.on('close', () => {
      const subs = this.subscribers.get(id);
      if (subs) {
        subs.delete(res);
        if (subs.size === 0) this.subscribers.delete(id);
      }
    });
  }

  /**
   * Sends an SSE frame to a single response stream.
   */
  sendSSE(res, eventName, data) {
    try {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      // client disconnected
    }
  }

  /**
   * Emits an event to memory listeners and all connected SSE clients for a submission.
   */
  emitEvent(submissionId, eventName, data) {
    const id = Number(submissionId);
    const subs = this.subscribers.get(id);
    if (subs) {
      for (const res of subs) {
        this.sendSSE(res, eventName, data);
      }
    }
    this.emit(`submission:${id}`, { event: eventName, data });
  }

  /**
   * Gets current in-memory status if the job is active/recent.
   */
  getStatus(submissionId) {
    return this.activeJobs.get(Number(submissionId)) || null;
  }

  /**
   * Worker loop to process the next job in the queue up to concurrency limit.
   */
  async processNext() {
    if (this.runningCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    this.runningCount++;

    const { submissionId, userId, problemId, language, sourceCode, tests } = job;
    const id = Number(submissionId);

    try {
      // Mark processing in DB and memory
      await pool.execute(
        'UPDATE submissions SET status = "processing", verdict = "Processing" WHERE id = ?',
        [id]
      ).catch(() => {
        pool.execute('UPDATE submissions SET verdict = "Processing" WHERE id = ?', [id]).catch(() => {});
      });

      const processingState = {
        submissionId: id,
        status: 'processing',
        verdict: 'Processing',
        message: 'Sandbox container initialized...'
      };
      this.activeJobs.set(id, processingState);
      this.emitEvent(id, 'progress', processingState);

      // Execute in sandbox with live progress tracking
      const result = await judgeSubmission(language, sourceCode, tests, (progress) => {
        const progressState = {
          submissionId: id,
          status: 'processing',
          verdict: progress.state === 'compiling' ? 'Compiling' : 'Running',
          message: progress.message,
          testIndex: progress.testIndex,
          totalTests: progress.totalTests,
          percent: progress.percent
        };
        this.activeJobs.set(id, progressState);
        this.emitEvent(id, 'progress', progressState);
      });

      // Update database with final verdict and memory
      try {
        await pool.execute(
          'UPDATE submissions SET status = "completed", verdict = ?, runtime_ms = ?, memory_mb = ?, passed_test_cases = ?, total_test_cases = ?, error_detail = ? WHERE id = ?',
          [
            result.verdict,
            result.runtimeMs || 0,
            result.memoryMb ? Math.round(result.memoryMb) : null,
            result.passedTests || 0,
            result.totalTests || tests.length,
            result.detail || null,
            id
          ]
        );
      } catch {
        await pool.execute(
          'UPDATE submissions SET verdict = ?, runtime_ms = ? WHERE id = ?',
          [result.verdict, result.runtimeMs || 0, id]
        ).catch(() => {});
      }

      // If accepted, update solved count if not already solved by user
      if (result.verdict === 'Accepted') {
        const [prev] = await pool.execute(
          'SELECT id FROM submissions WHERE user_id = ? AND problem_id = ? AND verdict = "Accepted" AND id != ? LIMIT 1',
          [userId, problemId, id]
        );
        if (prev.length === 0) {
          await pool.execute('UPDATE problems SET solved_count = solved_count + 1 WHERE id = ?', [problemId]);
        }
      }

      const completedState = {
        submissionId: id,
        status: 'completed',
        verdict: result.verdict,
        runtimeMs: result.runtimeMs,
        memoryMb: result.memoryMb,
        passedTests: result.passedTests,
        totalTests: result.totalTests || tests.length,
        testResults: result.testResults || [],
        detail: result.detail || null,
        message: result.detail || `Judged against ${tests.length} test case(s).`
      };


      this.activeJobs.set(id, completedState);
      this.emitEvent(id, 'completed', completedState);

      // Close SSE streams after a short delay
      setTimeout(() => {
        const subs = this.subscribers.get(id);
        if (subs) {
          for (const res of subs) {
            try { res.end(); } catch {}
          }
          this.subscribers.delete(id);
        }
        // Retain active job memory for 5 minutes
        setTimeout(() => this.activeJobs.delete(id), 5 * 60 * 1000);
      }, 1000);

    } catch (error) {
      console.error(`[JudgeQueue] Error processing submission #${id}:`, error);
      const isJudgeUnavailable = error.code === 'JUDGE_UNAVAILABLE';
      const errorVerdict = isJudgeUnavailable ? 'Judge Unavailable' : 'Internal Error';
      const errorMessage = error.message || 'Judge execution failed.';

      try {
        await pool.execute(
          'UPDATE submissions SET status = "failed", verdict = ?, error_detail = ? WHERE id = ?',
          [errorVerdict, errorMessage, id]
        );
      } catch {
        await pool.execute(
          'UPDATE submissions SET verdict = ? WHERE id = ?',
          [errorVerdict, id]
        ).catch(() => {});
      }

      const failedState = {
        submissionId: id,
        status: 'failed',
        verdict: errorVerdict,
        error: errorMessage,
        message: errorMessage
      };

      this.activeJobs.set(id, failedState);
      this.emitEvent(id, 'failed', failedState);

      setTimeout(() => {
        const subs = this.subscribers.get(id);
        if (subs) {
          for (const res of subs) {
            try { res.end(); } catch {}
          }
          this.subscribers.delete(id);
        }
      }, 1000);
    } finally {
      this.runningCount--;
      // Process next queued job
      this.processNext();
    }
  }
}

export const judgeQueue = new JudgeQueue();


import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EvaluationService } from './evaluation.service';

@Processor('evaluation')
export class EvaluationProcessor extends WorkerHost {
  private readonly log = new Logger(EvaluationProcessor.name);

  constructor(private readonly evaluationService: EvaluationService) {
    super();
  }

  async process(job: Job<{ evaluationId: string }>): Promise<void> {
    this.log.log(`Job ${job.id} processing evaluation ${job.data.evaluationId}`);
    await this.evaluationService.runEvaluationJob(job.data.evaluationId);
  }
}

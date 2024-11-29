import { RMQService } from 'nestjs-rmq';

export function catched(queue: string, data: unknown): void {
  console.log(`Catched ${queue}: `, data);
}

export async function notify(
  rmqService: RMQService,
  queue: string,
  data: unknown,
): Promise<void> {
  console.log(`Notify ${queue}:`, data);
  return rmqService.notify(queue, data);
}

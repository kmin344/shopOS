import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiExcludeController()
@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /** Liveness: the process is up. */
  @Get('health')
  health() {
    return { ok: true };
  }

  /** Readiness: the database also answers. Point load balancers here. */
  @Get('ready')
  async ready() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('database unavailable');
    }
    return { ok: true };
  }
}

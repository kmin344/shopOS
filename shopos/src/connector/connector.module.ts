import { Module } from '@nestjs/common';
import { ConnectorService } from './connector.service';

@Module({
  providers: [ConnectorService]
})
export class ConnectorModule {}

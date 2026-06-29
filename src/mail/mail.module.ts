import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: 'mail' }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}

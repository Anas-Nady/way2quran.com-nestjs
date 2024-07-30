import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MessageModule } from './message/message.module';
import { RecitationModule } from './recitation/recitation.module';
import { SurahModule } from './surah/surah.module';
import { ReciterModule } from './reciter/reciter.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
    MongooseModule.forRoot(process.env.DB_URI),
    ThrottlerModule.forRoot([
      {
        limit: 1000,
        ttl: 1000 * 60 * 60, // 1 hour
      },
    ]),
    AuthModule,
    ReciterModule,
    RecitationModule,
    MessageModule,
    SurahModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

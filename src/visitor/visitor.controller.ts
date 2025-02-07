import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { VisitorService } from './visitor.service';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';

@Controller('visitor')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Get('count')
  @UseGuards(AuthGuard('jwt'))
  async getVisitorCount() {
    return this.visitorService.getVisitorCount();
  }

  @Throttle({ default: { limit: 1, ttl: 3600 } })
  @Post('track')
  async logVisitorTracking(
    @Req() req: Request,
    @Query('visitorId') visitorId: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const ipAddress =
      req.query.userIP || req.headers['x-forwarded-for'] || req.ip;
    return this.visitorService.logVisitorTracking(
      ipAddress as string,
      userAgent,
      visitorId,
    );
  }
}

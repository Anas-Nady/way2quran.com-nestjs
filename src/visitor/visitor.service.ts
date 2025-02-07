import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Visitor } from './visitor.schema';

@Injectable()
export class VisitorService {
  constructor(
    @InjectModel(Visitor.name) private visitorModel: Model<Visitor>,
  ) {}

  private getDateRanges() {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthlyEnd.setHours(23, 59, 59, 999);

    const dayOfMonth = now.getDate();
    const weekIndex = Math.floor((dayOfMonth - 1) / 7);

    const weeklyStart = new Date(monthlyStart);
    weeklyStart.setDate(1 + weekIndex * 7);
    weeklyStart.setHours(0, 0, 0, 0);

    const weeklyEnd = new Date(weeklyStart);
    weeklyEnd.setDate(weeklyStart.getDate() + 6);
    weeklyEnd.setHours(23, 59, 59, 999);

    if (weeklyEnd > monthlyEnd) {
      weeklyEnd.setTime(monthlyEnd.getTime());
    }

    const yearlyStart = new Date(now.getFullYear(), 0, 1);

    const yearlyEnd = new Date(now.getFullYear(), 11, 31);
    yearlyEnd.setHours(23, 59, 59, 999);

    return {
      today: { start: todayStart, end: todayEnd },
      weekly: { start: weeklyStart, end: weeklyEnd },
      monthly: { start: monthlyStart, end: monthlyEnd },
      yearly: { start: yearlyStart, end: yearlyEnd },
    };
  }

  async getVisitorCount() {
    const ranges = this.getDateRanges();

    const todayCount = await this.visitorModel.countDocuments({
      visitDate: { $gte: ranges.today.start, $lt: ranges.today.end },
    });

    const weeklyCount = await this.visitorModel.countDocuments({
      visitDate: { $gte: ranges.weekly.start, $lt: ranges.weekly.end },
    });

    const monthlyCount = await this.visitorModel.countDocuments({
      visitDate: { $gte: ranges.monthly.start, $lt: ranges.monthly.end },
    });

    const yearlyCount = await this.visitorModel.countDocuments({
      visitDate: { $gte: ranges.yearly.start, $lt: ranges.yearly.end },
    });

    const totalCount = await this.visitorModel.countDocuments({});

    return {
      today: todayCount,
      weekly: weeklyCount,
      monthly: monthlyCount,
      yearly: yearlyCount,
      total: totalCount,
    };
  }

  async logVisitorTracking(
    ipAddress: string,
    userAgent: string,
    visitorId: string,
  ) {
    try {
      const visitor = await this.visitorModel.create({
        ipAddress,
        userAgent,
        visitorId,
      });

      if (!visitor) {
        throw new HttpException('Invalid data input.', 400);
      }
      return { status: 'success' };
    } catch (error) {
      throw new HttpException(
        `Failed to log visitor tracking, ${error.message}`,
        error.status,
      );
    }
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateGuestReportDto } from './dto/create-guest-report.dto';
import {
  ListGuestReportsQueryDto,
  UpdateGuestReportDto,
} from './dto/guest-report-status.dto';
import { GuestReportsService } from './guest-reports.service';

// Guests report each other here; reading and handling the reports is for
// admins (the host dashboard's Guest reports page).
@ApiTags('reports')
@Controller('reports/guests')
export class GuestReportsController {
  constructor(private readonly guestReports: GuestReportsService) {}

  /** POST /reports/guests: report a guest. It also blocks them. */
  @Post()
  async createReport(
    @UserId() userId: string,
    @Body() body: CreateGuestReportDto,
  ) {
    return this.guestReports.createReport(userId, body);
  }

  @Get()
  @UseGuards(AdminGuard)
  async listReports(@Query() query: ListGuestReportsQueryDto) {
    return this.guestReports.listReports(query.status);
  }

  @Get('summary')
  @UseGuards(AdminGuard)
  async getSummary() {
    return this.guestReports.pendingCount();
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async updateReport(
    @UserId() adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateGuestReportDto,
  ) {
    return this.guestReports.updateStatus(id, body.status, adminId);
  }
}

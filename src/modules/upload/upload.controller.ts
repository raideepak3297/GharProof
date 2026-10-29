import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { IUpload } from './interfaces/upload.interface';
import { UploadService } from './upload.service';

@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ): Promise<IUpload> {
    return this.uploadService.processSingleUpload(file, user.userId);
  }

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('batch')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadBatch(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: JwtPayload,
  ): Promise<IUpload[]> {
    return this.uploadService.processMultipleUploads(files, user.userId);
  }

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  async getUploadMetadata(@Param('id') id: string): Promise<IUpload> {
    return this.uploadService.getUploadById(id);
  }

  @Get(':id/view')
  async viewFile(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { diskPath, mimeType, originalName } = await this.uploadService.getFilePath(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
    res.sendFile(diskPath);
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canReadCrm, canWriteCrmRecords, normalizeVelonRole } from '@velon/shared';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CompanyLibraryAssetRepository,
  CrmContentBlockRepository,
} from './crm-company-assets.repositories';
import type {
  CompanyLibraryAssetQueryDto,
  CreateCompanyLibraryAssetDto,
  CreateCrmContentBlockDto,
  CrmContentBlockQueryDto,
} from './dto/crm-company-assets.dto';

const MAX_ASSET_BYTES = 15 * 1024 * 1024;

@Injectable()
export class CrmCompanyAssetsService {
  constructor(
    private readonly assets: CompanyLibraryAssetRepository,
    private readonly contentBlocks: CrmContentBlockRepository,
  ) {}

  private assertRead(user: AuthenticatedUser) {
    if (!canReadCrm(normalizeVelonRole(user.role))) {
      throw new ForbiddenException('CRM access denied.');
    }
  }

  private assertWrite(user: AuthenticatedUser) {
    if (!canWriteCrmRecords(normalizeVelonRole(user.role))) {
      throw new ForbiddenException('CRM write access denied.');
    }
  }

  listAssets(user: AuthenticatedUser, query: CompanyLibraryAssetQueryDto) {
    this.assertRead(user);
    return this.assets.findMany({
      category: query.category,
      search: query.search,
    });
  }

  async createAsset(user: AuthenticatedUser, dto: CreateCompanyLibraryAssetDto) {
    this.assertWrite(user);
    const fileContent = this.decodeBase64(dto.fileBase64);
    if (fileContent.length > MAX_ASSET_BYTES) {
      throw new BadRequestException('File exceeds maximum size of 15 MB.');
    }
    return this.assets.create({
      name: dto.name.trim(),
      category: dto.category,
      description: dto.description?.trim() || null,
      mimeType: dto.mimeType.trim(),
      fileName: dto.fileName.trim(),
      sizeBytes: fileContent.length,
      fileContent: new Uint8Array(fileContent),
      contentJson: dto.contentJson as object | undefined,
      uploadedById: user.id,
    });
  }

  async deleteAsset(user: AuthenticatedUser, id: string) {
    this.assertWrite(user);
    const row = await this.assets.findById(id);
    if (!row) throw new NotFoundException('Asset not found.');
    await this.assets.delete(id);
    return { deleted: true };
  }

  async downloadAsset(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const row = await this.assets.findByIdWithContent(id);
    if (!row) throw new NotFoundException('Asset not found.');
    return {
      buffer: Buffer.from(row.fileContent),
      fileName: row.fileName,
      mimeType: row.mimeType,
    };
  }

  listContentBlocks(user: AuthenticatedUser, query: CrmContentBlockQueryDto) {
    this.assertRead(user);
    return this.contentBlocks.findMany({
      category: query.category,
      search: query.search,
    });
  }

  createContentBlock(user: AuthenticatedUser, dto: CreateCrmContentBlockDto) {
    this.assertWrite(user);
    return this.contentBlocks.create({
      name: dto.name.trim(),
      category: dto.category?.trim() || 'GENERAL',
      description: dto.description?.trim() || null,
      contentJson: dto.contentJson as object,
    });
  }

  async deleteContentBlock(user: AuthenticatedUser, id: string) {
    this.assertWrite(user);
    const row = await this.contentBlocks.findById(id);
    if (!row) throw new NotFoundException('Content block not found.');
    await this.contentBlocks.delete(id);
    return { deleted: true };
  }

  private decodeBase64(input: string): Buffer {
    const raw = input.includes(',') ? (input.split(',').pop() ?? input) : input;
    const trimmed = raw.trim();
    if (!trimmed) throw new BadRequestException('File content is empty.');
    try {
      return Buffer.from(trimmed, 'base64');
    } catch {
      throw new BadRequestException('Invalid base64 file content.');
    }
  }
}

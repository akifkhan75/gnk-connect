import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get('groups')
  async getGroups() {
    const groups = await this.catalogService.getPublishedGroups();
    return { data: groups };
  }

  @Public()
  @Get('groups/:id')
  async getGroupDetails(@Param('id') id: string) {
    const group = await this.catalogService.getGroupDetails(id);
    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
    return { data: group };
  }
}

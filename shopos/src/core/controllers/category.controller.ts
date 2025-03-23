import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CategoryService } from '../services/category.service';
import { CreateCategoryInput } from '../dto/create-category.input';
import { UpdateCategoryInput } from '../dto/update-category.input';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiBody({ type: CreateCategoryInput })
  @ApiResponse({ status: 201, description: 'Category created successfully.' })
  create(@Body() createCategoryInput: CreateCategoryInput) {
    return this.categoryService.create(createCategoryInput);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Return all categories.' })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by id' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Return the category.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiBody({ type: UpdateCategoryInput })
  @ApiResponse({ status: 200, description: 'Category updated successfully.' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryInput: UpdateCategoryInput,
  ) {
    return this.categoryService.update(id, updateCategoryInput);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}

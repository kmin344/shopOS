import { InputType, Field } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

@InputType()
export class CreateCategoryInput {
  @ApiProperty({ description: 'Category name' })
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Category description', required: false })
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}

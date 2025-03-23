import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

@InputType()
export class CreateProductInput {
  @ApiProperty({ description: 'Product name' })
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Product description', required: false })
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Product price', minimum: 0 })
  @Field(() => Float)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Product stock quantity', minimum: 0 })
  @Field(() => Int)
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ description: 'Category ID' })
  @Field()
  @IsNotEmpty()
  categoryId: string;
}

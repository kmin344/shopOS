import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsUUID,
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
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99) // fits the decimal(10,2) column
  price: number;

  @ApiProperty({ description: 'Product stock quantity', minimum: 0 })
  @Field(() => Int)
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ description: 'Category ID' })
  @Field()
  @IsUUID()
  categoryId: string;
}

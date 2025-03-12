import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { FieldType, EntityType } from '../entities/custom-field.entity';

@InputType()
export class CreateCustomFieldInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field(() => FieldType)
  @IsEnum(FieldType)
  fieldType: FieldType;

  @Field(() => EntityType)
  @IsEnum(EntityType)
  entityType: EntityType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  enumValues?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @Field()
  @IsBoolean()
  isRequired: boolean;
}

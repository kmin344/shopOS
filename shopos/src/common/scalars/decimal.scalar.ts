import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { ApiProperty } from '@nestjs/swagger';

export class DecimalModel {
  @ApiProperty({
    description: 'Decimal number with 2 decimal places',
    example: 99.99,
    type: 'number',
    format: 'float',
  })
  value: number;
}

@Scalar('Decimal')
export class DecimalScalar implements CustomScalar<number, number> {
  description = 'Decimal custom scalar type';

  parseValue(value: number): number {
    return Number(value.toFixed(2));
  }

  serialize(value: number): number {
    return Number(value.toFixed(2));
  }

  parseLiteral(ast: ValueNode): number {
    if (ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
      return Number(Number(ast.value).toFixed(2));
    }
    return null;
  }
}

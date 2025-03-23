import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { ApiProperty } from '@nestjs/swagger';

export class DateModel {
  @ApiProperty({
    description: 'Unix timestamp in milliseconds',
    example: 1647356400000,
  })
  timestamp: number;
}

@Scalar('Date', () => Date)
export class DateScalar implements CustomScalar<number, Date> {
  description = 'Date custom scalar type';

  parseValue(value: number): Date {
    return new Date(value);
  }

  serialize(value: Date): number {
    return value.getTime();
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value, 10));
    }
    return null;
  }
}

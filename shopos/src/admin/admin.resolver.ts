import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class AdminResolver {
  /** Lets a client check an admin key. The global guard rejects the call when the key is wrong. */
  @Query(() => Boolean)
  adminKeyValid(): boolean {
    return true;
  }
}

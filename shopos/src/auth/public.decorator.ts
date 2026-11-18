import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'shopos:isPublic';

/** Opens a route or resolver to callers without an admin key. Everything else requires one. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

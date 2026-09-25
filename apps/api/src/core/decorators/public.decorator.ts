import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../modules/auth/guards/realm-auth.guard';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

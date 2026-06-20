import { Platform } from '@prisma/client';
import { MockSocialAdapter } from './mock-social.adapter';
import { SocialPlatformAdapter } from '../types';

export function getAdapter(platform: Platform): SocialPlatformAdapter {
  // Production note: switch on process.env.PUBLISHING_MODE and return real adapters here.
  // The rest of the application does not need to change.
  return new MockSocialAdapter(platform);
}

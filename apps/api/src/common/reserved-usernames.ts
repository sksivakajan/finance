// Shared between the auth module (registration) and the user module
// (availability check) so the two never disagree about what's reserved.
export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'support',
  'system',
  'moderator',
  'staff',
  'official',
  'help',
  'api',
  'null',
  'undefined',
  'finance',
  'security',
]);

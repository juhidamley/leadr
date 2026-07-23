/**
 * Object path convention enforced by the avatars storage RLS policies:
 * avatars/{auth.uid()}/... — the leading folder segment must equal the
 * caller's own uid, or every storage.objects policy denies the write.
 */
export function buildAvatarPath(userId: string, extension: string): string {
  return `${userId}/avatar.${extension}`
}

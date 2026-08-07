import { createClient } from '@/lib/supabase/server';
import MediaManager from './MediaManager';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  const db = createClient();
  const { data: files } = await db.storage.from('trip-images').list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  const items = (files ?? [])
    .filter((f) => f.name !== '.emptyFolderPlaceholder')
    .map((f) => {
      const { data } = db.storage.from('trip-images').getPublicUrl(f.name);
      return {
        name: f.name,
        url: data.publicUrl,
        size: (f.metadata as any)?.size ?? 0,
        createdAt: f.created_at,
      };
    });

  return <MediaManager items={items} />;
}

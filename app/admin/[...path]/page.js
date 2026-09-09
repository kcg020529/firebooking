import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { recordUnknownAdminPath } from '@/lib/security/authz';

export default async function UnknownAdminPage() {
  const headerList = await headers();
  const path = headerList.get('x-pathname') ?? '/admin/unknown';
  const user = await getCurrentUser();

  await recordUnknownAdminPath({ path, user });
  notFound();
}

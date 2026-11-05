// Versioned Terms & Conditions documents — admin-editable via the CMS
// (components/admin/TncAdmin.tsx), read by the agent agreement gate
// (accept_agreement / get_my_agreement in actions/users.ts read the active
// version through getActiveTncVersion(), actions/b2bSettings.ts).
import { callGateway } from './db';

export interface SpTncDocument {
  id: string;
  doc_version: string;
  title: string;
  content: string;
  is_active: boolean;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getActiveTnc(): Promise<Pick<SpTncDocument, 'doc_version' | 'title' | 'content' | 'published_at'> | null> {
  const { data, error } = await callGateway('get_active_tnc', {});
  if (error) { console.error('getActiveTnc:', error); return null; }
  return data ?? null;
}

export async function adminListTncDocuments(): Promise<SpTncDocument[]> {
  const { data, error } = await callGateway('admin_list_tnc_documents', {});
  if (error) { console.error('adminListTncDocuments:', error); return []; }
  return (data ?? []) as SpTncDocument[];
}

export async function adminSaveTncDocument(input: { id?: string; doc_version: string; title: string; content: string }): Promise<SpTncDocument | null> {
  const { data, error } = await callGateway('admin_save_tnc_document', input);
  if (error) { console.error('adminSaveTncDocument:', error); return null; }
  return data as SpTncDocument;
}

export async function adminPublishTncDocument(id: string): Promise<SpTncDocument | null> {
  const { data, error } = await callGateway('admin_publish_tnc_document', { id });
  if (error) { console.error('adminPublishTncDocument:', error); return null; }
  return data as SpTncDocument;
}

export async function adminDeleteTncDocument(id: string): Promise<boolean> {
  const { error } = await callGateway('admin_delete_tnc_document', { id });
  if (error) { console.error('adminDeleteTncDocument:', error); return false; }
  return true;
}

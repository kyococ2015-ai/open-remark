export type ClientCommentStatus = 'APPROVED' | 'PENDING' | 'SPAM' | 'DELETED';

export async function patchCommentStatus(id: string, status: ClientCommentStatus) {
  const res = await fetch(`/api/v1/comments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update comment status');
}

export async function patchCommentBody(id: string, body: string) {
  const res = await fetch(`/api/v1/comments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error('Failed to update comment body');
}

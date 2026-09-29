import { useEffect, useState } from 'react';

/** Loads a protected file (bearer-authenticated) into an object URL for <img>/<iframe>. */
export function useFileUrl(load: (() => Promise<Blob>) | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!load) return;
    let revoked = false;
    let objectUrl: string | null = null;
    load()
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setType(blob.type);
        setUrl(objectUrl);
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [load]);
  return { url, type, error };
}

export async function openBlob(load: () => Promise<Blob>) {
  const url = URL.createObjectURL(await load());
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

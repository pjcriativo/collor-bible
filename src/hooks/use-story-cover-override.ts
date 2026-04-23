import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cache: Record<string, string> | null = null;
let pending: Promise<Record<string, string>> | null = null;
const subscribers = new Set<(map: Record<string, string>) => void>();

async function load(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (pending) return pending;
  pending = (async () => {
    const { data, error } = await supabase
      .from("story_cover_overrides")
      .select("story_slug, image_url");
    const map: Record<string, string> = {};
    if (!error && data) for (const r of data) map[r.story_slug] = r.image_url;
    cache = map;
    pending = null;
    subscribers.forEach((fn) => fn(map));
    return map;
  })();
  return pending;
}

export function useStoryCoverOverride(slug: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() =>
    slug && cache ? (cache[slug] ?? null) : null,
  );
  useEffect(() => {
    if (!slug) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    load().then((map) => {
      if (!cancelled) setUrl(map[slug] ?? null);
    });
    const fn = (map: Record<string, string>) => {
      if (!cancelled) setUrl(map[slug] ?? null);
    };
    subscribers.add(fn);
    return () => {
      cancelled = true;
      subscribers.delete(fn);
    };
  }, [slug]);
  return url;
}

export function invalidateStoryCoverOverrides() {
  cache = null;
  pending = null;
}

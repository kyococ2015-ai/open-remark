'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

const DEBOUNCE_MS = 300;

export function UserSearchInput() {
  const router = useRouter();
  const pathname = usePathname();

  const [value, setValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    (query: string) => {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set('search', query.trim());
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      doSearch(next);
    }, DEBOUNCE_MS);
  }

  function handleClear() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setValue('');
    doSearch('');
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search by name, email..."
        className="pl-9 pr-9 w-64"
        value={value}
        onChange={handleChange}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { recordDeveloperClick } from '@/src/features/onboarding/developer-gesture';

export default function DeveloperHotspot() {
  const router = useRouter();
  const clicks = useRef<number[]>([]);

  return (
    <span
      className="developer-hotspot"
      aria-hidden="true"
      onClick={() => {
        const result = recordDeveloperClick(clicks.current, Date.now());
        clicks.current = result.clicks;
        if (result.activated) router.push('/dev');
      }}
    />
  );
}

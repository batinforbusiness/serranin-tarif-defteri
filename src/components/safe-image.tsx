"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type SafeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
};

export function SafeImage({ src, alt, className, fallback }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <>{fallback ?? null}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

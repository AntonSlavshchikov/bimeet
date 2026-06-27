"use client";
import { useId } from "react";

interface BrandMarkProps {
  /** Сторона квадрата в px. */
  size?: number;
  className?: string;
}

/**
 * Логотип Bimeet — два сплетённых кольца в графитовом градиенте, без плитки.
 * Лендинг светлый, поэтому цвета фиксированы (тёмное + серебро).
 */
export default function BrandMark({ size = 34, className }: BrandMarkProps) {
  const id = useId();
  const r1 = `${id}-r1`;
  const r2 = `${id}-r2`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id={r1} gradientUnits="userSpaceOnUse" x1="32.8" y1="25.4" x2="67.2" y2="74.6">
          <stop offset="0" stopColor="#0B0C0E" />
          <stop offset="1" stopColor="#3A4250" />
        </linearGradient>
        <linearGradient id={r2} gradientUnits="userSpaceOnUse" x1="32.8" y1="25.4" x2="67.2" y2="74.6">
          <stop offset="0" stopColor="#5A6473" />
          <stop offset="1" stopColor="#AEB6C2" />
        </linearGradient>
      </defs>
      <g transform="translate(50 50) scale(1.42) translate(-50 -50)">
        <circle cx="39" cy="50" r="16" fill="none" stroke={`url(#${r1})`} strokeWidth="11" />
        <circle cx="61" cy="50" r="16" fill="none" stroke={`url(#${r2})`} strokeWidth="11" />
        <path
          d="M54.86 52.09 A16 16 0 0 1 40.26 65.95"
          fill="none"
          stroke={`url(#${r1})`}
          strokeWidth="11"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

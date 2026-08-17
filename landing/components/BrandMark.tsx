interface BrandMarkProps {
  /** Ширина фирменного знака в px. */
  size?: number;
  className?: string;
}

/** Цветной знак Bimeet из единого landing-asset. */
export default function BrandMark({ size = 34, className }: BrandMarkProps) {
  return (
    <img
      src="/logo-mark.svg"
      width={size}
      height={Math.round((size * 534) / 914)}
      className={className}
      alt=""
      aria-hidden="true"
    />
  );
}

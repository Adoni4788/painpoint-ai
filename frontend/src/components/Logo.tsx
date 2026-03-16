interface LogoProps {
  className?: string;
  size?: number;
  color?: string;
  /** "brand" = teal→orange, "primary" = indigo→violet→purple */
  gradient?: "brand" | "primary";
}

const GRADIENTS = {
  brand: [
    { offset: "0%",   stopColor: "#4d7c7a" },
    { offset: "100%", stopColor: "#f97316" },
  ],
  primary: [
    { offset: "0%",   stopColor: "#6366f1" },
    { offset: "50%",  stopColor: "#8b5cf6" },
    { offset: "100%", stopColor: "#a855f7" },
  ],
};

export function Logo({ className = "", size = 28, color, gradient }: LogoProps) {
  const gradId = gradient ? `logo-grad-${gradient}` : undefined;
  const stops = gradient ? GRADIENTS[gradient] : null;

  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{ width: size, height: size, color: color ?? "currentColor" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 150 150"
        width={size}
        height={size}
        style={{ display: "block", width: size, height: size }}
        shapeRendering="geometricPrecision"
        aria-hidden
      >
        {stops && gradId && (
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              {stops.map((s) => (
                <stop key={s.offset} offset={s.offset} stopColor={s.stopColor} />
              ))}
            </linearGradient>
          </defs>
        )}
        <path
          fill={gradId ? `url(#${gradId})` : "currentColor"}
          d="M11.36,147.19.4,136.24l15.34-15.33A75,75,0,1,1,146.23,51.5H129.5A59.35,59.35,0,1,0,26.9,109.74l9.92-9.92A45.54,45.54,0,1,1,114,51.5H93.48a29.9,29.9,0,1,0,10.41,31.24H75V67.26l44.88-.05a45.54,45.54,0,0,1-69.27,46.25c-1.11-.72-2.2-1.47-3.25-2.27Z"
        />
        <path
          fill={gradId ? `url(#${gradId})` : "currentColor"}
          d="M150,75A75,75,0,0,1,32.31,136.62a.33.33,0,0,1-.1-.06l11.27-11.28.1.06A59.33,59.33,0,0,0,134.36,75a60.67,60.67,0,0,0-.51-7.79H149.6A77.09,77.09,0,0,1,150,75Z"
        />
      </svg>
    </span>
  );
}

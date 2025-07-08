export default function Tooltip({ label, children }) {
  return (
    <div className="relative group inline-block">
      {children}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform duration-150 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20">
        {label}
      </span>
    </div>
  );
} 
// Isotipo editorial a medida: sobre con sello geométrico, trazo fino.
export default function AlmaIsotipo({ size = 48, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Invita con el Alma"
    >
      <rect x="6.5" y="11.5" width="35" height="25" rx="2.2" stroke="currentColor" strokeWidth="1.1" />
      <path d="M6.5 13.5 24 26l17.5-12.5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M6.5 34.5 18.5 25M41.5 34.5 29.5 25" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="5.6" stroke="currentColor" strokeWidth="1.1" />
      <path d="M24 20.6 26.8 24 24 27.4 21.2 24 24 20.6Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M24 11.5v2.2M24 34.5v2.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

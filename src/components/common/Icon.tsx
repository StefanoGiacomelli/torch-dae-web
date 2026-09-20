export type IconName = 'book' | 'flask' | 'layers' | 'tag';

interface Props {
  name: IconName;
  size?: number;
}

/** A small first-party inline SVG icon set (stroke-based, `currentColor`), replacing the
 * heterogeneous emoji previously used in the footer strip. Purely decorative/labeling — the
 * adjacent text always carries the actual meaning. */
export function Icon({ name, size = 18 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };
  switch (name) {
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
          <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
        </svg>
      );
    case 'flask':
      return (
        <svg {...common}>
          <path d="M9 3h6" />
          <path d="M10 3v6.2L4.8 18a2 2 0 0 0 1.75 3h10.9a2 2 0 0 0 1.75-3L14 9.2V3" />
          <path d="M7.5 15h9" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...common}>
          <path d="M12.6 3H5a2 2 0 0 0-2 2v7.6a2 2 0 0 0 .6 1.42l8.38 8.38a2 2 0 0 0 2.83 0l6.77-6.77a2 2 0 0 0 0-2.83L13.2 3.6A2 2 0 0 0 12.6 3Z" />
          <circle cx="8.5" cy="8.5" r="1.25" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

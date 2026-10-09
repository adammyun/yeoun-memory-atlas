import type { AnchorHTMLAttributes, ReactNode } from 'react';

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string | { pathname?: string; query?: Record<string, string> };
  children?: ReactNode;
};

function hrefValue(href: LinkProps['href']) {
  if (typeof href === 'string') return href;
  const pathname = href.pathname ?? '/';
  const query = new URLSearchParams(href.query).toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}

export default function Link({ href, children, ...props }: LinkProps) {
  const value = hrefValue(href);
  const resolved = value.startsWith('/') ? `#${value}` : value;
  return (
    <a href={resolved} {...props}>
      {children}
    </a>
  );
}


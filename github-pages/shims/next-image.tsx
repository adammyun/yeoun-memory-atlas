import type { ImgHTMLAttributes } from 'react';

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  unoptimized?: boolean;
  priority?: boolean;
};

export default function Image({ unoptimized: _unoptimized, priority: _priority, ...props }: ImageProps) {
  void _unoptimized;
  void _priority;
  // The GitHub Pages build has no image optimizer server. Every caller still
  // supplies an accessible alt value and uploaded images were resized before storage.
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...props} />;
}

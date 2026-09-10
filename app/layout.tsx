import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: '여운 — 기억이 머무는 지도',
  description:
    '같은 장소, 서로 다른 이야기. 장소에 남겨진 기억을 발견하고 나만의 순간을 기록하세요.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

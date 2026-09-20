import Link from 'next/link';
import { chatGPTSignInPath } from '@/app/chatgpt-auth';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next ?? '/';
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand auth-brand" href="/"><span className="brand-mark">◌</span><b>여운</b></Link>
        <p className="eyebrow">SIGN IN</p>
        <h1>내 기억을 이어서 기록하세요</h1>
        <p>ChatGPT 계정으로 안전하게 로그인합니다. 비밀번호를 별도로 저장하지 않습니다.</p>
        <a className="auth-submit" href={chatGPTSignInPath(next)} target="_top">ChatGPT로 계속</a>
        <Link className="auth-back" href="/">지도로 돌아가기</Link>
      </section>
    </main>
  );
}

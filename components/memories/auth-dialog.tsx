'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSupabase } from '@/lib/supabase';
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react';
export default function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const configured = !!getSupabase();
  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const db = getSupabase();
    if (!db || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result =
        mode === 'login'
          ? await db.auth.signInWithPassword({ email, password })
          : await db.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: window.location.origin },
            });
      if (result.error) throw result.error;
      if (result.data.session) {
        setPassword('');
        onOpenChange(false);
      } else
        setMessage(
          '확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.',
        );
    } catch {
      setMessage(
        mode === 'login'
          ? '로그인하지 못했어요. 이메일과 비밀번호, 이메일 인증 여부를 확인해 주세요.'
          : '가입하지 못했어요. 입력 내용을 확인하거나 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          onOpenChange(v);
          setMessage('');
        }
      }}
    >
      <DialogContent className="auth-dialog">
        <div className="auth-symbol">
          <Mail size={25} />
        </div>
        <DialogTitle className="modal-heading">
          나의 기억이 머무는 곳
        </DialogTitle>
        <DialogDescription>
          소중한 순간을 기록하고, 언제든 다시 찾아오세요.
        </DialogDescription>
        {configured ? (
          <>
            <Tabs
              value={mode}
              onValueChange={(v) => {
                setMode(String(v));
                setMessage('');
              }}
            >
              <TabsList className="auth-tabs">
                <TabsTrigger value="login">로그인</TabsTrigger>
                <TabsTrigger value="signup">회원가입</TabsTrigger>
              </TabsList>
            </Tabs>
            <form className="memory-form" onSubmit={submit}>
              <label>
                이메일
                <input
                  autoComplete="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@example.com"
                />
              </label>
              <label>
                비밀번호
                <input
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  type="password"
                  minLength={8}
                  maxLength={72}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8자 이상"
                />
              </label>
              <button className="primary full" disabled={busy}>
                {busy
                  ? '잠시만 기다려 주세요'
                  : mode === 'login'
                    ? '로그인'
                    : '계정 만들기'}
                <ArrowRight size={17} />
              </button>
            </form>
          </>
        ) : (
          <div className="connection-note">
            <ShieldCheck size={21} />
            <div>
              <strong>지금은 미리보기 중이에요</strong>
              <p>
                계정 연결을 준비하고 있어요.
                <br />
                예시 기억을 둘러보거나 기록 화면을 살펴보세요. 아직 기억은
                저장되지 않습니다.
              </p>
            </div>
          </div>
        )}
        {message && <output className="form-message">{message}</output>}
        <p className="privacy-footnote">
          <ShieldCheck size={14} />
          내가 공개한 기억만 다른 사람에게 보여요.
        </p>
      </DialogContent>
    </Dialog>
  );
}

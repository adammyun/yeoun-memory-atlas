'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  Map,
  MapPin,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import {
  isOnboardingCompleted,
  resetOnboarding,
} from '@/src/features/onboarding/storage';

type DevToolsProps = {
  databaseConfigured: boolean;
  panoramaConfigured: boolean;
};

const demoPlaces = [
  {
    name: '태화강 국가정원',
    note: '한 장소의 여러 기억과 그룹 마커 확인',
  },
  { name: '울산대공원', note: '도심 공원 기억 확인' },
  { name: '대왕암공원', note: '동쪽 해안의 떨어진 기억 확인' },
  { name: '성남동 문화의거리', note: '근사 위치 공개 기억 확인' },
];

export default function DevTools({
  databaseConfigured,
  panoramaConfigured,
}: DevToolsProps) {
  const router = useRouter();
  const [tutorialComplete, setTutorialComplete] = useState<boolean | null>(null);
  const [resetMessage, setResetMessage] = useState('');
  const [geolocationAvailable, setGeolocationAvailable] = useState(false);

  useEffect(() => {
    // Browser-only capability and local completion state become available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTutorialComplete(isOnboardingCompleted(window.localStorage));
    setGeolocationAvailable('geolocation' in navigator);
  }, []);

  function startTutorial() {
    resetOnboarding(window.localStorage);
    router.push('/?tutorial=1');
  }

  function resetTutorial() {
    resetOnboarding(window.localStorage);
    setTutorialComplete(false);
    setResetMessage('완료 기록을 초기화했어요. 다음 지도 방문에서 안내가 시작됩니다.');
  }

  return (
    <main className="dev-page">
      <div className="dev-shell">
        <header className="dev-header">
          <div>
            <span className="eyebrow">LOCAL EXPERIENCE TOOLS</span>
            <h1>여운 개발 도구</h1>
            <p>
              시연 흐름과 브라우저 기능 상태를 확인하는 안전한 보조 화면입니다.
              관리자 권한이나 데이터 접근 권한을 제공하지 않습니다.
            </p>
          </div>
          <Link href="/" className="dev-back-link">
            <ArrowLeft size={17} /> 지도로 돌아가기
          </Link>
        </header>

        <section className="dev-card dev-tour-card">
          <div className="dev-card-heading">
            <BookOpen size={20} />
            <div>
              <h2>첫 사용자 튜토리얼</h2>
              <p>실제 지도 화면에서 열 단계 안내를 다시 확인합니다.</p>
            </div>
          </div>
          <div className="dev-state-line">
            <span>현재 브라우저 완료 상태</span>
            <strong>
              {tutorialComplete === null
                ? '확인 중'
                : tutorialComplete
                  ? '완료'
                  : '미완료'}
            </strong>
          </div>
          <div className="dev-actions">
            <button type="button" className="dev-primary" onClick={startTutorial}>
              <BookOpen size={17} /> 튜토리얼 시작
            </button>
            <button type="button" className="dev-secondary" onClick={resetTutorial}>
              <RotateCcw size={17} /> 완료 상태 초기화
            </button>
          </div>
          {resetMessage && <output className="dev-message">{resetMessage}</output>}
        </section>

        <div className="dev-grid">
          <section className="dev-card">
            <div className="dev-card-heading">
              <ExternalLink size={20} />
              <div>
                <h2>화면 바로가기</h2>
                <p>주요 사용자 흐름을 빠르게 확인합니다.</p>
              </div>
            </div>
            <nav className="dev-links" aria-label="시연 화면 바로가기">
              <Link href="/"><Map size={17} /> 공개 지도</Link>
              <Link href="/my-map"><UserRound size={17} /> 내 기억 지도</Link>
              <Link href="/login"><ExternalLink size={17} /> 로그인</Link>
              <Link href="/signup"><ExternalLink size={17} /> 회원가입 안내</Link>
            </nav>
          </section>

          <section className="dev-card">
            <div className="dev-card-heading">
              <CheckCircle2 size={20} />
              <div>
                <h2>환경 상태</h2>
                <p>설정값의 내용 없이 사용 가능 여부만 표시합니다.</p>
              </div>
            </div>
            <dl className="dev-status-list">
              <div>
                <dt>데이터베이스 연결</dt>
                <dd className={databaseConfigured ? 'ready' : 'missing'}>
                  {databaseConfigured ? '사용 가능' : '사용 불가'}
                </dd>
              </div>
              <div>
                <dt>NAVER 거리뷰 설정</dt>
                <dd className={panoramaConfigured ? 'ready' : 'missing'}>
                  {panoramaConfigured ? '설정됨' : '설정 안 됨'}
                </dd>
              </div>
              <div>
                <dt>브라우저 위치 기능</dt>
                <dd className={geolocationAvailable ? 'ready' : 'missing'}>
                  {geolocationAvailable ? '사용 가능' : '사용 불가'}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="dev-card">
          <div className="dev-card-heading">
            <MapPin size={20} />
            <div>
              <h2>울산 시연 장소</h2>
              <p>실제 장소명과 가상의 기억으로 준비된 확인 지점입니다.</p>
            </div>
          </div>
          <ul className="dev-place-list">
            {demoPlaces.map((place) => (
              <li key={place.name}>
                <MapPin size={16} />
                <span><strong>{place.name}</strong><small>{place.note}</small></span>
              </li>
            ))}
          </ul>
        </section>

        <p className="dev-footnote">
          <CircleHelp size={16} /> 이 경로와 숨은 진입 동작은 시연 편의를 위한 것으로,
          보안 경계나 관리자 기능으로 사용하지 않습니다.
        </p>
      </div>
    </main>
  );
}

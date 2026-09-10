import type { Memory } from './types';
// Editorial examples only; never combined with live Supabase results or persisted.
export const demoMemories: Memory[] = [
  {
    id: 'sample-1',
    title: '아무 말 없이 걸어도 좋았던 날',
    content:
      '할 말이 없어도 괜찮은 사람이 있다는 걸 알게 된 날.\n\n숲을 한 바퀴 돌아 나오는 동안 우리는 거의 말이 없었다. 나뭇잎 사이로 내려오는 빛을 보다가, 가끔 같은 쪽을 바라보며 웃었다. 특별한 일은 없었지만 이상하게 오래 기억에 남는다.\n\n다시 이 길을 걷게 되면, 그날의 바람도 생각나겠지.',
    location_name: '서울숲',
    memory_date: '2026-05-17',
    emotion: 'calm',
    lng: 127.0374,
    lat: 37.5447,
  },
  {
    id: 'sample-2',
    title: '봄은 늘 이 길에서 먼저 왔다',
    content:
      '유난히 길었던 겨울이 끝나고 처음으로 겉옷을 벗은 날. 커피 한 잔을 들고 천천히 걸었다. 별일 없는 오후가 이렇게 소중할 줄은 몰랐다.',
    location_name: '서울숲 은행나무길',
    memory_date: '2026-04-05',
    emotion: 'joy',
    lng: 127.0408,
    lat: 37.5469,
  },
  {
    id: 'sample-3',
    title: '우리의 계절이 남아 있는 곳',
    content:
      '지금은 각자 다른 도시에서 살지만 이 골목을 지날 때마다 그때의 우리가 떠오른다. 오래된 가게는 사라졌어도, 함께 웃던 마음은 아직 이곳에 있다.',
    location_name: '성수동 어느 골목',
    memory_date: '2025-10-24',
    emotion: 'longing',
    lng: 127.048,
    lat: 37.544,
  },
  {
    id: 'sample-4',
    title: '처음 손을 잡았던 저녁',
    content:
      '집에 가기 아쉬워 한 정거장을 더 걸었다. 무슨 이야기를 했는지는 기억나지 않는데, 손끝이 따뜻했던 것만은 선명하다.',
    location_name: '뚝섬역 근처',
    memory_date: '2026-06-12',
    emotion: 'love',
    lng: 127.047,
    lat: 37.5482,
  },
  {
    id: 'sample-5',
    title: '울어도 괜찮았던 벤치',
    content:
      '아무도 아는 사람이 없는 곳에 앉아 한참 강을 바라봤다. 강물은 계속 흘렀고, 마음도 조금씩 흘려보낼 수 있었다.',
    location_name: '한강 산책길',
    memory_date: '2025-09-08',
    emotion: 'sadness',
    lng: 127.036,
    lat: 37.5378,
  },
  {
    id: 'sample-6',
    title: '매일의 작은 여행',
    content:
      '퇴근길에 조금 돌아가는 길. 자전거를 세워 두고 하늘을 봤다. 오늘의 노을은 사진보다 눈으로 남기고 싶었다.',
    location_name: '성수동',
    memory_date: '2026-08-21',
    emotion: 'calm',
    lng: 127.052,
    lat: 37.5422,
  },
  {
    id: 'sample-7',
    title: '서툴러서 더 좋았던 피크닉',
    content:
      '돗자리는 작고 샌드위치는 눅눅했지만 온종일 웃었다. 완벽하지 않아서 우리다운 하루였다.',
    location_name: '서울숲 잔디마당',
    memory_date: '2026-05-02',
    emotion: 'joy',
    lng: 127.039,
    lat: 37.5418,
  },
].map(
  (m) =>
    ({
      ...m,
      visibility: 'public',
      is_anonymous: true,
      location_precision: 'approximate',
      created_at: m.memory_date + 'T12:00:00Z',
      owned: false,
    }) as Memory,
);

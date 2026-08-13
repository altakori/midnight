import type { Scene } from './engine';

export const scenes: Scene[] = [
  {
    id: 'desk', checkpoint: 0, kicker: '23:51 · 탈옥 준비 / 최종 인쇄 9분 전',
    title: '각주 소녀가 삭제선 안쪽에서 두드린다',
    body: [
      '자정이 되면 각주 17번과 그 안의 소녀는 영구 삭제된다. 세 개의 검문을 통과해 그녀를 원고 밖으로 빼내야 한다.',
      '편집자는 당신이 쓰는 동사를 센다. 한 번은 기록, 두 번은 경고, 세 번은 대가, 그 뒤에는 삭제다.',
    ],
    note: '마지막 문은 모순으로만 열린다. 숨기면서 드러내거나, 믿으면서 위조하라.',
    choices: [
      { id: 'desk-hide', label: '소녀를 원고 더미에 숨긴다', hint: '조용한 탈출의 첫 동사. 시간 -1.', next: 'checkpoint-1', verb: 'hide' },
      { id: 'desk-trust', label: '소녀가 알려준 비상구를 믿는다', hint: '공개 탈출의 첫 동사. 신뢰 +1.', next: 'checkpoint-1', verb: 'trust', trust: 1 },
      { id: 'desk-ask', label: '경비에게 인쇄실 위치를 묻는다', hint: '정보는 빠르지만 의심 +2.', next: 'checkpoint-1', verb: 'ask', suspicion: 2 },
    ],
  },
  {
    id: 'checkpoint-1', checkpoint: 1, kicker: '23:53 · 1차 검문 / 이름 대조',
    title: '명단에는 당신만 있고 소녀는 없다',
    body: [
      '교정관이 빈 명찰을 가리킨다. “혼자 왔습니까?” 소녀의 손가락이 원고 틈에서 떨린다.',
      '방금 쓴 동사를 반복하면 편집자가 밑줄을 긋기 시작한다.',
    ],
    note: '즉시 결과를 보라. 안전한 반복은 다음 장면의 선택지를 비싸게 만든다.',
    choices: [
      { id: 'cp1-hide', label: '원고를 몸 뒤로 다시 숨긴다', hint: '의심 -1. 숨기기를 반복한다.', next: 'corridor', verb: 'hide', suspicion: -1 },
      { id: 'cp1-forge', label: '명단에 소녀의 이름을 위조한다', hint: '공개 탈출의 반쪽. 의심 +1.', next: 'corridor', verb: 'forge', suspicion: 1 },
      { id: 'cp1-reveal', label: '삭제 명령서를 꺼내 보여준다', hint: '드러내기의 첫 기록. 의심 +2, 신뢰 +1.', next: 'corridor', verb: 'reveal', suspicion: 2, trust: 1 },
    ],
  },
  {
    id: 'corridor', checkpoint: 1, kicker: '23:55 · 교정 복도 / 카메라 회전 중',
    title: '빨간 렌즈가 원고 더미를 훑는다',
    body: [
      '카메라가 세 번 회전하면 검문대에 경보가 간다. 소녀가 묻는다. “내 말을 믿어요, 아니면 또 숨길 건가요?”',
      '여기서 한 동사에 집착하면 마지막에 그 동사를 잃을 수 있다.',
    ],
    note: '동사 장부를 확인하라. 삭제된 동사는 최종 조합에 사용할 수 없다.',
    choices: [
      { id: 'corridor-cut', label: '카메라 전선을 끊는다', hint: '의심 -2. 시간을 아끼지만 탈출 조합에는 쓰이지 않는다.', next: 'checkpoint-2', verb: 'cut', suspicion: -2 },
      { id: 'corridor-hide', label: '붉은 렌즈 아래서 숨는다', hint: '숨기기를 다시 사용한다.', next: 'checkpoint-2', verb: 'hide' },
      { id: 'corridor-trust', label: '소녀의 박자에 맞춰 걸어간다', hint: '믿기를 다시 사용. 신뢰 +1.', next: 'checkpoint-2', verb: 'trust', trust: 1 },
    ],
  },
  {
    id: 'checkpoint-2', checkpoint: 2, kicker: '23:57 · 2차 검문 / 내용 심사',
    title: '교정관이 묻는다. “그 원고 안에 누가 있죠?”',
    body: [
      '거짓말을 반복하면 통과는 쉽다. 하지만 반복할수록 그 동사는 당신의 설정이 되고, 반대 가능성은 닫힌다.',
      '소녀의 목소리가 작아진다. 신뢰가 바닥나면 그녀는 스스로 여백으로 돌아갈 것이다.',
    ],
    note: '의심 8은 즉시 체포, 시간 0은 인쇄 종료다. 신뢰가 부족하면 공개 탈출은 잠긴다.',
    choices: [
      { id: 'cp2-forge', label: '빈 승인 도장을 위조한다', hint: '위조를 반복한다. 의심 +1.', next: 'print-floor', verb: 'forge', suspicion: 1 },
      { id: 'cp2-reveal', label: '소녀의 삭제 사실을 공개한다', hint: '신뢰 2 필요. 드러내기를 반복. 의심 +2, 신뢰 +1.', next: 'print-floor', verb: 'reveal', suspicion: 2, trust: 1, requires: { trust: 2 } },
      { id: 'cp2-hide', label: '“아무도 없습니다”라며 숨긴다', hint: '숨기기를 또 사용. 신뢰 -1.', next: 'print-floor', verb: 'hide', trust: -1 },
    ],
  },
  {
    id: 'print-floor', checkpoint: 2, kicker: '23:59 · 3차 검문 / 인쇄기 잠금',
    title: '마지막 빈칸에는 당신의 인물 설정이 들어간다',
    body: [
      '문에는 두 개의 동사를 넣어야 한다. 지금 한 번 더 안전한 행동을 택하면 필요한 동사가 삭제될 수 있다.',
      '수정액은 삭제된 동사를 되돌리지만 2분과 의심 2를 빼앗는다. 자정 직전에는 그 대가가 치명적이다.',
    ],
    note: '마지막 준비다. 장부에서 두 탈출 조합 중 살아 있는 한 쌍을 확인하라.',
    choices: [
      { id: 'floor-reveal', label: '방송 마이크로 삭제 사실을 드러낸다', hint: '조용한 탈출의 반쪽. 의심 +1.', next: 'final', verb: 'reveal', suspicion: 1 },
      { id: 'floor-forge', label: '소녀의 새 출입증을 위조한다', hint: '공개 탈출의 반쪽. 의심 +1.', next: 'final', verb: 'forge', suspicion: 1 },
      { id: 'floor-trust', label: '잠금 순서를 소녀에게 맡긴다', hint: '믿기를 반복. 신뢰 +1.', next: 'final', verb: 'trust', trust: 1 },
    ],
  },
  {
    id: 'final', checkpoint: 3, kicker: '자정 직전 · 마지막 각주',
    title: '살아남은 두 동사를 한 문장에 넣어라',
    body: [
      '편집자의 손이 인쇄 레버 위에 내려온다. 여기서는 새로운 성격을 만들 수 없다. 지금까지 지켜낸 동사만 문을 연다.',
      '소녀가 손을 내민다. “모순은 망가진 문장이 아니에요. 탈출구예요.”',
    ],
    note: '잠긴 결말을 눌러도 실패하지 않는다. 동사 장부를 읽고 수정액 사용 여부를 결정하라.',
    choices: [
      { id: 'final-quiet', label: '숨기면서 드러낸다', hint: '숨기기 + 드러내기가 모두 기록되어 있고 삭제되지 않아야 한다.', next: 'final', verb: 'hide', contradiction: ['hide', 'reveal'] },
      { id: 'final-public', label: '믿으면서 위조한다', hint: '믿기 + 위조하기, 그리고 신뢰 3 이상이 필요하다.', next: 'final', verb: 'trust', contradiction: ['trust', 'forge'], requires: { trust: 3 } },
      { id: 'final-fail', label: '정해진 문장에 서명한다', hint: '당신은 안전하지만 소녀는 여백에 남는다.', next: 'final', verb: 'ask' },
    ],
  },
];

export const sceneMap = new Map(scenes.map((scene) => [scene.id, scene]));

# UI/UX 제품 목표와 실행형 합격 계약

## 제품 목표

처음 플레이하는 사람이 폭우 속 방송국의 구조 목표를 이해하고, 장면의 실제 단서와 도구를 발견해 서로 다른 물리 퍼즐을 풀며, 데스크톱·세로폰·가로폰 전환 중에도 같은 조사 상태를 잃지 않고 결말까지 갈 수 있어야 한다.

## 플레이어 성공 기준

1. **10초 안에 상황과 행동 파악:** 도입에서 하윤, 자정, 구조 신호, 첫 행동이 짧고 명확하다.
2. **장면 콘텐츠가 기능이 됨:** 장소 이동은 위치를 바꾸고, 가까이 보기는 조사 가능한 실물 도구를 드러내며, 수집은 가방·목표·저장 상태에 반영된다.
3. **퍼즐마다 다른 손맛:** 다이얼·회로·테이프·빛·문장 판별이 각자 다른 입력과 즉시 피드백을 제공한다.
4. **폰과 컴퓨터의 동일한 조사:** 1440×900, 390×844, 844×390에서 이동·조사·가방·증거·멈춤을 사용할 수 있다.
5. **회전해도 같은 게임:** portrait→landscape→portrait 후 장소, 조사 화면, 가방, 선택과 저장이 유지되고 게임 루트가 불필요하게 재생성되지 않는다.
6. **실패가 조용하지 않음:** 콘솔 오류, pageerror, HTTP 4xx/5xx, 수평 문서 넘침, 잘린 핵심 제어, 상태 초기화는 P0 실패다.

## 자동 검증 매트릭스

`npm run qa:uiux`는 지정 메인 서버를 대상으로 실제 이동·조사·수집·reload·회전을 수행하고 `qa-art/ui-ux-contract/`에 JSON과 스크린샷을 남긴다.

| 뷰포트 | 필수 검증 |
|---:|---|
| 1440×900 | 도입 CTA, 목표, 다음 장소 이동, 가까이 보기, 실물 도구 수집, reload 저장 |
| 390×844 | 회전 권장 선택, 핵심 HUD, 36px 이상 핵심 터치, 수평 넘침 0, 조사 상태 |
| 844×390 | 장면 우선 레이아웃, 이동/조사 제어 bounds, portrait에서 이어진 장소·DOM 상태 |
| 390×844 재복귀 | 장소·저장·루트 identity 유지, 콘솔/네트워크 오류 0 |

## 실행

1. 지정 메인 서버 `http://localhost:5174`가 정상 응답하면 재사용한다.
2. `npm run qa:uiux`를 실행한다.
3. 다른 서버를 검사할 때는 `MIDNIGHT_URL=http://localhost:<port> npm run qa:uiux`를 사용한다.

검증 스크립트는 서버를 시작하거나 종료하지 않는다. `PROCESS_HYGIENE.md`에 따라 소유권이 확인된 서버만 별도로 관리한다.

## 판정

- 모든 자동 assertion, 테스트, typecheck, build가 통과해야 후보가 된다.
- 자동화가 통과해도 스크린샷에서 정보 위계, 텍스트 대비, 장면-도구 위치 관계, 모달 겹침이 나쁘면 통과가 아니다.
- 변경 후 desktop/portrait/landscape exact snapshot을 독립 리뷰하고 승인 전에는 병합하지 않는다.

## 귀찮음·디테일 마찰 예산

기능이 동작해도 아래 마찰이 있으면 개선 대상으로 기록한다.

1. **반복 방해:** 도입은 1개 blocking dialog로 끝나고, 가로 화면 권장에 답한 선택은 reload 뒤 다시 묻지 않는다.
2. **불필요한 단계:** 기본 루프인 `장소 이동 → 가까이 보기 → 실물 도구 수집 → 결과 확인`에 중복 확인을 넣지 않는다. 첫 도구는 시작 후 3개 핵심 행동 이내에 얻을 수 있어야 한다.
3. **피드백 지연:** 도구 클릭 후 메시지·가방·저장은 500ms 안에 함께 갱신되어야 한다.
4. **정밀 조작 부담:** WCAG 2.2의 24×24px 최소 기준보다 엄격한 36×36px을 모바일 핵심 제어 P0로 사용한다. 주요 조사·이동 CTA는 가능하면 44px 이상을 유지한다.
5. **탈출과 복구:** 가까이 보기·가방·증거·일시정지는 명시적 닫기 또는 `Escape`로 한 단계씩 빠져나올 수 있고 초점이 원래 행동으로 돌아온다.
6. **기억 부담:** 목표, 현장 힌트, 퍼즐 단서는 필요한 시점에 화면에서 다시 찾을 수 있어야 하며 이전 방의 문장을 외우게 강요하지 않는다.
7. **시야 경쟁:** 도구 토스트·목표·장소 제목·이동 화살표·메시지·신호가 서로 가리거나, 실제 장면 도구와 무관한 위치에 붙지 않는다.
8. **실패 설명:** 오답·잠긴 선택·사용 불가 조작은 `왜 안 되는지`와 `다음에 무엇을 확인할지`를 함께 알려야 한다.

각 QA 보고서는 blocking dialog 반복 여부, 첫 도구까지의 핵심 행동 수, feedback latency, Escape/초점 복구, 모바일 핵심 글자/target 크기, 상태 복원을 `friction` 항목에 남긴다. 자동화가 잡지 못하는 작은 불편은 스크린샷 독립 heuristic review에서 `발견 위치 → 플레이어 비용 → 재현 → 개선안` 형식으로 기록한다.

## 외부 기준

- Nielsen Norman Group, *10 Usability Heuristics Applied to Video Games*: https://www.nngroup.com/articles/usability-heuristics-applied-video-games/
- Nielsen Norman Group, *10 Usability Heuristics for User Interface Design* (2024 review): https://www.nngroup.com/articles/ten-usability-heuristics/
- W3C, *WCAG 2.2 Understanding SC 2.5.8 Target Size (Minimum)*: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- Apple, *Human Interface Guidelines — Accessibility*: https://developer.apple.com/design/human-interface-guidelines/accessibility

# 《미정 인물》

문장특별시를 배경으로 한 5–8분 분량의 한국어 인터랙티브 픽션 프로토타입입니다. 선택할수록 인물의 세 축이 기울고, 서로 어울리지 않는 선택은 경고·수정액 비용·삭제선의 순서로 닫힙니다. 각주 소녀와 함께 중앙인쇄소에 도착해 자신이 어떤 문장이 되었는지 확인하세요.

## 개발

```bash
npm install
npm run dev
npm test
npm run build
```

- `src/engine.ts`: 순수 상태 전이, 선택 제한, 수정액, 저장 직렬화, 결말 판정
- `src/content.ts`: 장면/선택 콘텐츠
- `src/main.ts`: 접근 가능한 DOM 기반 UI 및 localStorage 저장
- `src/style.css`: 반응형 종이·활자·빨간 연필 시각 체계

저장 데이터는 브라우저의 `localStorage`에만 보관됩니다. `처음부터` 버튼으로 즉시 재시작할 수 있습니다. 삭제선이 그어진 선택지를 누르면 수정액을 사용해 복원할 수 있고, 다시 누르면 해당 선택을 실행합니다.

## GitHub Pages

`.github/workflows/pages.yml`은 private 저장소에서 자동 실행되지 않도록 `workflow_dispatch`만 사용합니다. 공개 전환 후 Actions에서 수동 실행하거나, 필요 시 Pages 배포 트리거를 별도 추가하세요. `vite.config.ts`는 상대 `base`를 사용하므로 프로젝트 Pages 하위 경로에서도 자산을 불러옵니다.

외부 런타임 의존성이나 원격 에셋은 사용하지 않습니다.

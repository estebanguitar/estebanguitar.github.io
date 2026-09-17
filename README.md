# estebanguitar.github.io

이직 활동 대시보드의 원격 뷰.

- `index.html` — 대시보드. Firebase Auth(Google) 로그인 후 Realtime Database에서 데이터를 받아 렌더한다.
- `board.html` — 예전 주소. `index.html` 로 넘긴다.

## 🔴 이 저장소는 공개다

회사명·판정근거·지원 이력은 **한 글자도 여기에 두지 않는다.** 저장소를 private 으로 바꿔도 GitHub Pages 사이트 자체는 공개다(비공개 Pages는 Enterprise Cloud 전용).

`index.html` 에는 데이터가 없다. 화면에 보이는 내용은 전부 로그인 후 RTDB에서 받아온 것이고, RTDB 규칙은 지정된 Google 계정 하나만 읽기를 허용한다.

두 겹으로 막아둔다.

1. `jobdash-push` 가 HTML 생성 직후 로컬 DB의 회사명 전수와 대조해, **한 건이라도 있으면 파일을 쓰지 않고 중단**한다.
2. `.git/hooks/pre-commit` — 스테이징된 파일에 회사명이 3건 이상이거나 파일명이 `01.대시보드`·`jobsearch.db`·`*대시보드.html` 이면 커밋을 막는다.

## 갱신

정본은 로컬 SQLite다. 밖에서 볼 수 있게 올리려면:

```
jobdash-push          # RTDB 업로드 + index.html 재생성
jobdash-push --html   # HTML 만
jobdash-push --check  # 설정·키·토큰 점검
```

집에서는 `~/Documents/01.대시보드.html` 을 새로고침하면 된다. 로컬 서버(`io.jobdash.server`, 127.0.0.1:8787)가 요청마다 DB를 다시 읽는다.

## 이전 내용

인테리어 비교 페이지(소파·침대·식탁·의자·타일)가 있었으나 2026-09-17 에 제거했다. 필요하면 커밋 `c1561dd` 이전에서 꺼낼 수 있다.

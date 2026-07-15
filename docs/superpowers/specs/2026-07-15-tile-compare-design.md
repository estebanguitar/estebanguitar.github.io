# 타일 비교 페이지 (tile-compare.html) — 설계서

**날짜:** 2026-07-15
**목표:** `카탈로그.pdf`(118 PDF 페이지 = ~230 인쇄 페이지, 타일 카탈로그)의 모든 타일 정보를 파싱해
`estebanguitar.github.io` 사이트에 필터링 가능한 타일 이미지 비교 탭을 추가한다.

## 결정된 범위 (사용자 확인)

- **범위:** 카탈로그 전체 타일 (포세린·벽·바닥·모자이크·우드·패턴·계단·포인트·젠다이 등 모든 종류). 예상 400~900개 제품.
- **필터:** 카테고리 · 브랜드 · 규격(사이즈) · 마감 · 색상 계열 (+ 제품명/코드 검색).
- **정확도:** 정밀 파싱 우선. 모든 페이지를 렌더링 후 vision으로 읽어 정확히 추출.
- **결과물:** 이미지 갤러리 형태(타일 텍스처 이미지 필수).

## 접근 방식

**A안 — 페이지별 vision 파싱 (채택).**
각 PDF 페이지를 이미지로 렌더링 → vision 서브에이전트가 페이지를 읽고(PDF 임베드 텍스트를 ground-truth로
함께 제공) 구조화된 제품 레코드 + 타일 이미지 crop-box + 색상 계열을 추출. 다양한 레이아웃(1-up 대형 슬래브
vs 2×2 그리드)에 강하고, 색상 계열 분류가 가능.

- B안(순수 결정론적 `pdftotext -bbox` + `pdfimages`): 이미지↔제품 매칭이 취약, 색상 추론 불가 → 미채택.
- C안(텍스트만, 이미지 없음): 이미지 필수라 미채택.

텍스트 필드는 `pdftotext -bbox`의 임베드 텍스트를 참고해 코드·규격 OCR 오류를 줄인다.

## 파이프라인

1. **렌더:** `pdftoppm -r 150` 로 118 페이지 → PNG. 콘텐츠 페이지는 2-up 스프레드(2481×1654px).
2. **텍스트 추출:** `pdftotext -bbox`/`-layout` 로 페이지별 텍스트(제품명·코드·규격·브랜드·마감·박스 스펙).
3. **파싱(병렬 에이전트):** 페이지를 배치로 나눠 ~15개 서브에이전트가 각자 담당 페이지를 읽고
   레코드 JSON을 scratchpad 파일로 기록.
   - 레코드 필드: `category, brand, name, colorCode, size, thickness, finish, colorFamily(추론),
     pcsPerBox, sqmPerBox, kgPerBox, boxPerPt, catalogPage, bbox(정규화 0~1)`.
4. **집계 + 크롭:** 모든 배치 JSON 병합 → 전역 ID 부여 → bbox로 페이지 렌더에서 타일 크롭 →
   ~480px JPEG 로 리사이즈 → `tiles/img/NNNN.jpg`.
5. **페이지 빌드:** `tile-compare.html` 에 `const TILES=[…]` 인라인 데이터 + 필터 + 이미지 그리드 + 라이트박스.
6. **연결:** `nav.js` 에 `🧱 타일 비교` 탭, `index.html` 에 카테고리 카드, `.gitignore` 에 `카탈로그.pdf` 추가.

## 데이터 모델 (TILES 레코드)

```
{
  id, category, brand, name, colorCode, size, thickness,
  finish,           // 무광/유광/실크/랩핑 등
  colorFamily,      // 화이트/아이보리/베이지/그레이/차콜/블랙/브라운/우드/그린/블루/멀티
  pcsPerBox, sqmPerBox, kgPerBox, boxPerPt,
  catalogPage, img  // "tiles/img/0042.jpg"
}
```

## UI (tile-compare.html)

- 기존 사이트 스타일/CSS 변수 재사용, 상단 `site-nav`.
- 필터 바: 카테고리 · 브랜드 · 규격 · 마감 · 색상 계열 + 검색 입력, 결과 수, 초기화 버튼.
- 반응형 이미지 그리드 카드: 텍스처 썸네일 + 제품명/코드 · 규격 · 마감 · 브랜드 · 카테고리 배지.
- 카드 클릭 → 라이트박스(큰 이미지 + 전체 스펙 + 카탈로그 페이지 번호).

## 검증

- 렌더 페이지와 파싱 레코드 대조 스팟체크, contact sheet(크롭 몽타주)로 크롭 품질 확인.
- 카테고리별 개수를 목차와 대조.
- 로컬에서 페이지 열어 모든 필터/검색/라이트박스/이미지 로딩 확인.

## 리스크/메모

- vision bbox 크롭은 여백을 조금 둬 보정(텍스처가 균일해 허용). 파일럿에서 품질 확인 후 스케일업.
- 색상 계열은 vision 추론(근사값). 필터 편의용.
- 이미지 ~20~40MB 저장은 GitHub Pages 한도 내. `카탈로그.pdf`(225MB)는 `.gitignore`로 커밋 방지.

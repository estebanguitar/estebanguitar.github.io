# 식탁 비교 페이지 (table-compare.html) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4인 기준 식탁 100개를 수집하는 단일 비교 페이지 `table-compare.html`을 만든다. 각 식탁에 종속 매칭 의자(개당가격)를 붙이고, "식탁 + 의자4개" 세트 합계를 200만원 기준으로 표시한다.

**Architecture:** `bed-compare.html`을 템플릿으로 복제해 데이터 배열(`TABLES`)·필터·카드 렌더를 식탁 도메인에 맞게 개조한다. 식탁 본체 URL/이미지는 침대와 동일하게 전수 검증하고, 의자는 이름+개당가격만 기록한다. 데이터는 브랜드별로 수집·커밋·푸시한다.

**Tech Stack:** 정적 HTML + 순수 JS(빌드리스), 검증은 `node`(문법/집계) + `curl`(HTTP/리다이렉트) + macOS `sips`(이미지 크기).

**참고 파일:** 설계서 `docs/superpowers/specs/2026-07-02-dining-table-compare-design.md`, 템플릿 `bed-compare.html`, 네비 `nav.js`.

---

## File Structure

- **Create:** `table-compare.html` — 식탁 비교 단일 페이지 (구조+스타일+데이터+로직 자체 포함, 빌드리스)
- **Modify:** `nav.js` — 공유 네비 컴포넌트에 `🍽 식탁 비교` 탭 추가
- **Modify:** `index.html` — 식탁 비교 링크 추가
- **Create(임시):** `scratchpad/table/agg.mjs` — TABLES 집계/무결성 검사
- **Create(임시):** `scratchpad/table/urlcheck.sh` — 식탁 URL 최종 리다이렉트/HTTP 검사
- **Create(임시):** `scratchpad/table/imgcheck.sh` — 식탁 이미지 HTTP/Content-Type/크기 검사

`scratchpad/`는 세션 스크래치패드 루트 `/private/tmp/claude-501/-Users-joseph-interior-compare/689f631e-69f2-44ef-8c57-e0b4212503e2/scratchpad` 아래를 사용한다(저장소에 커밋하지 않음).

---

## 데이터 계약 (모든 태스크 공통)

`table-compare.html`의 `const TABLES=[...]` 각 원소는 아래 형태를 **정확히** 따른다.

```javascript
{
  brand:"브랜드명",
  name:"식탁 제품명 전체",
  status:"ok",                 // ok|near|check|exceed|ref
  material:"ceramic",          // wood|ceramic|glass|marble|veneer|metal|unknown (상판)
  shape:"rect",                // rect|round|oval|ext (직사각/원형/타원/확장형)
  seat:"4",                    // "4" | "4-6"
  price:890000,                // 식탁 단품 가격(정수)
  orig:null,                   // 정가(정수) 또는 null
  url:"https://식탁-상세페이지",// 실제 상세페이지 (검증 대상)
  img:"https://식탁-이미지",    // 실제 이미지 (검증 대상)
  chairName:"매칭 식탁의자 제품명",
  chairPrice:120000,           // 의자 개당 가격(정수)
  setTotal:1370000,            // = price + chairPrice*4 (정적으로 계산해 저장)
  badge:"4인 세트 확인",
  bc:"b-ok",                   // b-ok|b-near|b-warn|b-fail|b-ref
  specs:[
    ["상판","세라믹 1400×800mm","ok"],
    ["사이즈","4인 폭1400×깊이800mm ✓","ok"],
    ["형태","직사각",""],
    ["다리","원목 4다리",""],
    ["의자","패브릭 의자 ×4 포함",""]
  ]
}
```

**status/badge/bc 매핑 규칙:**

| status | 조건 | badge | bc |
|---|---|---|---|
| `ok` | 4인 사이즈 확인 + setTotal ≤ 2,000,000 | `4인 세트 확인` | `b-ok` |
| `near` | seat="4-6" 겸용 이거나 setTotal 2,000,001~2,200,000 | `예산 근접` | `b-near` |
| `check` | 사이즈/구성 확인 필요 | `사이즈 확인 필요` | `b-warn` |
| `exceed` | setTotal > 2,200,000 | `예산 초과` | `b-fail` |
| `ref` | 단종/참고 | `단종 가능 — 참고` | `b-ref` |

**불변식:** 모든 원소에서 `setTotal === price + chairPrice*4`.

---

## Task 1: 페이지 스캐폴드 (템플릿 복제 + 뼈대 개조)

**Files:**
- Create: `table-compare.html` (from `bed-compare.html`)

- [ ] **Step 1: 템플릿 복제**

```bash
cd /Users/joseph/interior-compare
cp bed-compare.html table-compare.html
```

- [ ] **Step 2: `<head>` 타이틀/설명 교체**

`table-compare.html:6` 부근 `<title>` 를 교체:

```html
<title>4인 식탁 비교 — Interior Compare</title>
```

- [ ] **Step 3: 헤더(`<header class="ph">`) 문구 교체 (line 86~99 대응)**

`<h1>` 블록을 아래로 교체:

```html
    <h1>4인 식탁 비교</h1>
    <p class="ph-sub">총 <span id="hcnt">0</span>개 — 식탁 + 의자4개 세트가 200만원 이하</p>
    <div class="chips">
      <div class="chip"><span class="chip-k">4인</span><span class="chip-v">폭 1200~1500mm</span></div>
      <div class="chip"><span class="chip-k">세트</span><span class="chip-v">식탁+의자4개 ≤ 200만원</span></div>
      <a href="https://search.shopping.naver.com/search/all?query=4%EC%9D%B8+%EC%8B%9D%ED%83%81+%EC%84%B8%ED%8A%B8" target="_blank" rel="noopener" class="naver-btn">
        <svg class="ni" viewBox="0 0 24 24"><path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/></svg>
        네이버 쇼핑 검색
      </a>
    </div>
```

(헤더의 `<svg class="diag">` 장식은 그대로 두거나 삭제해도 무방 — 그대로 둔다.)

- [ ] **Step 4: 필터 바(`<div class="fbar">`) 교체 (line 111~172 대응)**

`.fbar-inner` 내부를 아래로 통째 교체:

```html
    <div class="fg">
      <span class="fl">상판</span>
      <div class="fchips" data-group="material">
        <button class="fc on" data-v="all">전체</button>
        <button class="fc" data-v="wood">원목</button>
        <button class="fc" data-v="ceramic">세라믹</button>
        <button class="fc" data-v="glass">강화유리</button>
        <button class="fc" data-v="marble">대리석</button>
        <button class="fc" data-v="veneer">무늬목·MDF</button>
        <button class="fc" data-v="metal">철제</button>
      </div>
    </div>
    <div class="fg">
      <span class="fl">형태</span>
      <div class="fchips" data-group="shape">
        <button class="fc on" data-v="all">전체</button>
        <button class="fc" data-v="rect">직사각</button>
        <button class="fc" data-v="round">원형</button>
        <button class="fc" data-v="oval">타원</button>
        <button class="fc" data-v="ext">확장형</button>
      </div>
    </div>
    <div class="fg">
      <span class="fl">인원</span>
      <div class="fchips" data-group="seat">
        <button class="fc on" data-v="all">전체</button>
        <button class="fc" data-v="4">4인</button>
        <button class="fc" data-v="4-6">4~6인</button>
      </div>
    </div>
    <div class="fg">
      <span class="fl">예산</span>
      <div class="fchips" data-group="budget">
        <button class="fc on" data-v="all">전체</button>
        <button class="fc" data-v="in">200만 이하만</button>
      </div>
    </div>
    <div class="fg">
      <span class="fl">정렬</span>
      <select class="fsort" id="fsort">
        <option value="default">기본순</option>
        <option value="price-asc">세트 낮은순</option>
        <option value="price-desc">세트 높은순</option>
      </select>
    </div>
    <div class="fg">
      <input class="fsearch" id="fsearch" type="search" placeholder="브랜드·제품명 검색" autocomplete="off">
    </div>
    <div class="fcount"><span id="cnt">0</span>개 표시 <button class="freset" id="freset">초기화</button></div>
```

- [ ] **Step 5: 범례/각주(`<div class="legend">` ~ `<p class="note">`) 교체 (line 176~182 대응)**

```html
  <div class="legend">
    <div class="li"><div class="ld ok"></div>4인 확인 · 세트 200만 이하</div>
    <div class="li"><div class="ld near"></div>예산 근접 / 4~6인 겸용</div>
    <div class="li"><div class="ld fail"></div>200만 초과 (참고용)</div>
    <div class="li"><div class="ld ref"></div>단종 가능 / 참고용</div>
  </div>
  <p class="note">※ 가격은 2026-07-02 기준 · 변동 가능 &nbsp;|&nbsp; ※ 4인 식탁: 폭 1200~1500mm &nbsp;|&nbsp; ※ 세트 합계 = 식탁 + 의자 개당가격 × 4 &nbsp;|&nbsp; ※ 의자 가격은 개당 표기</p>
```

- [ ] **Step 6: 커밋(데이터/로직은 다음 태스크에서)**

이 시점에서는 아직 `BEDS`/로직이 남아 있으므로 커밋하지 않는다. Task 2 완료 후 함께 커밋한다.

---

## Task 2: 스크립트 로직 개조 (TABLES + 필터 + 카드 렌더)

**Files:**
- Modify: `table-compare.html` (`<script>` 블록 전체, line 187~669 대응)

- [ ] **Step 1: 데이터 배열을 `TABLES` 시드 5개로 교체**

`const BEDS=[ ... ];` (line 187~476 대응) 전체를 아래로 교체. 시드 5개는 Task 4에서 실데이터로 검증/확장하기 전의 임시값이며, 형식 검증용이다. (Task 4에서 실제 검증된 상품으로 대체·확장)

```javascript
const TABLES=[
  {brand:"시드",name:"시드 세라믹 4인 식탁 A",status:"ok",material:"ceramic",shape:"rect",seat:"4",price:790000,orig:null,url:"https://example.com/a",img:null,chairName:"시드 의자 A",chairPrice:90000,setTotal:1150000,badge:"4인 세트 확인",bc:"b-ok",specs:[["상판","세라믹 1400×800mm","ok"],["사이즈","4인 폭1400×깊이800mm ✓","ok"],["형태","직사각",""],["다리","금속",""],["의자","의자 ×4",""]]},
  {brand:"시드",name:"시드 원목 4인 식탁 B",status:"ok",material:"wood",shape:"rect",seat:"4",price:990000,orig:1200000,url:"https://example.com/b",img:null,chairName:"시드 의자 B",chairPrice:150000,setTotal:1590000,badge:"4인 세트 확인",bc:"b-ok",specs:[["상판","원목 1200×800mm","ok"],["사이즈","4인 폭1200×깊이800mm ✓","ok"],["형태","직사각",""],["다리","원목",""],["의자","의자 ×4",""]]},
  {brand:"시드",name:"시드 확장형 4~6인 식탁 C",status:"near",material:"veneer",shape:"ext",seat:"4-6",price:850000,orig:null,url:"https://example.com/c",img:null,chairName:"시드 의자 C",chairPrice:120000,setTotal:1330000,badge:"예산 근접",bc:"b-near",specs:[["상판","무늬목 1400~1800mm","ok"],["사이즈","4~6인 겸용","near"],["형태","확장형",""],["다리","금속",""],["의자","의자 ×4",""]]},
  {brand:"시드",name:"시드 대리석 4인 식탁 D",status:"exceed",material:"marble",shape:"round",seat:"4",price:1900000,orig:null,url:"https://example.com/d",img:null,chairName:"시드 의자 D",chairPrice:100000,setTotal:2300000,badge:"예산 초과",bc:"b-fail",specs:[["상판","대리석 Ø1200mm","ok"],["사이즈","4인 원형 Ø1200 ✓","ok"],["형태","원형",""],["다리","금속",""],["의자","의자 ×4",""]]},
  {brand:"시드",name:"시드 유리 4인 식탁 E",status:"ok",material:"glass",shape:"rect",seat:"4",price:450000,orig:null,url:"https://example.com/e",img:null,chairName:"시드 의자 E",chairPrice:70000,setTotal:730000,badge:"4인 세트 확인",bc:"b-ok",specs:[["상판","강화유리 1300×800mm","ok"],["사이즈","4인 폭1300×깊이800mm ✓","ok"],["형태","직사각",""],["다리","철제",""],["의자","의자 ×4",""]]},
];
```

- [ ] **Step 2: `SECS`를 예산/사이즈 상태 기준으로 교체 (line 478~482 대응)**

```javascript
const SECS=[
  {key:'ok',statuses:['ok'],title:'4인 확인 · 세트 200만원 이하',sub:'4인 사이즈 + 예산 충족'},
  {key:'near',statuses:['near','check'],title:'예산 근접 / 확인 권장',sub:'4~6인 겸용 또는 예산 근접'},
  {key:'other',statuses:['exceed','ref'],title:'예산 초과 / 참고용',sub:'세트 200만원 초과 또는 단종'},
];
```

- [ ] **Step 3: 필터 상태 변수·`fmt` 교체 (line 484~486 대응)**

```javascript
let fMaterial='all',fShape='all',fSeat='all',fBudget='all',fSort='default',fSearch='';

function fmt(n){return n?n.toLocaleString('ko-KR')+'원':'가격 확인 필요'}
```

- [ ] **Step 4: 오버라이드/폴백 로직 제거 후 `productDetailUrl` 단순화 (line 488~598 대응)**

`PRODUCT_DETAIL_URLS`, `BRAND_SEARCH_URLS`, `NON_DETAIL_URL_PATTERNS`, 기존 `productDetailUrl` 를 모두 삭제하고 아래로 교체. (식탁 URL은 전수 검증되어 `s.url`에 실제 상세페이지만 들어가므로 오버라이드가 불필요하다.)

```javascript
function productDetailUrl(s){
  if(s.url)return s.url;
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(s.name)}`;
}
```

- [ ] **Step 5: `cardH` 를 3가격(식탁/의자개당/세트합계) 표시로 교체 (line 600~606 대응)**

```javascript
function cardH(s){
  const dim=(s.status==='ref'||s.status==='exceed')?' dimmed':'';
  const imgH=s.img?`<div class="cimg"><img src="${s.img}" alt="${s.name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('.cimg').remove()"></div>`:'';
  const sp=s.specs.map(([k,v,c])=>`<span class="sk">${k}</span><span class="sv${c?' '+c:''}">${v}</span>`).join('');
  const pr=`<div class="setrows"><div class="setrow"><span class="sr-k">식탁</span><span class="sr-v">${fmt(s.price)}</span></div><div class="setrow"><span class="sr-k">의자(개당)</span><span class="sr-v">${fmt(s.chairPrice)} ×4</span></div><div class="setrow total"><span class="sr-k">세트 합계</span><span class="sr-v">${fmt(s.setTotal)}</span></div></div>`;
  return `<div class="card${dim}">${imgH}<div class="cbody"><div class="ct"><span class="brand">${s.brand}</span><span class="badge ${s.bc}">${s.badge}</span></div><div class="pname">${s.name}</div><div class="specs">${sp}</div>${pr}<div class="cf"><a href="${productDetailUrl(s)}" target="_blank" rel="noopener" class="btn">식탁 상세보기 →</a></div></div></div>`;
}
```

- [ ] **Step 6: `passes` / `getSorted` / `render` 교체 (line 608~644 대응)**

```javascript
function passes(s){
  if(fMaterial!=='all'&&s.material!==fMaterial)return false;
  if(fShape!=='all'&&s.shape!==fShape)return false;
  if(fSeat!=='all'&&s.seat!==fSeat)return false;
  if(fBudget==='in'&&!(s.setTotal<=2000000))return false;
  if(fSearch){const q=fSearch.toLowerCase();if(!s.brand.toLowerCase().includes(q)&&!s.name.toLowerCase().includes(q))return false;}
  return true;
}

function getSorted(arr){
  if(fSort==='price-asc')return[...arr].sort((a,b)=>(a.setTotal||9e9)-(b.setTotal||9e9));
  if(fSort==='price-desc')return[...arr].sort((a,b)=>(b.setTotal||0)-(a.setTotal||0));
  return arr;
}

function render(){
  const r=TABLES.filter(passes);
  document.getElementById('cnt').textContent=r.length;
  document.getElementById('hcnt').textContent=TABLES.length;
  const el=document.getElementById('content');
  if(!r.length){el.innerHTML='<p class="no-result">조건에 맞는 제품이 없습니다.</p>';return;}
  const isDefault=fMaterial==='all'&&fShape==='all'&&fSeat==='all'&&fBudget==='all'&&fSort==='default'&&!fSearch;
  if(isDefault){
    el.innerHTML=SECS.map(sec=>{
      const items=getSorted(r.filter(s=>sec.statuses.includes(s.status)));
      if(!items.length)return'';
      return`<div class="sec"><div class="sec-head"><span class="sec-title">${sec.title} — ${items.length}개</span><span class="sec-sub">${sec.sub}</span></div><div class="grid">${items.map(cardH).join('')}</div></div>`;
    }).join('');
  } else {
    const sorted=getSorted(r);
    el.innerHTML=`<div class="sec"><div class="sec-head"><span class="sec-title">필터 결과 — ${sorted.length}개</span><span class="sec-sub">정렬: ${{default:'기본순','price-asc':'세트 낮은순','price-desc':'세트 높은순'}[fSort]}</span></div><div class="grid">${sorted.map(cardH).join('')}</div></div>`;
  }
}
```

- [ ] **Step 7: 이벤트 바인딩의 그룹 분기 교체 (line 646~668 대응)**

`.fc` 클릭 핸들러의 분기와 reset을 교체:

```javascript
document.querySelectorAll('.fc').forEach(btn=>{
  btn.addEventListener('click',function(){
    const g=this.closest('[data-group]').dataset.group;
    this.closest('[data-group]').querySelectorAll('.fc').forEach(b=>b.classList.remove('on'));
    this.classList.add('on');
    const v=this.dataset.v;
    if(g==='material')fMaterial=v;
    else if(g==='shape')fShape=v;
    else if(g==='seat')fSeat=v;
    else if(g==='budget')fBudget=v;
    render();
  });
});
document.getElementById('fsort').addEventListener('change',function(){fSort=this.value;render();});
document.getElementById('fsearch').addEventListener('input',function(){fSearch=this.value.trim();render();});
document.getElementById('freset').addEventListener('click',function(){
  fMaterial='all';fShape='all';fSeat='all';fBudget='all';fSort='default';fSearch='';
  document.querySelectorAll('.fc').forEach(b=>b.classList.toggle('on',b.dataset.v==='all'));
  document.getElementById('fsort').value='default';
  document.getElementById('fsearch').value='';
  render();
});
render();
```

- [ ] **Step 8: 세트 가격 행 스타일 추가 (`<style>` 내부, `.specs` 규칙 근처)**

`<head>`의 `<style>` 안에 아래 규칙을 추가(적절한 위치 아무 곳):

```css
.setrows{margin:.6rem 0;border-top:1px solid rgba(255,255,255,.08);padding-top:.5rem}
.setrow{display:flex;justify-content:space-between;font-size:.8rem;color:rgba(255,255,255,.6);padding:.15rem 0}
.setrow.total{color:#fff;font-weight:700;border-top:1px dashed rgba(255,255,255,.15);margin-top:.25rem;padding-top:.35rem}
.setrow .sr-v{font-variant-numeric:tabular-nums}
```

- [ ] **Step 9: 문법 검사**

Run:
```bash
cd /Users/joseph/interior-compare
node -e 'const fs=require("fs");const h=fs.readFileSync("table-compare.html","utf8");const m=h.match(/const TABLES\s*=\s*(\[[\s\S]*?\]);/);const T=eval(m[1]);console.log("TABLES:",T.length);T.forEach(t=>{if(t.setTotal!==t.price+t.chairPrice*4)throw new Error("setTotal mismatch: "+t.name)});console.log("setTotal 불변식 OK");'
```
Expected: `TABLES: 5` 와 `setTotal 불변식 OK` 출력, 오류 없음.

- [ ] **Step 10: 브라우저 확인**

`open table-compare.html` 로 열어 5개 카드가 렌더되고, 상판/형태/인원/예산 필터·정렬·검색·초기화가 동작하는지 확인한다.

- [ ] **Step 11: 커밋**

```bash
cd /Users/joseph/interior-compare
git add table-compare.html
git commit -m "feat(table): 4인 식탁 비교 페이지 스캐폴드 (시드 5개, 필터/세트가격 UI)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push origin main
```

---

## Task 3: 네비게이션·진입점 연결

**Files:**
- Modify: `nav.js`
- Modify: `index.html`

- [ ] **Step 1: `nav.js`에 식탁 탭 추가**

`nav.js`의 침대 탭 라인 다음에 식탁 탭을 추가:

```javascript
      + '<a href="/bed-compare.html" class="nav-tab' + on('/bed-compare.html') + '">🛏 침대 비교</a>'
      + '<a href="/table-compare.html" class="nav-tab' + on('/table-compare.html') + '">🍽 식탁 비교</a>'
```

- [ ] **Step 2: `index.html`에 식탁 링크 추가**

`index.html`에서 기존 카드/링크 목록 패턴을 찾아(침대 링크 근처) 식탁 링크를 동일 형식으로 추가한다. 먼저 확인:

```bash
grep -n "bed-compare" index.html
```

침대 링크 블록을 복제해 `table-compare.html` / `🍽 식탁 비교` / 설명("4인 식탁 + 의자4개 200만원 이하")으로 바꿔 삽입한다.

- [ ] **Step 3: 확인**

`open index.html` 로 열어 네비에 `🍽 식탁 비교` 탭과 index 링크가 보이고, 클릭 시 `table-compare.html`로 이동하는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
cd /Users/joseph/interior-compare
git add nav.js index.html
git commit -m "feat(table): 식탁 비교 탭을 네비/인덱스에 연결

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push origin main
```

---

## Task 4: 검증 도구 준비 (scratchpad)

**Files:**
- Create: `scratchpad/table/agg.mjs`, `scratchpad/table/urlcheck.sh`, `scratchpad/table/imgcheck.sh`

`SP` = `/private/tmp/claude-501/-Users-joseph-interior-compare/689f631e-69f2-44ef-8c57-e0b4212503e2/scratchpad/table`

- [ ] **Step 1: 집계 스크립트 작성 (`agg.mjs`)**

```javascript
import fs from 'fs';
const h=fs.readFileSync('/Users/joseph/interior-compare/table-compare.html','utf8');
const m=h.match(/const TABLES\s*=\s*(\[[\s\S]*?\]);/);
const T=eval(m[1]);
console.log('전체:',T.length);
const cnt=(k)=>{const o={};T.forEach(t=>o[t[k]]=(o[t[k]]||0)+1);return o;};
console.log('material:',JSON.stringify(cnt('material')));
console.log('shape:',JSON.stringify(cnt('shape')));
console.log('seat:',JSON.stringify(cnt('seat')));
console.log('status:',JSON.stringify(cnt('status')));
console.log('img null:',T.filter(t=>!t.img).length);
console.log('url null:',T.filter(t=>!t.url).length);
console.log('chairName null:',T.filter(t=>!t.chairName).length);
console.log('chairPrice null:',T.filter(t=>!t.chairPrice).length);
const bad=T.filter(t=>t.setTotal!==t.price+t.chairPrice*4);
console.log('setTotal 불변식 위반:',bad.length,bad.map(t=>t.name));
const names=T.map(t=>t.name);
console.log('중복 이름:',[...new Set(names.filter((n,i)=>names.indexOf(n)!==i))]);
const imgs=T.filter(t=>t.img).map(t=>t.img);
console.log('중복 이미지 종류수:',new Set(imgs.filter((u,i)=>imgs.indexOf(u)!==i)).size);
console.log('세트 200만 초과(exceed 대상):',T.filter(t=>t.setTotal>2000000).length);
```

Run: `node "$SP/agg.mjs"` → 시드 5개 기준 정상 출력 확인.

- [ ] **Step 2: URL 검사 스크립트 (`urlcheck.sh`)** — 최종 리다이렉트까지 확인

```bash
#!/usr/bin/env bash
# 사용법: urlcheck.sh <url1> <url2> ...
for u in "$@"; do
  out=$(curl -sSL -4 --http1.1 --connect-timeout 6 --max-time 25 -A "Mozilla/5.0" \
        -o /dev/null -w "%{http_code} %{url_effective}" "$u")
  echo "$u => $out"
done
```

판정 기준: HTTP 200 이고 `url_effective`가 상세페이지 경로여야 한다. 루트(`/`), `/search`, `?s=`, `?q=`, `/cat/`, `/np/search`, `naver` 리다이렉트는 **실패**로 간주하고 해당 상품을 실존 상세 URL로 교체한다.

- [ ] **Step 3: 이미지 검사 스크립트 (`imgcheck.sh`)**

```bash
#!/usr/bin/env bash
# 사용법: imgcheck.sh <img1> <img2> ...
tmp=$(mktemp)
for u in "$@"; do
  info=$(curl -sSL -4 --http1.1 --connect-timeout 6 --max-time 25 -A "Mozilla/5.0" \
         -o "$tmp" -w "%{http_code} %{content_type} %{size_download}" "$u")
  dim=$(sips -g pixelWidth -g pixelHeight "$tmp" 2>/dev/null | awk '/pixelWidth|pixelHeight/{printf "%s ",$2}')
  echo "$u => $info | ${dim:-NO_IMAGE}"
done
rm -f "$tmp"
```

판정 기준: HTTP 200, 실제 래스터로 디코드(=`sips`가 크기 출력), 너비 ≥ 300. `content_type`이 `application/octet-stream`이어도 `sips`가 크기를 읽으면 실이미지로 인정. `NO_IMAGE`(디코드 실패=HTML 차단 페이지 등)는 불합격.

- [ ] **Step 4: 스크립트 실행 권한** — `chmod +x "$SP"/urlcheck.sh "$SP"/imgcheck.sh`

(scratchpad 파일은 커밋하지 않는다.)

---

## Task 5: 브랜드별 데이터 수집 (100개까지 반복)

시드 5개를 실제 검증 상품으로 교체·확장한다. **한 번에 한 브랜드**만 처리하고 검증 즉시 커밋·푸시한다. 목표: `TABLES.length >= 100`.

**권장 브랜드/판매처 순서(4인 식탁 취급):**
```
이케아(IKEA)  ← 공식 API 사용
한샘 / 리바트 / 까사미아 / 일룸(퍼시스)
장인가구 / 동서가구 / 에넥스 / 시디즈(의자 매칭)
데스커 / 리샘 / 소마 / 우아미 / 라자가구
다나와/네이버 catalog 로 확인되는 중소 브랜드
```

**한 브랜드당 반복 절차(각 단계 체크):**

- [ ] **Step A: 실존 4인 식탁 조사** — 공식몰/다나와 개별상품(`prod.danawa.com/info/?pcode=`)/네이버 catalog에서 4인(폭 1200~1500mm) 식탁의 상품명·가격·상세URL·이미지를 수집한다. IKEA는 침대와 동일하게 공식 검색 API(`https://sik.search.blue.cdtapps.com/kr/ko/search-result-page?...&q=식탁`)의 `pipUrl`/`mainImageUrl`/`salesPrice` 사용.

- [ ] **Step B: 매칭 의자 조사** — 같은 브랜드(없으면 대표 매칭)의 실존 4인용 식탁의자 이름 + **개당 가격**을 확보한다. (의자 URL/이미지는 검증하지 않음.)

- [ ] **Step C: 세트 계산·status 판정** — `setTotal = price + chairPrice*4`. 위 status/badge 매핑표대로 status/badge/bc를 정한다.

- [ ] **Step D: URL 검사** — 수집한 식탁 URL들을 `urlcheck.sh`로 검사. 상세페이지 아님/실패는 실존 상세 URL로 교체.

- [ ] **Step E: 이미지 검사** — 식탁 이미지들을 `imgcheck.sh`로 검사. 불합격은 같은 상품의 공식 대표 이미지로 교체. 끝까지 없으면 그 상품을 이미지 검증되는 다른 실존 상품으로 교체.

- [ ] **Step F: TABLES에 반영** — 해당 브랜드 원소들을 `table-compare.html`의 `TABLES`에 추가/교체(정적). 첫 브랜드는 시드 원소를 교체하며 시작한다.

- [ ] **Step G: 집계·문법 검사**

```bash
node "$SP/agg.mjs"
git diff --check
```
확인: setTotal 불변식 위반 0, 중복 이름 0, 해당 브랜드 img/url null 0.

- [ ] **Step H: diff 범위 확인** — `git diff -- table-compare.html` 에 다른 브랜드가 섞이지 않았는지 확인.

- [ ] **Step I: 브랜드 커밋·푸시**

```bash
git add table-compare.html
git commit -m "feat(table): <브랜드> 4인 식탁 N개 수집 (URL+이미지+매칭의자)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step J: 원격 반영 확인 후 다음 브랜드** — `git rev-parse HEAD origin/main` 일치 확인. `TABLES.length < 100`이면 다음 브랜드로 Step A부터 반복.

---

## Task 6: 최종 통합 검증 + 배포 확인

**Files:** (검증만; 필요 시 `table-compare.html` 미세 수정)

- [ ] **Step 1: 전체 집계**

```bash
node "$SP/agg.mjs"
```
확인 항목:
- `전체 >= 100`
- `img null: 0`, `url null: 0`, `chairName null: 0`, `chairPrice null: 0`
- `setTotal 불변식 위반: 0`
- `중복 이름: []`
- 이미지 중복은 허용 변형 외 0

- [ ] **Step 2: 전 URL 최종 리다이렉트 일괄 검사**

```bash
node -e 'import("fs").then(({default:fs})=>{const h=fs.readFileSync("/Users/joseph/interior-compare/table-compare.html","utf8");const T=eval(h.match(/const TABLES\s*=\s*(\[[\s\S]*?\]);/)[1]);console.log(T.map(t=>t.url).join("\n"))})' > "$SP/urls.txt"
xargs -a "$SP/urls.txt" "$SP/urlcheck.sh" | grep -viE ' 200 ' || echo "전부 HTTP 200"
```
비정상(비200/폴백 리다이렉트) 0건이어야 한다.

- [ ] **Step 3: 전 이미지 일괄 검사**

```bash
node -e 'import("fs").then(({default:fs})=>{const h=fs.readFileSync("/Users/joseph/interior-compare/table-compare.html","utf8");const T=eval(h.match(/const TABLES\s*=\s*(\[[\s\S]*?\]);/)[1]);console.log(T.map(t=>t.img).filter(Boolean).join("\n"))})' > "$SP/imgs.txt"
xargs -a "$SP/imgs.txt" "$SP/imgcheck.sh" | grep -iE 'NO_IMAGE| 4[0-9][0-9] | 5[0-9][0-9] ' || echo "전 이미지 정상"
```

- [ ] **Step 4: 브라우저 최종 확인** — 데스크톱/모바일 폭에서 카드 렌더, 세 가격 표기, 필터·정렬·검색·초기화, 표본 카드의 `식탁 상세보기` 링크 실제 이동 확인.

- [ ] **Step 5: 배포 확인** — GitHub Pages(`estebanguitar.github.io/table-compare.html`) 배포본에서 링크·이미지 표본 재확인.

- [ ] **Step 6: 최종 커밋(잔여 변경 있을 때만)**

```bash
git add table-compare.html nav.js index.html
git commit -m "feat(table): 4인 식탁 100개 최종 통합 검증

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push origin main
```

---

## Self-Review 메모

- 설계서 요구사항 커버: 단일 페이지(Task1) · TABLES 계약/세트가(Task2) · 필터(Task1·2) · nav/index(Task3) · 검증도구(Task4) · 브랜드별 수집·커밋(Task5) · 완료조건(Task6) — 전부 태스크에 매핑됨.
- 의자 검증 생략(이름+개당가격만) 반영: Task5 Step B, 데이터 계약에 명시.
- 예산 초과 포함+badge 반영: status 매핑표 + SECS `other` 그룹 + budget 필터(`in`).
- setTotal 불변식은 Task2 Step9 / agg.mjs / Task6 Step1 세 곳에서 검사.
- `.agents/` 는 건드리지 않는다(스테이징에 포함하지 않음).

# CS 분석 데이터 패키지

생성: 2026-05-12T14:00:14.002Z
기간: 2025-12-22 ~ 2026-05-12 (142일)
출처: Supabase `kakao_partner_messages` + `kakao_partner_chats` (PR #37 실시간 데몬 수집)

## 파일 목록

| 파일 | 설명 | 행 수 |
|---|---|---|
| 00_metadata.json | 패키지 요약 + 검증 가능 통계 | — |
| 01_customer_chats.csv | 고객 채팅방 (카테고리·감정·드롭 분류) | 1429 |
| 02_customer_messages.csv | 고객 메시지 raw + 카테고리·감정 | 14250 |
| 03_category_summary.csv | 카테고리별 집계 (인입·부정·드롭) | 11 |
| 04_manager_stats.csv | 매니저별 부하 통계 | 14 |
| 05_response_time.csv | 운영시간 bucket별 응답시간 분포 | 3 |
| 06_monthly.csv | 월별 신규 채팅·총 메시지 | 6 |
| 07_hour_dow_heatmap.csv | 시간대 × 요일 매트릭스 | 141 |
| 08_representative_messages.csv | 카테고리별 대표 메시지 (top 5) | 53 |

## 분류 룰

카테고리 11종 + 기타 (`scripts/export-cs-package.mjs` 의 CATEGORY_RULES).
감정: NEG 키워드 hit > POS hit → negative, 반대 → positive, 동률 → neutral.

## 단과톡방 raw

별도 파일: `uploads/단과톡방 25.11.03-26.05.11.txt` (5,689 메시지, 210명, 190일).
파싱·분류: `scripts/analyze-dangua-talkroom.mjs`.

## 재현

```bash
node --env-file=.env.local scripts/export-cs-package.mjs
```

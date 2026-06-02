// src/pages/FaqPage.jsx
// 구조: PageHeader → 카테고리 pill → Accordion (shadcn 공식)
//
// 분류·내용 단일화: 챗봇 대메뉴(CHIP_MENU) 7개와 "동일한 분류 + 동일한 데이터"로
// 노출한다. 챗봇이 칩에서 보여주는 공식 Q&A(officialQa, getQaByCategory)와
// 매니저 FAQ(managerFaq)를 같은 7개 분류로 합쳐, 챗봇과 위키 FAQ가 어긋나지 않게 한다.
import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CaretRight as ChevronRight } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion'
import { PageShell, PageHeader } from '@/components/common/page-primitives'
import { cn } from '@/lib/utils'
import { CHIP_MENU } from '@/components/chatbot/chatbotConfig'
import { getQaByCategory } from '@/data/officialQa'
import { MANAGER_FAQ } from '@/data/managerFaq'

// 챗봇 7개 대메뉴와 동일하게 구성. 각 분류 = 공식 Q&A(payment+refund 병합 포함) + 매니저 FAQ.
const FAQ_ITEMS = CHIP_MENU.flatMap((chip) =>
  [
    ...getQaByCategory(chip.id),
    ...MANAGER_FAQ.filter((f) => f.category === chip.label),
  ].map((item) => ({ ...item, cat: chip.label }))
)

const CATEGORIES = ['전체', ...CHIP_MENU.map((c) => c.label)]

export default function FaqPage() {
  const [category, setCategory] = useState('전체')

  const filtered = useMemo(
    () => (category === '전체' ? FAQ_ITEMS : FAQ_ITEMS.filter((f) => f.cat === category)),
    [category]
  )

  return (
    <PageShell maxWidth="3xl">
      <PageHeader
        breadcrumbs={[{ label: '홈', to: '/' }, { label: 'FAQ' }]}
        title="운영 FAQ"
        description={`상담실장님들이 가장 자주 묻는 반복 문의 ${FAQ_ITEMS.length}개 문항 · 챗봇과 동일한 7개 분류`}
      />

      {/* 카테고리 pill */}
      <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="카테고리 필터">
        {CATEGORIES.map((cat) => {
          const count = cat === '전체' ? FAQ_ITEMS.length : FAQ_ITEMS.filter((f) => f.cat === cat).length
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                category === cat
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground',
              )}
            >
              {cat}
              <span className={cn(
                'tabular-nums',
                category === cat ? 'text-background/70' : 'text-muted-foreground/70'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Accordion */}
      <div className="rounded-lg border bg-card px-4 sm:px-6">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            ‘오류신고’는 접수 메뉴예요. 등록된 FAQ 문항은 없습니다.
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filtered.map((item, i) => (
              <AccordionItem key={`${category}-${i}`} value={`item-${i}`}>
                <AccordionTrigger className="py-4">
                  <div className="flex flex-1 items-start gap-3 text-left">
                    <Badge variant="outline" size="sm" className="mt-0.5 shrink-0 font-normal">
                      {item.cat}
                    </Badge>
                    <span className="flex-1 text-sm font-medium">{item.q}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-[72px] pr-8 pb-5">
                  <p className="prose-ams whitespace-pre-line text-sm">{item.a}</p>
                  {item.guideId && (
                    <Link
                      to={`/guides/${item.guideId}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground transition-colors hover:underline"
                    >
                      관련 가이드 보기 <ChevronRight size={12} />
                    </Link>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </PageShell>
  )
}

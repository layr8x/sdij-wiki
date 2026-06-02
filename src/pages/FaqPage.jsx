// src/pages/FaqPage.jsx
// 구조: PageHeader → 카테고리 pill → Accordion (shadcn 공식)
import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Question as HelpCircle,
  ArrowSquareOut as ExternalLink,
  CaretRight as ChevronRight
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion'
import { PageShell, PageHeader } from '@/components/common/page-primitives'
import { cn } from '@/lib/utils'
import { MANAGER_FAQ as FAQ_DATA } from '@/data/managerFaq'

export default function FaqPage() {
  const [category, setCategory] = useState('전체')

  // 챗봇 대메뉴(CHIP_MENU) 7개와 동일한 분류 체계로 통일
  const FAQ_CATEGORIES = ['OKTA', '강좌/영상/교재', '입퇴반/대기', '결제/환불', '출결/배부', '회원', '오류신고']
  const categories = ['전체', ...FAQ_CATEGORIES]

  const filtered = useMemo(
    () => category === '전체' ? FAQ_DATA : FAQ_DATA.filter(f => f.category === category),
    [category]
  )

  return (
    <PageShell maxWidth="3xl">
      <PageHeader
        breadcrumbs={[{ label: '홈', to: '/' }, { label: 'FAQ' }]}
        title="운영 FAQ"
        description={`상담실장님들이 가장 자주 묻는 반복 문의 ${FAQ_DATA.length}개 문항`}
      />

      {/* 카테고리 pill */}
      <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="카테고리 필터">
        {categories.map(cat => {
          const count = cat === '전체' ? FAQ_DATA.length : FAQ_DATA.filter(f => f.category === cat).length
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
          <p className="py-10 text-center text-sm text-muted-foreground">아직 이 분류에 등록된 FAQ가 없습니다.</p>
        ) : (
        <Accordion type="single" collapsible className="w-full">
          {filtered.map((item, i) => (
            <AccordionItem key={`${category}-${i}`} value={`item-${i}`}>
              <AccordionTrigger className="py-4">
                <div className="flex flex-1 items-start gap-3 text-left">
                  <Badge variant="outline" size="sm" className="mt-0.5 shrink-0 font-normal">
                    {item.category}
                  </Badge>
                  <span className="flex-1 text-sm font-medium">{item.q}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-[72px] pr-8 pb-5">
                <p className="prose-ams text-sm">{item.a}</p>
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

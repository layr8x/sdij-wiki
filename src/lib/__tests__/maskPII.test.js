import { describe, it, expect } from 'vitest'
import { maskName, maskBody } from '../maskPII'

describe('maskPII.maskName', () => {
  it('외자/2자/3자+ 규칙', () => {
    expect(maskName('홍')).toBe('*')
    expect(maskName('김철')).toBe('김*')
    expect(maskName('홍길동')).toBe('홍*동')
    expect(maskName('남궁민수')).toBe('남**수')
  })
  it('멱등 + null 보존', () => {
    expect(maskName(maskName('홍길동'))).toBe('홍*동')
    expect(maskName(null)).toBe(null)
  })
})

describe('maskPII.maskBody', () => {
  it('전화/이메일/주민/카드', () => {
    expect(maskBody('010-1234-5678')).toBe('010-****-5678')
    expect(maskBody('a.b@example.com')).toBe('***@example.com')
    expect(maskBody('901231-1234567')).toBe('[주민번호]')
    expect(maskBody('1234-5678-9012-3456')).toBe('[카드번호]')
  })
  it('라벨 이름 + 폼 단독줄 이름', () => {
    expect(maskBody('학생이름: 홍길동')).toBe('학생이름: 홍*동')
    expect(maskBody('홍길동\n010-1234-5678')).toBe('홍*동\n010-****-5678')
  })
  it('PII 없으면 그대로, null 보존, 멱등', () => {
    expect(maskBody('수업 문의')).toBe('수업 문의')
    expect(maskBody(null)).toBe(null)
    const c = '학생이름: 홍길동\n010-1234-5678 / a@b.com'
    expect(maskBody(maskBody(c))).toBe(maskBody(c))
  })
})

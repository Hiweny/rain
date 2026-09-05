export interface Quote {
  text: string
  from: string
}

/** 离线兜底诗词（接口不可用时也有意境） */
const FALLBACK: Quote[] = [
  { text: '小楼一夜听春雨，深巷明朝卖杏花。', from: '陆游《临安春雨初霁》' },
  { text: '枕上闻雨凉，床前见月明。', from: '白居易《夜雨》' },
  { text: '随风潜入夜，润物细无声。', from: '杜甫《春夜喜雨》' },
  { text: '秋阴不散霜飞晚，留得枯荷听雨声。', from: '李商隐《宿骆氏亭寄怀》' },
  { text: '闲愁似飞絮，细雨湿流光。', from: '冯延巳《南乡子》' },
  { text: '黑云翻墨未遮山，白雨跳珠乱入船。', from: '苏轼《六月二十七日望湖楼醉书》' },
  { text: '沾衣欲湿杏花雨，吹面不寒杨柳风。', from: '志南《绝句》' },
  { text: '空山新雨后，天气晚来秋。', from: '王维《山居秋暝》' },
]

function pickFallback(): Quote {
  return FALLBACK[Math.floor(Math.random() * FALLBACK.length)]
}

/**
 * 拉取一句古诗词。
 * 原本指定的 api.yujn.cn 一言接口不返回 CORS 头，静态站点无法在浏览器读取，
 * 故改用开放跨域的 Hitokoto（分类 i=诗词、k=文学，内容同为古诗词）。
 */
export async function fetchQuote(timeoutMs = 8000): Promise<Quote> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const resp = await fetch('https://v1.hitokoto.cn/?c=i&c=k&encode=json', {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    const text = String(data?.hitokoto || '').trim()
    if (!text) throw new Error('empty')
    const who = data.from_who ? `${data.from_who}` : ''
    const work = data.from ? `《${String(data.from).replace(/[《》]/g, '')}》` : ''
    return { text, from: [who, work].filter(Boolean).join(' ') }
  } catch {
    return pickFallback()
  } finally {
    clearTimeout(timer)
  }
}

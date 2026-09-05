import { useEffect, useState } from 'react'
import { fetchQuote, type Quote } from '../lib/quote'

const ROTATE_MS = 24000

export function useQuote() {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    fetchQuote().then((q) => {
      if (alive) setQuote(q)
    })
    const id = window.setInterval(() => {
      fetchQuote().then((q) => {
        if (alive) setQuote(q)
      })
    }, ROTATE_MS)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [nonce])

  return { quote, refresh: () => setNonce((n) => n + 1) }
}

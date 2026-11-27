import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function ShareButtons({ event }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareText = `¡Te invito al cumple de ${event?.honoreeName || event?.childName || 'mi hijo o hija'}! 🎉⚽`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-3">
      <a
        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-pill-warm inline-flex items-center justify-center gap-2 px-6 py-4 w-full"
      >
        <span className="text-xl">💬</span>
        Compartir por WhatsApp
      </a>

      <button
        onClick={copyLink}
        className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold transition-all ${
          copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'btn-pill-secondary'
        }`}
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
        {copied ? '¡Copiado!' : 'Copiar Link'}
      </button>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const MESES_CURTOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

function parseAnoMes(ym) {
  if (!ym || typeof ym !== 'string') return null
  const match = ym.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  return { ano: Number(match[1]), mes: Number(match[2]) }
}

function formatarRotulo(ym) {
  const parsed = parseAnoMes(ym)
  if (!parsed) return 'Selecione o mês'
  return `${MESES_CURTOS[parsed.mes - 1].toLowerCase()} de ${parsed.ano}`
}

export default function SeletorMes({ value, onChange, min, max, ariaLabel = 'Selecionar mês' }) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef(null)

  const parsedAtual = parseAnoMes(value)
  const hoje = new Date()
  const [anoVisivel, setAnoVisivel] = useState(parsedAtual?.ano || hoje.getFullYear())

  useEffect(() => {
    const p = parseAnoMes(value)
    if (p) setAnoVisivel(p.ano)
  }, [value])

  useEffect(() => {
    function handleClickFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false)
      }
    }
    if (aberto) {
      document.addEventListener('mousedown', handleClickFora)
    }
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [aberto])

  function desabilitado(ano, mesIdx) {
    const ym = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`
    if (min && ym < min) return true
    if (max && ym > max) return true
    return false
  }

  function selecionarMes(mesIdx) {
    if (desabilitado(anoVisivel, mesIdx)) return
    const ym = `${anoVisivel}-${String(mesIdx + 1).padStart(2, '0')}`
    onChange(ym)
    setAberto(false)
  }

  function irParaMesAtual() {
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const ym = `${ano}-${mes}`
    setAnoVisivel(ano)
    onChange(ym)
    setAberto(false)
  }

  return (
    <div ref={containerRef} className="seletor-mes">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={aberto}
        className={`seletor-mes-btn ${aberto ? 'aberto' : ''}`}
        onClick={() => setAberto(prev => !prev)}
      >
        <span>{formatarRotulo(value)}</span>
        <Calendar size={14} className="seletor-mes-icone" />
      </button>

      {aberto && (
        <div className="seletor-mes-popover" role="dialog" aria-label={ariaLabel}>
          <div className="seletor-mes-topo">
            <button
              type="button"
              className="seletor-mes-nav"
              onClick={() => setAnoVisivel(a => a - 1)}
              aria-label="Ano anterior"
            >
              <ChevronLeft size={15} />
            </button>

            <strong className="seletor-mes-ano">{anoVisivel}</strong>

            <button
              type="button"
              className="seletor-mes-nav"
              onClick={() => setAnoVisivel(a => a + 1)}
              aria-label="Próximo ano"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="seletor-mes-grid">
            {MESES_CURTOS.map((nomeMes, idx) => {
              const ym = `${anoVisivel}-${String(idx + 1).padStart(2, '0')}`
              const selecionado = value === ym
              const bloqueado = desabilitado(anoVisivel, idx)

              return (
                <button
                  key={nomeMes}
                  type="button"
                  disabled={bloqueado}
                  onClick={() => selecionarMes(idx)}
                  className={`seletor-mes-item ${selecionado ? 'selecionado' : ''}`}
                >
                  {nomeMes}
                </button>
              )
            })}
          </div>

          <div className="seletor-mes-rodape">
            <button
              type="button"
              className="seletor-mes-hoje"
              onClick={irParaMesAtual}
            >
              Este mês
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
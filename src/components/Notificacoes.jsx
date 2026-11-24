import { useState, useEffect, useMemo, useRef } from 'react'
import { Bell, X, AlertTriangle, AlertCircle, Trash2 } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import './Notificacoes.css'

function formatarValor(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Notificacoes() {
  const { transacoes, orcamentos, loading } = useFinance()
  const [aberto, setAberto] = useState(false)
  const [popups, setPopups] = useState([])
  const [descartadas, setDescartadas] = useState([])
  const chavesExibidasRef = useRef(new Set())

  useEffect(() => {
    if (!aberto) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setAberto(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [aberto])

  const statusOrcamentos = useMemo(() => {
    if (!Array.isArray(orcamentos)) return []

    return orcamentos
      .map(orc => {
        const limite = Number(orc.limite || 0)
        if (!orc.categoria || limite <= 0) return null

        const gasto = (Array.isArray(transacoes) ? transacoes : [])
          .filter(t => t.tipo === 'despesa' && t.categoria === orc.categoria)
          .reduce((acc, t) => acc + Number(t.valor || 0), 0)

        const diferenca = gasto - limite
        const pct = (gasto / limite) * 100
        const pctArredondado = Math.round(pct)

        let estado = null
        let faixaPopup = null
        let tituloPopup = ''
        let mensagemPopup = ''

        if (diferenca > 0.009) {
          estado = 'critico'
          faixaPopup = 'estourado'
          tituloPopup = `Orçamento estourado — ${orc.categoria}`
          mensagemPopup = `${formatarValor(gasto)} de ${formatarValor(limite)} (${pctArredondado}%)`
        } else if (Math.abs(diferenca) <= 0.009) {
          estado = 'critico'
          faixaPopup = 'limite_exato'
          tituloPopup = `Limite atingido — ${orc.categoria}`
          mensagemPopup = `${formatarValor(gasto)} de ${formatarValor(limite)} (100% exato)`
        } else if (pct >= 90) {
          estado = 'aviso'
          faixaPopup = 'dez_porcento'
          const restante = limite - gasto
          tituloPopup = `Faltam 10% (ou menos) — ${orc.categoria}`
          mensagemPopup = `${formatarValor(gasto)} de ${formatarValor(limite)} (${pctArredondado}%) • Restam ${formatarValor(restante)}`
        } else if (pct >= 80) {
          estado = 'aviso'
        }

        return {
          categoria: orc.categoria,
          gasto,
          limite,
          pct: pctArredondado,
          estado,
          faixaPopup,
          tituloPopup,
          mensagemPopup,
        }
      })
      .filter(Boolean)
  }, [transacoes, orcamentos])

  // Remove chaves descartadas que não estão mais ativas
  useEffect(() => {
    const chavesValidas = new Set(
      statusOrcamentos
        .filter(item => item.estado !== null)
        .map(item => `${item.categoria}:${item.estado}`)
    )
    setDescartadas(prev => prev.filter(chave => chavesValidas.has(chave)))
  }, [statusOrcamentos])

  const alertasSininho = useMemo(
    () =>
      statusOrcamentos.filter(
        item => item.estado !== null && !descartadas.includes(`${item.categoria}:${item.estado}`)
      ),
    [statusOrcamentos, descartadas]
  )

  useEffect(() => {
    if (loading) return

    const chavesAtivas = new Set()
    const novosPopups = []

    statusOrcamentos.forEach(item => {
      if (!item.faixaPopup) return
      const chave = `${item.categoria}:${item.faixaPopup}`
      chavesAtivas.add(chave)

      if (!chavesExibidasRef.current.has(chave)) {
        chavesExibidasRef.current.add(chave)
        novosPopups.push({
          id: `${chave}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tipo: item.estado,
          titulo: item.tituloPopup,
          mensagem: item.mensagemPopup,
          pct: item.pct,
        })
      }
    })

    Array.from(chavesExibidasRef.current).forEach(chave => {
      if (!chavesAtivas.has(chave)) {
        chavesExibidasRef.current.delete(chave)
      }
    })

    if (novosPopups.length > 0) {
      setPopups(prev => [...prev, ...novosPopups])
    }
  }, [statusOrcamentos, loading])

  useEffect(() => {
    if (!popups.length) return
    const timers = popups.map(p =>
      setTimeout(() => {
        setPopups(prev => prev.filter(item => item.id !== p.id))
      }, 7000)
    )
    return () => timers.forEach(clearTimeout)
  }, [popups])

  function excluirAlerta(alerta) {
    const chave = `${alerta.categoria}:${alerta.estado}`
    setDescartadas(prev => (prev.includes(chave) ? prev : [...prev, chave]))
  }

  function limparTodosAlertas() {
    const chaves = alertasSininho.map(a => `${a.categoria}:${a.estado}`)
    setDescartadas(prev => Array.from(new Set([...prev, ...chaves])))
  }

  function fecharPopup(id) {
    setPopups(prev => prev.filter(item => item.id !== id))
  }

  if (!Array.isArray(orcamentos)) return null

  return (
    <>
      <div className="notif-wrapper">
        <button
          type="button"
          className="notif-btn"
          onClick={() => setAberto(prev => !prev)}
          aria-label="Notificações"
        >
          <Bell size={20} />
          {alertasSininho.length > 0 && (
            <span className={`notif-badge ${alertasSininho.some(a => a.estado === 'critico') ? 'critico' : 'aviso'}`}>
              {alertasSininho.length}
            </span>
          )}
        </button>

        {aberto && (
          <>
            <div className="notif-overlay" onClick={() => setAberto(false)} />
            <div className="notif-dropdown">
              <div className="notif-header">
                <span>Notificações</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {alertasSininho.length > 0 && (
                    <button
                      type="button"
                      onClick={limparTodosAlertas}
                      title="Limpar todas as notificações"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        padding: '3px 8px',
                      }}
                    >
                      Limpar
                    </button>
                  )}
                  <button type="button" onClick={() => setAberto(false)} aria-label="Fechar notificações">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {alertasSininho.length === 0 ? (
                <div className="notif-vazio">
                  <Bell size={32} />
                  <p>Nenhum alerta no momento!</p>
                  <span>Seus gastos estão dentro do limite.</span>
                </div>
              ) : (
                <div className="notif-lista">
                  {alertasSininho.map((a, i) => (
                    <div key={`${a.categoria}-${a.estado}-${i}`} className={`notif-item ${a.estado}`}>
                      <div className="notif-icone">
                        {a.estado === 'critico'
                          ? <AlertCircle size={18} />
                          : <AlertTriangle size={18} />
                        }
                      </div>
                      <div className="notif-conteudo">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <strong>
                            {a.estado === 'critico'
                              ? `Limite ultrapassado — ${a.categoria}`
                              : `Atenção — ${a.categoria}`
                            }
                          </strong>
                          <button
                            type="button"
                            onClick={() => excluirAlerta(a)}
                            title="Excluir notificação"
                            aria-label="Excluir notificação"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: 2,
                              display: 'inline-flex',
                              flexShrink: 0,
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p>
                          {formatarValor(a.gasto)} de {formatarValor(a.limite)} ({a.pct}%)
                        </p>
                        <div className="notif-barra-bg">
                          <div
                            className={`notif-barra ${a.estado}`}
                            style={{ width: `${Math.min(a.pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {popups.length > 0 && (
        <div className="notif-popup-stack" role="alert" aria-live="assertive">
          {popups.map(p => (
            <div key={p.id} className={`notif-popup ${p.tipo}`}>
              <div className="notif-popup-icone">
                {p.tipo === 'critico' ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
              </div>
              <div className="notif-popup-corpo">
                <strong>{p.titulo}</strong>
                <span>{p.mensagem}</span>
              </div>
              <button
                type="button"
                className="notif-popup-fechar"
                onClick={() => fecharPopup(p.id)}
                title="Fechar notificação"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
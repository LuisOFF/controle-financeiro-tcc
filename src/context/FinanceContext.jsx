import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../services/api'

const FinanceContext = createContext()

export function FinanceProvider({ children }) {
  const [transacoes, setTransacoes] = useState([])
  const [metas, setMetas]           = useState([])
  const [carteiras, setCarteiras]   = useState([])
  const [orcamentos, setOrcamentos] = useState([])
  const [historico, setHistorico]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [alertasOrcamento, setAlertasOrcamento] = useState([])

  const alertasDisparadosRef = useRef(new Set())

  const fecharAlertaOrcamento = useCallback((id) => {
    setAlertasOrcamento(prev => prev.filter(a => a.id !== id))
  }, [])

  const registrar = useCallback(async (tipo, descricao) => {
    try {
      const novo = await api.post('/historico', { tipo, descricao })
      setHistorico(prev => [novo, ...prev].slice(0, 100))
    } catch (err) {
      console.error('Erro ao registrar histórico:', err)
    }
  }, [])

  const carregarDados = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setTransacoes([])
      setMetas([])
      setCarteiras([])
      setOrcamentos([])
      setHistorico([])
      setAlertasOrcamento([])
      alertasDisparadosRef.current.clear()
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [t, m, c, o, h] = await Promise.all([
        api.get('/transacoes'),
        api.get('/metas'),
        api.get('/carteiras'),
        api.get('/orcamentos'),
        api.get('/historico'),
      ])
      setTransacoes(Array.isArray(t) ? t : [])
      setMetas(Array.isArray(m) ? m : [])
      setCarteiras(Array.isArray(c) ? c : [])
      setOrcamentos(Array.isArray(o) ? o : [])
      setHistorico(Array.isArray(h) ? h : [])
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()

    const retryTimer = setTimeout(() => {
      if (localStorage.getItem('token')) {
        carregarDados()
      }
    }, 150)

    function handleStorageChange(e) {
      if (!e.key || e.key === 'token' || e.key === 'usuario') {
        carregarDados()
      }
    }

    window.addEventListener('auth-change', carregarDados)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      clearTimeout(retryTimer)
      window.removeEventListener('auth-change', carregarDados)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [carregarDados])

  // Monitora orçamentos por categoria para disparar pop-ups em 90% (10% restante), 100% exato e estouro (>100%)
  useEffect(() => {
    if (loading || !orcamentos.length) return

    const gastosPorCat = transacoes
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => {
        const cat = t.categoria || 'Outros'
        acc[cat] = (acc[cat] || 0) + Number(t.valor || 0)
        return acc
      }, {})

    const novosAlertas = []
    const chavesAtivas = new Set()

    orcamentos.forEach((orc) => {
      const cat = orc.categoria
      const limite = Number(orc.limite || 0)
      if (!cat || limite <= 0) return

      const gasto = gastosPorCat[cat] || 0
      const diferenca = gasto - limite
      const percentual = (gasto / limite) * 100

      let faixa = null
      let titulo = ''
      let mensagem = ''
      let severidade = 'warning'

      if (diferenca > 0.009) {
        faixa = 'estourado'
        severidade = 'danger'
        titulo = `Orçamento estourado: ${cat}`
        mensagem = `Gasto de ${gasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ultrapassou o limite de ${limite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} acima).`
      } else if (Math.abs(diferenca) <= 0.009) {
        faixa = 'limite'
        severidade = 'warning'
        titulo = `Limite atingido: ${cat}`
        mensagem = `Você atingiu 100% do limite de ${limite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em ${cat}.`
      } else if (percentual >= 90) {
        faixa = 'quase_limite'
        severidade = 'warning'
        const restante = limite - gasto
        titulo = `Atenção ao limite: ${cat}`
        mensagem = `Você já utilizou ${percentual.toFixed(0)}% do orçamento (${gasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de ${limite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Restam ${restante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
      }

      if (faixa) {
        const chave = `${cat}:${faixa}`
        chavesAtivas.add(chave)

        if (!alertasDisparadosRef.current.has(chave)) {
          alertasDisparadosRef.current.add(chave)
          novosAlertas.push({
            id: `${chave}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            categoria: cat,
            faixa,
            severidade,
            titulo,
            mensagem,
          })
        }
      }
    })

    // Remove chaves antigas que já não se aplicam mais (ex: orçamento aumentado ou despesa removida)
    Array.from(alertasDisparadosRef.current).forEach((chave) => {
      if (!chavesAtivas.has(chave)) {
        alertasDisparadosRef.current.delete(chave)
      }
    })

    if (novosAlertas.length > 0) {
      setAlertasOrcamento(prev => [...prev, ...novosAlertas])
    }
  }, [transacoes, orcamentos, loading])

  async function adicionarTransacao(transacao) {
    const nova = await api.post('/transacoes', transacao)
    setTransacoes(prev => [nova, ...prev])
    await registrar(
      `transacao_adicionada_${nova.tipo}`,
      `${nova.tipo === 'receita' ? 'Receita' : 'Despesa'} adicionada: ${nova.desc} — ${nova.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    )
  }

  async function atualizarTransacao(id, transacao) {
    const atualizada = await api.put(`/transacoes/${id}`, transacao)
    setTransacoes(prev => prev.map(t => t.id === id ? atualizada : t))
    await registrar(
      'transacao_editada',
      `Transação editada: ${atualizada.desc} — ${atualizada.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    )
    return atualizada
  }

  async function removerTransacao(id) {
    const t = transacoes.find(t => t.id === id)
    await api.delete(`/transacoes/${id}`)
    setTransacoes(prev => prev.filter(t => t.id !== id))
    if (t) await registrar('transacao_removida', `Transação removida: ${t.desc}`)
  }

  async function adicionarMeta(meta) {
    const nova = await api.post('/metas', meta)
    setMetas(prev => [...prev, nova])
    await registrar('meta_adicionada', `Meta criada: ${nova.nome} — objetivo: ${nova.objetivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
  }

  async function atualizarMeta(id, atual) {
    const m = metas.find(m => m.id === id)
    await api.put(`/metas/${id}`, { atual })
    setMetas(prev => prev.map(m => m.id === id ? { ...m, atual } : m))
    if (m) {
      const deposito = atual - m.atual
      await registrar(
        'meta_deposito',
        `Depósito na meta "${m.nome}": ${deposito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Total: ${atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`
      )
    }
  }

  async function removerMeta(id) {
    const m = metas.find(m => m.id === id)
    await api.delete(`/metas/${id}`)
    setMetas(prev => prev.filter(m => m.id !== id))
    if (m) await registrar('meta_removida', `Meta removida: ${m.nome}`)
  }

  async function adicionarCarteira(carteira) {
    const nova = await api.post('/carteiras', carteira)
    setCarteiras(prev => [...prev, nova])
    await registrar('carteira_adicionada', `Carteira adicionada: ${nova.nome} — saldo: ${nova.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
  }

  async function removerCarteira(id) {
    const c = carteiras.find(c => c.id === id)
    await api.delete(`/carteiras/${id}`)
    setCarteiras(prev => prev.filter(c => c.id !== id))
    if (c) await registrar('carteira_removida', `Carteira removida: ${c.nome}`)
  }

  async function adicionarOrcamento(orc) {
    const salvo = await api.post('/orcamentos', orc)
    setOrcamentos(prev => {
      const existe = prev.some(item => item.id === salvo.id)
      return existe
        ? prev.map(item => item.id === salvo.id ? salvo : item)
        : [...prev, salvo]
    })
    await registrar('orcamento_adicionado', `Orçamento definido: ${salvo.categoria} — limite: ${salvo.limite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
  }

  async function removerOrcamento(idOuIndex) {
    const alvo = orcamentos.find(o => o.id === idOuIndex) || orcamentos[idOuIndex]
    if (!alvo) return

    await api.delete(`/orcamentos/${alvo.id}`)
    setOrcamentos(prev => prev.filter(o => o.id !== alvo.id))
    await registrar('orcamento_removido', `Orçamento removido: ${alvo.categoria}`)
  }

  async function registrarImportacao(qtd) {
    await registrar('importacao', `Importação realizada: ${qtd} registros importados`)
  }

  const totalReceitas = transacoes
    .filter(t => t.tipo === 'receita')
    .reduce((acc, t) => acc + t.valor, 0)

  const totalDespesas = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, t) => acc + t.valor, 0)

  const saldo = totalReceitas - totalDespesas

  const gastosPorCategoria = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, t) => {
      const existing = acc.find(i => i.name === t.categoria)
      if (existing) existing.value += t.valor
      else acc.push({ name: t.categoria, value: t.valor })
      return acc
    }, [])

  return (
    <FinanceContext.Provider value={{
      transacoes, metas, carteiras, orcamentos, historico, loading,
      alertasOrcamento, fecharAlertaOrcamento,
      carregarDados,
      adicionarTransacao, atualizarTransacao, removerTransacao,
      adicionarMeta, atualizarMeta, removerMeta,
      adicionarCarteira, removerCarteira,
      adicionarOrcamento, removerOrcamento,
      registrarImportacao,
      totalReceitas, totalDespesas, saldo,
      gastosPorCategoria,
    }}>
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  return useContext(FinanceContext)
}
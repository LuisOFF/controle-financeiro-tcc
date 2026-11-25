import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Users, Plus, LogOut, Copy, Check, TrendingUp, TrendingDown, Target,
  Wallet, X, UserMinus, SquarePen, Trash2, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronDown, ChevronUp
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { api } from '../../services/api'
import SeletorMes from '../../components/SeletorMes'
import './Familia.css'

const categorias = ['Alimentação','Moradia','Transporte','Saúde','Educação','Lazer','Salário','Freelance','Outros']
const cores = ['#60a5fa','#4ade80','#c084fc','#fb923c','#f472b6','#f87171','#34d399','#facc15']
const coresGrafico = ['#4ade80', '#60a5fa', '#c084fc', '#fb923c', '#f472b6', '#94a3b8']
const MESES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const iconesMeta = ['🎯','✈️','🏠','🚗','💻','🎓','💍','🛡️']

const vazioTransacao = { desc: '', tipo: 'despesa', categoria: 'Alimentação', valor: '', data: '' }
const vazioMeta      = { nome: '', objetivo: '', atual: '', icone: '🎯', cor: '#4ade80' }
const vazioCarteira  = { nome: '', tipo: 'banco', saldo: '', cor: '#60a5fa' }

function TooltipFamilia({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="familia-tooltip">
        <p className="familia-tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name === 'receitas' ? 'Receitas' : 'Despesas'}:{' '}
            {Number(p.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        ))}
      </div>
    )
  }
  return null
}

function normalizarAnoMes(dataStr) {
  if (!dataStr || typeof dataStr !== 'string') return null
  const match = dataStr.trim().match(/^(\d{2,4})-(\d{2})/)
  if (!match) return null

  let ano = Number(match[1])
  const mes = Number(match[2])
  if (mes < 1 || mes > 12) return null

  if (ano < 100) ano += 2000
  if (ano < 1970 || ano > 2100) return null

  return `${ano}-${String(mes).padStart(2, '0')}`
}

function chaveDataOrdenacao(dataStr) {
  if (!dataStr || typeof dataStr !== 'string') return ''
  const isoMatch = dataStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const brMatch = dataStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`

  return dataStr.trim()
}

function parsearValor(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0
  if (!valor) return 0

  const limpo = String(valor)
    .replace(/\s+/g, '')
    .replace(/^R\$/i, '')
    .trim()

  if (limpo.includes(',')) {
    const normalizado = limpo.replace(/\./g, '').replace(',', '.')
    const num = Number(normalizado)
    return Number.isFinite(num) ? num : 0
  }

  const num = Number(limpo)
  return Number.isFinite(num) ? num : 0
}

export default function Familia() {
  const [conta, setConta]             = useState(null)
  const [contaMinimizada, setContaMinimizada] = useState(true)
  const [loading, setLoading]         = useState(true)
  const [copiado, setCopiado]         = useState(false)
  const [codigo, setCodigo]           = useState('')
  const [erro, setErro]               = useState('')
  const [transacoes, setTransacoes]   = useState([])
  const [metas, setMetas]             = useState([])
  const [carteiras, setCarteiras]     = useState([])
  const [aba, setAba]                 = useState('transacoes')
  const [periodoAtalho, setPeriodoAtalho] = useState('ultimos_6_meses')
  const [ordenarPor, setOrdenarPor]     = useState('data')
  const [ordemDirecao, setOrdemDirecao] = useState('desc')
  const [dataDe, setDataDe]           = useState(() => {
    const agora = new Date()
    const inicio = new Date(agora.getFullYear(), agora.getMonth() - 5, 1)
    return `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}`
  })
  const [dataAte, setDataAte]         = useState(() => {
    const agora = new Date()
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  })
  const [salvando, setSalvando]       = useState(false)

  // Modal e estados de edição
  const [modalTipo, setModalTipo]     = useState(null) // 'transacao' | 'meta' | 'carteira' | null
  const [editandoId, setEditandoId]   = useState(null)
  const [form, setForm]               = useState(vazioTransacao)
  const [formMeta, setFormMeta]       = useState(vazioMeta)
  const [formCarteira, setFormCarteira] = useState(vazioCarteira)

  const buscandoRef = useRef(false)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const carregarConta = useCallback(async (silencioso = false) => {
    if (buscandoRef.current) return
    buscandoRef.current = true

    if (!silencioso) setLoading(true)

    try {
      const data = await api.get('/familia')
      setConta(data)

      if (data) {
        const [t, m, c] = await Promise.all([
          api.get('/familia/transacoes'),
          api.get('/familia/metas'),
          api.get('/familia/carteiras'),
        ])
        setTransacoes(t)
        setMetas(m)
        setCarteiras(c)
      } else {
        setTransacoes([])
        setMetas([])
        setCarteiras([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      if (!silencioso) setLoading(false)
      buscandoRef.current = false
    }
  }, [])

  useEffect(() => {
    carregarConta(false)

    const intervalo = setInterval(() => {
      if (!document.hidden) {
        carregarConta(true)
      }
    }, 5000)

    function aoFocar() {
      if (!document.hidden) {
        carregarConta(true)
      }
    }

    function aoMudarSessao(e) {
      if (!e.key || e.key === 'token' || e.key === 'usuario') {
        carregarConta(false)
      }
    }

    window.addEventListener('focus', aoFocar)
    document.addEventListener('visibilitychange', aoFocar)
    window.addEventListener('storage', aoMudarSessao)
    window.addEventListener('auth-change', aoMudarSessao)

    return () => {
      clearInterval(intervalo)
      window.removeEventListener('focus', aoFocar)
      document.removeEventListener('visibilitychange', aoFocar)
      window.removeEventListener('storage', aoMudarSessao)
      window.removeEventListener('auth-change', aoMudarSessao)
    }
  }, [carregarConta])

  function handleOrdenarColuna(coluna) {
    if (ordenarPor === coluna) {
      setOrdemDirecao(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrdenarPor(coluna)
      setOrdemDirecao(coluna === 'data' || coluna === 'valor' ? 'desc' : 'asc')
    }
  }

  function renderIconeOrdenacao(coluna) {
    if (ordenarPor !== coluna) {
      return <ArrowUpDown size={13} style={{ opacity: 0.55, flexShrink: 0 }} />
    }
    return ordemDirecao === 'asc'
      ? <ArrowUp size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
      : <ArrowDown size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
  }

  function fecharModal() {
    setModalTipo(null)
    setEditandoId(null)
    setForm(vazioTransacao)
    setFormMeta(vazioMeta)
    setFormCarteira(vazioCarteira)
  }

  function abrirNovaTransacao() {
    setEditandoId(null)
    setForm(vazioTransacao)
    setModalTipo('transacao')
  }

  function abrirEditarTransacao(t) {
    setEditandoId(t.id)
    setForm({
      desc: t.desc,
      tipo: t.tipo,
      categoria: t.categoria,
      valor: String(t.valor),
      data: t.data,
    })
    setModalTipo('transacao')
  }

  function abrirNovaMeta() {
    setEditandoId(null)
    setFormMeta(vazioMeta)
    setModalTipo('meta')
  }

  function abrirEditarMeta(m) {
    setEditandoId(m.id)
    setFormMeta({
      nome: m.nome,
      objetivo: String(m.objetivo),
      atual: String(m.atual),
      icone: m.icone || '🎯',
      cor: m.cor || '#4ade80',
    })
    setModalTipo('meta')
  }

  function abrirNovaCarteira() {
    setEditandoId(null)
    setFormCarteira(vazioCarteira)
    setModalTipo('carteira')
  }

  function abrirEditarCarteira(c) {
    setEditandoId(c.id)
    setFormCarteira({
      nome: c.nome,
      tipo: c.tipo,
      saldo: String(c.saldo),
      cor: c.cor || '#60a5fa',
    })
    setModalTipo('carteira')
  }

  async function handleCriar() {
    try {
      setErro('')
      const data = await api.post('/familia/criar', {})
      setConta(data)
    } catch (err) {
      setErro(err.message)
    }
  }

  async function handleEntrar(e) {
    e.preventDefault()
    if (!codigo) { setErro('Informe o código.'); return }
    try {
      setErro('')
      const data = await api.post('/familia/entrar', { codigo })
      setConta(data)
      carregarConta(false)
    } catch (err) {
      setErro(err.message)
    }
  }

  async function handleSair() {
    if (!confirm('Tem certeza que deseja sair da conta compartilhada?')) return
    try {
      await api.post('/familia/sair', {})
      setConta(null)
      setTransacoes([])
      setMetas([])
      setCarteiras([])
    } catch (err) {
      setErro(err.message)
    }
  }

  async function handleRemoverMembro(membroId, membroNome) {
    if (!confirm(`Tem certeza que deseja remover ${membroNome} da conta?`)) return
    try {
      await api.delete(`/familia/membros/${membroId}`)
      setConta(prev => ({
        ...prev,
        usuarios: prev.usuarios.filter(u => u.id !== membroId)
      }))
    } catch (err) {
      setErro(err.message)
    }
  }

  function copiarCodigo() {
    navigator.clipboard.writeText(conta.codigo)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  // --- CRUD TRANSAÇÕES ---
  async function handleSalvarTransacao(e) {
    e.preventDefault()
    if (!form.desc || !form.valor || !form.data) return
    try {
      setSalvando(true)
      const payload = {
        desc: form.desc,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: parseFloat(form.valor),
        data: form.data,
      }

      if (editandoId) {
        const atualizada = await api.put(`/familia/transacoes/${editandoId}`, payload)
        setTransacoes(prev => prev.map(t => t.id === editandoId ? atualizada : t))
      } else {
        const nova = await api.post('/familia/transacoes', payload)
        setTransacoes(prev => [nova, ...prev])
      }
      fecharModal()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleRemoverTransacao(id) {
    await api.delete(`/familia/transacoes/${id}`)
    setTransacoes(prev => prev.filter(t => t.id !== id))
  }

  // --- CRUD METAS ---
  async function handleSalvarMeta(e) {
    e.preventDefault()
    if (!formMeta.nome || !formMeta.objetivo) return
    try {
      setSalvando(true)
      const payload = {
        nome: formMeta.nome,
        objetivo: parseFloat(formMeta.objetivo),
        atual: parseFloat(formMeta.atual) || 0,
        icone: formMeta.icone,
        cor: formMeta.cor,
      }

      if (editandoId) {
        const atualizada = await api.put(`/familia/metas/${editandoId}`, payload)
        setMetas(prev => prev.map(m => m.id === editandoId ? atualizada : m))
      } else {
        const nova = await api.post('/familia/metas', payload)
        setMetas(prev => [...prev, nova])
      }
      fecharModal()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleRemoverMeta(id) {
    await api.delete(`/familia/metas/${id}`)
    setMetas(prev => prev.filter(m => m.id !== id))
  }

  // --- CRUD CARTEIRAS ---
  async function handleSalvarCarteira(e) {
    e.preventDefault()
    if (!formCarteira.nome || formCarteira.saldo === '') return
    try {
      setSalvando(true)
      const payload = {
        nome: formCarteira.nome,
        tipo: formCarteira.tipo,
        saldo: parseFloat(formCarteira.saldo) || 0,
        cor: formCarteira.cor,
      }

      if (editandoId) {
        const atualizada = await api.put(`/familia/carteiras/${editandoId}`, payload)
        setCarteiras(prev => prev.map(c => c.id === editandoId ? atualizada : c))
      } else {
        const nova = await api.post('/familia/carteiras', payload)
        setCarteiras(prev => [...prev, nova])
      }
      fecharModal()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleRemoverCarteira(id) {
    await api.delete(`/familia/carteiras/${id}`)
    setCarteiras(prev => prev.filter(c => c.id !== id))
  }

  function formatarValor(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarData(data) {
    if (!data) return ''
    return data.split('-').reverse().join('/')
  }

  const transacoesFiltradas = useMemo(() => {
    if (periodoAtalho === 'todo_periodo') return transacoes

    const agora = new Date()
    const ateAtualYm = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

    let inicioYm = dataDe
    let fimYm = dataAte

    if (periodoAtalho === 'ultimos_6_meses') {
      const d = new Date(agora.getFullYear(), agora.getMonth() - 5, 1)
      inicioYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      fimYm = ateAtualYm
    } else if (periodoAtalho === 'ultimos_12_meses') {
      const d = new Date(agora.getFullYear(), agora.getMonth() - 11, 1)
      inicioYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      fimYm = ateAtualYm
    }

    return transacoes.filter(t => {
      const ym = normalizarAnoMes(t.data)
      if (!ym) return false
      if (inicioYm && ym < inicioYm) return false
      if (fimYm && ym > fimYm) return false
      return true
    })
  }, [transacoes, periodoAtalho, dataDe, dataAte])

  const transacoesOrdenadas = useMemo(() => {
    const fator = ordemDirecao === 'asc' ? 1 : -1

    return [...transacoesFiltradas].sort((a, b) => {
      let comparacao = 0

      if (ordenarPor === 'valor') {
        const valA = Math.abs(parsearValor(a.valor))
        const valB = Math.abs(parsearValor(b.valor))
        comparacao = valA - valB
      } else if (ordenarPor === 'data') {
        const dA = chaveDataOrdenacao(a.data)
        const dB = chaveDataOrdenacao(b.data)
        comparacao = dA.localeCompare(dB)
      } else {
        const strA = String(a[ordenarPor] || '').toLowerCase()
        const strB = String(b[ordenarPor] || '').toLowerCase()
        comparacao = strA.localeCompare(strB, 'pt-BR')
      }

      if (comparacao !== 0) return comparacao * fator
      return Number(b.id || 0) - Number(a.id || 0)
    })
  }, [transacoesFiltradas, ordenarPor, ordemDirecao])

  const totalReceitas = transacoesFiltradas
    .filter(t => t.tipo === 'receita')
    .reduce((acc, t) => acc + parsearValor(t.valor), 0)

  const totalDespesas = transacoesFiltradas
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, t) => acc + parsearValor(t.valor), 0)

  const saldo = totalReceitas - totalDespesas

  // Gráfico da família: Receitas vs Despesas apenas dos meses filtrados
  const dadosGraficoMensal = useMemo(() => {
    const mapa = {}
    transacoesFiltradas.forEach(t => {
      const ym = normalizarAnoMes(t.data)
      if (!ym) return
      if (!mapa[ym]) mapa[ym] = { ym, receitas: 0, despesas: 0 }
      if (t.tipo === 'receita') mapa[ym].receitas += parsearValor(t.valor)
      if (t.tipo === 'despesa') mapa[ym].despesas += parsearValor(t.valor)
    })

    const chaves = Object.keys(mapa).sort()
    const anoAtual = new Date().getFullYear()

    return chaves.map(ym => {
      const [anoStr, mesStr] = ym.split('-')
      const ano = Number(anoStr)
      const mesIdx = Number(mesStr) - 1
      const label = ano === anoAtual
        ? MESES_NOMES[mesIdx]
        : `${MESES_NOMES[mesIdx]}/${anoStr.slice(-2)}`

      return {
        mes: label,
        receitas: mapa[ym].receitas,
        despesas: mapa[ym].despesas,
      }
    })
  }, [transacoesFiltradas])

  // Gráfico da família: Gastos por categoria (separando "Outros" pela descrição)
  const dadosGraficoCategoria = useMemo(() => {
    const mapa = {}
    transacoesFiltradas
      .filter(t => t.tipo === 'despesa')
      .forEach(t => {
        const cat = t.categoria || 'Outros'
        const valor = parsearValor(t.valor)

        if (cat === 'Outros') {
          const nomeDesc = t.desc?.trim() || 'Outros'
          const chave = `outros-${nomeDesc.toLowerCase()}`
          if (!mapa[chave]) {
            mapa[chave] = { name: nomeDesc, value: 0 }
          }
          mapa[chave].value += valor
        } else {
          if (!mapa[cat]) {
            mapa[cat] = { name: cat, value: 0 }
          }
          mapa[cat].value += valor
        }
      })

    return Object.values(mapa).sort((a, b) => b.value - a.value)
  }, [transacoesFiltradas])

  // Histórico geral da família (sem filtros, mais recente primeiro)
  const historicoTransacoesFamilia = useMemo(() => {
    return [...transacoes].sort((a, b) => {
      const cmp = chaveDataOrdenacao(b.data).localeCompare(chaveDataOrdenacao(a.data))
      if (cmp !== 0) return cmp
      return Number(b.id || 0) - Number(a.id || 0)
    })
  }, [transacoes])

  if (loading) return <div className="familia-loading">Carregando...</div>

  if (!conta) {
    return (
      <div className="familia-page">
        <div className="familia-header">
          <h2>Conta Família</h2>
          <p>Compartilhe suas finanças com parceiro, cônjuge ou família.</p>
        </div>

        <div className="familia-opcoes">
          <div className="opcao-card">
            <div className="opcao-icone criar">
              <Users size={28} />
            </div>
            <h3>Criar conta compartilhada</h3>
            <p>Crie uma nova conta e convide outras pessoas com um código único.</p>
            <button className="btn-criar-conta" onClick={handleCriar}>
              <Plus size={16} />
              Criar conta
            </button>
          </div>

          <div className="opcao-divider">ou</div>

          <div className="opcao-card">
            <div className="opcao-icone entrar">
              <LogOut size={28} style={{ transform: 'rotate(180deg)' }} />
            </div>
            <h3>Entrar em uma conta</h3>
            <p>Recebeu um código de convite? Digite abaixo para entrar.</p>
            <form className="form-codigo" onSubmit={handleEntrar}>
              <input
                placeholder="Digite o código (ex: AB12CD)"
                value={codigo}
                onChange={e => { setCodigo(e.target.value.toUpperCase()); setErro('') }}
                maxLength={8}
              />
              <button type="submit">Entrar</button>
            </form>
            {erro && <p className="familia-erro">{erro}</p>}
          </div>
        </div>
      </div>
    )
  }

  const abasConfig = [
    { key: 'transacoes', label: 'Transações' },
    { key: 'metas',      label: 'Metas' },
    { key: 'carteiras',  label: 'Carteiras' },
    { key: 'historico',  label: 'Histórico' },
  ]

  const estiloColunaBtn = {
    background: 'none',
    border: 'none',
    padding: 0,
    font: 'inherit',
    color: 'inherit',
    textTransform: 'inherit',
    letterSpacing: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer',
  }

  return (
    <div className="familia-page">
      <div className="familia-header">
        <h2>Conta Família</h2>
        <p>Finanças compartilhadas em tempo real.</p>
      </div>

      {/* Info da conta (minimizada por padrão) */}
      <div className="conta-info-card">
        <div className="conta-info-barra">
          <div className="conta-info-resumo">
            <Users size={16} />
            <span className="conta-resumo-titulo">Detalhes da conta</span>
            <span className="conta-resumo-codigo">Código: {conta.codigo}</span>
            <span className="conta-resumo-meta">
              {conta.usuarios?.length || 0} {conta.usuarios?.length === 1 ? 'membro' : 'membros'}
            </span>
          </div>

          <button
            type="button"
            className="btn-toggle-conta"
            onClick={() => setContaMinimizada(prev => !prev)}
            aria-expanded={!contaMinimizada}
          >
            <span>{contaMinimizada ? 'Expandir' : 'Minimizar'}</span>
            {contaMinimizada ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>

        {!contaMinimizada && (
          <div className="conta-info-conteudo">
            <div className="conta-codigo-area">
              <div>
                <span className="codigo-label">Código de convite</span>
                <div className="codigo-valor">{conta.codigo}</div>
                <span className="codigo-hint">Compartilhe este código para convidar pessoas</span>
              </div>
              <button className="btn-copiar" onClick={copiarCodigo}>
                {copiado ? <Check size={16} /> : <Copy size={16} />}
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="conta-membros">
              <span className="membros-label">Membros ({conta.usuarios?.length || 0})</span>
              <div className="membros-lista">
                {conta.usuarios?.map((u, i) => (
                  <div key={u.id || i} className="membro-item">
                    <div className="membro-avatar">
                      {u.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="membro-dados">
                      <strong>{u.nome}</strong>
                      {u.id === usuario.id && <span className="membro-voce">você</span>}
                    </div>
                    {u.id !== usuario.id && (
                      <button
                        className="btn-remover-membro"
                        onClick={() => handleRemoverMembro(u.id, u.nome)}
                        title={`Remover ${u.nome}`}
                      >
                        <UserMinus size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-sair-conta" onClick={handleSair}>
              <LogOut size={16} />
              Sair da conta
            </button>
          </div>
        )}
      </div>

      {/* Filtro de período */}
      <div className="familia-periodo-bar">
        <div className="familia-periodo-atalhos">
          <button
            type="button"
            className={`periodo-btn ${periodoAtalho === 'ultimos_6_meses' ? 'ativo' : ''}`}
            onClick={() => setPeriodoAtalho('ultimos_6_meses')}
          >
            Últimos 6 meses
          </button>
          <button
            type="button"
            className={`periodo-btn ${periodoAtalho === 'ultimos_12_meses' ? 'ativo' : ''}`}
            onClick={() => setPeriodoAtalho('ultimos_12_meses')}
          >
            Últimos 12 meses
          </button>
          <button
            type="button"
            className={`periodo-btn ${periodoAtalho === 'todo_periodo' ? 'ativo' : ''}`}
            onClick={() => setPeriodoAtalho('todo_periodo')}
          >
            Todo o período
          </button>
        </div>

        <div className="familia-periodo-range">
          <span className="periodo-label">De</span>
          <SeletorMes
            value={dataDe}
            max={dataAte || undefined}
            onChange={valor => {
              setDataDe(valor)
              setPeriodoAtalho('intervalo')
            }}
            ariaLabel="Mês inicial"
          />
          <span className="periodo-label">Até</span>
          <SeletorMes
            value={dataAte}
            min={dataDe || undefined}
            onChange={valor => {
              setDataAte(valor)
              setPeriodoAtalho('intervalo')
            }}
            ariaLabel="Mês final"
          />
        </div>
      </div>

      {/* Gráficos da Família */}
      <div className="familia-graficos-grid">
        <div className="familia-grafico-card">
          <div className="familia-grafico-header">
            <h3>Receitas vs Despesas da Família</h3>
            <span>Visão mensal</span>
          </div>

          {dadosGraficoMensal.length === 0 ? (
            <div className="familia-sem-dados">Sem lançamentos suficientes para o gráfico.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dadosGraficoMensal} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={<TooltipFamilia />}
                  cursor={{ fill: 'var(--bg-hover, rgba(148, 163, 184, 0.14))' }}
                />
                <Bar
                  dataKey="receitas"
                  fill="#4ade80"
                  radius={[6, 6, 0, 0]}
                  activeBar={{ fill: '#22c55e', stroke: '#dcfce7', strokeWidth: 1.5 }}
                />
                <Bar
                  dataKey="despesas"
                  fill="#f87171"
                  radius={[6, 6, 0, 0]}
                  activeBar={{ fill: '#ef4444', stroke: '#fee2e2', strokeWidth: 1.5 }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}

          <div className="familia-grafico-legenda">
            <span><span className="familia-dot green" />Receitas</span>
            <span><span className="familia-dot red" />Despesas</span>
          </div>
        </div>

        <div className="familia-grafico-card">
          <div className="familia-grafico-header">
            <h3>Gastos por Categoria</h3>
            <span>Conta compartilhada</span>
          </div>

          {dadosGraficoCategoria.length === 0 ? (
            <div className="familia-sem-dados">Nenhuma despesa registrada neste período.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart style={{ outline: 'none' }}>
                <Pie
                  data={dadosGraficoCategoria}
                  cx="50%"
                  cy="46%"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  isAnimationActive={false}
                  activeShape={{ stroke: 'var(--text-primary)', strokeWidth: 2 }}
                  style={{ outline: 'none' }}
                >
                  {dadosGraficoCategoria.map((_, i) => (
                    <Cell
                      key={i}
                      fill={coresGrafico[i % coresGrafico.length]}
                      style={{ outline: 'none', cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const item = payload[0].payload
                    return (
                      <div className="familia-tooltip">
                        <p className="familia-tooltip-label" style={{ marginBottom: 0 }}>
                          {item.name} : {formatarValor(item.value)}
                        </p>
                      </div>
                    )
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={v => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="familia-resumo">
        <div className="resumo-card green">
          <TrendingUp size={20} />
          <div>
            <span>Receitas</span>
            <strong>{formatarValor(totalReceitas)}</strong>
          </div>
        </div>
        <div className="resumo-card red">
          <TrendingDown size={20} />
          <div>
            <span>Despesas</span>
            <strong>{formatarValor(totalDespesas)}</strong>
          </div>
        </div>
        <div className={`resumo-card ${saldo >= 0 ? 'blue' : 'red'}`}>
          <Wallet size={20} />
          <div>
            <span>Saldo</span>
            <strong>{formatarValor(saldo)}</strong>
          </div>
        </div>
        <div className="resumo-card purple">
          <Target size={20} />
          <div>
            <span>Transações</span>
            <strong>{transacoesFiltradas.length}</strong>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="familia-abas">
        {abasConfig.map(a => (
          <button
            key={a.key}
            className={`aba-btn ${aba === a.key ? 'ativa' : ''}`}
            onClick={() => setAba(a.key)}
          >
            {a.label}
          </button>
        ))}

        {aba === 'transacoes' && (
          <button className="btn-nova-familia" onClick={abrirNovaTransacao}>
            <Plus size={16} />
            Nova transação
          </button>
        )}
        {aba === 'metas' && (
          <button className="btn-nova-familia" onClick={abrirNovaMeta}>
            <Plus size={16} />
            Nova meta
          </button>
        )}
        {aba === 'carteiras' && (
          <button className="btn-nova-familia" onClick={abrirNovaCarteira}>
            <Plus size={16} />
            Nova carteira
          </button>
        )}
      </div>

      {/* Conteúdo das abas */}
      {aba === 'transacoes' && (
        <div className="familia-tabela-card">
          <div className="familia-tabela-header">
            <button type="button" style={estiloColunaBtn} onClick={() => handleOrdenarColuna('desc')}>
              <span>Descrição</span>
              {renderIconeOrdenacao('desc')}
            </button>
            <button type="button" style={estiloColunaBtn} onClick={() => handleOrdenarColuna('categoria')}>
              <span>Categoria</span>
              {renderIconeOrdenacao('categoria')}
            </button>
            <button type="button" style={estiloColunaBtn} onClick={() => handleOrdenarColuna('autorNome')}>
              <span>Por</span>
              {renderIconeOrdenacao('autorNome')}
            </button>
            <button type="button" style={estiloColunaBtn} onClick={() => handleOrdenarColuna('data')}>
              <span>Data</span>
              {renderIconeOrdenacao('data')}
            </button>
            <button type="button" style={estiloColunaBtn} onClick={() => handleOrdenarColuna('valor')}>
              <span>Valor</span>
              {renderIconeOrdenacao('valor')}
            </button>
            <span></span>
          </div>
          {transacoesOrdenadas.length === 0 ? (
            <div className="familia-vazio">Nenhuma transação neste período.</div>
          ) : (
            transacoesOrdenadas.map(t => (
              <div key={t.id} className="familia-tabela-row">
                <span className="t-desc">
                  <div className={`tipo-dot ${t.tipo}`} />
                  {t.desc}
                </span>
                <span className="t-cat">{t.categoria}</span>
                <span className="t-autor">{t.autorNome}</span>
                <span className="t-data">{formatarData(t.data)}</span>
                <span className={`t-valor ${t.tipo}`}>
                  {t.tipo === 'receita' ? '+' : '-'}{formatarValor(t.valor)}
                </span>
                <div className="familia-acoes-row">
                  <button
                    type="button"
                    className="btn-acao-familia editar"
                    onClick={() => abrirEditarTransacao(t)}
                    title="Editar transação"
                  >
                    <SquarePen size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn-acao-familia excluir"
                    onClick={() => handleRemoverTransacao(t.id)}
                    title="Excluir transação"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {aba === 'metas' && (
        <div className="familia-metas-grid">
          {metas.length === 0 ? (
            <div className="familia-vazio">Nenhuma meta ainda.</div>
          ) : (
            metas.map(m => {
              const pct = Math.min(Math.round((m.atual / m.objetivo) * 100), 100)
              return (
                <div key={m.id} className="familia-meta-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div className="meta-icone" style={{ background: m.cor + '22', color: m.cor }}>
                      {m.icone}
                    </div>
                    <div className="familia-acoes-row">
                      <button
                        type="button"
                        className="btn-acao-familia editar"
                        onClick={() => abrirEditarMeta(m)}
                        title="Editar meta"
                      >
                        <SquarePen size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-acao-familia excluir"
                        onClick={() => handleRemoverMeta(m.id)}
                        title="Excluir meta"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="meta-info-familia">
                    <h3>{m.nome}</h3>
                    <p>{formatarValor(m.atual)} de {formatarValor(m.objetivo)}</p>
                  </div>
                  <div className="meta-barra-bg">
                    <div className="meta-barra" style={{ width: `${pct}%`, background: m.cor }} />
                  </div>
                  <span className="meta-pct" style={{ color: m.cor }}>{pct}%</span>
                </div>
              )
            })
          )}
        </div>
      )}

      {aba === 'carteiras' && (
        <div className="familia-carteiras-grid">
          {carteiras.length === 0 ? (
            <div className="familia-vazio">Nenhuma carteira ainda.</div>
          ) : (
            carteiras.map(c => (
              <div key={c.id} className="familia-carteira-card" style={{ borderTopColor: c.cor }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>{c.nome}</h3>
                  <div className="familia-acoes-row">
                    <button
                      type="button"
                      className="btn-acao-familia editar"
                      onClick={() => abrirEditarCarteira(c)}
                      title="Editar carteira"
                    >
                      <SquarePen size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-acao-familia excluir"
                      onClick={() => handleRemoverCarteira(c.id)}
                      title="Excluir carteira"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <span className="carteira-tipo">{c.tipo}</span>
                <div className={`carteira-saldo ${c.saldo >= 0 ? 'positivo' : 'negativo'}`}>
                  {formatarValor(c.saldo)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {aba === 'historico' && (
        <div className="familia-historico-card">
          {historicoTransacoesFamilia.length === 0 ? (
            <div className="familia-vazio">Nenhuma transação familiar registrada ainda.</div>
          ) : (
            <div className="familia-historico-lista">
              {historicoTransacoesFamilia.map(t => (
                <div key={t.id} className="historico-item">
                  <div className="historico-item-esq">
                    <div className={`historico-icone ${t.tipo === 'receita' ? 'receita' : 'despesa'}`}>
                      {t.tipo === 'receita' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div className="historico-texto">
                      <span className="historico-titulo">{t.desc}</span>
                      <span className="historico-meta">
                        Lançado por <strong>{t.autorNome || 'Membro'}</strong> • {t.categoria || 'Outros'}
                      </span>
                    </div>
                  </div>

                  <div className="historico-item-dir">
                    <span className={`historico-valor ${t.tipo}`}>
                      {t.tipo === 'receita' ? '+' : '-'}{formatarValor(t.valor)}
                    </span>
                    <span className="historico-data">{formatarData(t.data)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Transação (Criar / Editar) */}
      {modalTipo === 'transacao' && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editandoId ? 'Editar transação compartilhada' : 'Nova transação compartilhada'}</h3>
              <button className="modal-fechar" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSalvarTransacao}>
              <div className="tipo-toggle">
                <button
                  type="button"
                  className={`tipo-btn ${form.tipo === 'despesa' ? 'ativo-red' : ''}`}
                  onClick={() => setForm({ ...form, tipo: 'despesa' })}
                >
                  <TrendingDown size={16} /> Despesa
                </button>
                <button
                  type="button"
                  className={`tipo-btn ${form.tipo === 'receita' ? 'ativo-green' : ''}`}
                  onClick={() => setForm({ ...form, tipo: 'receita' })}
                >
                  <TrendingUp size={16} /> Receita
                </button>
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <input
                  name="desc" placeholder="Ex: Supermercado"
                  value={form.desc}
                  onChange={e => setForm({ ...form, desc: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Valor (R$)</label>
                  <input
                    name="valor" type="number" placeholder="0,00" min="0" step="0.01"
                    value={form.valor}
                    onChange={e => setForm({ ...form, valor: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Data</label>
                  <input
                    name="data" type="date"
                    value={form.data}
                    onChange={e => setForm({ ...form, data: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Categoria</label>
                <select
                  value={form.categoria}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}
                >
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-salvar" disabled={salvando}>
                {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Salvar transação'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Meta (Criar / Editar) */}
      {modalTipo === 'meta' && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editandoId ? 'Editar meta compartilhada' : 'Nova meta compartilhada'}</h3>
              <button className="modal-fechar" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSalvarMeta}>
              <div className="form-group">
                <label>Nome da meta</label>
                <input
                  placeholder="Ex: Viagem em família"
                  value={formMeta.nome}
                  onChange={e => setFormMeta({ ...formMeta, nome: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Objetivo (R$)</label>
                  <input
                    type="number" placeholder="0,00" min="0" step="0.01"
                    value={formMeta.objetivo}
                    onChange={e => setFormMeta({ ...formMeta, objetivo: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Valor atual (R$)</label>
                  <input
                    type="number" placeholder="0,00" min="0" step="0.01"
                    value={formMeta.atual}
                    onChange={e => setFormMeta({ ...formMeta, atual: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Ícone e Cor</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {iconesMeta.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setFormMeta({ ...formMeta, icone: ic })}
                      style={{
                        padding: '0.4rem 0.6rem',
                        borderRadius: '8px',
                        border: formMeta.icone === ic ? '2px solid #4ade80' : '1px solid var(--border)',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {cores.map(cor => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setFormMeta({ ...formMeta, cor })}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: cor,
                        border: formMeta.cor === cor ? '2px solid #fff' : 'none',
                        outline: formMeta.cor === cor ? '2px solid #1e293b' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-salvar" disabled={salvando}>
                {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Criar meta'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Carteira (Criar / Editar) */}
      {modalTipo === 'carteira' && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editandoId ? 'Editar carteira compartilhada' : 'Nova carteira compartilhada'}</h3>
              <button className="modal-fechar" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSalvarCarteira}>
              <div className="form-group">
                <label>Nome da carteira</label>
                <input
                  placeholder="Ex: Conta Conjunta"
                  value={formCarteira.nome}
                  onChange={e => setFormCarteira({ ...formCarteira, nome: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo</label>
                  <select
                    value={formCarteira.tipo}
                    onChange={e => setFormCarteira({ ...formCarteira, tipo: e.target.value })}
                  >
                    <option value="banco">Banco</option>
                    <option value="cartao">Cartão</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="invest">Investimento</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Saldo (R$)</label>
                  <input
                    type="number" placeholder="0,00" step="0.01"
                    value={formCarteira.saldo}
                    onChange={e => setFormCarteira({ ...formCarteira, saldo: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Cor</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {cores.map(cor => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setFormCarteira({ ...formCarteira, cor })}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: cor,
                        border: formCarteira.cor === cor ? '2px solid #fff' : 'none',
                        outline: formCarteira.cor === cor ? '2px solid #1e293b' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-salvar" disabled={salvando}>
                {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Criar carteira'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
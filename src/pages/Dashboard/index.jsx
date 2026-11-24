import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Wallet, Target, Calendar, RotateCcw, Plus, X, SquarePen, Trash2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { useFinance } from '../../context/FinanceContext'
import './Dashboard.css'

const CORES = ['#4ade80', '#60a5fa', '#c084fc', '#fb923c', '#f472b6', '#94a3b8']
const MESES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const CATEGORIAS = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Salário', 'Freelance', 'Outros']

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function criarFormVazio() {
  return {
    desc: '',
    tipo: 'despesa',
    categoria: 'Alimentação',
    valor: '',
    data: hojeISO(),
  }
}

function formatarMesInput(date) {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

function obterIntervaloPadrao() {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)
  return {
    inicio: formatarMesInput(inicio),
    fim: formatarMesInput(hoje),
  }
}

function normalizarAnoMes(dataStr) {
  if (!dataStr || typeof dataStr !== 'string') return null
  const match = dataStr.trim().match(/^(\d{2,4})-(\d{2})/)
  if (!match) return null

  let ano = Number(match[1])
  const mes = Number(match[2])
  if (mes < 1 || mes > 12) return null

  if (ano < 100) {
    ano += 2000
  }
  if (ano < 1970 || ano > 2100) return null

  return `${ano}-${String(mes).padStart(2, '0')}`
}

function TooltipCustom({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="tooltip-custom">
        <p className="tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name === 'receitas' ? 'Receitas' : 'Despesas'}: R$ {p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const { transacoes, saldo, loading, adicionarTransacao, atualizarTransacao, removerTransacao } = useFinance()

  const padrao = useMemo(() => obterIntervaloPadrao(), [])
  const [preset, setPreset] = useState('6m')
  const [mesInicio, setMesInicio] = useState(padrao.inicio)
  const [mesFim, setMesFim] = useState(padrao.fim)

  // Modal único: 'form' (criar/editar) ou 'excluir' (confirmar exclusão)
  const [modalAberto, setModalAberto] = useState(false)
  const [modoModal, setModoModal] = useState('form')
  const [editandoId, setEditandoId] = useState(null)
  const [itemExcluir, setItemExcluir] = useState(null)
  const [form, setForm] = useState(criarFormVazio)
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('')

  function abrirModalNova() {
    setModoModal('form')
    setEditandoId(null)
    setItemExcluir(null)
    setForm(criarFormVazio())
    setErroModal('')
    setModalAberto(true)
  }

  function abrirModalEditar(t) {
    setModoModal('form')
    setEditandoId(t.id)
    setItemExcluir(null)
    setForm({
      desc: t.desc || '',
      tipo: t.tipo || 'despesa',
      categoria: t.categoria || 'Outros',
      valor: String(t.valor ?? ''),
      data: t.data ? t.data.slice(0, 10) : hojeISO(),
    })
    setErroModal('')
    setModalAberto(true)
  }

  function abrirModalExcluir(t) {
    setModoModal('excluir')
    setEditandoId(null)
    setItemExcluir(t)
    setErroModal('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setModoModal('form')
    setEditandoId(null)
    setItemExcluir(null)
    setErroModal('')
  }

  async function handleSalvarTransacao(e) {
    e.preventDefault()
    const valorNum = parseFloat(form.valor)
    if (!form.desc.trim() || !form.data || Number.isNaN(valorNum) || valorNum <= 0) {
      setErroModal('Preencha descrição, data e um valor maior que zero.')
      return
    }

    const payload = {
      desc: form.desc.trim(),
      tipo: form.tipo,
      categoria: form.categoria,
      valor: valorNum,
      data: form.data,
    }

    try {
      setSalvando(true)
      setErroModal('')
      if (editandoId) {
        await atualizarTransacao(editandoId, payload)
      } else {
        await adicionarTransacao(payload)
      }
      fecharModal()
    } catch (err) {
      setErroModal(err.message || 'Erro ao salvar transação.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleConfirmarExclusao() {
    if (!itemExcluir) return
    try {
      setSalvando(true)
      setErroModal('')
      await removerTransacao(itemExcluir.id)
      fecharModal()
    } catch (err) {
      setErroModal(err.message || 'Erro ao excluir transação.')
    } finally {
      setSalvando(false)
    }
  }

  function aplicarPreset(tipo) {
    const hoje = new Date()
    setPreset(tipo)

    if (tipo === '6m') {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)
      setMesInicio(formatarMesInput(inicio))
      setMesFim(formatarMesInput(hoje))
    } else if (tipo === '12m') {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)
      setMesInicio(formatarMesInput(inicio))
      setMesFim(formatarMesInput(hoje))
    } else if (tipo === 'todos') {
      const datasValidas = transacoes
        .map(t => normalizarAnoMes(t.data))
        .filter(Boolean)
        .sort()

      const mesAtual = formatarMesInput(hoje)
      setMesInicio(datasValidas[0] || padrao.inicio)
      setMesFim(datasValidas[datasValidas.length - 1] || mesAtual)
    }
  }

  function handleAlterarInicio(valor) {
    setPreset('personalizado')
    setMesInicio(valor)
    if (valor && mesFim && valor > mesFim) {
      setMesFim(valor)
    }
  }

  function handleAlterarFim(valor) {
    setPreset('personalizado')
    setMesFim(valor)
    if (valor && mesInicio && valor < mesInicio) {
      setMesInicio(valor)
    }
  }

  // Transações filtradas pelo intervalo YYYY-MM selecionado
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter(t => {
      const anoMes = normalizarAnoMes(t.data)
      if (!anoMes) return false
      if (mesInicio && anoMes < mesInicio) return false
      if (mesFim && anoMes > mesFim) return false
      return true
    })
  }, [transacoes, mesInicio, mesFim])

  // Totais do período filtrado
  const totalReceitasPeriodo = useMemo(() => {
    return transacoesFiltradas
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + t.valor, 0)
  }, [transacoesFiltradas])

  const totalDespesasPeriodo = useMemo(() => {
    return transacoesFiltradas
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + t.valor, 0)
  }, [transacoesFiltradas])

  // Gastos por categoria no período filtrado
  const gastosPorCategoriaPeriodo = useMemo(() => {
    const mapa = {}
    transacoesFiltradas
      .filter(t => t.tipo === 'despesa')
      .forEach(t => {
        const cat = t.categoria || 'Outros'
        mapa[cat] = (mapa[cat] || 0) + t.valor
      })

    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transacoesFiltradas])

  const temGastos = gastosPorCategoriaPeriodo.length > 0
  const dadosPieCategoria = temGastos
    ? gastosPorCategoriaPeriodo
    : [{ name: 'Sem gastos', value: 1 }]

  // Dados mensais dinâmicos para o gráfico de barras
  const dadosMensais = useMemo(() => {
    const iniNorm = normalizarAnoMes(mesInicio)
    const fimNorm = normalizarAnoMes(mesFim)
    if (!iniNorm || !fimNorm) return []

    const [anoIni, mesIni] = iniNorm.split('-').map(Number)
    const [anoFim, mesF] = fimNorm.split('-').map(Number)
    const anoAtual = new Date().getFullYear()

    const resultado = []
    const cursor = new Date(2000, mesIni - 1, 1)
    cursor.setFullYear(anoIni)

    const limite = new Date(2000, mesF - 1, 1)
    limite.setFullYear(anoFim)

    // Trava de segurança de até 36 meses no gráfico
    let contador = 0
    while (cursor <= limite && contador < 36) {
      const ano = cursor.getFullYear()
      const mesNum = String(cursor.getMonth() + 1).padStart(2, '0')
      const prefixo = `${ano}-${mesNum}`
      const labelMes = ano === anoAtual
        ? MESES_NOMES[cursor.getMonth()]
        : `${MESES_NOMES[cursor.getMonth()]}/${String(ano).slice(-2)}`

      const receitas = transacoesFiltradas
        .filter(t => t.tipo === 'receita' && normalizarAnoMes(t.data) === prefixo)
        .reduce((acc, t) => acc + Number(t.valor || 0), 0)

      const despesas = transacoesFiltradas
        .filter(t => t.tipo === 'despesa' && normalizarAnoMes(t.data) === prefixo)
        .reduce((acc, t) => acc + Number(t.valor || 0), 0)

      resultado.push({ mes: labelMes, receitas, despesas })
      cursor.setMonth(cursor.getMonth() + 1)
      contador++
    }

    return resultado
  }, [transacoesFiltradas, mesInicio, mesFim])

  const descricaoPeriodo = useMemo(() => {
    if (preset === '6m') return 'Últimos 6 meses'
    if (preset === '12m') return 'Últimos 12 meses'
    if (preset === 'todos') return 'Todo o período'
    if (mesInicio && mesFim) {
      const formatar = ym => {
        const [a, m] = ym.split('-')
        return `${MESES_NOMES[Number(m) - 1]}/${a}`
      }
      return mesInicio === mesFim ? formatar(mesInicio) : `${formatar(mesInicio)} até ${formatar(mesFim)}`
    }
    return 'Período selecionado'
  }, [preset, mesInicio, mesFim])

  if (loading) {
    return (
      <div className="dashboard" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Carregando dados financeiros...
      </div>
    )
  }

  const cards = [
    {
      title: 'Saldo Total',
      value: saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: <Wallet size={22} />,
      color: 'card-blue',
      trend: 'Saldo atual acumulado',
      up: saldo >= 0,
    },
    {
      title: 'Receitas',
      value: totalReceitasPeriodo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: <TrendingUp size={22} />,
      color: 'card-green',
      trend: descricaoPeriodo,
      up: true,
    },
    {
      title: 'Despesas',
      value: totalDespesasPeriodo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: <TrendingDown size={22} />,
      color: 'card-red',
      trend: descricaoPeriodo,
      up: false,
    },
    {
      title: 'Transações',
      value: transacoesFiltradas.length,
      icon: <Target size={22} />,
      color: 'card-purple',
      trend: 'Lançamentos no período',
      up: true,
    },
  ]

  return (
    <div className="dashboard">

      {/* Barra de Filtro de Período */}
      <div className="dashboard-filtro-bar">
        <div className="filtro-presets">
          <button
            type="button"
            className={`preset-btn ${preset === '6m' ? 'ativo' : ''}`}
            onClick={() => aplicarPreset('6m')}
          >
            Últimos 6 meses
          </button>
          <button
            type="button"
            className={`preset-btn ${preset === '12m' ? 'ativo' : ''}`}
            onClick={() => aplicarPreset('12m')}
          >
            Últimos 12 meses
          </button>
          <button
            type="button"
            className={`preset-btn ${preset === 'todos' ? 'ativo' : ''}`}
            onClick={() => aplicarPreset('todos')}
          >
            Todo o período
          </button>
        </div>

        <div className="filtro-datas">
          <Calendar size={15} className="filtro-icon" />
          <label className="data-campo">
            <span>De</span>
            <input
              type="month"
              value={mesInicio}
              max={mesFim || undefined}
              onChange={e => handleAlterarInicio(e.target.value)}
            />
          </label>
          <label className="data-campo">
            <span>Até</span>
            <input
              type="month"
              value={mesFim}
              min={mesInicio || undefined}
              onChange={e => handleAlterarFim(e.target.value)}
            />
          </label>

          {preset !== '6m' && (
            <button
              type="button"
              className="btn-reset-filtro"
              onClick={() => aplicarPreset('6m')}
              title="Voltar para os últimos 6 meses"
            >
              <RotateCcw size={14} />
              Resetar
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="cards-grid">
        {cards.map(card => (
          <div key={card.title} className={`card ${card.color}`}>
            <div className="card-header">
              <span className="card-title">{card.title}</span>
              <div className="card-icon">{card.icon}</div>
            </div>
            <div className="card-value">{card.value}</div>
            <div className={`card-trend ${card.up ? 'up' : 'down'}`}>
              {card.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {card.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="graficos-grid">

        <div className="grafico-card">
          <div className="grafico-header">
            <h3>Receitas vs Despesas</h3>
            <span>{descricaoPeriodo}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dadosMensais} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                content={<TooltipCustom />}
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
          <div className="grafico-legenda">
            <span><span className="dot green" />Receitas</span>
            <span><span className="dot red" />Despesas</span>
          </div>
        </div>

        <div className="grafico-card" style={{ position: 'relative' }}>
          <div className="grafico-header">
            <h3>Gastos por categoria</h3>
            <span>{descricaoPeriodo}</span>
          </div>

          {!temGastos && (
            <div className="sem-gastos-aviso">
              Sem gastos : R$ 0,00
            </div>
          )}

          <ResponsiveContainer width="100%" height={240}>
            <PieChart style={{ outline: 'none' }}>
              <Pie
                data={dadosPieCategoria}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={temGastos ? 3 : 0}
                dataKey="value"
                isAnimationActive={false}
                activeShape={{ stroke: 'var(--text-primary)', strokeWidth: 2 }}
                style={{ outline: 'none', pointerEvents: temGastos ? 'auto' : 'none' }}
              >
                {dadosPieCategoria.map((_, i) => (
                  <Cell
                    key={i}
                    fill={temGastos ? CORES[i % CORES.length] : '#cbd5e1'}
                    style={{ outline: 'none', cursor: temGastos ? 'pointer' : 'default' }}
                  />
                ))}
              </Pie>
              {temGastos && (
                <Tooltip formatter={v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
              )}
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={v => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Últimas transações */}
      <div className="section-header">
        <div>
          <div className="section-title">Últimas transações</div>
          <span className="section-subtitle">{descricaoPeriodo}</span>
        </div>
        <button type="button" className="btn-nova-dashboard" onClick={abrirModalNova}>
          <Plus size={16} />
          Nova transação
        </button>
      </div>
      <div className="transacoes-table">
        <div className="table-header">
          <span>Descrição</span>
          <span>Categoria</span>
          <span>Data</span>
          <span>Valor</span>
          <span></span>
        </div>
        {transacoesFiltradas.length === 0 ? (
          <div className="table-row" style={{ gridTemplateColumns: '1fr', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhuma transação encontrada neste período.
          </div>
        ) : (
          transacoesFiltradas.slice(0, 5).map((t, i) => (
            <div key={t.id || i} className="table-row">
              <span className="t-desc">{t.desc}</span>
              <span className="t-cat">{t.categoria}</span>
              <span className="t-data">{t.data?.split('-').reverse().join('/')}</span>
              <span className={`t-valor ${t.tipo}`}>
                {t.tipo === 'receita' ? '+' : '-'}
                {t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <div className="dash-acoes-row">
                <button
                  type="button"
                  className="dash-btn-acao editar"
                  onClick={() => abrirModalEditar(t)}
                  title="Editar transação"
                >
                  <SquarePen size={15} />
                </button>
                <button
                  type="button"
                  className="dash-btn-acao excluir"
                  onClick={() => abrirModalExcluir(t)}
                  title="Excluir transação"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Único: Criar / Editar / Confirmar Exclusão */}
      {modalAberto && (
        <div className="dash-modal-overlay" onClick={fecharModal}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>
                {modoModal === 'excluir'
                  ? 'Excluir transação'
                  : editandoId
                    ? 'Editar transação'
                    : 'Nova transação'}
              </h3>
              <button type="button" className="dash-modal-fechar" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>

            {modoModal === 'excluir' ? (
              <div className="dash-modal-form">
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Tem certeza que deseja excluir esta transação? Essa ação não poderá ser desfeita.
                </p>
                {itemExcluir && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border-color)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {itemExcluir.desc} —{' '}
                    {Number(itemExcluir.valor || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </div>
                )}

                {erroModal && <p className="dash-form-erro">{erroModal}</p>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    className="dash-tipo-btn"
                    onClick={fecharModal}
                    disabled={salvando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="dash-btn-salvar"
                    style={{ background: '#ef4444', color: '#ffffff' }}
                    onClick={handleConfirmarExclusao}
                    disabled={salvando}
                  >
                    {salvando ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            ) : (
              <form className="dash-modal-form" onSubmit={handleSalvarTransacao}>
                <div className="dash-tipo-toggle">
                  <button
                    type="button"
                    className={`dash-tipo-btn ${form.tipo === 'despesa' ? 'ativo-red' : ''}`}
                    onClick={() => setForm({ ...form, tipo: 'despesa' })}
                  >
                    <TrendingDown size={16} /> Despesa
                  </button>
                  <button
                    type="button"
                    className={`dash-tipo-btn ${form.tipo === 'receita' ? 'ativo-green' : ''}`}
                    onClick={() => setForm({ ...form, tipo: 'receita' })}
                  >
                    <TrendingUp size={16} /> Receita
                  </button>
                </div>

                <div className="dash-form-group">
                  <label>Descrição</label>
                  <input
                    type="text"
                    placeholder="Ex: Mercado, Combustível, Salário..."
                    value={form.desc}
                    onChange={e => setForm({ ...form, desc: e.target.value })}
                  />
                </div>

                <div className="dash-form-row">
                  <div className="dash-form-group">
                    <label>Valor (R$)</label>
                    <input
                      type="number"
                      placeholder="0,00"
                      min="0"
                      step="0.01"
                      value={form.valor}
                      onChange={e => setForm({ ...form, valor: e.target.value })}
                    />
                  </div>
                  <div className="dash-form-group">
                    <label>Data</label>
                    <input
                      type="date"
                      value={form.data}
                      onChange={e => setForm({ ...form, data: e.target.value })}
                    />
                  </div>
                </div>

                <div className="dash-form-group">
                  <label>Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm({ ...form, categoria: e.target.value })}
                  >
                    {CATEGORIAS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {erroModal && <p className="dash-form-erro">{erroModal}</p>}

                <button type="submit" className="dash-btn-salvar" disabled={salvando}>
                  {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Salvar transação'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
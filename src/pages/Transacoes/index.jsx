import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown, X, SquarePen, Trash2 } from 'lucide-react'
import { useFinance } from '../../context/FinanceContext'
import './Transacoes.css'

const categorias = [
  'Alimentação', 'Moradia', 'Transporte', 'Saúde',
  'Educação', 'Lazer', 'Salário', 'Freelance', 'Outros'
]

const vazio = { desc: '', tipo: 'despesa', categoria: 'Alimentação', valor: '', data: '' }

export default function Transacoes() {
  const {
    transacoes, adicionarTransacao, atualizarTransacao, removerTransacao,
    totalReceitas, totalDespesas, saldo, loading
  } = useFinance()

  const [filtro, setFiltro]           = useState('todas')
  const [modalAberto, setModalAberto] = useState(false)
  const [modoModal, setModoModal]     = useState('form') // 'form' | 'excluir'
  const [editandoId, setEditandoId]   = useState(null)
  const [itemExcluir, setItemExcluir] = useState(null)
  const [form, setForm]               = useState(vazio)
  const [erro, setErro]               = useState('')
  const [salvando, setSalvando]       = useState(false)

  if (loading) {
    return (
      <div className="transacoes-page" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Carregando transações...
      </div>
    )
  }

  const transacoesFiltradas = transacoes.filter(t =>
    filtro === 'todas' ? true : t.tipo === filtro
  )

  function abrirModalNova() {
    setModoModal('form')
    setEditandoId(null)
    setItemExcluir(null)
    setForm(vazio)
    setErro('')
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
      data: t.data ? t.data.slice(0, 10) : '',
    })
    setErro('')
    setModalAberto(true)
  }

  function abrirModalExcluir(t) {
    setModoModal('excluir')
    setEditandoId(null)
    setItemExcluir(t)
    setErro('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setModoModal('form')
    setEditandoId(null)
    setItemExcluir(null)
    setForm(vazio)
    setErro('')
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErro('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.desc || !form.valor || !form.data) {
      setErro('Preencha todos os campos.')
      return
    }

    const payload = {
      desc: form.desc,
      tipo: form.tipo,
      categoria: form.categoria,
      valor: parseFloat(form.valor),
      data: form.data,
    }

    try {
      setSalvando(true)
      if (editandoId) {
        await atualizarTransacao(editandoId, payload)
      } else {
        await adicionarTransacao(payload)
      }
      fecharModal()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleConfirmarExclusao() {
    if (!itemExcluir) return
    try {
      setSalvando(true)
      setErro('')
      await removerTransacao(itemExcluir.id)
      fecharModal()
    } catch (err) {
      setErro(err.message || 'Erro ao excluir transação.')
    } finally {
      setSalvando(false)
    }
  }

  function formatarValor(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarData(data) {
    if (!data) return ''
    return data.split('-').reverse().join('/')
  }

  return (
    <div className="transacoes-page">
      <div className="resumo-grid">
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
          <div>
            <span>Saldo</span>
            <strong>{formatarValor(saldo)}</strong>
          </div>
        </div>
      </div>

      <div className="acoes-bar">
        <div className="filtros">
          {['todas', 'receita', 'despesa'].map(f => (
            <button
              key={f}
              className={`filtro-btn ${filtro === f ? 'ativo' : ''}`}
              onClick={() => setFiltro(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn-nova" onClick={abrirModalNova}>
          <Plus size={18} />
          Nova transação
        </button>
      </div>

      <div className="tabela-card">
        <div className="tabela-header">
          <span>Descrição</span>
          <span>Categoria</span>
          <span>Data</span>
          <span>Valor</span>
          <span></span>
        </div>
        {transacoesFiltradas.length === 0 ? (
          <div className="tabela-vazia">Nenhuma transação encontrada.</div>
        ) : (
          transacoesFiltradas.map(t => (
            <div key={t.id} className="tabela-row">
              <span className="t-desc">
                <div className={`tipo-dot ${t.tipo}`} />
                {t.desc}
              </span>
              <span className="t-cat">{t.categoria}</span>
              <span className="t-data">{formatarData(t.data)}</span>
              <span className={`t-valor ${t.tipo}`}>
                {t.tipo === 'receita' ? '+' : '-'}{formatarValor(t.valor)}
              </span>
              <div className="tx-acoes-row">
                <button
                  type="button"
                  className="btn-editar-tx"
                  onClick={() => abrirModalEditar(t)}
                  title="Editar transação"
                >
                  <SquarePen size={15} />
                </button>
                <button
                  type="button"
                  className="btn-remover"
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

      {modalAberto && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modoModal === 'excluir'
                  ? 'Excluir transação'
                  : editandoId
                    ? 'Editar transação'
                    : 'Nova transação'}
              </h3>
              <button className="modal-fechar" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>

            {modoModal === 'excluir' ? (
              <div className="modal-form">
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
                    {itemExcluir.desc} — {formatarValor(Number(itemExcluir.valor || 0))}
                  </div>
                )}

                {erro && <div className="form-erro">{erro}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    className="tipo-btn"
                    onClick={fecharModal}
                    disabled={salvando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-salvar"
                    style={{ background: '#ef4444', color: '#ffffff' }}
                    onClick={handleConfirmarExclusao}
                    disabled={salvando}
                  >
                    {salvando ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            ) : (
              <form className="modal-form" onSubmit={handleSubmit}>
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
                  <input name="desc" placeholder="Ex: Supermercado" value={form.desc} onChange={handleChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Valor (R$)</label>
                    <input name="valor" type="number" placeholder="0,00" min="0" step="0.01" value={form.valor} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Data</label>
                    <input name="data" type="date" value={form.data} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Categoria</label>
                  <select name="categoria" value={form.categoria} onChange={handleChange}>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {erro && <div className="form-erro">{erro}</div>}
                <button type="submit" className="btn-salvar" disabled={salvando}>
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
import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, X, ChevronDown, Check } from 'lucide-react'
import { useFinance } from '../../context/FinanceContext'
import './Orcamento.css'

const categorias = [
  'Alimentação', 'Moradia', 'Transporte', 'Saúde',
  'Educação', 'Lazer', 'Freelance', 'Outros'
]

const vazio = { categoria: 'Alimentação', descricaoOutro: '', limite: '' }

export default function Orcamento() {
  const { transacoes, orcamentos, adicionarOrcamento, removerOrcamento, loading } = useFinance()
  const [modalAberto, setModalAberto]           = useState(false)
  const [dropdownAberto, setDropdownAberto]     = useState(false)
  const [orcamentoExcluir, setOrcamentoExcluir] = useState(null)
  const [form, setForm]                         = useState(vazio)
  const [erro, setErro]                         = useState('')
  const [salvando, setSalvando]                 = useState(false)
  const [excluindo, setExcluindo]               = useState(false)

  const dropdownRef = useRef(null)
  const itemSelecionadoRef = useRef(null)

  useEffect(() => {
    function handleClickFora(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAberto(false)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape' && dropdownAberto) {
        setDropdownAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickFora)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dropdownAberto])

  useEffect(() => {
    if (dropdownAberto && itemSelecionadoRef.current) {
      itemSelecionadoRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [dropdownAberto])

  if (loading) {
    return (
      <div className="orcamento-page" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Carregando orçamentos...
      </div>
    )
  }

  function formatarValor(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function gastoCategoria(categoria) {
    return transacoes
      .filter(t => t.tipo === 'despesa' && t.categoria === categoria)
      .reduce((acc, t) => acc + t.valor, 0)
  }

  function abrirModalNovo() {
    setForm(vazio)
    setErro('')
    setDropdownAberto(false)
    setModalAberto(true)
  }

  function fecharModalNovo() {
    setModalAberto(false)
    setDropdownAberto(false)
    setForm(vazio)
    setErro('')
  }

  function selecionarCategoria(cat) {
    setForm(prev => ({
      ...prev,
      categoria: cat,
      descricaoOutro: cat === 'Outros' ? prev.descricaoOutro : '',
    }))
    setErro('')
    setDropdownAberto(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const categoriaFinal = form.categoria === 'Outros'
      ? form.descricaoOutro.trim()
      : form.categoria

    if (form.categoria === 'Outros' && !categoriaFinal) {
      setErro('Descreva o tipo de gasto para a opção Outros.')
      return
    }

    if (!form.limite || parseFloat(form.limite) <= 0) {
      setErro('Informe um limite válido.')
      return
    }

    if (orcamentos.find(o => o.categoria.toLowerCase() === categoriaFinal.toLowerCase())) {
      setErro('Já existe um orçamento para essa categoria.')
      return
    }

    try {
      setSalvando(true)
      await adicionarOrcamento({
        categoria: categoriaFinal,
        limite: parseFloat(form.limite),
      })
      fecharModalNovo()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleConfirmarExclusao() {
    if (!orcamentoExcluir || excluindo) return
    try {
      setExcluindo(true)
      setErro('')
      await removerOrcamento(orcamentoExcluir.id ?? orcamentoExcluir.index)
      setOrcamentoExcluir(null)
    } catch (err) {
      setErro(err.message || 'Erro ao excluir orçamento.')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="orcamento-page">
      <div className="orcamento-header">
        <h2>Orçamento por categoria</h2>
        <p>Defina limites de gastos e receba alertas quando estiver próximo do limite.</p>
      </div>

      <div className="orcamento-acoes">
        <button className="btn-novo-orc" onClick={abrirModalNovo}>
          <Plus size={18} />
          Novo orçamento
        </button>
      </div>

      {orcamentos.length === 0 ? (
        <div className="orcamento-vazio">
          <p>Nenhum orçamento definido ainda.</p>
          <span>Crie um orçamento para começar a receber alertas de gastos.</span>
          <button onClick={abrirModalNovo}>Criar primeiro orçamento</button>
        </div>
      ) : (
        <div className="orcamento-grid">
          {orcamentos.map((orc, i) => {
            const gasto = gastoCategoria(orc.categoria)
            const pct   = Math.min(Math.round((gasto / orc.limite) * 100), 100)
            const status = pct >= 100 ? 'critico' : pct >= 80 ? 'aviso' : 'ok'

            return (
              <div key={orc.id || i} className={`orc-card ${status}`}>
                <div className="orc-card-header">
                  <div className="orc-info">
                    <h3>{orc.categoria}</h3>
                    <span className={`orc-badge ${status}`}>
                      {status === 'critico' ? 'Limite ultrapassado' : status === 'aviso' ? 'Atenção' : 'No limite'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-remover-orc"
                    onClick={() => { setErro(''); setOrcamentoExcluir({ ...orc, index: i }) }}
                    title="Excluir orçamento"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="orc-valores">
                  <span className="orc-gasto">{formatarValor(gasto)}</span>
                  <span className="orc-limite">de {formatarValor(orc.limite)}</span>
                </div>

                <div className="orc-barra-bg">
                  <div className={`orc-barra ${status}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="orc-footer">
                  <span className={`orc-pct ${status}`}>{pct}% utilizado</span>
                  <span className="orc-restante">
                    {gasto > orc.limite
                      ? `${formatarValor(gasto - orc.limite)} acima`
                      : `${formatarValor(orc.limite - gasto)} restante`
                    }
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={fecharModalNovo}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Novo orçamento</h3>
              <button className="modal-fechar" onClick={fecharModalNovo}>
                <X size={20} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Categoria</label>
                <div className="orc-dropdown" ref={dropdownRef}>
                  <button
                    type="button"
                    className={`orc-dropdown-trigger ${dropdownAberto ? 'aberto' : ''}`}
                    onClick={() => setDropdownAberto(prev => !prev)}
                  >
                    <span>{form.categoria}</span>
                    <ChevronDown
                      size={16}
                      className={`orc-dropdown-chevron ${dropdownAberto ? 'girar' : ''}`}
                    />
                  </button>

                  {dropdownAberto && (
                    <div className="orc-dropdown-menu">
                      {categorias.map(c => {
                        const selecionado = form.categoria === c
                        return (
                          <button
                            key={c}
                            ref={selecionado ? itemSelecionadoRef : null}
                            type="button"
                            className={`orc-dropdown-item ${selecionado ? 'selecionado' : ''}`}
                            onClick={() => selecionarCategoria(c)}
                          >
                            <span>{c}</span>
                            {selecionado && <Check size={15} />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {form.categoria === 'Outros' && (
                <div className="form-group">
                  <label>Descreva o tipo de gasto</label>
                  <input
                    type="text"
                    placeholder="Ex: Pets, Assinaturas, Manutenção..."
                    value={form.descricaoOutro}
                    onChange={e => {
                      setForm({ ...form, descricaoOutro: e.target.value })
                      setErro('')
                    }}
                    autoFocus
                  />
                </div>
              )}

              <div className="form-group">
                <label>Limite mensal (R$)</label>
                <input
                  type="number" min="0" step="0.01" placeholder="0,00"
                  value={form.limite}
                  onChange={e => { setForm({ ...form, limite: e.target.value }); setErro('') }}
                />
              </div>
              {erro && <div className="form-erro">{erro}</div>}
              <button type="submit" className="btn-salvar" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Criar orçamento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {orcamentoExcluir && (
        <div className="modal-overlay" onClick={() => !excluindo && setOrcamentoExcluir(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Excluir orçamento</h3>
              <button className="modal-fechar" onClick={() => setOrcamentoExcluir(null)} disabled={excluindo}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-form">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Tem certeza que deseja excluir este orçamento? Essa ação não poderá ser desfeita.
              </p>
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
                {orcamentoExcluir.categoria} — Limite de {formatarValor(orcamentoExcluir.limite)}
              </div>
              {erro && <div className="form-erro">{erro}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  className="tipo-btn"
                  onClick={() => setOrcamentoExcluir(null)}
                  disabled={excluindo}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-salvar"
                  style={{ background: '#ef4444', color: '#ffffff' }}
                  onClick={handleConfirmarExclusao}
                  disabled={excluindo}
                >
                  {excluindo ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
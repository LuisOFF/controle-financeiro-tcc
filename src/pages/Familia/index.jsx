import { useState, useEffect, useCallback, useRef } from 'react'
import { Users, Plus, LogOut, Copy, Check, TrendingUp, TrendingDown, Target, Wallet, X, UserMinus, SquarePen, Trash2 } from 'lucide-react'
import { api } from '../../services/api'
import './Familia.css'

const categorias = ['Alimentação','Moradia','Transporte','Saúde','Educação','Lazer','Salário','Freelance','Outros']
const cores = ['#60a5fa','#4ade80','#c084fc','#fb923c','#f472b6','#f87171','#34d399','#facc15']
const iconesMeta = ['🎯','✈️','🏠','🚗','💻','🎓','💍','🛡️']

const vazioTransacao = { desc: '', tipo: 'despesa', categoria: 'Alimentação', valor: '', data: '' }
const vazioMeta      = { nome: '', objetivo: '', atual: '', icone: '🎯', cor: '#4ade80' }
const vazioCarteira  = { nome: '', tipo: 'banco', saldo: '', cor: '#60a5fa' }

export default function Familia() {
  const [conta, setConta]             = useState(null)
  const [loading, setLoading]         = useState(true)
  const [copiado, setCopiado]         = useState(false)
  const [codigo, setCodigo]           = useState('')
  const [erro, setErro]               = useState('')
  const [transacoes, setTransacoes]   = useState([])
  const [metas, setMetas]             = useState([])
  const [carteiras, setCarteiras]     = useState([])
  const [aba, setAba]                 = useState('transacoes')
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
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarData(data) {
    if (!data) return ''
    return data.split('-').reverse().join('/')
  }

  const totalReceitas = transacoes.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + t.valor, 0)
  const totalDespesas = transacoes.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + t.valor, 0)
  const saldo = totalReceitas - totalDespesas

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
  ]

  return (
    <div className="familia-page">
      <div className="familia-header">
        <h2>Conta Família</h2>
        <p>Finanças compartilhadas em tempo real.</p>
      </div>

      {/* Info da conta */}
      <div className="conta-info-card">
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
            <strong>{transacoes.length}</strong>
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
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Por</span>
            <span>Data</span>
            <span>Valor</span>
            <span></span>
          </div>
          {transacoes.length === 0 ? (
            <div className="familia-vazio">Nenhuma transação ainda.</div>
          ) : (
            transacoes.map(t => (
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
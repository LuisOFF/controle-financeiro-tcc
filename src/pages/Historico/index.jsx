import { useFinance } from '../../context/FinanceContext'
import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Target, Wallet,
  PieChart, Upload, Trash2, Plus, Search, History
} from 'lucide-react'
import './Historico.css'

const iconesPorTipo = {
  'transacao_adicionada_receita': <TrendingUp size={18} />,
  'transacao_adicionada_despesa': <TrendingDown size={18} />,
  'transacao_removida':           <Trash2 size={18} />,
  'meta_adicionada':              <Target size={18} />,
  'meta_removida':                <Trash2 size={18} />,
  'meta_deposito':                <Plus size={18} />,
  'carteira_adicionada':          <Wallet size={18} />,
  'carteira_removida':            <Trash2 size={18} />,
  'orcamento_adicionado':         <PieChart size={18} />,
  'orcamento_removido':           <Trash2 size={18} />,
  'importacao':                   <Upload size={18} />,
}

const coresPorTipo = {
  'transacao_adicionada_receita': 'verde',
  'transacao_adicionada_despesa': 'vermelho',
  'transacao_removida':           'cinza',
  'meta_adicionada':              'roxo',
  'meta_removida':                'cinza',
  'meta_deposito':                'verde',
  'carteira_adicionada':          'azul',
  'carteira_removida':            'cinza',
  'orcamento_adicionado':         'laranja',
  'orcamento_removido':           'cinza',
  'importacao':                   'azul',
}

const labelsCategoria = {
  transacao:  'Transação',
  meta:       'Meta',
  carteira:   'Carteira',
  orcamento:  'Orçamento',
  importacao: 'Importação',
}

const filtros = [
  { label: 'Todos',      value: 'todos' },
  { label: 'Transações', value: 'transacao' },
  { label: 'Metas',      value: 'meta' },
  { label: 'Carteiras',  value: 'carteira' },
  { label: 'Orçamento',  value: 'orcamento' },
]

export default function Historico() {
  const { historico, loading } = useFinance()
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')

  if (loading) {
    return (
      <div className="historico-page" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Carregando histórico...
      </div>
    )
  }

  const historicoFiltrado = historico.filter(h => {
    const bateCategoria = filtro === 'todos' ? true : h.tipo.startsWith(filtro)
    const bateBusca = h.descricao.toLowerCase().includes(busca.toLowerCase())
    return bateCategoria && bateBusca
  })

  function formatarDataHora(dataISO) {
    if (!dataISO) return ''
    const d = new Date(dataISO)
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  function formatarDescricao(texto) {
    const [tituloBruto, valor] = texto.split(' — ')
    const titulo = tituloBruto.replace(/:\s*([a-zà-ú])/i, (_, letra) => `: ${letra.toUpperCase()}`)
    return { titulo, valor }
  }

  function obterCategoria(tipo) {
    const prefixo = tipo.split('_')[0]
    return labelsCategoria[prefixo] || 'Sistema'
  }

  return (
    <div className="historico-page">
      <div className="historico-header">
        <div>
          <h2>Histórico de atividades</h2>
          <p>Acompanhe tudo que aconteceu na sua conta.</p>
        </div>
        <span className="historico-contador">
          {historicoFiltrado.length} {historicoFiltrado.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      <div className="historico-toolbar">
        <div className="historico-filtros">
          {filtros.map(f => (
            <button
              key={f.value}
              className={`filtro-btn ${filtro === f.value ? 'ativo' : ''}`}
              onClick={() => setFiltro(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="historico-busca">
          <Search size={16} />
          <input
            type="text"
            placeholder="Filtrar por descrição..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      {historicoFiltrado.length === 0 ? (
        <div className="historico-vazio">
          <div className="historico-vazio-icone">
            <History size={24} />
          </div>
          <p>Nenhuma atividade encontrada.</p>
          <span>
            {busca || filtro !== 'todos'
              ? 'Tente limpar os filtros ou buscar por outro termo.'
              : 'As ações que você realizar aparecerão aqui.'}
          </span>
        </div>
      ) : (
        <div className="historico-timeline">
          {historicoFiltrado.map(h => {
            const { titulo, valor } = formatarDescricao(h.descricao)
            const cor = coresPorTipo[h.tipo] || 'cinza'

            return (
              <div key={h.id} className="timeline-item">
                <div className={`timeline-icone ${cor}`}>
                  {iconesPorTipo[h.tipo] || <Plus size={18} />}
                </div>

                <div className="timeline-conteudo">
                  <div className="timeline-info">
                    <p className="timeline-descricao">{titulo}</p>
                    <div className="timeline-meta">
                      <span className="timeline-badge">{obterCategoria(h.tipo)}</span>
                      <span className="timeline-separador">•</span>
                      <span className="timeline-data">{formatarDataHora(h.data || h.createdAt)}</span>
                    </div>
                  </div>

                  {valor && (
                    <span className={`timeline-valor ${cor}`}>
                      {cor === 'vermelho' ? `- ${valor}` : cor === 'verde' ? `+ ${valor}` : valor}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
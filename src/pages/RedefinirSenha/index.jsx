import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Wallet, ArrowLeft, Lock } from 'lucide-react'
import { api } from '../../services/api'
import './RedefinirSenha.css'

export default function RedefinirSenha() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    if (!novaSenha || !confirmarSenha) {
      setErro('Preencha todos os campos.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    if (!token) {
      setErro('Token de recuperação inválido ou ausente.')
      return
    }

    try {
      setLoading(true)
      // Ajusta para a rota correta do teu backend que efetiva a troca de senha
      await api.post('/recuperacao/redefinir', { token, novaSenha })
      setSucesso(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao redefinir a senha. O token pode ter expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="recuperar-page">
      <div className="recuperar-card">
        <div className="recuperar-logo">
          <Wallet size={28} />
          <span>FinanControl</span>
        </div>

        {!sucesso ? (
          <>
            <div className="recuperar-header">
              <h2>Nova senha</h2>
              <p>Insira a sua nova senha abaixo para redefinir o acesso à conta.</p>
            </div>

            <form className="recuperar-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="novaSenha">Nova Senha</label>
                <input
                  id="novaSenha"
                  type="password"
                  placeholder="••••••••"
                  value={novaSenha}
                  onChange={e => { setNovaSenha(e.target.value); setErro('') }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmarSenha">Confirmar Nova Senha</label>
                <input
                  id="confirmarSenha"
                  type="password"
                  placeholder="••••••••"
                  value={confirmarSenha}
                  onChange={e => { setConfirmarSenha(e.target.value); setErro('') }}
                />
              </div>

              {erro && <div className="recuperar-erro">{erro}</div>}

              <button type="submit" className="btn-recuperar" disabled={loading}>
                {loading ? 'A redefinir...' : 'Redefinir senha'}
              </button>
            </form>
          </>
        ) : (
          <div className="recuperar-sucesso">
            <div className="sucesso-icone">✓</div>
            <h2>Senha redefinida!</h2>
            <p>A sua senha foi alterada com sucesso. Já pode iniciar sessão com a nova senha.</p>
            <p className="sucesso-obs">A redirecionar para o login...</p>
          </div>
        )}

        <button className="btn-voltar" onClick={() => navigate('/login')}>
          <ArrowLeft size={16} />
          Voltar para o login
        </button>
      </div>
    </div>
  )
}
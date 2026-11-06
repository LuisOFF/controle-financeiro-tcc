const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const prisma = require('../prisma')
const { enviarEmailRecuperacao } = require('../services/email')

async function solicitarRecuperacao(req, res) {
  console.log('🚀 Requisição recebida na rota de recuperação com o corpo:', req.body)

  const { email } = req.body
  if (!email) {
    console.log('⚠️ Erro: E-mail não foi informado na requisição.')
    return res.status(400).json({ erro: 'Informe o e-mail.' })
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) {
    console.log(`⚠️ Aviso: O e-mail "${email}" não foi encontrado no banco de dados.`)
    return res.json({ mensagem: 'Se o e-mail existir, você receberá as instruções.' })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiracao = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.tokenRecuperacao.create({
    data: { token, usuarioId: usuario.id, expiracao }
  })

  console.log('✅ Token gerado e gravado no banco para o usuário:', usuario.email)

  try {
    await enviarEmailRecuperacao(usuario.email, usuario.nome, token)
    console.log('✉️ Função de envio de e-mail executada com sucesso.')
  } catch (error) {
    console.error('❌ Erro detalhado ao tentar enviar o e-mail pelo Nodemailer:', error)
  }

  res.json({ mensagem: 'Se o e-mail existir, você receberá as instruções.' })
}

async function redefinirSenha(req, res) {
  const { token, novaSenha } = req.body
  if (!token || !novaSenha)
    return res.status(400).json({ erro: 'Token e nova senha são obrigatórios.' })

  const tokenRecord = await prisma.tokenRecuperacao.findUnique({ where: { token } })

  if (!tokenRecord || tokenRecord.usado || tokenRecord.expiracao < new Date())
    return res.status(400).json({ erro: 'Token inválido ou expirado.' })

  const hash = await bcrypt.hash(novaSenha, 10)

  await prisma.usuario.update({
    where: { id: tokenRecord.usuarioId },
    data: { senha: hash }
  })

  await prisma.tokenRecuperacao.update({
    where: { token },
    data: { usado: true }
  })

  res.json({ mensagem: 'Senha redefinida com sucesso!' })
}

module.exports = { solicitarRecuperacao, redefinirSenha }
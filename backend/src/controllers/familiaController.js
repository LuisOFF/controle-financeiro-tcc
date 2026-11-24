const crypto = require('crypto')
const prisma = require('../prisma')

async function criarConta(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      include: { conta: true }
    })

    if (usuario.conta) {
      return res.status(400).json({ erro: 'Você já faz parte de uma conta compartilhada.' })
    }

    const codigo = crypto.randomBytes(4).toString('hex').toUpperCase()

    const conta = await prisma.contaCompartilhada.create({
      data: {
        codigo,
        usuarios: { connect: { id: req.usuarioId } }
      },
      include: { usuarios: { select: { id: true, nome: true, email: true } } }
    })

    res.json(conta)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar conta compartilhada.' })
  }
}

async function entrarConta(req, res) {
  try {
    const { codigo } = req.body
    if (!codigo) return res.status(400).json({ erro: 'Informe o código.' })

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      include: { conta: true }
    })

    if (usuario.conta) {
      return res.status(400).json({ erro: 'Você já faz parte de uma conta compartilhada.' })
    }

    const conta = await prisma.contaCompartilhada.findUnique({
      where: { codigo: codigo.toUpperCase() },
      include: { usuarios: true }
    })

    if (!conta) return res.status(404).json({ erro: 'Código inválido.' })
    if (conta.usuarios.length >= 5) return res.status(400).json({ erro: 'Conta cheia (máximo 5 pessoas).' })

    const contaAtualizada = await prisma.contaCompartilhada.update({
      where: { id: conta.id },
      data: { usuarios: { connect: { id: req.usuarioId } } },
      include: { usuarios: { select: { id: true, nome: true, email: true } } }
    })

    res.json(contaAtualizada)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao entrar na conta.' })
  }
}

async function sairConta(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      include: { conta: { include: { usuarios: true } } }
    })

    if (!usuario.conta) return res.status(400).json({ erro: 'Você não faz parte de uma conta compartilhada.' })

    await prisma.usuario.update({
      where: { id: req.usuarioId },
      data: { contaId: null }
    })

    if (usuario.conta.usuarios.length === 1) {
      await prisma.contaCompartilhada.delete({ where: { id: usuario.conta.id } })
    }

    res.json({ mensagem: 'Saiu da conta compartilhada.' })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao sair da conta.' })
  }
}

async function buscarConta(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      include: {
        conta: {
          include: {
            usuarios: { select: { id: true, nome: true, email: true } }
          }
        }
      }
    })

    if (!usuario.conta) return res.json(null)
    res.json(usuario.conta)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar conta.' })
  }
}

// --- TRANSAÇÕES ---
async function listarTransacoes(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.json([])

    const transacoes = await prisma.transacaoCompartilhada.findMany({
      where: { contaId: usuario.contaId },
      orderBy: { criadoEm: 'desc' }
    })
    res.json(transacoes)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar transações.' })
  }
}

async function adicionarTransacao(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.status(400).json({ erro: 'Você não faz parte de uma conta compartilhada.' })

    const { desc, tipo, categoria, valor, data } = req.body
    const transacao = await prisma.transacaoCompartilhada.create({
      data: {
        desc, tipo, categoria,
        valor: parseFloat(valor),
        data,
        autorNome: usuario.nome,
        contaId: usuario.contaId
      }
    })
    res.json(transacao)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao adicionar transação.' })
  }
}

async function atualizarTransacao(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.status(403).json({ erro: 'Acesso negado.' })

    const { id } = req.params
    const { desc, tipo, categoria, valor, data } = req.body

    const existente = await prisma.transacaoCompartilhada.findFirst({
      where: { id: parseInt(id), contaId: usuario.contaId }
    })
    if (!existente) return res.status(404).json({ erro: 'Transação não encontrada.' })

    const atualizada = await prisma.transacaoCompartilhada.update({
      where: { id: parseInt(id) },
      data: {
        desc,
        tipo,
        categoria,
        valor: parseFloat(valor),
        data,
      }
    })
    res.json(atualizada)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar transação.' })
  }
}

async function removerTransacao(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.status(403).json({ erro: 'Acesso negado.' })

    const { id } = req.params
    const resultado = await prisma.transacaoCompartilhada.deleteMany({
      where: { id: parseInt(id), contaId: usuario.contaId }
    })

    if (resultado.count === 0) return res.status(404).json({ erro: 'Transação não encontrada.' })
    res.json({ mensagem: 'Transação removida.' })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover transação.' })
  }
}

// --- METAS ---
async function listarMetas(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.json([])
    const metas = await prisma.metaCompartilhada.findMany({ where: { contaId: usuario.contaId } })
    res.json(metas)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar metas.' })
  }
}

async function adicionarMeta(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.status(400).json({ erro: 'Você não faz parte de uma conta compartilhada.' })

    const { nome, objetivo, atual, icone, cor } = req.body
    const meta = await prisma.metaCompartilhada.create({
      data: {
        nome,
        objetivo: parseFloat(objetivo),
        atual: parseFloat(atual) || 0,
        icone: icone || '🎯',
        cor: cor || '#4ade80',
        contaId: usuario.contaId
      }
    })
    res.json(meta)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao adicionar meta.' })
  }
}

async function atualizarMeta(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.status(403).json({ erro: 'Acesso negado.' })

    const { id } = req.params
    const { nome, objetivo, atual, icone, cor } = req.body

    const metaExistente = await prisma.metaCompartilhada.findFirst({
      where: { id: parseInt(id), contaId: usuario.contaId }
    })
    if (!metaExistente) return res.status(404).json({ erro: 'Meta não encontrada.' })

    const dadosAtualizacao = {}
    if (nome !== undefined) dadosAtualizacao.nome = nome
    if (objetivo !== undefined) dadosAtualizacao.objetivo = parseFloat(objetivo)
    if (atual !== undefined) dadosAtualizacao.atual = parseFloat(atual)
    if (icone !== undefined) dadosAtualizacao.icone = icone
    if (cor !== undefined) dadosAtualizacao.cor = cor

    const meta = await prisma.metaCompartilhada.update({
      where: { id: parseInt(id) },
      data: dadosAtualizacao
    })
    res.json(meta)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar meta.' })
  }
}

async function removerMeta(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.status(403).json({ erro: 'Acesso negado.' })

    const { id } = req.params
    const resultado = await prisma.metaCompartilhada.deleteMany({
      where: { id: parseInt(id), contaId: usuario.contaId }
    })

    if (resultado.count === 0) return res.status(404).json({ erro: 'Meta não encontrada.' })
    res.json({ mensagem: 'Meta removida.' })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover meta.' })
  }
}

// --- CARTEIRAS ---
async function listarCarteiras(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.json([])
    const carteiras = await prisma.carteiraCompartilhada.findMany({ where: { contaId: usuario.contaId } })
    res.json(carteiras)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar carteiras.' })
  }
}

async function adicionarCarteira(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.status(400).json({ erro: 'Você não faz parte de uma conta compartilhada.' })

    const { nome, tipo, saldo, cor } = req.body
    const carteira = await prisma.carteiraCompartilhada.create({
      data: {
        nome,
        tipo,
        saldo: parseFloat(saldo) || 0,
        cor: cor || '#60a5fa',
        contaId: usuario.contaId
      }
    })
    res.json(carteira)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao adicionar carteira.' })
  }
}

async function atualizarCarteira(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.status(403).json({ erro: 'Acesso negado.' })

    const { id } = req.params
    const { nome, tipo, saldo, cor } = req.body

    const existente = await prisma.carteiraCompartilhada.findFirst({
      where: { id: parseInt(id), contaId: usuario.contaId }
    })
    if (!existente) return res.status(404).json({ erro: 'Carteira não encontrada.' })

    const carteira = await prisma.carteiraCompartilhada.update({
      where: { id: parseInt(id) },
      data: {
        nome,
        tipo,
        saldo: parseFloat(saldo) || 0,
        cor: cor || existente.cor,
      }
    })
    res.json(carteira)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar carteira.' })
  }
}

async function removerCarteira(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
    if (!usuario.contaId) return res.status(403).json({ erro: 'Acesso negado.' })

    const { id } = req.params
    const resultado = await prisma.carteiraCompartilhada.deleteMany({
      where: { id: parseInt(id), contaId: usuario.contaId }
    })

    if (resultado.count === 0) return res.status(404).json({ erro: 'Carteira não encontrada.' })
    res.json({ mensagem: 'Carteira removida.' })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover carteira.' })
  }
}

// --- MEMBROS ---
async function removerMembro(req, res) {
  try {
    const { usuarioId } = req.params

    const usuarioLogado = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      include: { conta: { include: { usuarios: true } } }
    })

    if (!usuarioLogado.conta)
      return res.status(400).json({ erro: 'Você não faz parte de uma conta compartilhada.' })

    const membroParaRemover = usuarioLogado.conta.usuarios.find(
      u => u.id === parseInt(usuarioId)
    )

    if (!membroParaRemover)
      return res.status(404).json({ erro: 'Membro não encontrado.' })

    if (membroParaRemover.id === req.usuarioId)
      return res.status(400).json({ erro: 'Use "Sair da conta" para se remover.' })

    await prisma.usuario.update({
      where: { id: parseInt(usuarioId) },
      data: { contaId: null }
    })

    res.json({ mensagem: 'Membro removido com sucesso.' })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover membro.' })
  }
}

module.exports = {
  criarConta, entrarConta, sairConta, buscarConta,
  removerMembro,
  listarTransacoes, adicionarTransacao, atualizarTransacao, removerTransacao,
  listarMetas, adicionarMeta, atualizarMeta, removerMeta,
  listarCarteiras, adicionarCarteira, atualizarCarteira, removerCarteira,
}
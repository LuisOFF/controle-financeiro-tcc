const prisma = require('../prisma')

async function listar(req, res) {
  try {
    const orcamentos = await prisma.orcamento.findMany({
      where: { usuarioId: req.usuarioId },
      orderBy: { criadoEm: 'asc' }
    })
    res.json(orcamentos)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar orçamentos.' })
  }
}

async function criar(req, res) {
  try {
    const { categoria, limite } = req.body
    const valorLimite = parseFloat(limite)

    if (!categoria || isNaN(valorLimite) || valorLimite <= 0) {
      return res.status(400).json({ erro: 'Preencha uma categoria e um limite válido.' })
    }

    const existente = await prisma.orcamento.findFirst({
      where: { usuarioId: req.usuarioId, categoria }
    })

    if (existente) {
      const atualizado = await prisma.orcamento.update({
        where: { id: existente.id },
        data: { limite: valorLimite }
      })
      return res.json(atualizado)
    }

    const orcamento = await prisma.orcamento.create({
      data: {
        categoria,
        limite: valorLimite,
        usuarioId: req.usuarioId
      }
    })
    res.status(201).json(orcamento)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar orçamento.' })
  }
}

async function remover(req, res) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ erro: 'ID inválido.' })

    const deletado = await prisma.orcamento.deleteMany({
      where: { id, usuarioId: req.usuarioId }
    })

    if (deletado.count === 0) {
      return res.status(404).json({ erro: 'Orçamento não encontrado.' })
    }

    res.json({ mensagem: 'Orçamento removido.' })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover orçamento.' })
  }
}

module.exports = { listar, criar, remover }
const prisma = require('../prisma')

async function listar(req, res) {
  try {
    const historico = await prisma.historico.findMany({
      where: { usuarioId: req.usuarioId },
      orderBy: { data: 'desc' },
      take: 100
    })
    res.json(historico)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar histórico.' })
  }
}

async function registrar(req, res) {
  try {
    const { tipo, descricao } = req.body
    if (!tipo || !descricao) {
      return res.status(400).json({ erro: 'Tipo e descrição são obrigatórios.' })
    }

    const registro = await prisma.historico.create({
      data: {
        tipo,
        descricao,
        usuarioId: req.usuarioId
      }
    })
    res.status(201).json(registro)
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao registrar no histórico.' })
  }
}

module.exports = { listar, registrar }
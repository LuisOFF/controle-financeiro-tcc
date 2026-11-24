const router = require('express').Router()
const auth = require('../middlewares/auth')
const {
  criarConta, entrarConta, sairConta, buscarConta,
  removerMembro,
  listarTransacoes, adicionarTransacao, atualizarTransacao, removerTransacao,
  listarMetas, adicionarMeta, atualizarMeta, removerMeta,
  listarCarteiras, adicionarCarteira, atualizarCarteira, removerCarteira,
} = require('../controllers/familiaController')

router.get('/',                      auth, buscarConta)
router.post('/criar',                auth, criarConta)
router.post('/entrar',               auth, entrarConta)
router.post('/sair',                 auth, sairConta)
router.delete('/membros/:usuarioId', auth, removerMembro)

router.get('/transacoes',            auth, listarTransacoes)
router.post('/transacoes',           auth, adicionarTransacao)
router.put('/transacoes/:id',        auth, atualizarTransacao)
router.delete('/transacoes/:id',     auth, removerTransacao)

router.get('/metas',                 auth, listarMetas)
router.post('/metas',                auth, adicionarMeta)
router.put('/metas/:id',             auth, atualizarMeta)
router.delete('/metas/:id',          auth, removerMeta)

router.get('/carteiras',             auth, listarCarteiras)
router.post('/carteiras',            auth, adicionarCarteira)
router.put('/carteiras/:id',         auth, atualizarCarteira)
router.delete('/carteiras/:id',      auth, removerCarteira)

module.exports = router
const router = require('express').Router()
const auth = require('../middlewares/auth')
const { listar, registrar } = require('../controllers/historicoController')

router.get('/',  auth, listar)
router.post('/', auth, registrar)

module.exports = router
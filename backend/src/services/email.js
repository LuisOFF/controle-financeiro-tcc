const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

async function enviarEmailRecuperacao(email, nome, token) {
  const link = `${process.env.FRONTEND_URL}/redefinir-senha?token=${token}`

  console.log('🔗 [LINK DE RECUPERAÇÃO GERADO]:', link)

  await transporter.sendMail({
    from: `"FinanControl" <${process.env.EMAIL_USER}>`,
    to: email, // <--- Isto garante que o destinatário é passado para o Nodemailer
    subject: 'Recuperação de senha — FinanControl',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <h2 style="color: #1a1a2e; text-align: center;">FinanControl</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para prosseguir:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${link}" style="
            background-color: #16a34a;
            color: #ffffff;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
          ">Redefinir Senha</a>
        </div>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">
          Este link expira em 1 hora. Se você não solicitou isso, pode ignorar este e-mail com segurança.
        </p>
      </div>
    `,
  })
}

module.exports = { enviarEmailRecuperacao }
# FinanControl

Sistema web de gestão financeira pessoal e familiar desenvolvido como Trabalho de Conclusão de Curso (TCC) em Ciência da Computação, com foco em organização financeira, educação financeira e colaboração familiar.

---

## 📋 Sobre o Projeto

O **FinanControl** centraliza o controle de receitas, despesas, orçamentos por categoria, metas financeiras e carteiras em uma interface web. Além do uso individual, o sistema conta com **Modo Família**, permitindo carteiras compartilhadas e hierarquia de permissões entre membros.

---

## 🚀 Funcionalidades Principais

- **Dashboard Financeiro:** Visão consolidada de saldo, receitas, despesas, transações recentes e gráficos interativos com filtros por período.
- **Gestão de Transações:** Cadastro, edição e exclusão de receitas e despesas com categorização e datas.
- **Orçamentos por Categoria:** Definição de limites de gastos por categoria e alertas visuais/notificações ao atingir faixas de atenção ou ultrapassar o limite.
- **Metas Financeiras:** Acompanhamento de objetivos financeiros.
- **Modo Família e Carteiras Compartilhadas:** Gestão colaborativa com controle de acesso e permissões por papel/membro.
- **Importação e Exportação:** Importação de dados via planilhas Excel e exportação de relatórios em PDF.
- **Autenticação e Segurança:** Fluxo autenticado via **JWT** e validações de autorização em nível de objeto/recurso.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React, Vite, Recharts, Lucide React, CSS Variables (`--bg-*`, `--text-*`, `--border-*`)
- **Backend:** Node.js com Express
- **Banco de Dados & ORM:** PostgreSQL e Prisma ORM
- **Autenticação:** JSON Web Tokens (JWT)

---

## 📁 Estrutura do Projeto (Referência)

```text
FinanControl/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   └── prisma/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── styles/
│   └── package.json
└── README.md
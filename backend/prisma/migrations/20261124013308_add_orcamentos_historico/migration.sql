-- DropForeignKey
ALTER TABLE "Carteira" DROP CONSTRAINT "Carteira_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "CarteiraCompartilhada" DROP CONSTRAINT "CarteiraCompartilhada_contaId_fkey";

-- DropForeignKey
ALTER TABLE "Meta" DROP CONSTRAINT "Meta_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "MetaCompartilhada" DROP CONSTRAINT "MetaCompartilhada_contaId_fkey";

-- DropForeignKey
ALTER TABLE "TokenRecuperacao" DROP CONSTRAINT "TokenRecuperacao_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Transacao" DROP CONSTRAINT "Transacao_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "TransacaoCompartilhada" DROP CONSTRAINT "TransacaoCompartilhada_contaId_fkey";

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" SERIAL NOT NULL,
    "categoria" TEXT NOT NULL,
    "limite" DOUBLE PRECISION NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Historico" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Historico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TransacaoCompartilhada" ADD CONSTRAINT "TransacaoCompartilhada_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "ContaCompartilhada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaCompartilhada" ADD CONSTRAINT "MetaCompartilhada_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "ContaCompartilhada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarteiraCompartilhada" ADD CONSTRAINT "CarteiraCompartilhada_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "ContaCompartilhada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carteira" ADD CONSTRAINT "Carteira_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Historico" ADD CONSTRAINT "Historico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenRecuperacao" ADD CONSTRAINT "TokenRecuperacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

# Campanhas de arrecadação por Pix

A página `doacoes.html` está disponível pelo menu **Doe por um pet**, pela chamada na página inicial e pelo link **Gerenciar campanhas de arrecadação** na administração.

## Como publicar

1. Entre com uma conta de administrador e abra **Doe por um pet**.
2. Clique em **Nova campanha** e selecione um pet com perfil público.
3. Preencha história, finalidade, meta, responsável, contato e nome do beneficiário.
4. Informe o tipo e a chave Pix; confira os dados e a autorização do responsável para divulgá-los.
5. Escolha **Publicada e aberta** e salve. **Rascunho** fica visível apenas à administração.

As campanhas começam vazias no projeto entregue: nenhum beneficiário, chave Pix ou recebimento fictício é publicado. Os exemplos usados para testar ficaram exclusivamente em um banco temporário.

## Recebimento e acompanhamento

O visitante abre a campanha, escolhe um valor (botões de R$ 10, R$ 25, R$ 50 e R$ 100 ou valor livre) e clica em **Gerar Pix**. O site apresenta um QR Code e um **Pix Copia e Cola** com esse valor e a chave cadastrada pela administração. O visitante conclui a doação no aplicativo do banco, conferindo o valor e o recebedor. A opção de copiar apenas a chave continua disponível.

O site não cria uma nova chave bancária. O QR é estático, gerado localmente no padrão BR Code; não existe cobrança registrada no banco, expiração ou confirmação automática de recebimento. Um código já copiado pode continuar utilizável mesmo após o encerramento da campanha. Não há processamento de pagamentos nem integração com banco.

O servidor aceita valores inteiros em centavos, de R$ 0,01 a R$ 1.000.000, e usa exclusivamente os dados da campanha salva. Campanhas encerradas, rascunhos, animais sem perfil público e versões desatualizadas não geram código. O limite é de 30 gerações/tentativas por IP a cada 10 minutos. Alterar o valor na tela apaga o código anterior; respostas atrasadas não substituem o novo valor. Chaves incompatíveis com o QR estático (por exemplo, e-mail com mais de 77 caracteres) não são truncadas: é exibida uma orientação para usar a chave diretamente.

A administração usa **Editar campanha** para informar o total recebido e uma atualização pública explicando a alteração. O total é identificado como manual. Gerar o QR Code, copiar o código/chave ou compartilhar a campanha não registra doações. Valores são armazenados em centavos.

Ao encerrar uma campanha, o histórico continua disponível, mas a chave Pix deixa de aparecer ao público. A campanha também deixa de oferecer doações se o perfil do animal não estiver público. Para retirar uma campanha da listagem pública, use **Rascunho**.

## Arquivos

- `doacoes.html`: página pública e formulários de administração.
- `css/doacoes.css`: visual responsivo, cartões, progresso e janelas.
- `js/pages/doacoes.js`: pesquisa, filtros, detalhes, escolha de valor, exibição do QR/código, cópia da chave, compartilhamento, criação e edição.
- `lib/pix.cjs`: geração do BR Code com valor, validação de tamanho e CRC16; não é servido como arquivo público.
- `server.js`: coleção persistente `campaigns`, permissões, validação de valores/chaves, histórico e controle de versões para evitar sobrescrever uma edição mais recente.
- `js/store.js`: integração com a API de campanhas.
- `js/nav.js`: entrada no menu compartilhado.
- `admin.html`: acesso ao gerenciamento.
- `index.html`: chamada para apoiar campanhas.
- `tests/campaigns.cjs`: testes de autorização, privacidade de rascunhos, validação, progresso, revisões e encerramento.
- `tests/pix.cjs`: exemplo de referência do BCB, cinco tipos de chave, limites de valor, integridade do destino, campanhas indisponíveis, totais preservados e limite por IP.

## Aprovação e prevenção de campanhas falsas

Somente administradores autenticados podem criar, publicar ou editar campanhas. Essa restrição é aplicada na API, além da interface. Usuários comuns e ONGs não publicam arrecadações diretamente. Não há cadastro adicional para quem deseja doar.

A confirmação do beneficiário no formulário é uma declaração do administrador: o sistema não consulta o banco nem verifica documentos ou a veracidade do caso automaticamente. A publicação depende da conferência humana. A aprovação de uma conta de ONG também não comprova, por si só, a necessidade de uma campanha.

Caso o projeto passe a aceitar solicitações de campanhas de usuários, o fluxo recomendado é usar o cadastro existente, receber comprovantes em área privada, manter a campanha pendente até a análise e registrar a decisão do administrador. Esse fluxo de solicitações e documentos ainda não foi implementado. Não publique documentos pessoais junto à campanha.

Referência do formato: [Manual de Padrões para Iniciação do Pix, Banco Central, seções 2.5 e 2.6](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).

## Verificação

Executados com bancos temporários: `node tests/pix.cjs`, `node tests/campaigns.cjs`, `node tests/security.cjs` e `node tests/security-regressions.cjs`. Todos passaram. O servidor iniciou após cada etapa e os arquivos JavaScript passaram na validação de sintaxe.

No navegador foram verificados criação, edição, atualização do progresso, detalhes do Pix, cópia da chave, filtros, encerramento e visualização pública. Layout conferido em desktop e celular; não houve rolagem horizontal em 390 px nem erros de JavaScript nos fluxos verificados.

Na atualização de 29/09, foram conferidos valor sugerido e personalizado (inclusive centavos), geração de QR/Copia e Cola, conteúdo copiado, remoção do QR ao mudar o valor e erro para valor zero. Layout do Pix conferido em 1366, 390 e 320 px; corrigido o transbordamento do diálogo em telas estreitas. Nenhuma transferência real foi realizada; a aceitação por aplicativo bancário com uma chave real ainda precisa ser conferida pelo responsável.

Aplicado diretamente na versão local de 09/09 indicada pelo usuário. GitHub e Render não foram atualizados.

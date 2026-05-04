# Hospedagem gratuita do Asset Manager

O projeto precisa de backend Node e PostgreSQL. Por isso, GitHub Pages ou Netlify estatico nao sao suficientes para o sistema funcionar completo.

## Opcao indicada: Render

O arquivo `render.yaml` na raiz ja cria:

- um Web Service Node gratuito para o sistema;
- um banco PostgreSQL gratuito;
- a variavel `DATABASE_URL`;
- o comando de build do frontend e backend;
- o comando de preparacao do banco com Drizzle.

## Como publicar

1. Crie ou conecte um repositorio GitHub com este projeto.
2. Entre em `https://dashboard.render.com/`.
3. Use `New` > `Blueprint`.
4. Selecione o repositorio do Asset Manager.
5. Confirme o blueprint `render.yaml`.

Depois que o deploy terminar, o Render mostra a URL publica do sistema.

## Observacoes importantes

- O plano gratuito do Render serve para teste e demonstracao.
- O banco PostgreSQL gratuito do Render expira depois do prazo informado pela propria plataforma.
- Para uso real da empresa, use um plano pago ou um banco persistente fora do plano gratuito.

# Veltro Bot v2.0

Bot Discord completo para venda e suporte do Veltro.

## Setup

```bash
npm install
cp .env.example .env
# edita o .env com os teus tokens
node deploy-commands.js   # regista os slash commands
node bot.js               # inicia o bot
```

## Variáveis de Ambiente (.env)

| Variável            | Descrição                              |
|---------------------|----------------------------------------|
| `BOT_TOKEN`         | Token do bot Discord                   |
| `CLIENT_ID`         | ID da aplicação Discord                |
| `GUILD_ID`          | ID do servidor                         |
| `ADMIN_ROLE`        | ID do role de administrador            |
| `CATEGORY_SUPORTE`  | ID da categoria de tickets de suporte  |
| `CATEGORY_VENDAS`   | ID da categoria de tickets de venda    |
| `LOG_CHANNEL`       | ID do canal de logs                    |
| `FIREBASE_PROJECT`  | ID do projeto Firebase (veltro-app)    |
| `FIREBASE_KEY`      | API Key do Firebase                    |

## Comandos

### Admin
| Comando                        | Descrição                              |
|--------------------------------|----------------------------------------|
| `/admin gerar`                 | Gera chave VLTR- e guarda no Firestore |
| `/admin revogar`               | Revoga uma chave                       |
| `/admin estender`              | Adiciona dias a uma chave              |
| `/admin resetkey`              | Desvincula chave do PC/utilizador      |
| `/admin info`                  | Detalhes de uma chave específica       |
| `/admin clientes`              | Lista todos os clientes ativos         |
| `/admin stats`                 | Estatísticas gerais                    |

### Utilizador
| Comando        | Descrição                        |
|----------------|----------------------------------|
| `/ativar`      | Confirma licença online          |
| `/status`      | Estado da licença ativa          |
| `/comprar`     | Ver planos e abrir ticket        |
| `/painel`      | Cria painel com botões           |
| `/setup`       | Cria painel de tickets           |
| `/divulgar`    | Envia embed de divulgação        |
| `/ping`        | Latência do bot                  |

### Tickets
| Comando    | Descrição                      |
|------------|--------------------------------|
| `/fechar`  | Fecha e guarda transcript      |
| `/add`     | Adiciona utilizador ao ticket  |
| `/remover` | Remove utilizador do ticket    |

## Melhorias v2.0 vs v1.0

- **Firestore real** — licenças persistem entre reinicios
- **Chaves VLTR-** em vez de VELTRO-
- **Plano Semestral** adicionado
- **Anti-spam** — cooldown de 30s entre tickets
- **Botão Assumir** — staff pode assumir tickets
- **`/admin estender`** — adiciona dias sem recriar chave
- **`/admin resetkey`** — desvincula PC/utilizador
- **`/admin info`** — detalhes completos de qualquer chave
- **`/admin stats`** — estatísticas globais
- **`/remover`** — remove utilizador do ticket
- **`/ping`** — latência do bot
- **Transcripts** melhorados com encoding PT
- **Logs** com canal separado para vendas e suporte

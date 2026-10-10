require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ver a latência do bot'),

  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Criar painel de tickets com menu de seleção'),

  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Criar painel completo do Veltro com botões'),

  new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Ver os planos do Veltro e abrir ticket de compra'),

  new SlashCommandBuilder()
    .setName('ativar')
    .setDescription('Verificar e confirmar a tua licença Veltro')
    .addStringOption(o => o
      .setName('chave')
      .setDescription('A tua chave VLTR-XXXX-XXXX-XXXX')
      .setRequired(true)),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Ver o estado da tua licença ativa'),

  new SlashCommandBuilder()
    .setName('fechar')
    .setDescription('Fechar este ticket (dentro de um ticket)'),

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Adicionar um utilizador ao ticket')
    .addUserOption(o => o
      .setName('utilizador')
      .setDescription('Utilizador a adicionar')
      .setRequired(true)),

  new SlashCommandBuilder()
    .setName('remover')
    .setDescription('Remover um utilizador do ticket')
    .addUserOption(o => o
      .setName('utilizador')
      .setDescription('Utilizador a remover')
      .setRequired(true)),

  new SlashCommandBuilder()
    .setName('divulgar')
    .setDescription('Enviar embed de divulgação do Veltro')
    .addChannelOption(o => o
      .setName('canal')
      .setDescription('Canal onde enviar (padrão: canal atual)')),

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Comandos de administração')
    .addSubcommand(s => s
      .setName('gerar')
      .setDescription('Gerar uma chave de licença')
      .addStringOption(o => o
        .setName('plano')
        .setDescription('Plano da licença')
        .setRequired(true)
        .addChoices(
          { name: '📅 Mensal (30 dias)',     value: 'mensal'     },
          { name: '📆 Trimestral (90 dias)', value: 'trimestral' },
          { name: '🗓️ Semestral (180 dias)', value: 'semestral'  },
          { name: '♾️ Vitalício',            value: 'vitalicio'  },
        ))
      .addUserOption(o => o
        .setName('cliente')
        .setDescription('Atribuir a um cliente (opcional)')))
    .addSubcommand(s => s
      .setName('revogar')
      .setDescription('Revogar uma chave')
      .addStringOption(o => o
        .setName('chave')
        .setDescription('Chave a revogar')
        .setRequired(true)))
    .addSubcommand(s => s
      .setName('estender')
      .setDescription('Estender validade de uma chave')
      .addStringOption(o => o
        .setName('chave')
        .setDescription('Chave a estender')
        .setRequired(true))
      .addIntegerOption(o => o
        .setName('dias')
        .setDescription('Dias a adicionar')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(3650)))
    .addSubcommand(s => s
      .setName('resetkey')
      .setDescription('Desvincular chave do PC/utilizador para reativação')
      .addStringOption(o => o
        .setName('chave')
        .setDescription('Chave a desvincular')
        .setRequired(true)))
    .addSubcommand(s => s
      .setName('info')
      .setDescription('Ver detalhes de uma chave')
      .addStringOption(o => o
        .setName('chave')
        .setDescription('Chave a verificar')
        .setRequired(true)))
    .addSubcommand(s => s
      .setName('clientes')
      .setDescription('Listar todos os clientes com licença ativa'))
    .addSubcommand(s => s
      .setName('stats')
      .setDescription('Ver estatísticas gerais das licenças'))
    .addSubcommand(s => s
      .setName('dm')
      .setDescription('Enviar mensagem privada a um utilizador pelo ID')
      .addStringOption(o => o
        .setName('id')
        .setDescription('ID do utilizador')
        .setRequired(true))
      .addStringOption(o => o
        .setName('mensagem')
        .setDescription('Conteúdo da mensagem')
        .setRequired(true)
        .setMaxLength(2000))
      .addStringOption(o => o
        .setName('imagem')
        .setDescription('Link de uma imagem para incluir (opcional)')
        .setRequired(false))),

].map(c => c.toJSON());

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`A registar ${commands.length} comandos...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log(`✅ ${commands.length} comandos registados com sucesso!`);
  } catch (err) {
    console.error('Erro:', err);
  }
})();

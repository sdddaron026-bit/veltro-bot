require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
<<<<<<< HEAD

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
=======
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Criar painel de tickets no canal atual'),

  new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Ver os planos do Veltro e comprar'),

  new SlashCommandBuilder()
    .setName('suporte')
    .setDescription('Abrir um ticket de suporte'),

  new SlashCommandBuilder()
    .setName('ativar')
    .setDescription('Ativar a tua licença do Veltro')
    .addStringOption(o => o.setName('chave').setDescription('A tua chave de ativação').setRequired(true)),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Ver o estado da tua licença'),

  new SlashCommandBuilder()
    .setName('fechar')
    .setDescription('Fechar este ticket'),
>>>>>>> 212270ac6f6225b2436823fcd673f7eba3952ccb

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Adicionar um utilizador ao ticket')
<<<<<<< HEAD
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
=======
    .addUserOption(o => o.setName('utilizador').setDescription('Utilizador a adicionar').setRequired(true)),

  new SlashCommandBuilder()
    .setName('divulgar')
    .setDescription('Gerar embed de divulgação do Veltro')
    .addChannelOption(o => o.setName('canal').setDescription('Canal onde enviar (opcional)')),

  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Criar painel completo do Veltro com todas as opções'),
>>>>>>> 212270ac6f6225b2436823fcd673f7eba3952ccb

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Comandos de administração')
<<<<<<< HEAD
    .addSubcommand(s => s
      .setName('gerar')
      .setDescription('Gerar uma chave de licença')
      .addStringOption(o => o
        .setName('plano')
        .setDescription('Plano da licença')
        .setRequired(true)
        .addChoices(
          { name: '📅 Mensal (30 dias)',    value: 'mensal'     },
          { name: '📆 Trimestral (90 dias)', value: 'trimestral' },
          { name: '🗓️ Semestral (180 dias)', value: 'semestral'  },
          { name: '♾️ Vitalício',           value: 'vitalicio'  },
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
      .setDescription('Enviar mensagem privada a um utilizador')
      .addUserOption(o => o
        .setName('utilizador')
        .setDescription('Utilizador a quem enviar a mensagem')
        .setRequired(true))
      .addStringOption(o => o
        .setName('mensagem')
        .setDescription('Conteúdo da mensagem')
        .setRequired(true)
        .setMaxLength(2000))),

=======
    .addSubcommand(s => s.setName('gerar').setDescription('Gerar uma chave de licença')
      .addStringOption(o => o.setName('plano').setDescription('Plano').setRequired(true)
        .addChoices(
          { name: 'Mensal',     value: 'mensal'     },
          { name: 'Trimestral', value: 'trimestral' },
          { name: 'Vitalício',  value: 'vitalicio'  }
        ))
      .addUserOption(o => o.setName('cliente').setDescription('Cliente (opcional)')))
    .addSubcommand(s => s.setName('revogar').setDescription('Revogar uma chave')
      .addStringOption(o => o.setName('chave').setDescription('Chave a revogar').setRequired(true)))
    .addSubcommand(s => s.setName('clientes').setDescription('Ver todos os clientes')),
>>>>>>> 212270ac6f6225b2436823fcd673f7eba3952ccb
].map(c => c.toJSON());

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
<<<<<<< HEAD
    console.log(`A registar ${commands.length} comandos...`);
=======
    console.log('A registar comandos...');
>>>>>>> 212270ac6f6225b2436823fcd673f7eba3952ccb
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
<<<<<<< HEAD
    console.log(`✅ ${commands.length} comandos registados com sucesso!`);
  } catch (err) {
    console.error('Erro:', err);
=======
    console.log('✅ Comandos registados com sucesso!');
  } catch (e) {
    console.error(e);
>>>>>>> 212270ac6f6225b2436823fcd673f7eba3952ccb
  }
})();

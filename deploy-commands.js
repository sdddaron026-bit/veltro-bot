require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
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

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Adicionar um utilizador ao ticket')
    .addUserOption(o => o.setName('utilizador').setDescription('Utilizador a adicionar').setRequired(true)),

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Comandos de administração')
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
].map(c => c.toJSON());

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('A registar comandos no servidor...');
    // Registo por servidor — aparece instantaneamente!
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Comandos registados com sucesso!');
  } catch (e) {
    console.error(e);
  }
})();

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

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Adicionar um utilizador ao ticket')
    .addUserOption(o => o.setName('utilizador').setDescription('Utilizador a adicionar').setRequired(true)),

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Comandos de administração')
    .addSubcommand(s => s.setName('gerar').setDescription('Gerar uma chave de licença')
      .addStringOption(o => o.setName('plano').setDescription('Plano').setRequired(true)
        .addChoices(
          { name: 'Mensal', value: 'mensal' },
          { name: 'Trimestral', value: 'trimestral' },
          { name: 'Semestral', value: 'semestral' },
          { name: 'Anual', value: 'anual' },
          { name: 'Vitalício', value: 'vitalicio' }
        ))
      .addUserOption(o => o.setName('cliente').setDescription('Cliente (opcional)')))
    .addSubcommand(s => s.setName('revogar').setDescription('Revogar uma chave')
      .addStringOption(o => o.setName('chave').setDescription('Chave a revogar').setRequired(true)))
    .addSubcommand(s => s.setName('clientes').setDescription('Ver todos os clientes')),
].map(c => c.toJSON());

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('A registar comandos...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Comandos registados com sucesso!');
  } catch (e) {
    console.error(e);
  }
})();

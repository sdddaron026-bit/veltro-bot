require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits, ChannelType, StringSelectMenuBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ── Helpers ────────────────────────────────────────────────────────────────
function makeKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = (n) => Array.from({length:n}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  return `VELTRO-${seg(4)}-${seg(4)}-${seg(4)}`;
}

function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
         (process.env.ADMIN_ROLE && member.roles.cache.has(process.env.ADMIN_ROLE));
}

const tickets  = new Map();
const licenses = new Map();

// ── Ready ──────────────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log(`✅ Veltro Bot online como ${client.user.tag}`);
  client.user.setActivity('Veltro | /setup', { type: 3 });
});

// ── Interactions ───────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  try {
    if      (interaction.isChatInputCommand()) await handleSlash(interaction);
    else if (interaction.isButton())           await handleButton(interaction);
    else if (interaction.isStringSelectMenu()) await handleSelect(interaction);
  } catch (err) {
    console.error(err);
    const msg = { content: '❌ Ocorreu um erro. Tenta novamente.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
    else await interaction.reply(msg);
  }
});

// ── Slash Commands ─────────────────────────────────────────────────────────
async function handleSlash(i) {
  const cmd = i.commandName;

  // /setup
  if (cmd === 'setup') {
    if (!isAdmin(i.member)) return i.reply({ content: '❌ Sem permissão.', ephemeral: true });

    await i.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0x0ea5e9)
      .setTitle('Veltros Optimization')
      .setDescription('Precisa de ajuda ou pretende adquirir o Veltros?\nAbra um ticket e escolha a opção que melhor corresponde ao motivo do seu atendimento.')
      .setThumbnail(client.user.displayAvatarURL());

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ticket_menu')
        .setPlaceholder('Seleciona uma opção')
        .addOptions([
          { label: 'Comprar Veltro',     description: 'Quero adquirir uma licença',  value: 'buy',     emoji: '🛒' },
          { label: 'Suporte Técnico',    description: 'Preciso de ajuda técnica',     value: 'support', emoji: '🎫' },
          { label: 'Problema com chave', description: 'A minha chave não funciona',   value: 'key',     emoji: '🔑' },
          { label: 'Dúvida geral',       description: 'Tenho uma questão',            value: 'general', emoji: '❓' },
        ])
    );

    await i.channel.send({ embeds: [embed], components: [row] });
    await i.editReply({ content: '✅ Painel criado!' });
  }

  // /comprar
  else if (cmd === 'comprar') {
    const embed = new EmbedBuilder()
      .setColor(0x0ea5e9)
      .setTitle('🚀 Veltro Premium')
      .setDescription('Escolhe o teu plano e abre um ticket.')
      .addFields(
        { name: '📅 Mensal',    value: '30 dias de acesso',    inline: true },
        { name: '📆 Trimestral',value: '90 dias de acesso',    inline: true },
        { name: '♾️ Vitalício', value: 'Acesso para sempre',   inline: true },
      )
      .addFields({ name: '✅ Inclui', value: '150+ tweaks · Aim Trainer · Layer Overlay · Suporte Discord\n🌐 **https://veltrootm.netlify.app**' })
      .setFooter({ text: 'Clica num plano para abrir o ticket de compra' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('buy_mensal').setLabel('Mensal').setStyle(ButtonStyle.Secondary).setEmoji('📅'),
      new ButtonBuilder().setCustomId('buy_trimestral').setLabel('Trimestral').setStyle(ButtonStyle.Secondary).setEmoji('📆'),
      new ButtonBuilder().setCustomId('buy_vitalicio').setLabel('Vitalício').setStyle(ButtonStyle.Primary).setEmoji('♾️'),
    );

    await i.reply({ embeds: [embed], components: [row] });
  }

  // /suporte
  else if (cmd === 'suporte') {
    await openTicket(i, 'suporte', null, '🎫 Suporte Técnico');
  }

  // /ativar
  else if (cmd === 'ativar') {
    const chave = i.options.getString('chave').trim().toUpperCase();
    const lic   = licenses.get(chave);

    if (!lic)         return i.reply({ content: '❌ Chave inválida.', ephemeral: true });
    if (!lic.active)  return i.reply({ content: '❌ Esta chave foi revogada.', ephemeral: true });
    if (lic.userId && lic.userId !== i.user.id)
                      return i.reply({ content: '❌ Esta chave pertence a outro utilizador.', ephemeral: true });
    if (Date.now() > lic.expiry)
                      return i.reply({ content: '❌ Esta chave expirou. Renova no Discord!', ephemeral: true });

    lic.userId = i.user.id;
    const exp = new Date(lic.expiry).toLocaleDateString('pt-BR');

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle('✅ Licença Ativada!')
      .setDescription(`Bem-vindo ao **Veltro Premium**, ${i.user}!`)
      .addFields(
        { name: 'Plano',     value: lic.plano, inline: true },
        { name: 'Expira em', value: exp,        inline: true },
      );
    await i.reply({ embeds: [embed], ephemeral: true });
  }

  // /status
  else if (cmd === 'status') {
    const lic = [...licenses.values()].find(l => l.userId === i.user.id && l.active);
    if (!lic) return i.reply({ content: '❌ Sem licença ativa. Usa `/comprar`!', ephemeral: true });

    const exp  = new Date(lic.expiry).toLocaleDateString('pt-BR');
    const dias = Math.max(0, Math.ceil((lic.expiry - Date.now()) / 86400000));

    const embed = new EmbedBuilder()
      .setColor(0x0ea5e9)
      .setTitle('🔑 Estado da Licença')
      .addFields(
        { name: 'Plano',           value: lic.plano,       inline: true },
        { name: 'Expira em',       value: exp,             inline: true },
        { name: 'Dias restantes',  value: `${dias} dias`,  inline: true },
        { name: 'Estado',          value: '✅ Ativa',      inline: true },
      );
    await i.reply({ embeds: [embed], ephemeral: true });
  }

  // /fechar
  else if (cmd === 'fechar') {
    if (!i.channel.name.startsWith('ticket-'))
      return i.reply({ content: '❌ Só funciona dentro de um ticket.', ephemeral: true });

    await i.reply({ content: '🔒 Ticket a fechar em 5 segundos...' });
    await saveTranscript(i.channel, i.guild);
    setTimeout(() => i.channel.delete().catch(() => {}), 5000);
  }

  // /add
  else if (cmd === 'add') {
    if (!i.channel.name.startsWith('ticket-'))
      return i.reply({ content: '❌ Só funciona dentro de um ticket.', ephemeral: true });

    const user = i.options.getUser('utilizador');
    await i.channel.permissionOverwrites.create(user.id, { ViewChannel: true, SendMessages: true });
    await i.reply({ content: `✅ ${user} adicionado ao ticket.` });
  }

  // /divulgar
  else if (cmd === 'divulgar') {
    if (!isAdmin(i.member)) return i.reply({ content: '❌ Sem permissão.', ephemeral: true });

    const canal = i.options.getChannel('canal') || i.channel;

    const embed = new EmbedBuilder()
      .setColor(0x0ea5e9)
      .setAuthor({ name: 'Veltro — Otimizador Premium para Windows', iconURL: client.user.displayAvatarURL() })
      .setTitle('⚡ O teu PC merece mais')
      .setDescription(
        '> Já imaginou ter **+30-60 FPS** a mais nos teus jogos favoritos?\n' +
        '> O **Veltro** faz isso e muito mais — com 1 clique.\n\n' +
        '```\n🚀 +500 tweaks de performance\n🎯 Aim Trainer integrado\n🌐 Otimização de rede e ping\n🧹 Limpeza de RAM automática\n🔒 Tweaks de segurança\n💾 Boost de disco e CPU\n```\n\n' +
        '💬 **Suporte 24/7 via Discord**\n' +
        '🔄 **Atualizações automáticas incluídas**\n' +
        '✅ **Ativação instantânea por chave**\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '🛒 **Adquire já o teu plano:**\n' +
        '🔗 [Site oficial](https://veltrootm.netlify.app)\n' +
        '📩 [Entrar no Discord](https://discord.gg/ByCV38w23f)'
      )
      .setImage('https://veltrootm.netlify.app/preview.png')
      .setFooter({ text: 'Veltro • veltrootm.netlify.app', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('🌐 Site Oficial')
        .setURL('https://veltrootm.netlify.app')
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('📩 Entrar no Discord')
        .setURL('https://discord.gg/ByCV38w23f')
        .setStyle(ButtonStyle.Link),
    );

    await canal.send({ embeds: [embed], components: [row] });
    await i.reply({ content: `✅ Divulgação enviada em ${canal}!`, ephemeral: true });
  }

  // /admin
  else if (cmd === 'admin') {
    if (!isAdmin(i.member))
      return i.reply({ content: '❌ Sem permissão.', ephemeral: true });

    const sub = i.options.getSubcommand();

    if (sub === 'gerar') {
      const plano   = i.options.getString('plano');
      const cliente = i.options.getUser('cliente');
      const key     = makeKey();
      const dias    = { mensal:30, trimestral:90, vitalicio:36500 }[plano] || 30;
      const expiry  = Date.now() + dias * 86400000;

      licenses.set(key, { userId: cliente?.id || null, plano, expiry, active: true });

      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('🔑 Chave Gerada')
        .addFields(
          { name: 'Chave',   value: `\`${key}\``,                               inline: false },
          { name: 'Plano',   value: plano,                                       inline: true  },
          { name: 'Expira',  value: new Date(expiry).toLocaleDateString('pt-BR'), inline: true  },
          { name: 'Cliente', value: cliente ? `${cliente}` : 'Não atribuído',    inline: true  },
        );

      await i.reply({ embeds: [embed], ephemeral: true });

      if (cliente) {
        try {
          const dm = new EmbedBuilder()
            .setColor(0x0ea5e9)
            .setTitle('🎉 A tua licença Veltro está pronta!')
            .addFields(
              { name: '🔑 Chave',        value: `\`${key}\`` },
              { name: '📋 Como ativar',  value: 'Abre o Veltro e insere a chave na tela de ativação.' },
              { name: '📅 Plano',        value: plano },
            );
          await cliente.send({ embeds: [dm] });
        } catch {
          await i.followUp({ content: `⚠️ Não consegui enviar DM. Partilha manualmente: \`${key}\``, ephemeral: true });
        }
      }
    }

    else if (sub === 'revogar') {
      const chave = i.options.getString('chave').trim().toUpperCase();
      const lic   = licenses.get(chave);
      if (!lic) return i.reply({ content: '❌ Chave não encontrada.', ephemeral: true });
      lic.active = false;
      await i.reply({ content: `✅ Chave \`${chave}\` revogada.`, ephemeral: true });
    }

    else if (sub === 'clientes') {
      const ativos = [...licenses.entries()].filter(([, l]) => l.active && Date.now() < l.expiry);
      if (!ativos.length) return i.reply({ content: '📭 Nenhum cliente ativo.', ephemeral: true });

      const lista = ativos.map(([k, l]) => {
        const exp = new Date(l.expiry).toLocaleDateString('pt-BR');
        return `\`${k}\` · ${l.plano} · expira ${exp} · <@${l.userId || 'N/A'}>`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x0ea5e9)
        .setTitle(`📊 Clientes Ativos (${ativos.length})`)
        .setDescription(lista.slice(0, 4000));
      await i.reply({ embeds: [embed], ephemeral: true });
    }
  }
}

// ── Buttons ────────────────────────────────────────────────────────────────
async function handleButton(i) {
  if (i.customId.startsWith('buy_')) {
    const plano = i.customId.replace('buy_', '');
    await openTicket(i, 'venda', plano, `🛒 Compra — ${plano.charAt(0).toUpperCase() + plano.slice(1)}`);
  }
  else if (i.customId === 'close_ticket') {
    await i.reply({ content: '🔒 Ticket a fechar em 5 segundos...' });
    await saveTranscript(i.channel, i.guild);
    setTimeout(() => i.channel.delete().catch(() => {}), 5000);
  }
}

// ── Select Menu ────────────────────────────────────────────────────────────
async function handleSelect(i) {
  if (i.customId !== 'ticket_menu') return;

  const configs = {
    buy:     { tipo: 'venda',   plano: 'a definir', label: '🛒 Compra'              },
    support: { tipo: 'suporte', plano: null,         label: '🎫 Suporte Técnico'     },
    key:     { tipo: 'suporte', plano: null,         label: '🔑 Problema com Chave'  },
    general: { tipo: 'suporte', plano: null,         label: '❓ Dúvida Geral'        },
  };

  const { tipo, plano, label } = configs[i.values[0]];
  await openTicket(i, tipo, plano, label);
}

// ── Open Ticket ────────────────────────────────────────────────────────────
async function openTicket(i, tipo, plano, label) {
  const guild  = i.guild;
  const userId = i.user.id;

  if (tickets.has(userId)) {
    const existing = guild.channels.cache.get(tickets.get(userId));
    if (existing) return i.reply({ content: `❌ Já tens um ticket aberto: ${existing}`, ephemeral: true });
    tickets.delete(userId);
  }

  const categoryId = process.env.CATEGORY_SUPORTE;
  const nome       = `ticket-${i.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}`;

  console.log(`Tipo: ${tipo} | Category: ${categoryId} | User: ${i.user.tag}`);

  const perms = [
    { id: guild.roles.everyone.id, deny:  [PermissionFlagsBits.ViewChannel] },
    { id: userId,                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
  ];

  if (process.env.ADMIN_ROLE) {
    const role = guild.roles.cache.get(process.env.ADMIN_ROLE);
    if (role) perms.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
  }

  const ch = await guild.channels.create({
    name:                nome,
    type:                ChannelType.GuildText,
    parent:              categoryId || undefined,
    permissionOverwrites: perms,
  });

  tickets.set(userId, ch.id);

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
  );

  const color  = tipo === 'venda' ? 0x0ea5e9 : 0x8b5cf6;
  const titulo = tipo === 'venda'
    ? `🛒 Ticket de Compra — ${(plano || '').charAt(0).toUpperCase() + (plano || '').slice(1)}`
    : `🎫 ${label || 'Ticket de Suporte'}`;

  const desc = tipo === 'venda'
    ? `Olá ${i.user}! 👋\n\nUm membro da equipa vai atender-te em breve para finalizar a compra.\n\n> Enquanto esperas, podes ver mais em **https://veltrootm.netlify.app**`
    : `Olá ${i.user}! 👋\n\nDescreve o teu problema e a equipa responde em breve.`;

  const embed = new EmbedBuilder().setColor(color).setTitle(titulo).setDescription(desc).setTimestamp();
  if (plano && tipo === 'venda') embed.addFields({ name: 'Plano', value: plano, inline: true });

  await ch.send({ content: `${i.user}`, embeds: [embed], components: [closeRow] });
  await i.reply({ content: `✅ Ticket criado: ${ch}`, ephemeral: true });

  // Log
  if (process.env.LOG_CHANNEL) {
    const logCh = guild.channels.cache.get(process.env.LOG_CHANNEL);
    if (logCh) {
      const logEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${tipo === 'venda' ? '🛒 Nova venda' : '🎫 Novo suporte'}`)
        .addFields(
          { name: 'Utilizador', value: `${i.user} (${i.user.id})`, inline: true },
          { name: 'Canal',      value: `${ch}`,                     inline: true },
          { name: 'Tipo',       value: label || tipo,               inline: true },
        )
        .setTimestamp();
      await logCh.send({ embeds: [logEmbed] });
    }
  }
}

// ── Save Transcript ────────────────────────────────────────────────────────
async function saveTranscript(channel, guild) {
  if (!process.env.LOG_CHANNEL) return;
  const logCh = guild.channels.cache.get(process.env.LOG_CHANNEL);
  if (!logCh) return;

  try {
    // Busca até 500 mensagens do ticket
    const msgs = await channel.messages.fetch({ limit: 100 });
    const sorted = [...msgs.values()].reverse();

    if (!sorted.length) return;

    // Formata o transcript
    const lines = sorted.map(m => {
      const time = new Date(m.createdTimestamp).toLocaleString('pt-BR');
      const content = m.content || (m.embeds.length ? '[Embed]' : '[Sem conteúdo]');
      return `[${time}] ${m.author.tag}: ${content}`;
    }).join('\n');

    const header = `=== TRANSCRIPT — ${channel.name} ===\nData: ${new Date().toLocaleString('pt-BR')}\nMensagens: ${sorted.length}\n${'='.repeat(40)}\n\n`;
    const full   = header + lines;

    // Envia como ficheiro .txt
    const { AttachmentBuilder } = require('discord.js');
    const buffer  = Buffer.from(full, 'utf8');
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('📄 Transcript do Ticket')
      .addFields(
        { name: 'Canal',      value: channel.name,             inline: true },
        { name: 'Mensagens',  value: `${sorted.length}`,       inline: true },
        { name: 'Fechado em', value: new Date().toLocaleString('pt-BR'), inline: true },
      )
      .setTimestamp();

    await logCh.send({ embeds: [embed], files: [attachment] });
  } catch (err) {
    console.error('Erro ao guardar transcript:', err);
  }
}

client.login(process.env.BOT_TOKEN);

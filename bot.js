'use strict';
require('dotenv').config();

const {
  Client, GatewayIntentBits, Partials,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits, ChannelType, StringSelectMenuBuilder,
  AttachmentBuilder,
} = require('discord.js');

// ═══════════════════════════════════════════════════════
// FIRESTORE REST
// ═══════════════════════════════════════════════════════
const FS_PROJECT = process.env.FIREBASE_PROJECT || 'veltro-app';
const FS_KEY     = process.env.FIREBASE_KEY     || '';
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${FS_PROJECT}/databases/(default)/documents`;

async function fsGet(col, doc) {
  const r = await fetch(`${FS_BASE}/${col}/${encodeURIComponent(doc)}?key=${FS_KEY}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Firestore GET ${r.status}`);
  const d = await r.json();
  return d.fields ? parseFields(d.fields) : null;
}

async function fsSet(col, doc, data) {
  const r = await fetch(`${FS_BASE}/${col}/${encodeURIComponent(doc)}?key=${FS_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!r.ok) throw new Error(`Firestore SET ${r.status}: ${await r.text()}`);
}

async function fsList(col) {
  const r = await fetch(`${FS_BASE}/${col}?key=${FS_KEY}&pageSize=300`);
  if (!r.ok) return [];
  const d = await r.json();
  if (!d.documents) return [];
  return d.documents.map(doc => ({
    id: doc.name.split('/').pop(),
    ...parseFields(doc.fields || {}),
  }));
}

function parseFields(f) {
  const out = {};
  for (const [k, v] of Object.entries(f)) {
    if      ('stringValue'  in v) out[k] = v.stringValue;
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('doubleValue'  in v) out[k] = v.doubleValue;
    else if ('nullValue'    in v) out[k] = null;
  }
  return out;
}

function toFields(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if      (v === null || v === undefined) out[k] = { nullValue: null };
    else if (typeof v === 'boolean')        out[k] = { booleanValue: v };
    else if (typeof v === 'number')         out[k] = { integerValue: String(v) };
    else                                    out[k] = { stringValue: String(v) };
  }
  return out;
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
function makeKey() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const s = n => Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join('');
  return `VLTR-${s(4)}-${s(4)}-${s(4)}`;
}

function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
    (process.env.ADMIN_ROLE && member.roles.cache.has(process.env.ADMIN_ROLE));
}

function planoDias(p)  { return { mensal:30, trimestral:90, semestral:180, vitalicio:36500 }[p] ?? 30; }
function planoEmoji(p) { return { mensal:'📅', trimestral:'📆', semestral:'🗓️', vitalicio:'♾️' }[p] ?? '🔑'; }
function fmtDate(ts)   { return new Date(Number(ts)).toLocaleDateString('pt-PT', { day:'2-digit', month:'2-digit', year:'numeric' }); }
function diasRest(exp) { return Math.max(0, Math.ceil((Number(exp) - Date.now()) / 86400000)); }

// ═══════════════════════════════════════════════════════
// CLIENT
// ═══════════════════════════════════════════════════════
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const ticketCooldown = new Map();

client.once('ready', () => {
  console.log(`✅ Veltro Bot online: ${client.user.tag}`);
  client.user.setActivity('Veltro | /painel', { type: 3 });
});

// ═══════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════
client.on('interactionCreate', async interaction => {
  try {
    if      (interaction.isChatInputCommand()) await handleSlash(interaction);
    else if (interaction.isButton())           await handleButton(interaction);
    else if (interaction.isStringSelectMenu()) await handleSelect(interaction);
  } catch (err) {
    console.error('[Error]', err);
    const msg = { content: '❌ Erro interno. Tenta novamente.', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch {}
  }
});

// ═══════════════════════════════════════════════════════
// SLASH COMMANDS
// ═══════════════════════════════════════════════════════
async function handleSlash(i) {
  const cmd = i.commandName;

  // /ping
  if (cmd === 'ping') {
    return i.reply({ content: `🏓 Pong! Latência: **${client.ws.ping}ms**`, ephemeral: true });
  }

  // /setup
  if (cmd === 'setup') {
    if (!isAdmin(i.member)) return i.reply({ content: '❌ Sem permissão.', ephemeral: true });
    await i.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle('🖤 Veltro — Suporte & Vendas')
      .setDescription('Precisa de ajuda ou quer adquirir o Veltro?\nSeleciona uma opção abaixo.')
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: 'Veltro • veltrootm.netlify.app' });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ticket_menu')
        .setPlaceholder('Seleciona uma opção...')
        .addOptions([
          { label: 'Comprar Veltro',     value: 'buy',     emoji: '🛒', description: 'Quero adquirir uma licença'  },
          { label: 'Suporte Técnico',    value: 'support', emoji: '🎫', description: 'Preciso de ajuda técnica'    },
          { label: 'Problema com Chave', value: 'key',     emoji: '🔑', description: 'A minha chave não funciona'  },
          { label: 'Dúvida Geral',       value: 'general', emoji: '❓', description: 'Tenho uma questão'           },
        ])
    );

    await i.channel.send({ embeds: [embed], components: [row] });
    return i.editReply('✅ Painel criado!');
  }

  // /painel
  if (cmd === 'painel') {
    if (!isAdmin(i.member)) return i.reply({ content: '❌ Sem permissão.', ephemeral: true });
    await i.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: 'VELTRO OPTIMIZATION', iconURL: client.user.displayAvatarURL() })
      .setTitle('⚡ O Otimizador Mais Completo Para Windows')
      .setDescription(
        '```\n' +
        '⚡ PERFORMANCE    +50~100 FPS garantidos\n' +
        '🌐 REDE           Ping reduzido, zero packet loss\n' +
        '🎯 ANALISE        Diagnóstico completo do sistema\n' +
        '🖥️  PC ESPECÍFICO  Tweaks para o teu hardware\n' +
        '🎮 GRAFICOS       NVIDIA/AMD otimizados\n' +
        '🧹 LIMPEZA        RAM, cache e lixo eliminados\n' +
        '🔒 PRIVACIDADE    Telemetria e tracking removidos\n' +
        '💾 1500+ TWEAKS   Comandos reais no sistema\n' +
        '```\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '> 🏆 Usado por centenas de jogadores\n' +
        '> 🔄 Atualizações automáticas incluídas\n' +
        '> 💬 Suporte 24/7 via Discord\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '**💰 PLANOS**\n' +
        '> 📅 **Mensal** — 30 dias\n' +
        '> 📆 **Trimestral** — 90 dias\n' +
        '> 🗓️ **Semestral** — 180 dias\n' +
        '> ♾️ **Vitalício** — Para sempre\n\n' +
        '*Clica num botão abaixo para começar* 👇'
      )
      .setFooter({ text: 'Veltro • veltrootm.netlify.app', iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('painel_comprar').setLabel('Comprar').setStyle(ButtonStyle.Primary).setEmoji('🛒'),
      new ButtonBuilder().setCustomId('painel_suporte').setLabel('Suporte').setStyle(ButtonStyle.Secondary).setEmoji('🎫'),
      new ButtonBuilder().setCustomId('painel_key').setLabel('Problema Chave').setStyle(ButtonStyle.Secondary).setEmoji('🔑'),
      new ButtonBuilder().setCustomId('painel_duvida').setLabel('Dúvida').setStyle(ButtonStyle.Secondary).setEmoji('❓'),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Site Oficial').setURL('https://veltrootm.netlify.app').setStyle(ButtonStyle.Link).setEmoji('🌐'),
      new ButtonBuilder().setLabel('Discord').setURL('https://discord.gg/ByCV38w23f').setStyle(ButtonStyle.Link).setEmoji('📩'),
    );

    await i.channel.send({ embeds: [embed], components: [row1, row2] });
    return i.editReply('✅ Painel criado!');
  }

  // /comprar
  if (cmd === 'comprar') {
    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle('🚀 Veltro Premium — Planos')
      .addFields(
        { name: '📅 Mensal',     value: '30 dias',      inline: true },
        { name: '📆 Trimestral', value: '90 dias',      inline: true },
        { name: '🗓️ Semestral',  value: '180 dias',     inline: true },
        { name: '♾️ Vitalício',  value: 'Para sempre',  inline: true },
      )
      .addFields({ name: '✅ Inclui', value: '1500+ tweaks · Análise · Gráficos · PC Específico · Suporte 24/7\n🌐 **https://veltrootm.netlify.app**' })
      .setFooter({ text: 'Abre um ticket para comprar' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('buy_mensal').setLabel('Mensal').setStyle(ButtonStyle.Secondary).setEmoji('📅'),
      new ButtonBuilder().setCustomId('buy_trimestral').setLabel('Trimestral').setStyle(ButtonStyle.Secondary).setEmoji('📆'),
      new ButtonBuilder().setCustomId('buy_semestral').setLabel('Semestral').setStyle(ButtonStyle.Secondary).setEmoji('🗓️'),
      new ButtonBuilder().setCustomId('buy_vitalicio').setLabel('Vitalício').setStyle(ButtonStyle.Primary).setEmoji('♾️'),
    );

    return i.reply({ embeds: [embed], components: [row] });
  }

  // /ativar
  if (cmd === 'ativar') {
    const chave = i.options.getString('chave').trim().toUpperCase();
    await i.deferReply({ ephemeral: true });

    let lic;
    try { lic = await fsGet('licenses', chave); } catch { return i.editReply('❌ Erro de ligação. Tenta novamente.'); }

    if (!lic)        return i.editReply('❌ Chave inválida.');
    if (!lic.active) return i.editReply('❌ Chave revogada. Contacta o suporte.');
    if (lic.userId && lic.userId !== i.user.id)
                     return i.editReply('❌ Esta chave está registada noutro utilizador.');
    if (Date.now() > Number(lic.expiry))
                     return i.editReply('❌ Chave expirada. Renova o teu plano!');

    if (!lic.userId) await fsSet('licenses', chave, { ...lic, userId: i.user.id, activatedAt: Date.now() });

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('✅ Licença Confirmada!')
      .setDescription(`Bem-vindo ao **Veltro Premium**, ${i.user}!`)
      .addFields(
        { name: `${planoEmoji(lic.plano)} Plano`, value: lic.plano || 'N/A', inline: true },
        { name: '📅 Expira em',                   value: fmtDate(lic.expiry),  inline: true },
        { name: '⏳ Dias restantes',              value: `${diasRest(lic.expiry)} dias`, inline: true },
      )
      .setFooter({ text: 'Veltro • veltrootm.netlify.app' });

    return i.editReply({ embeds: [embed] });
  }

  // /status
  if (cmd === 'status') {
    await i.deferReply({ ephemeral: true });

    let all = [];
    try { all = await fsList('licenses'); } catch { return i.editReply('❌ Erro de ligação.'); }

    const lic = all.find(l => l.userId === i.user.id && l.active && Date.now() < Number(l.expiry));
    if (!lic) return i.editReply('❌ Sem licença ativa. Usa `/comprar`!');

    const dias = diasRest(lic.expiry);
    const pct  = Math.round(Math.min(dias, 30) / 30 * 10);
    const bar  = '█'.repeat(pct) + '░'.repeat(10 - pct);

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle('🔑 Estado da Licença')
      .setDescription(`Olá ${i.user}! A tua licença está **activa**.`)
      .addFields(
        { name: `${planoEmoji(lic.plano)} Plano`, value: lic.plano || 'N/A',    inline: true },
        { name: '📅 Expira em',                   value: fmtDate(lic.expiry),   inline: true },
        { name: '⏳ Dias restantes',              value: `${dias} dias`,        inline: true },
        { name: '📊 Progresso',                   value: `\`[${bar}]\``,        inline: false },
      )
      .setFooter({ text: 'Veltro • veltrootm.netlify.app' });

    return i.editReply({ embeds: [embed] });
  }

  // /fechar
  if (cmd === 'fechar') {
    if (!i.channel.name.startsWith('ticket-'))
      return i.reply({ content: '❌ Só funciona dentro de um ticket.', ephemeral: true });
    await i.reply({ content: '🔒 A fechar em 5 segundos...' });
    await saveTranscript(i.channel, i.guild);
    setTimeout(() => i.channel.delete().catch(() => {}), 5000);
    return;
  }

  // /add
  if (cmd === 'add') {
    if (!i.channel.name.startsWith('ticket-'))
      return i.reply({ content: '❌ Só dentro de um ticket.', ephemeral: true });
    const user = i.options.getUser('utilizador');
    await i.channel.permissionOverwrites.create(user.id, { ViewChannel: true, SendMessages: true, AttachFiles: true });
    return i.reply({ content: `✅ ${user} adicionado.` });
  }

  // /remover
  if (cmd === 'remover') {
    if (!i.channel.name.startsWith('ticket-'))
      return i.reply({ content: '❌ Só dentro de um ticket.', ephemeral: true });
    const user = i.options.getUser('utilizador');
    await i.channel.permissionOverwrites.delete(user.id).catch(() => {});
    return i.reply({ content: `✅ ${user} removido.` });
  }

  // /divulgar
  if (cmd === 'divulgar') {
    if (!isAdmin(i.member)) return i.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const canal = i.options.getChannel('canal') || i.channel;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: 'Veltro — Otimizador Premium para Windows', iconURL: client.user.displayAvatarURL() })
      .setTitle('⚡ O teu PC merece mais')
      .setDescription(
        '> Imagina ter **+50-100 FPS** a mais nos teus jogos favoritos?\n' +
        '> O **Veltro** faz isso e muito mais — com 1 clique.\n\n' +
        '```\n🚀 1500+ tweaks de performance\n🎯 Análise completa do Windows\n🖥️  Otimização para o teu hardware\n🎮 Tweaks NVIDIA/AMD\n🌐 Redução de ping e latência\n🧹 Limpeza automática de RAM\n🔒 Privacidade total\n```\n\n' +
        '✅ **Ativação instantânea por chave VLTR-**\n' +
        '🔄 **Atualizações automáticas incluídas**\n' +
        '💬 **Suporte 24/7 via Discord**\n\n' +
        '🔗 [Site oficial](https://veltrootm.netlify.app) • 📩 [Discord](https://discord.gg/ByCV38w23f)'
      )
      .setFooter({ text: 'Veltro • veltrootm.netlify.app' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Site Oficial').setURL('https://veltrootm.netlify.app').setStyle(ButtonStyle.Link).setEmoji('🌐'),
      new ButtonBuilder().setLabel('Entrar no Discord').setURL('https://discord.gg/ByCV38w23f').setStyle(ButtonStyle.Link).setEmoji('📩'),
    );

    await canal.send({ embeds: [embed], components: [row] });
    return i.reply({ content: `✅ Divulgação enviada em ${canal}!`, ephemeral: true });
  }

  // /admin
  if (cmd === 'admin') {
    if (!isAdmin(i.member)) return i.reply({ content: '❌ Sem permissão.', ephemeral: true });
    const sub = i.options.getSubcommand();
    await i.deferReply({ ephemeral: true });

    if (sub === 'gerar') {
      const plano   = i.options.getString('plano');
      const cliente = i.options.getUser('cliente');
      const dias    = planoDias(plano);
      const key     = makeKey();
      const expiry  = Date.now() + dias * 86400000;

      await fsSet('licenses', key, {
        plano, expiry, active: true,
        userId:      cliente?.id || '',
        createdAt:   Date.now(),
        createdBy:   i.user.id,
        activatedAt: 0,
      });

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('🔑 Chave Gerada')
        .addFields(
          { name: 'Chave',                        value: `\`${key}\``,              inline: false },
          { name: `${planoEmoji(plano)} Plano`,   value: plano,                     inline: true  },
          { name: '📅 Expira',                    value: fmtDate(expiry),           inline: true  },
          { name: '👤 Cliente',                   value: cliente ? `${cliente}` : 'Não atribuído', inline: true },
        )
        .setFooter({ text: `Criada por ${i.user.tag}` });

      await i.editReply({ embeds: [embed] });

      if (cliente) {
        try {
          await cliente.send({
            embeds: [new EmbedBuilder()
              .setColor(0x000000)
              .setTitle('🎉 A tua licença Veltro está pronta!')
              .setDescription('Bem-vindo ao **Veltro Premium**!')
              .addFields(
                { name: '🔑 Chave',       value: `\`${key}\`` },
                { name: `${planoEmoji(plano)} Plano`, value: `${plano} — ${dias} dias` },
                { name: '📅 Expira em',   value: fmtDate(expiry) },
                { name: '📋 Como ativar', value: 'Abre o Veltro → insere a chave → clica Ativar.' },
              )
              .setFooter({ text: 'Veltro • veltrootm.netlify.app' })],
          });
        } catch {
          await i.followUp({ content: `⚠️ Não consegui enviar DM. Partilha: \`${key}\``, ephemeral: true });
        }
      }
      return;
    }

    if (sub === 'revogar') {
      const chave = i.options.getString('chave').trim().toUpperCase();
      const lic   = await fsGet('licenses', chave);
      if (!lic) return i.editReply('❌ Chave não encontrada.');
      await fsSet('licenses', chave, { ...lic, active: false, revokedAt: Date.now(), revokedBy: i.user.id });
      return i.editReply(`✅ Chave \`${chave}\` revogada.`);
    }

    if (sub === 'estender') {
      const chave = i.options.getString('chave').trim().toUpperCase();
      const dias  = i.options.getInteger('dias');
      const lic   = await fsGet('licenses', chave);
      if (!lic) return i.editReply('❌ Chave não encontrada.');
      const novo = Number(lic.expiry) + dias * 86400000;
      await fsSet('licenses', chave, { ...lic, expiry: novo });
      return i.editReply(`✅ \`${chave}\` estendida ${dias} dias. Nova expiração: ${fmtDate(novo)}`);
    }

    if (sub === 'resetkey') {
      const chave = i.options.getString('chave').trim().toUpperCase();
      const lic   = await fsGet('licenses', chave);
      if (!lic) return i.editReply('❌ Chave não encontrada.');
      await fsSet('licenses', chave, { ...lic, userId: '', activatedAt: 0 });
      return i.editReply(`✅ Chave \`${chave}\` desvinculada. Pode ser reativada noutro PC.`);
    }

    if (sub === 'info') {
      const chave = i.options.getString('chave').trim().toUpperCase();
      const lic   = await fsGet('licenses', chave);
      if (!lic) return i.editReply('❌ Chave não encontrada.');
      const estado = lic.active ? (Date.now() < Number(lic.expiry) ? '✅ Activa' : '⏰ Expirada') : '❌ Revogada';
      const embed = new EmbedBuilder()
        .setColor(lic.active && Date.now() < Number(lic.expiry) ? 0x22c55e : 0xef4444)
        .setTitle(`🔑 Info — \`${chave}\``)
        .addFields(
          { name: 'Estado',                         value: estado,                    inline: true },
          { name: `${planoEmoji(lic.plano)} Plano`, value: lic.plano || 'N/A',        inline: true },
          { name: '📅 Expira',                      value: fmtDate(lic.expiry),       inline: true },
          { name: '⏳ Restante',                    value: `${diasRest(lic.expiry)} dias`, inline: true },
          { name: '👤 Utilizador',                  value: lic.userId ? `<@${lic.userId}>` : 'Não atribuído', inline: true },
          { name: '📅 Criada',                      value: lic.createdAt ? fmtDate(lic.createdAt) : 'N/A', inline: true },
        );
      return i.editReply({ embeds: [embed] });
    }

    if (sub === 'clientes') {
      let all = [];
      try { all = await fsList('licenses'); } catch { return i.editReply('❌ Erro Firestore.'); }
      const ativos = all.filter(l => l.active && Date.now() < Number(l.expiry));
      if (!ativos.length) return i.editReply('📭 Nenhum cliente ativo.');
      const lista = ativos.map(l =>
        `\`${l.id}\` ${planoEmoji(l.plano)} **${l.plano}** · ⏳${diasRest(l.expiry)}d · ${l.userId ? `<@${l.userId}>` : '`N/A`'}`
      ).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`📊 Clientes Ativos — ${ativos.length}`)
        .setDescription(lista.slice(0, 4000))
        .setFooter({ text: `Total chaves: ${all.length} | Activas: ${ativos.length}` });
      return i.editReply({ embeds: [embed] });
    }

    if (sub === 'dm') {
      const userId   = i.options.getString('id').trim();
      const mensagem = i.options.getString('mensagem');

      let alvo;
      try {
        alvo = await client.users.fetch(userId);
      } catch {
        return i.editReply('❌ ID inválido. Não encontrei nenhum utilizador com esse ID.');
      }

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setAuthor({ name: 'Veltro', iconURL: client.user.displayAvatarURL() })
        .setDescription(mensagem)
        .setTimestamp()
        .setFooter({ text: 'Veltro • veltrootm.netlify.app' });

      try {
        await alvo.send({ embeds: [embed] });
        return i.editReply(`✅ Mensagem enviada para **${alvo.tag}** com sucesso!`);
      } catch {
        return i.editReply(`❌ Não consegui enviar DM para **${alvo.tag}**. O utilizador pode ter as DMs desativadas.`);
      }
    }

    if (sub === 'stats') {
      let all = [];
      try { all = await fsList('licenses'); } catch { return i.editReply('❌ Erro Firestore.'); }
      const ativos    = all.filter(l => l.active && Date.now() < Number(l.expiry));
      const expirados = all.filter(l => l.active && Date.now() >= Number(l.expiry));
      const revogados = all.filter(l => !l.active);
      const planos    = {};
      ativos.forEach(l => { planos[l.plano] = (planos[l.plano] || 0) + 1; });
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle('📈 Estatísticas Veltro')
        .addFields(
          { name: '✅ Activos',   value: String(ativos.length),    inline: true },
          { name: '⏰ Expirados', value: String(expirados.length), inline: true },
          { name: '❌ Revogados', value: String(revogados.length), inline: true },
          { name: '📊 Total',     value: String(all.length),       inline: true },
        );
      if (Object.keys(planos).length)
        embed.addFields({ name: '💰 Por Plano', value: Object.entries(planos).map(([k,v]) => `${planoEmoji(k)} ${k}: **${v}**`).join('\n') });
      embed.setTimestamp().setFooter({ text: `Por ${i.user.tag}` });
      return i.editReply({ embeds: [embed] });
    }
  }
}

// ═══════════════════════════════════════════════════════
// BUTTONS
// ═══════════════════════════════════════════════════════
async function handleButton(i) {
  if (i.customId.startsWith('buy_')) {
    const plano = i.customId.replace('buy_', '');
    return openTicket(i, 'venda', plano, `🛒 Compra — ${plano.charAt(0).toUpperCase() + plano.slice(1)}`);
  }
  if (i.customId === 'painel_comprar') return openTicket(i, 'venda',   'a definir', '🛒 Compra');
  if (i.customId === 'painel_suporte') return openTicket(i, 'suporte', null, '🎫 Suporte Técnico');
  if (i.customId === 'painel_key')     return openTicket(i, 'suporte', null, '🔑 Problema com Chave');
  if (i.customId === 'painel_duvida')  return openTicket(i, 'suporte', null, '❓ Dúvida Geral');

  if (i.customId === 'claim_ticket') {
    await i.channel.setTopic(`claimed:${i.user.id}`).catch(() => {});
    return i.reply({ content: `✅ Ticket assumido por ${i.user}!` });
  }

  if (i.customId === 'close_ticket') {
    await i.reply({ content: '🔒 A fechar em 5 segundos...' });
    await saveTranscript(i.channel, i.guild);
    setTimeout(() => i.channel.delete().catch(() => {}), 5000);
  }
}

// ═══════════════════════════════════════════════════════
// SELECT MENU
// ═══════════════════════════════════════════════════════
async function handleSelect(i) {
  if (i.customId !== 'ticket_menu') return;
  const map = {
    buy:     { tipo: 'venda',   plano: 'a definir', label: '🛒 Compra'              },
    support: { tipo: 'suporte', plano: null,         label: '🎫 Suporte Técnico'     },
    key:     { tipo: 'suporte', plano: null,         label: '🔑 Problema com Chave'  },
    general: { tipo: 'suporte', plano: null,         label: '❓ Dúvida Geral'        },
  };
  const cfg = map[i.values[0]];
  if (cfg) await openTicket(i, cfg.tipo, cfg.plano, cfg.label);
}

// ═══════════════════════════════════════════════════════
// OPEN TICKET
// ═══════════════════════════════════════════════════════
async function openTicket(i, tipo, plano, label) {
  const guild  = i.guild;
  const userId = i.user.id;

  // Anti-spam cooldown 30s
  const now = Date.now();
  if (ticketCooldown.has(userId) && now - ticketCooldown.get(userId) < 30000)
    return i.reply({ content: '⏳ Aguarda 30 segundos antes de abrir outro ticket.', ephemeral: true });

  // Check existing ticket
  const existing = guild.channels.cache.find(c =>
    c.name.startsWith('ticket-') && c.permissionOverwrites.cache.has(userId)
  );
  if (existing) return i.reply({ content: `❌ Já tens um ticket aberto: ${existing}`, ephemeral: true });

  ticketCooldown.set(userId, now);

  const categoryId = tipo === 'venda'
    ? (process.env.CATEGORY_VENDAS || process.env.CATEGORY_SUPORTE)
    : process.env.CATEGORY_SUPORTE;

  const nome = `ticket-${i.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)}-${Date.now().toString(36).slice(-4)}`;

  const perms = [
    { id: guild.roles.everyone.id, deny:  [PermissionFlagsBits.ViewChannel] },
    { id: userId,                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
  ];
  if (process.env.ADMIN_ROLE) {
    const role = guild.roles.cache.get(process.env.ADMIN_ROLE);
    if (role) perms.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] });
  }

  const ch = await guild.channels.create({
    name: nome, type: ChannelType.GuildText,
    parent:               categoryId || undefined,
    permissionOverwrites: perms,
    topic:                `owner:${userId}`,
  });

  const color = tipo === 'venda' ? 0x000000 : 0x4f46e5;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(label)
    .setDescription(
      tipo === 'venda'
        ? `Olá ${i.user}! 👋\n\nUm membro da equipa vai atender-te em breve para finalizar a compra do plano **${plano}**.\n\n> Vê mais em **https://veltrootm.netlify.app**`
        : `Olá ${i.user}! 👋\n\nDescreve o teu problema com detalhe e respondemos o mais rápido possível.`
    )
    .setTimestamp();

  if (plano && tipo === 'venda')
    embed.addFields({ name: `${planoEmoji(plano)} Plano`, value: plano, inline: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumir').setStyle(ButtonStyle.Secondary).setEmoji('👋'),
  );

  const mention = `${i.user}${process.env.ADMIN_ROLE ? ` <@&${process.env.ADMIN_ROLE}>` : ''}`;
  await ch.send({ content: mention, embeds: [embed], components: [row] });
  await i.reply({ content: `✅ Ticket criado: ${ch}`, ephemeral: true });

  // Log novo ticket
  if (process.env.LOG_CHANNEL) {
    const logCh = guild.channels.cache.get(process.env.LOG_CHANNEL);
    if (logCh) {
      await logCh.send({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setTitle(tipo === 'venda' ? '🛒 Novo Ticket de Venda' : '🎫 Novo Ticket de Suporte')
          .addFields(
            { name: '👤 Utilizador', value: `${i.user} (${i.user.id})`, inline: true },
            { name: '📌 Canal',      value: `${ch}`,                    inline: true },
            { name: '📋 Tipo',       value: label,                      inline: true },
          )
          .setTimestamp()],
      });
    }
  }
}

// ═══════════════════════════════════════════════════════
// TRANSCRIPT
// ═══════════════════════════════════════════════════════
async function saveTranscript(channel, guild) {
  if (!process.env.LOG_CHANNEL) return;
  const logCh = guild.channels.cache.get(process.env.LOG_CHANNEL);
  if (!logCh) return;

  try {
    const msgs   = await channel.messages.fetch({ limit: 100 });
    const sorted = [...msgs.values()].reverse();
    if (!sorted.length) return;

    const lines = sorted.map(m => {
      const time    = new Date(m.createdTimestamp).toLocaleString('pt-PT');
      const content = m.content || (m.embeds.length ? '[Embed]' : '[Sem conteúdo]');
      const attach  = m.attachments.size ? ` [${m.attachments.size} anexo(s)]` : '';
      return `[${time}] ${m.author.tag}: ${content}${attach}`;
    }).join('\n');

    const header =
      `${'═'.repeat(50)}\n` +
      `  TRANSCRIPT — ${channel.name}\n` +
      `  Data:       ${new Date().toLocaleString('pt-PT')}\n` +
      `  Mensagens:  ${sorted.length}\n` +
      `${'═'.repeat(50)}\n\n`;

    const buffer = Buffer.from(header + lines, 'utf8');
    const attach = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

    await logCh.send({
      embeds: [new EmbedBuilder()
        .setColor(0x4f46e5)
        .setTitle('📄 Transcript do Ticket')
        .addFields(
          { name: '📌 Canal',      value: channel.name,                       inline: true },
          { name: '💬 Mensagens',  value: String(sorted.length),              inline: true },
          { name: '🕐 Fechado em', value: new Date().toLocaleString('pt-PT'), inline: true },
        )
        .setTimestamp()],
      files: [attach],
    });
  } catch (err) {
    console.error('[Transcript Error]', err);
  }
}

// ═══════════════════════════════════════════════════════
// HTTP SERVER (para o Render não matar o serviço)
// ═══════════════════════════════════════════════════════
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('OK')).listen(PORT, () => {
  console.log(`🌐 HTTP server a correr na porta ${PORT}`);
});

// ═══════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════
client.login(process.env.BOT_TOKEN);

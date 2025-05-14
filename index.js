//
// The translation from French to English is not yet finished ;)
//


const Discord = require('discord.js');
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildPresences,
    Discord.GatewayIntentBits.GuildVoiceStates,
    Discord.GatewayIntentBits.GuildMessageTyping,
    Discord.GatewayIntentBits.DirectMessages
  ]
});
const config = require('./config.json');
const sequelize = require('./database');
const SellerReview = require('./models/SellerReview');

async function initializeDatabase() {
    try {
        await sequelize.sync();
        console.log('✅ Base de données synchronisée');
    } catch (error) {
        console.error('❌ Erreur de synchronisation de la base de données:', error);
    }
}

initializeDatabase();

client.on('ready', () => {
  console.log(`✅ Nebula est Connecté!`);
  
  client.user.setStatus('idle');
  client.user.setActivity('/help', { type: Discord.ActivityType.Playing });

  const ticketChannel = client.channels.cache.get(config.ticket.channelId);
  if (ticketChannel) {
    ticketChannel.messages.fetch().then(messages => {
      const ticketMessage = messages.find(m => m.author.id === client.user.id);
      if (!ticketMessage) {
        sendTicketMessage(ticketChannel);
      }
    }).catch(console.error);
  }

  const rulesChannel = client.channels.cache.get(config.rules?.channelId);
  if (rulesChannel) {
    rulesChannel.messages.fetch().then(messages => {
      const rulesMessage = messages.find(m => m.author.id === client.user.id && m.components.length > 0);
      if (!rulesMessage) {
        sendRulesMessage(rulesChannel);
      }
    }).catch(console.error);
  }
});

function sendRulesMessage(channel) {
  const embed = new Discord.EmbedBuilder()
    .setColor(0xfae3d6)
    .setTitle('📜 Règlement du serveur')
    .setDescription('Veuillez lire attentivement les règles ci-dessous :')
    .addFields(
      { name: 'Règle 1', value: 'Respectez tous les membres', inline: false },
      { name: 'Règle 2', value: 'Pas de spam ou de flood', inline: false },
      { name: 'Règle 3', value: 'Pas de contenu NSFW', inline: false },
      { name: 'Règle 4', value: 'Pas de publicité non autorisée', inline: false }
    )
    .setImage('https://cdn.discordapp.com/attachments/1369711051234611242/1369716788392235130/ede322a8c59bcbad659e78774e950d22.gif?ex=681cdfaa&is=681b8e2a&hm=905fd0935ea906c401b6a99a6f0e7f0ad78f0e65fa104ab11878aae285380080&')
    .setFooter({ text: 'En acceptant les règles, vous acceptez de les respecter' });

  const selectMenu = new Discord.StringSelectMenuBuilder()
    .setCustomId('accept_rules')
    .setPlaceholder('Sélectionnez une option')
    .addOptions(
      {
        label: 'J\'accepte le règlement',
        description: 'Cliquez ici pour accéder au serveur',
        value: 'accept'
      },
      {
        label: 'Je refuse le règlement',
        description: 'Vous serez expulsé du serveur',
        value: 'reject'
      }
    );

  const actionRow = new Discord.ActionRowBuilder().addComponents(selectMenu);
  channel.send({ embeds: [embed], components: [actionRow] });
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === 'accept_rules') {
    const value = interaction.values[0];
    
    try {
      const member = interaction.member;
      const role = interaction.guild.roles.cache.get(config.rules.roleId);
      
      if (!role) {
        return interaction.reply({
          content: 'Le rôle à attribuer n\'a pas été trouvé. Contactez un administrateur.',
          ephemeral: true
        });
      }

      if (value === 'accept') {
        await member.roles.add(role);
        
        interaction.reply({
          content: 'Merci d\'avoir accepté les règles ! Vous avez maintenant accès au serveur.',
          ephemeral: true
        });
      } 
      else if (value === 'reject') {
        if (member.roles.cache.has(role.id)) {
          await member.roles.remove(role);
        }

        try {
          await member.send({
            embeds: [
              new Discord.EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Règlement refusé')
                .setDescription('Vous avez choisi de refuser le règlement du serveur. Vous avez été expulsé.')
            ]
          }).catch(() => {});
        } catch {}

        setTimeout(() => {
          member.kick('A refusé le règlement du serveur').catch(console.error);
        }, 1000);
        
        interaction.reply({
          content: 'Vous avez refusé le règlement. Vous allez être expulsé du serveur.',
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'attribution/retrait du rôle:', error);
      interaction.reply({
        content: 'Une erreur est survenue lors du traitement de votre choix.',
        ephemeral: true
      });
    }
  }
});

client.on('presenceUpdate', async (oldPresence, newPresence) => {
  if (!newPresence || !newPresence.member || !config.customStatus) return;

  const member = newPresence.member;
  const customStatus = newPresence.activities.find(a => a.type === Discord.ActivityType.Custom)?.state;
  const oldCustomStatus = oldPresence?.activities.find(a => a.type === Discord.ActivityType.Custom)?.state;

  const hasStatus = customStatus && customStatus.includes(config.customStatus.text);
  const hadStatus = oldCustomStatus && oldCustomStatus.includes(config.customStatus.text);

  try {
    const role = member.guild.roles.cache.get(config.customStatus.roleId);
    if (!role) return;

    if (hasStatus && !member.roles.cache.has(role.id)) {
      await member.roles.add(role);
      console.log(`✅ Rôle ${role.name} ajouté à ${member.user.tag} pour le statut "${customStatus}"`);
    }
    else if (!hasStatus && hadStatus && member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      console.log(`❌ Rôle ${role.name} retiré de ${member.user.tag} (statut changé)`);
    }
  } catch (error) {
    console.error(`Erreur avec le système de statut personnalisé:`, error);
  }
});

function containsLinks(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return urlRegex.test(text);
}

function censorLinks(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '``æ@£ß!?€&%#£@ßæ?%!#&€ß€#?@!&£%æ#%&€?!@£æß%ß!&€?£æ@#`` *(lien censuré)*');
}

client.on('messageCreate', async message => {
  if (message.author.bot || !containsLinks(message.content)) return;

  if (config.allowedLinkChannels?.includes(message.channel.id)) return;

  try {
    const originalContent = message.content;
    const censoredContent = censorLinks(originalContent);

    await message.delete();

    await message.author.send({
      embeds: [
        new Discord.EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('⚠️ Lien supprimé')
          .setDescription(config.linkFilter.warningMessage)
          .addFields(
            { name: 'Salon', value: message.channel.toString(), inline: true },
            { name: 'Message original', value: censoredContent, inline: false }
          )
      ]
    }).catch(() => console.log(`Impossible d'envoyer un DM à ${message.author.tag}`));

    const logChannel = message.guild.channels.cache.get(config.linkFilter.logChannelId);
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new Discord.EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🔗 Lien supprimé')
            .setDescription(`Un message contenant un lien a été supprimé`)
            .addFields(
              { name: 'Auteur', value: message.author.toString(), inline: true },
              { name: 'Salon', value: message.channel.toString(), inline: true },
              { name: 'Message', value: censoredContent, inline: false }
            )
            .setThumbnail(message.author.displayAvatarURL())
            .setTimestamp()
        ]
      });
    }

  } catch (error) {
    console.error('Erreur lors de la suppression de lien:', error);
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  const { voiceChannels } = config;
  if (!voiceChannels?.creationChannelId) return;

  try {
    if (newState.channelId === voiceChannels.creationChannelId) {
      const member = newState.member;
      if (!member) return;

      const channel = await newState.guild.channels.create({
        name: `vocal-${member.user.username}`.substring(0, 32),
        type: Discord.ChannelType.GuildVoice,
        parent: voiceChannels.categoryId || null,
        permissionOverwrites: [
          {
            id: newState.guild.id,
            deny: [Discord.PermissionFlagsBits.ViewChannel, 
                  Discord.PermissionFlagsBits.Connect]
          },
          {
            id: member.id,
            allow: [Discord.PermissionFlagsBits.ViewChannel,
                   Discord.PermissionFlagsBits.Connect,
                   Discord.PermissionFlagsBits.Speak]
          },
          {
            id: voiceChannels.allowedRoleId,
            allow: [Discord.PermissionFlagsBits.ViewChannel,
                   Discord.PermissionFlagsBits.Connect]
          }
        ]
      });

      console.log(`✅ Salon créé pour ${member.user.tag}`);
      await member.voice.setChannel(channel);

      const deleteIfEmpty = async () => {
        try {
          const fetchedChannel = await newState.guild.channels.fetch(channel.id);
          if (fetchedChannel && fetchedChannel.members.size === 0) {
            await fetchedChannel.delete();
            console.log(`🗑️ Salon ${fetchedChannel.name} supprimé (vide)`);
            return true;
          }
        } catch (error) {
          console.error('Erreur vérification salon:', error);
        }
        return false;
      };

      const interval = setInterval(async () => {
        if (await deleteIfEmpty()) {
          clearInterval(interval);
        }
      }, 30000);

      deleteIfEmpty();
    }

    if (oldState.channel && oldState.channelId !== voiceChannels.creationChannelId) {
      try {
        const fetchedChannel = await oldState.guild.channels.fetch(oldState.channelId);
        if (fetchedChannel && 
            fetchedChannel.name.startsWith('vocal-') && 
            fetchedChannel.members.size === 0) {
          await fetchedChannel.delete();
          console.log(`🗑️ Salon ${fetchedChannel.name} supprimé (vide)`);
        }
      } catch (error) {
        console.error('Erreur suppression salon:', error);
      }
    }

  } catch (error) {
    console.error('❌ Erreur voiceStateUpdate:', error);
  }
});

function sendTicketMessage(channel) {
  const embed = new Discord.EmbedBuilder()
    .setColor(0xfae3d6)
    .setTitle('🎫 Système de Tickets')
    .setDescription('Ouvrez un ticket en sélectionnant une option ci-dessous :')
    .addFields(
      { name: '🆘 Demande d\'aide', value: 'Pour toute question ou problème', inline: true },
      { name: '🤝 Demande de partenariat', value: 'Pour proposer un partenariat', inline: true },
      { name: '🛒 Achat d\'un produit', value: 'Pour commander un produit', inline: true }
    )
    .setFooter({ text: 'Nebula Ticket System' });

  const selectMenu = new Discord.StringSelectMenuBuilder()
    .setCustomId('ticket_select')
    .setPlaceholder('Sélectionnez une option')
    .addOptions(
      {
        label: 'Demande d\'aide',
        description: 'Ouvrir un ticket pour une demande d\'aide',
        value: 'help'
      },
      {
        label: 'Demande de partenariat',
        description: 'Ouvrir un ticket pour un partenariat',
        value: 'partnership'
      },
      {
        label: 'Achat d\'un produit',
        description: 'Ouvrir un ticket pour un achat',
        value: 'purchase'
      }
    );

  const actionRow = new Discord.ActionRowBuilder().addComponents(selectMenu);
  channel.send({ embeds: [embed], components: [actionRow] });
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === 'ticket_select') {
    const value = interaction.values[0];
    const user = interaction.user;
    const guild = interaction.guild;

    const existingChannel = guild.channels.cache.find(ch => 
      ch.name.startsWith(value) && ch.topic === user.id
    );

    if (existingChannel) {
      return interaction.reply({
        content: `Vous avez déjà un ticket ouvert: ${existingChannel}`,
        ephemeral: true
      });
    }

    let categoryId, ticketName;
    switch (value) {
      case 'help':
        categoryId = config.ticket.categories.help;
        ticketName = `aide-${user.username}`;
        break;
      case 'partnership':
        categoryId = config.ticket.categories.partnership;
        ticketName = `partenariat-${user.username}`;
        break;
      case 'purchase':
        categoryId = config.ticket.categories.purchase;
        ticketName = `achat-${user.username}`;
        break;
    }

    try {
      const channel = await guild.channels.create({
        name: ticketName,
        type: Discord.ChannelType.GuildText,
        parent: categoryId,
        topic: user.id,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [Discord.PermissionFlagsBits.ViewChannel]
          },
          {
            id: user.id,
            allow: [
              Discord.PermissionFlagsBits.ViewChannel,
              Discord.PermissionFlagsBits.SendMessages,
              Discord.PermissionFlagsBits.AttachFiles
            ]
          },
          {
            id: config.ticket.staffRoleId,
            allow: [
              Discord.PermissionFlagsBits.ViewChannel,
              Discord.PermissionFlagsBits.SendMessages,
              Discord.PermissionFlagsBits.AttachFiles,
              Discord.PermissionFlagsBits.ManageMessages
            ]
          }
        ]
      });

      const embed = new Discord.EmbedBuilder()
        .setColor(0xfae3d6)
        .setTitle(`Ticket ${getTicketType(value)}`)
        .setDescription(`Merci d'avoir ouvert un ticket! Le staff va vous répondre bientôt.\n\nPour fermer ce ticket, utilisez la commande \`/close\``)
        .setFooter({ text: 'Nebula Ticket System' });

      const staffRole = guild.roles.cache.get(config.ticket.staffRoleId);
      await channel.send({
        content: `${staffRole ? staffRole.toString() : '@Staff'} | ${user.toString()}`,
        embeds: [embed]
      });

      interaction.reply({
        content: `Votre ticket a été créé: ${channel}`,
        ephemeral: true
      });
    } catch (error) {
      console.error(error);
      interaction.reply({
        content: 'Une erreur est survenue lors de la création du ticket.',
        ephemeral: true
      });
    }
  }
});

function getTicketType(value) {
  switch (value) {
    case 'help': return 'Demande d\'aide';
    case 'partnership': return 'Demande de partenariat';
    case 'purchase': return 'Achat d\'un produit';
    default: return '';
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'rep') {
    const subCommand = args[0]?.toLowerCase();
    
    if (subCommand === 'vente') {
        try {
            if (args.length < 6) {
                return await message.reply({
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle('❌ Utilisation incorrecte')
                            .setDescription('**Utilisation:** `/rep vente @vendeur quantité item prix moyen_paiement note/5 [commentaire]`\n**Exemple:** `/rep vente @John 2 Nitro 10€ PayPal 5/5 Excellent vendeur!`')
                    ]
                });
            }

            const seller = message.mentions.users.first();
            if (!seller) {
                return await message.reply({
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle('❌ Vendeur non mentionné')
                            .setDescription('Vous devez mentionner le vendeur (@vendeur) en premier argument')
                    ]
                });
            }

            if (seller.bot) {
                return await message.reply({
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle('❌ Action impossible')
                            .setDescription('Vous ne pouvez pas donner un avis à un bot')
                    ]
                });
            }

            if (seller.id === message.author.id) {
                return await message.reply({
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle('❌ Auto-évaluation')
                            .setDescription('Vous ne pouvez pas vous donner un avis à vous-même')
                    ]
                });
            }

            const quantity = parseInt(args[2]);
            const item = args[3];
            const price = args[4];
            const paymentMethod = args[5];
            let note = args[6];
            let comment = args.slice(7).join(' ') || 'Aucun commentaire';

            if (isNaN(quantity) || quantity < 1) {
                return await message.reply({
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle('❌ Quantité invalide')
                            .setDescription('La quantité doit être un nombre supérieur à 0')
                    ]
                });
            }

            if (!note || !note.includes('/5')) {
                return await message.reply({
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle('❌ Format de note invalide')
                            .setDescription('La note doit être sous la forme X/5 (ex: 5/5)')
                    ]
                });
            }

            const noteValue = parseFloat(note.split('/')[0]);
            if (isNaN(noteValue) || noteValue < 1 || noteValue > 5) {
                return await message.reply({
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle('❌ Note invalide')
                            .setDescription('La note doit être un nombre entre 1 et 5 (ex: 4.5/5)')
                    ]
                });
            }

            await SellerReview.create({
                sellerId: seller.id,
                buyerId: message.author.id,
                item: item,
                quantity: quantity,
                price: price,
                paymentMethod: paymentMethod,
                note: noteValue,
                comment: comment,
                guildId: message.guild.id,
                createdAt: new Date()
            });

            const stars = '★'.repeat(Math.round(noteValue)) + '☆'.repeat(5 - Math.round(noteValue));
            const embed = new Discord.EmbedBuilder()
                .setColor(0xfae3d6)
                .setTitle(`📝 Avis enregistré - ${seller.username}`)
                .setDescription(`**Acheteur:** ${message.author}\n**Vendeur:** ${seller}\n\n**Détails de la transaction:**`)
                .addFields(
                    { name: '🛒 Item', value: item, inline: true },
                    { name: '📦 Quantité', value: quantity.toString(), inline: true },
                    { name: '💶 Prix', value: price, inline: true },
                    { name: '💳 Paiement', value: paymentMethod, inline: true },
                    { name: '⭐ Note', value: `${stars} (${noteValue.toFixed(1)}/5)`, inline: true },
                    { name: '📝 Commentaire', value: comment, inline: false }
                )
                .setFooter({ 
                    text: `Avis déposé par ${message.author.tag}`, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

            try {
                const dmEmbed = new Discord.EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('⭐ Nouvel avis reçu!')
                    .setDescription(`${message.author} vous a donné ${noteValue.toFixed(1)}/5 pour votre vente!`)
                    .addFields(
                        { name: 'Item', value: item, inline: true },
                        { name: 'Quantité', value: quantity.toString(), inline: true },
                        { name: 'Note', value: `${stars} (${noteValue.toFixed(1)}/5)`, inline: true },
                        { name: 'Commentaire', value: comment || 'Aucun commentaire', inline: false }
                    )
                    .setFooter({ text: `Merci pour votre transaction sur ${message.guild.name}!` });

                await seller.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.error(`Impossible d'envoyer la notification au vendeur: ${error}`);
            }

            await message.delete().catch(console.error);

        } catch (error) {
            console.error('Erreur dans la commande rep vente:', error);
            await message.reply({
                embeds: [
                    new Discord.EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle('❌ Erreur')
                        .setDescription('Une erreur est survenue lors de l\'enregistrement de votre avis')
                ]
            });
        }
    }
}

  if (command === 'topreseller') {
    try {
        const sellersStats = await SellerReview.findAll({
            attributes: [
                'sellerId',
                [sequelize.fn('AVG', sequelize.col('note')), 'moyenne'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'nbVentes']
            ],
            group: ['sellerId'],
            order: [
                [sequelize.literal('moyenne'), 'DESC'],
                [sequelize.literal('nbVentes'), 'DESC']
            ],
            limit: 10
        });

        if (sellersStats.length === 0) {
            return message.reply({
                embeds: [
                    new Discord.EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle('❌ Aucun vendeur trouvé')
                        .setDescription('Aucun avis de vente enregistré.')
                ]
            });
        }

        const sellersWithUsers = await Promise.all(
            sellersStats.map(async stat => {
                try {
                    const user = await client.users.fetch(stat.sellerId);
                    return {
                        user,
                        moyenne: parseFloat(stat.dataValues.moyenne),
                        nbVentes: stat.dataValues.nbVentes
                    };
                } catch (error) {
                    console.error(`Erreur fetch user ${stat.sellerId}:`, error);
                    return null;
                }
            })
        );

        const validSellers = sellersWithUsers.filter(s => s !== null);

        const embed = new Discord.EmbedBuilder()
            .setColor(0xfae3d6)
            .setTitle('🏆 Top des vendeurs')
            .setDescription('Classement basé sur les notes moyennes et le nombre de ventes')
            .setThumbnail('https://cdn.discordapp.com/emojis/892292745916481546.png?size=96');

        validSellers.forEach((seller, index) => {
            embed.addFields({
                name: `#${index + 1} ${seller.user.username}`,
                value: `⭐ Moyenne: ${seller.moyenne.toFixed(2)}/5\n🛒 Ventes: ${seller.nbVentes}`,
                inline: true
            });
        });

        await message.channel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Erreur topreseller:', error);
        await message.reply('Une erreur est survenue lors de la génération du classement.');
    }
}

  if (command === 'close') {
    if (!message.channel.name.startsWith('aide-') && 
        !message.channel.name.startsWith('partenariat-') && 
        !message.channel.name.startsWith('achat-')) {
      return message.reply('Cette commande ne peut être utilisée que dans un ticket.');
    }

    if (!message.member.permissions.has(Discord.PermissionFlagsBits.ManageMessages) && 
        !message.member.roles.cache.has(config.ticket.staffRoleId)) {
      return message.reply('Seuls les membres du staff peuvent fermer les tickets.');
    }

    const userId = message.channel.topic;
    if (!userId) {
      return message.reply('Impossible de trouver l\'utilisateur associé à ce ticket.');
    }

    try {
      const user = await client.users.fetch(userId);
      await user.send('Merci pour votre ticket, en espérant vous avoir aidé.');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message de fermeture:', error);
    }

    message.channel.send('Fermeture du ticket dans 5 secondes...');
    setTimeout(() => {
      message.channel.delete().catch(console.error);
    }, 5000);
  }
});

function getStatusEmoji(status) {
  const statusEmojis = {
    online: '🟢 En ligne',
    idle: '🌙 Inactif',
    dnd: '⛔ Ne pas déranger',
    offline: '⚫ Hors-ligne'
  };
  return statusEmojis[status] || '⚫ Inconnu';
}

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'help') {
    const embed = new Discord.EmbedBuilder()
      .setColor(0xfae3d6)
      .setTitle('📝 Aide de Nebula')
      .setDescription('Voici la liste de toutes les commandes disponibles :')
      .addFields(
        { name: '🆘 /help', value: 'Affiche ce message d\'aide', inline: false },
        { name: '🏠 /serverinfo', value: 'Affiche les informations du serveur', inline: false },
        { name: '👤 /userinfo [@membre]', value: 'Affiche les informations d\'un membre', inline: false },
        { name: '🖼️ /profile [@membre]', value: 'Affiche la photo de profil en grand', inline: false },
        { name: '🎭 /roles', value: 'Liste tous les rôles du serveur', inline: false },
        { name: '👥 /members', value: 'Liste tous les membres du serveur', inline: false },
        { name: '😀 /emojis', value: 'Affiche tous les emojis du serveur', inline: false }
      )
      .setFooter({ 
        text: `Demandé par ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      });

    return message.channel.send({ embeds: [embed] });
  }

  if (command === 'serverinfo') {
    const guild = message.guild;
    const embed = new Discord.EmbedBuilder()
      .setColor(0xfae3d6)
      .setTitle(`Informations du serveur: ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: 'Propriétaire', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Membres', value: `${guild.memberCount}`, inline: true },
        { name: 'Créé le', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'Salons', value: `${guild.channels.cache.size}`, inline: true },
        { name: 'Rôles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Niveau de boost', value: `${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true },
        { name: 'Emojis', value: `${guild.emojis.cache.size}`, inline: true },
        { name: 'Serveur ID', value: guild.id, inline: true }
      )
      .setFooter({ text: `Demandé par ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    message.channel.send({ embeds: [embed] });
  }

  if (command === 'userinfo') {
    const user = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(user.id);
    const rawStatus = member?.presence?.status || 'offline';
    const status = getStatusEmoji(rawStatus);
    const embed = new Discord.EmbedBuilder()
      .setColor(0xfae3d6)
      .setTitle(`Informations de ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: 'Tag', value: user.tag, inline: true },
        { name: 'ID', value: user.id, inline: true },
        { name: 'Compte créé le', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'A rejoint le', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : 'N/A', inline: true },
        { name: 'Statut', value: status, inline: true },
        { name: 'Rôles', value: member ? `${member.roles.cache.size - 1}` : 'N/A', inline: true },
        { name: 'Bot', value: user.bot ? 'Oui' : 'Non', inline: true },
        { name: 'Boost Nitro', value: member?.premiumSince ? `<t:${Math.floor(new Date(member.premiumSince).getTime() / 1000)}:R>` : 'Non', inline: true }
      )
      .setFooter({ text: `Demandé par ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    message.channel.send({ embeds: [embed] });
  }

  if (command === 'profile') {
    const user = message.mentions.users.first() || message.author;
    const avatarURL = user.displayAvatarURL({ dynamic: true, size: 4096 });

    const embed = new Discord.EmbedBuilder()
      .setColor(0xfae3d6)
      .setTitle(`Photo de profil de ${user.username}`)
      .setImage(avatarURL)
      .setDescription(`[Lien vers l'image](${avatarURL})`)
      .setFooter({ 
        text: `Demandé par ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      });

    message.channel.send({ embeds: [embed] });
  }

  if (command === 'role' || command === 'roles') {
    const guild = message.guild;
    const roles = guild.roles.cache
      .sort((a, b) => b.position - a.position)
      .map(role => role.toString())
      .filter(role => role !== '@everyone')
      .join('\n');

    const embed = new Discord.EmbedBuilder()
      .setColor(0xfae3d6)
      .setTitle(`Liste des rôles (${guild.roles.cache.size - 1})`)
      .setDescription(roles.length > 4096 ? 
        '⚠️ Trop de rôles à afficher (limite Discord dépassée)' : 
        roles || 'Aucun rôle disponible')
      .setFooter({ 
        text: `Demandé par ${message.author.tag}`, 
        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      });

    message.channel.send({ embeds: [embed] });
  }

  if (command === 'members' || command === 'membres') {
    const guild = message.guild;
    
    const members = guild.members.cache
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map(member => {
            const status = getStatusEmoji(member.presence?.status || 'offline');
            return `${status} ${member.toString()}`;
        });

    if (members.length === 0) {
        return message.channel.send('Aucun membre trouvé sur ce serveur.');
    }

    const chunks = [];
    let currentChunk = '';
    
    members.forEach(member => {
        const memberText = `${member}\n`;
        if ((currentChunk + memberText).length > 4096) {
            chunks.push(currentChunk);
            currentChunk = memberText;
        } else {
            currentChunk += memberText;
        }
    });
    
    if (currentChunk) chunks.push(currentChunk);

    const firstEmbed = new Discord.EmbedBuilder()
        .setColor(0xfae3d6)
        .setTitle(`📋 Membres du serveur (${members.length})`)
        .setDescription(chunks[0])
        .setFooter({ 
            text: `Page 1/${chunks.length} • Cliquez sur les mentions pour voir les profils • Demandé par ${message.author.tag}`, 
            iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        });

    message.channel.send({ embeds: [firstEmbed] }).then(msg => {
        if (chunks.length > 1) {
            msg.react('⬅️').then(() => msg.react('➡️'));
            
            const filter = (reaction, user) => 
                ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id;
            
            const collector = msg.createReactionCollector({ filter, time: 60000 });
            let currentPage = 0;

            collector.on('collect', reaction => {
                reaction.users.remove(message.author.id);
                
                if (reaction.emoji.name === '➡️' && currentPage < chunks.length - 1) {
                    currentPage++;
                } else if (reaction.emoji.name === '⬅️' && currentPage > 0) {
                    currentPage--;
                }

                const newEmbed = new Discord.EmbedBuilder()
                    .setColor(0xfae3d6)
                    .setTitle(`📋 Membres du serveur (${members.length})`)
                    .setDescription(chunks[currentPage])
                    .setFooter({ 
                        text: `Page ${currentPage + 1}/${chunks.length} • Demandé par ${message.author.tag}`, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    });

                msg.edit({ embeds: [newEmbed] });
            });

            collector.on('end', () => {
                msg.reactions.removeAll().catch(error => 
                    console.error('Erreur lors de la suppression des réactions:', error)
                );
            });
        }
    });
  }

  if (command === 'emoji' || command === 'emojis') {
    const guild = message.guild;
    const emojis = guild.emojis.cache;
    
    if (emojis.size === 0) {
      return message.channel.send('Ce serveur ne possède aucun emoji personnalisé.');
    }

    const emojiArray = Array.from(emojis.values());
    const emojiLines = [];
    const emojisPerLine = 10;
    
    for (let i = 0; i < emojiArray.length; i += emojisPerLine) {
      const line = emojiArray
        .slice(i, i + emojisPerLine)
        .map(emoji => emoji.toString())
        .join(' ');
      emojiLines.push(line);
    }

    const totalPages = Math.ceil(emojiLines.length / 10);
    let currentPage = 0;

    const createEmbed = (page) => {
      const startLine = page * 10;
      const endLine = Math.min(startLine + 10, emojiLines.length);
      const pageContent = emojiLines.slice(startLine, endLine).join('\n');
      
      return new Discord.EmbedBuilder()
        .setColor(0xfae3d6)
        .setTitle(`Emojis du serveur (${emojis.size})`)
        .setDescription(pageContent || 'Aucun emoji à afficher')
        .setFooter({ 
          text: `Page ${page + 1}/${totalPages} • Format : [emoji] • Demandé par ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        });
    };

    const msg = await message.channel.send({ embeds: [createEmbed(currentPage)] });

    if (totalPages > 1) {
      await msg.react('⬅️');
      await msg.react('➡️');
      
      const filter = (reaction, user) => 
        ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id;
      
      const collector = msg.createReactionCollector({ filter, time: 60000 });

      collector.on('collect', async reaction => {
        await reaction.users.remove(message.author.id);
        
        if (reaction.emoji.name === '➡️' && currentPage < totalPages - 1) {
          currentPage++;
        } else if (reaction.emoji.name === '⬅️' && currentPage > 0) {
          currentPage--;
        }

        await msg.edit({ embeds: [createEmbed(currentPage)] });
      });

      collector.on('end', () => {
        msg.reactions.removeAll().catch(console.error);
      });
    }
  }
});

const logEvent = async (guild, title, description, color, fields = [], thumbnail = null) => {
  const logChannel = guild.channels.cache.get(config.logs.channelId);
  if (!logChannel) return;

  const embed = new Discord.EmbedBuilder()
      .setColor(color || 0x2b2d31)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

  if (fields.length > 0) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);

  try {
      await logChannel.send({ embeds: [embed] });
  } catch (error) {
      console.error('Erreur lors de l\'envoi des logs:', error);
  }
};

client.on('messageDelete', async message => {
  if (message.author.bot || config.logs.ignoredChannels?.includes(message.channel.id)) return;

  const attachments = message.attachments.map(a => a.url).join('\n') || 'Aucune pièce jointe';
  const content = message.content || 'Message vide (peut-être uniquement des pièces jointes)';

  await logEvent(message.guild, '🗑️ Message supprimé', 
      `**Message de ${message.author} supprimé dans ${message.channel}**`,
      0xff0000,
      [
          { name: 'Contenu', value: `\`\`\`${content.slice(0, 1000)}\`\`\``, inline: false },
          { name: 'Pièces jointes', value: attachments, inline: false },
          { name: 'Auteur', value: `${message.author.tag} (${message.author.id})`, inline: true },
          { name: 'Salon', value: `${message.channel.name} (${message.channel.id})`, inline: true }
      ],
      message.author.displayAvatarURL({ dynamic: true })
  );
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (newMessage.author.bot || config.logs.ignoredChannels?.includes(newMessage.channel.id)) return;
  if (oldMessage.content === newMessage.content) return;

  await logEvent(newMessage.guild, '📝 Message édité', 
      `**Message de ${newMessage.author} édité dans ${newMessage.channel}**`,
      0xffff00,
      [
          { name: 'Ancien contenu', value: `\`\`\`${oldMessage.content?.slice(0, 1000) || 'Message vide'}\`\`\``, inline: false },
          { name: 'Nouveau contenu', value: `\`\`\`${newMessage.content.slice(0, 1000)}\`\`\``, inline: false },
          { name: 'Auteur', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
          { name: 'Salon', value: `${newMessage.channel.name} (${newMessage.channel.id})`, inline: true },
          { name: 'Lien', value: `[Aller au message](${newMessage.url})`, inline: false }
      ],
      newMessage.author.displayAvatarURL({ dynamic: true })
  );
});

client.on('guildMemberAdd', async member => {
  const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
  
  await logEvent(member.guild, '👋 Nouveau membre', 
      `${member.user} a rejoint le serveur!`,
      0x00ff00,
      [
          { name: 'Compte créé il y a', value: `${accountAge} jours`, inline: true },
          { name: 'ID', value: member.user.id, inline: true },
          { name: 'Bot', value: member.user.bot ? 'Oui' : 'Non', inline: true }
      ],
      member.user.displayAvatarURL({ dynamic: true })
  );
});

client.on('guildMemberRemove', async member => {
  const { welcome } = config;
  
  if (!welcome?.privateGoodbyeMessage) return;

  try {
      const message = welcome.privateGoodbyeMessage
          .replace('{user}', member.user.username)
          .replace('{server}', member.guild.name);

      await member.send({
          embeds: [new Discord.EmbedBuilder()
              .setColor('#FF0000')
              .setDescription(message)
              .setThumbnail(member.guild.iconURL({ dynamic: true }))
          ]
      }).catch(error => {
          if (error.code !== 50007) {
              console.error('❌ Erreur lors de l\'envoi du message d\'au revoir:', error);
          }
      });
      
      console.log(`✅ Tentative d'envoi du message d'au revoir à ${member.user.tag}`);

  } catch (error) {
      if (error.code !== 50007) {
          console.error('❌ Erreur lors de l\'envoi du message d\'au revoir:', error);
      }

      const logChannel = member.guild.channels.cache.get(config.logs?.channelId);
      if (logChannel) {
          await logChannel.send(`Impossible d'envoyer le message d'au revoir à ${member.user.tag} (DMs probablement fermés)`).catch(console.error);
      }
  }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (oldMember.nickname !== newMember.nickname) {
      await logEvent(newMember.guild, '🏷️ Changement de pseudo', 
          `${newMember.user}`,
          0x00ffff,
          [
              { name: 'Ancien pseudo', value: oldMember.nickname || 'Aucun', inline: true },
              { name: 'Nouveau pseudo', value: newMember.nickname || 'Aucun', inline: true },
              { name: 'ID', value: newMember.user.id, inline: true }
          ],
          newMember.user.displayAvatarURL({ dynamic: true })
      );
  }

  if (!oldMember.roles.cache.equals(newMember.roles.cache)) {
      const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

      if (addedRoles.size > 0 || removedRoles.size > 0) {
          await logEvent(newMember.guild, '🎭 Changement de rôles', 
              `${newMember.user}`,
              0xffa500,
              [
                  { name: 'Rôles ajoutés', value: addedRoles.map(r => r.name).join(', ') || 'Aucun', inline: false },
                  { name: 'Rôles retirés', value: removedRoles.map(r => r.name).join(', ') || 'Aucun', inline: false },
                  { name: 'ID', value: newMember.user.id, inline: true }
              ],
              newMember.user.displayAvatarURL({ dynamic: true })
          );
      }
  }
});

client.on('channelCreate', async channel => {
  if (channel.type === Discord.ChannelType.GuildCategory) return;

  await logEvent(channel.guild, '➕ Salon créé', 
      `**${channel.name}** (${channel.type === Discord.ChannelType.GuildText ? 'Textuel' : 'Vocal'})`,
      0x00ff00,
      [
          { name: 'ID', value: channel.id, inline: true },
          { name: 'Catégorie', value: channel.parent?.name || 'Aucune', inline: true }
      ]
  );
});

client.on('channelDelete', async channel => {
  if (channel.type === Discord.ChannelType.GuildCategory) return;

  await logEvent(channel.guild, '➖ Salon supprimé', 
      `**${channel.name}** (${channel.type === Discord.ChannelType.GuildText ? 'Textuel' : 'Vocal'})`,
      0xff0000,
      [
          { name: 'ID', value: channel.id, inline: true },
          { name: 'Catégorie', value: channel.parent?.name || 'Aucune', inline: true }
      ]
  );
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
  if (oldChannel.type === Discord.ChannelType.GuildCategory) return;

  const changes = [];
  
  if (oldChannel.name !== newChannel.name) {
      changes.push({ name: 'Nom', value: `${oldChannel.name} → ${newChannel.name}`, inline: true });
  }
  
  if (oldChannel.parent?.id !== newChannel.parent?.id) {
      changes.push({ 
          name: 'Catégorie', 
          value: `${oldChannel.parent?.name || 'Aucune'} → ${newChannel.parent?.name || 'Aucune'}`,
          inline: true 
      });
  }

  if (changes.length > 0) {
      await logEvent(newChannel.guild, '✏️ Salon modifié', 
          `**${newChannel.name}** (${newChannel.type === Discord.ChannelType.GuildText ? 'Textuel' : 'Vocal'})`,
          0xffff00,
          changes.concat([{ name: 'ID', value: newChannel.id, inline: true }])
      );
  }
});

client.on('roleCreate', async role => {
  await logEvent(role.guild, '➕ Rôle créé', 
      `**${role.name}**`,
      0x00ff00,
      [
          { name: 'Couleur', value: role.hexColor, inline: true },
          { name: 'ID', value: role.id, inline: true }
      ]
  );
});

client.on('roleDelete', async role => {
  await logEvent(role.guild, '➖ Rôle supprimé', 
      `**${role.name}**`,
      0xff0000,
      [
          { name: 'ID', value: role.id, inline: true }
      ]
  );
});

client.on('roleUpdate', async (oldRole, newRole) => {
  const changes = [];
  
  if (oldRole.name !== newRole.name) {
      changes.push({ name: 'Nom', value: `${oldRole.name} → ${newRole.name}`, inline: true });
  }
  
  if (oldRole.hexColor !== newRole.hexColor) {
      changes.push({ name: 'Couleur', value: `${oldRole.hexColor} → ${newRole.hexColor}`, inline: true });
  }
  
  if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
      const addedPerms = newRole.permissions.toArray().filter(p => !oldRole.permissions.has(p));
      const removedPerms = oldRole.permissions.toArray().filter(p => !newRole.permissions.has(p));
      
      if (addedPerms.length > 0) {
          changes.push({ name: 'Permissions ajoutées', value: addedPerms.join(', '), inline: false });
      }
      if (removedPerms.length > 0) {
          changes.push({ name: 'Permissions retirées', value: removedPerms.join(', '), inline: false });
      }
  }

  if (changes.length > 0) {
      await logEvent(newRole.guild, '✏️ Rôle modifié', 
          `**${newRole.name}**`,
          0xffff00,
          changes.concat([{ name: 'ID', value: newRole.id, inline: true }])
      );
  }
});

client.on('guildBanAdd', async ban => {
  await logEvent(ban.guild, '🔨 Membre banni', 
      `${ban.user}`,
      0xff0000,
      [
          { name: 'Raison', value: ban.reason || 'Aucune raison spécifiée', inline: false },
          { name: 'ID', value: ban.user.id, inline: true }
      ],
      ban.user.displayAvatarURL({ dynamic: true })
  );
});

client.on('guildBanRemove', async ban => {
  await logEvent(ban.guild, '🔓 Membre débanni', 
      `${ban.user}`,
      0x00ff00,
      [
          { name: 'ID', value: ban.user.id, inline: true }
      ],
      ban.user.displayAvatarURL({ dynamic: true })
  );
});

client.on('inviteCreate', async invite => {
  await logEvent(invite.guild, '📩 Invitation créée', 
      `**Code:** ${invite.code}`,
      0x00ff00,
      [
          { name: 'Créée par', value: invite.inviter?.toString() || 'Inconnu', inline: true },
          { name: 'Salon', value: invite.channel.toString(), inline: true },
          { name: 'Expire le', value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Jamais', inline: true },
          { name: 'Utilisations max', value: invite.maxUses?.toString() || 'Illimité', inline: true }
      ]
  );
});

client.on('inviteDelete', async invite => {
  await logEvent(invite.guild, '🗑️ Invitation supprimée', 
      `**Code:** ${invite.code}`,
      0xff0000,
      [
          { name: 'Créée par', value: invite.inviter?.toString() || 'Inconnu', inline: true },
          { name: 'Salon', value: invite.channel.toString(), inline: true }
      ]
  );
});

client.on('guildMemberAdd', async member => {
  const { welcome } = config;
  if (!welcome?.channelId) return;

  const welcomeChannel = member.guild.channels.cache.get(welcome.channelId);
  if (welcomeChannel) {
      const welcomeMessage = welcome.message
          .replace('{user}', member.toString())
          .replace('{server}', member.guild.name);

      const embed = new Discord.EmbedBuilder()
          .setColor(welcome.embedColor || 0xFFA500)
          .setTitle(`🎉 Bienvenue sur ${member.guild.name} !`)
          .setDescription(welcomeMessage)
          .setThumbnail(welcome.thumbnail || member.guild.iconURL({ dynamic: true }))
          .setImage(welcome.image || null)
          .setFooter({ text: `Nous sommes maintenant ${member.guild.memberCount} membres !` })
          .setTimestamp();

      welcomeChannel.send({ 
          content: member.toString(),
          embeds: [embed] 
      }).catch(console.error);
  }

  try {
      const privateMessage = welcome.privateMessage
          .replace('{user}', member.user.username)
          .replace('{server}', member.guild.name);

      const dmEmbed = new Discord.EmbedBuilder()
          .setColor(welcome.embedColor || 0xFFA500)
          .setTitle(`🎉 Bienvenue sur ${member.guild.name} !`)
          .setDescription(privateMessage)
          .setThumbnail(welcome.thumbnail || member.guild.iconURL({ dynamic: true }))
          .setImage(welcome.image || null)
          .setFooter({ text: 'Passe un bon moment parmi nous !' });

      await member.send({ embeds: [dmEmbed] });
  } catch (error) {
      console.error('Impossible d\'envoyer le message de bienvenue en DM:', error);
  }

  const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
  logEvent(member.guild, '👋 Nouveau membre', 
      `${member.user} a rejoint le serveur!`,
      0x00ff00,
      [
          { name: 'Compte créé il y a', value: `${accountAge} jours`, inline: true },
          { name: 'ID', value: member.user.id, inline: true },
          { name: 'Bot', value: member.user.bot ? 'Oui' : 'Non', inline: true }
      ],
      member.user.displayAvatarURL({ dynamic: true })
  );
});


client.login(config.token);
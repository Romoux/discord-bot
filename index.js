//Les constante principal\\


const Discord = require("discord.js")
const Bot = new Discord.Client;
const data = require("./data.json")
const ytdl = require("ytdl-core");

//Prefix\\
const prefix = data.prefix

//Token\\
Bot.login(process.env.TOKEN);

//Port\\

const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))


//Connection au bot + status\\
Bot.on('ready', () => {
        console.log(`connecter au bot : ${Bot.user.tag}`)
    setInterval(() => {
      const TargetGuild = Bot.guilds.cache.get('754286518759325786');
      if(TargetGuild) {
        Bot.user.setActivity(`${TargetGuild.memberCount} membres.`, {
            type:"STREAMING",
            url: "https://www.twitch.tv/romou_x"
        })
                .then(console.log)
                .catch(console.error);
      }
    }, 1000*60*5);

});

//Ping + server + avatar\\
Bot.on('message', async(message)  => {
    if (message.content === prefix+'ping') {
        message.delete();
        let début = Date.now();
        await message.channel.send("Ping en cour . . . .").then(async(m) => 
        await m.edit(`:ping_pong: Pong : ${Date.now() - début} ms`))
        message.channel.send("- " + `**${message.author}**`); 
    
    }else if (message.content === prefix+'server') {
        message.delete();
        message.channel.send(`Nom du serveur : **__${message.guild.name}__**\n Nombre d'utilistateurs : **__${message.guild.memberCount}__**`)

    }else if (message.content === prefix+'avatar') {
        message.delete();
        if (!message.mentions.users.size) {
            return message.channel.send(`Votre avatar est : ${message.author.displayAvatarURL({ format: 'gif'})}`) | message.channel.send(`Votre avatar est : ${message.author.displayAvatarURL({ format: 'png'})}`)
        }

    }
});

//Help\\
Bot.on('message', async(message) => {
    if (message.content === prefix+'support') {
        message.delete();
        const TargetGuild = Bot.guilds.cache.get('754286518759325786');
        let embed = new Discord.MessageEmbed()
            .setColor('#7717e0')
            .setTitle('Voici toute mes commandes que je possède')
            .setImage(TargetGuild.discoverySplashURL())
            .setDescription(`Voici toute mes commande commençant par le prefix **__d!__** : 
            
            __Les commandes basique__ : 
            
            - d!avatar : pour voir de ton avatar (bug mais fonctionnel).
            - d!server : pour voir le nombre de membre (bot + membre) du server.
            - d!ping : pour voir t'a latence.
            - d!say : pour que je parle a ta place.
            __Les commandes musique__ :
            - d!play + lien youtube : mettre du son dans le vocal.
            - d!skip : skipper ta musique.
            - d!stop : pour arrêter la musique.
            
            __Les autres commandes__ 
            
            - d!support : pour afficher ce menu.
            
            **__COMMANDE A VENIR__** 
            
            - La commande memberCount
            - Les commandes rp.`)

            .setTimestamp()
            .setFooter(message.author.username);
            message.channel.send(embed);
    }
});

//Say\\

Bot.on('message', message  => {
    if (message.content.startsWith(prefix+'say')) {
      message.delete();
        if (message.author.bot) return;
        const SayMessage = message.content.slice(5).trim();
        message.channel.send("**" + SayMessage + "**")
        message.channel.send("- " + `**${message.author}**`)
    }
});

//Musique\\
const queue = new Map();

Bot.once("ready", () => {
  console.log("Ready!");
});

Bot.once("reconnecting", () => {
  console.log("Reconnecting!");
});

Bot.once("disconnect", () => {
  console.log("Disconnect!");
});

Bot.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;

};

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
   };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
    
  if (!serverQueue)
    return message.channel.send("There is no song that I could stop!");
    
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);



}});
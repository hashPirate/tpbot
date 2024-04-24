const fs = require('fs');
const mineflayer = require('mineflayer');
const axios = require('axios');
const Discord = require('discord.js');
const { Vec3 } = require('vec3');

const webhookUrl = 'https://discord.com/api/webhooks/1232449849883103292/L8VoX5ZiYVbNwjOKfe1goVQ25ASlcDgGAgyWxPoprUb1XfzTwk4SJZpZ6g1CzC4sDUgt';
const namesniped = fs.readFileSync('bot.txt', 'utf8').trim().split('/');
const username = namesniped[0];
const password = namesniped[1];

let bot = mineflayer.createBot({
  host: '0b0t.org',
  port: 25565,
  version: '1.14.2',
  username: username,
  password: password,
  auth: 'microsoft'
});

const discordBot = new Discord.Client({
  allowedMentions: {
      parse: [
          'users',
          'roles'
      ],
      repliedUser: true
  },
  autoReconnect: true,
  disabledEvents: [
      "TYPING_START"
  ],
  partials: [
      Discord.Partials.Channel,
      Discord.Partials.GuildMember,
      Discord.Partials.Message,
      Discord.Partials.Reaction,
      Discord.Partials.User,
      Discord.Partials.GuildScheduledEvent
  ],
  intents: [
      Discord.GatewayIntentBits.Guilds,
      Discord.GatewayIntentBits.GuildMembers,
      Discord.GatewayIntentBits.GuildBans,
      Discord.GatewayIntentBits.GuildEmojisAndStickers,
      Discord.GatewayIntentBits.GuildIntegrations,
      Discord.GatewayIntentBits.GuildWebhooks,
      Discord.GatewayIntentBits.GuildInvites,
      Discord.GatewayIntentBits.GuildVoiceStates,
      Discord.GatewayIntentBits.GuildMessages,
      Discord.GatewayIntentBits.GuildMessageReactions,
      Discord.GatewayIntentBits.GuildMessageTyping,
      Discord.GatewayIntentBits.DirectMessages,
      Discord.GatewayIntentBits.DirectMessageReactions,
      Discord.GatewayIntentBits.DirectMessageTyping,
      Discord.GatewayIntentBits.GuildScheduledEvents,
      Discord.GatewayIntentBits.MessageContent
  ],
  restTimeOffset: 0
});

discordBot.login('MTIzMjQ1MDExODc2NzA4NzY0Ng.GcHDuK.PAKKlpmXhJyl2olSUEL4R4RFqf1k6Jag-V7i2I');

discordBot.on('ready', () => {
  console.log(`Discord bot logged in as ${discordBot.user.tag}`);
});
function loadTPUUIDs() {
  const tpuuidsRaw = fs.readFileSync('tpuuid.txt', 'utf8').trim().split('\n');
  const tpuuids = tpuuidsRaw.map(uuid => uuid.replace(/\r$/, '')); // Remove '\r' from each UUID
  console.log('TPUUIDs:', tpuuids); // Log the modified UUIDs
  return tpuuids;
}
let isCrouching = false;
let isSprintingJumping = false;
let followingPlayer = null;
let followDistance = 5; // Default follow distance in blocks
let currentMessage = null;
let sprintFollow = false;
let stalkedPlayer = null;
let tpuuids = loadTPUUIDs();

discordBot.on('messageCreate', (message) => {
  if (message.author.bot) return; // Ignore messages from other bots
  const desiredChannelID = '1232449818773950478'
  if(message.content.startsWith('!')) {
    currentMessage = message;
    if (message.content === "!playerlist") {
    const playerNames = Object.values(bot.players).map(player => player.username);
    const playerListMessage = playerNames.join(', ');
    message.channel.send(playerListMessage);
}

   if(message.content === "!sneak" || message.content === '!shift'){
      if (!isCrouching) {
            bot.setControlState('sneak', true);
            isCrouching = true;
            message.channel.send("Bot is sneaking!")
   }
 }

    if(message.content === "!stand"){
            if (isCrouching) {
            bot.setControlState('sneak', false);
            isCrouching = false;
            message.channel.send("Bot is standing!")
   }

}

 if (message.content === "!sprintjump") {
      if (!isSprintingJumping) {
        bot.setControlState('sprint', true); // Enable sprinting
        bot.setControlState('forward', true)
        bot.setControlState('jump', true);   // Enable jumping
        isSprintingJumping = true;
        message.channel.send("Started SprintJumping.")
      } else {
        bot.setControlState('sprint', false); // Disable sprinting
        bot.setControlState('forward', false)
        bot.setControlState('jump', false);   // Disable jumping
        isSprintingJumping = false;
        message.channel.send("Stopped SprintJumping.")
      }
    }

    if (message.content.startsWith('!rapidsneak') || message.content.startsWith('!rapidshift')) {
  const args = message.content.split(' ');
  if (args.length !== 3) {
    message.channel.send('Invalid usage! Correct usage: !rapidsneak <delay> <duration>');
    return;
  }
  
  const delay = parseInt(args[1]);
  const duration = parseInt(args[2]);
  
  if (isNaN(delay) || isNaN(duration)) {
    message.channel.send('Invalid delay or duration values. Please provide valid numbers.');
    return;
  }
  
  // Call a function to perform rapid sneaking and unsneaking
  performRapidSneak(bot, delay, duration);
}

if (message.content.startsWith('!lookat')) {
  const args = message.content.split(' ');
  if (args.length !== 2) {
    message.channel.send('Invalid usage! Correct usage: !lookat <playerName>|nearest');
    return;
  }

  const target = args[1];
  if (target.toLowerCase() === 'nearest') {
    const nearestPlayer = findNearestPlayer(bot);
    if (nearestPlayer) {
      lookAtPlayer(bot, nearestPlayer, message);
    } else {
      message.channel.send('No players are online to look at.');
    }
  } else {
    lookAtPlayer(bot, target, message);
  }
}

if (message.content.startsWith('!follow')) {
  sprintFollow = false;
  const args = message.content.split(' ');
  if (args.length !== 3) {
    message.channel.send('Invalid usage! Correct usage: !follow <playerName> <distance>');
    return;
  }

  const targetPlayer = args[1];
  const newFollowDistance = parseFloat(args[2]);

  if (isNaN(newFollowDistance) || newFollowDistance <= 0) {
    message.channel.send('Invalid distance value. Please provide a valid number greater than 0.');
    return;
  }

  // Stop following the current player if already following
  if (followingPlayer) {
    followingPlayer = null;
    message.channel.send('Stopped following the previous player.');
  }

  followingPlayer = targetPlayer;
  followDistance = newFollowDistance;

  message.channel.send(`Now following ${targetPlayer} while maintaining a distance of ${followDistance} blocks.`);
}

if (message.content.startsWith('!sprintfollow')) {
  sprintFollow = true;
  const args = message.content.split(' ');
  if (args.length !== 3) {
    message.channel.send('Invalid usage! Correct usage: !sprintfollow <playerName> <distance>');
    return;
  }

  const targetPlayer = args[1];
  const newFollowDistance = parseFloat(args[2]);

  if (isNaN(newFollowDistance) || newFollowDistance <= 0) {
    message.channel.send('Invalid distance value. Please provide a valid number greater than 0.');
    return;
  }

  // Stop following the current player if already following
  if (followingPlayer) {
    followingPlayer = null;
    message.channel.send('Stopped following the previous player.');
  }

  followingPlayer = targetPlayer;
  followDistance = newFollowDistance;

  message.channel.send(`Now speedily following ${targetPlayer} while maintaining a distance of ${followDistance} blocks.`);
}

if (message.content === '!stopfollow') {
  if (followingPlayer) {
    followingPlayer = null;
    bot.setControlState('jump', false);
    bot.setControlState('forward', false);
    message.channel.send('Stopped following all players.');
  } else {
    message.channel.send('The bot is not currently following any players.');
  }
}
if (message.content === '!spawn') {
bot.chat("/spawn");
message.channel.send("Bot is now at spawn!")

}
if (message.content.startsWith('!stalk')) {
  const args = message.content.split(' ');
  if (args.length !== 2) {
    message.channel.send('Invalid usage! Correct usage: !stalk <playerName>');
    return;
  }

  const targetPlayer = args[1];
  stalkedPlayer = targetPlayer;
  lookAtPlayer(bot, stalkedPlayer, message);
  message.channel.send(`Now stalking ${targetPlayer}.`);
}

if (message.content === '!stopstalk') {
  if (stalkedPlayer) {
    stalkedPlayer = null;
    message.channel.send('Stopped stalking.');
  } else {
    message.channel.send('The bot is not currently stalking any players.');
  }
}
  }

  


  if (message.channel.id === desiredChannelID && !message.content.startsWith('!') && !message.content.includes('NIGGER') && !message.content.includes('NIGGA')) {
    let chatMessage = message.content;
    if (chatMessage.startsWith('\\')) {
     chatMessage = chatMessage.substring(1);
    }
    bot.chat(chatMessage); // Send the Discord message to Minecraft server chat
    console.log(`Sent message: ${chatMessage}`)
  }
});

let proxyList = []; // Array to store the list of proxies
let proxyIndex = 0; // Current index to keep track of the current proxy being used


// Function to get the current proxy
function getCurrentProxy() {
  return proxyList[proxyIndex % proxyList.length];
}

// Function to switch to the next proxy after every 10 messages sent
function switchProxy() {
  proxyIndex++;
}
bot.on('playerJoined', (player) => {
  const playerName = player.username;
  const timestamp = getCurrentTimestamp();
  storePlayerJoinTime(playerName, timestamp);
});

bot.on('playerLeft', (player) => {
  const playerName = player.username;
  const timestamp = getCurrentTimestamp();
  storePlayerLeaveTime(playerName, timestamp);
});
bot.on('physicsTick', () => {

  if (stalkedPlayer) {
    const player = bot.players[stalkedPlayer];
    if (player && player.entity) {
      const targetPosition = player.entity.position.offset(0, player.entity.height, 0);
      bot.lookAt(targetPosition);
    } else {
      stalkedPlayer = null;
    }
  }
  if (followingPlayer) {
    const targetPlayer = bot.players[followingPlayer];
    if (targetPlayer && targetPlayer.entity) {
      const targetPosition = targetPlayer.entity.position;
      const botPosition = bot.entity.position;

      // Calculate the distance between the bot and the target player
      const distance = botPosition.distanceTo(targetPosition);

      if (distance > followDistance) {
        // Move towards the target player if the distance is greater than the follow distance
        const direction = targetPosition.minus(botPosition).normalize();
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        if(sprintFollow === true) {
          bot.setControlState('jump', true);
        }
        bot.lookAt(targetPosition);
      } else {
        // Stop moving if the bot is too close to the target player
        bot.setControlState('forward', false);
        bot.setControlState('jump', false)
      }
    } else {
      if(currentMessage) {
        currentMessage.channel.send(`Stopped following ${followingPlayer} because they are not online or don't have an entity.`);
        bot.setControlState('jump', false);
      }
      // Stop following if the target player is not online or doesn't have an entity
      
      followingPlayer = null;
    }
  }
});








/*async function sendWebhookMessage(message) {
  try {
    const response = await axios.post(webhookUrl, { content: message });
    console.log(message, ": ", response.status);
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.log('Rate limited by Discord, will retry after a delay...');
      const retryDelay = 5000; // 5 seconds delay, you can adjust this value as needed
      setTimeout(() => sendWebhookMessage(message), retryDelay);
    } else {
      console.error('Error sending webhook message:', error.message);
    }
  }
}
*/


function findNearestPlayer() {
  let nearestPlayer = null;
  let nearestDistance = Infinity;

  for (const player in bot.players) {
    if (player !== bot.username) {
      const playerEntity = bot.players[player].entity;
      if (playerEntity) {
        const distance = bot.entity.position.distanceTo(playerEntity.position);
        if (distance < nearestDistance) {
          nearestPlayer = player;
          nearestDistance = distance;
        }
      }
    }
  }

  return nearestPlayer;
}




function getPlayerCount(bot) {
  const playerCount = Object.keys(bot.players).length;
  return playerCount;
}

function savePlayerCount(playerCount) {
  const currentTime = new Date().toISOString();
  const data = `${playerCount}/${currentTime}\n`;

  fs.appendFile('playercount.txt', data, (err) => {
    if (err) throw err;
    console.log(`Player count (${playerCount}) saved at ${currentTime}`);
  });
}

function lookAtPlayer(bot, targetPlayer, message) {
  const player = bot.players[targetPlayer];

  if (!player) {
    message.channel.send(`Player "${targetPlayer}" is not online or does not exist.`);
    return;
  }

  const targetPosition = player.entity.position.offset(0, player.entity.height, 0);
  bot.lookAt(targetPosition);

  message.channel.send(`Bot is now looking at ${targetPlayer}.`);
}


function performRapidSneak(bot, delay, duration) {
  const sneakingInterval = setInterval(() => {
    bot.setControlState('sneak', !bot.controlState.sneak); // Toggle sneaking
  }, delay);

  setTimeout(() => {
    clearInterval(sneakingInterval); // Clear the interval after the specified duration
    bot.setControlState('sneak', false); // Ensure the bot is not sneaking when done
  }, duration * 1000); // Convert duration to milliseconds
}

async function sendWebhookMessage(message) {
  try {
    const currentProxy = getCurrentProxy();
    await new Promise((resolve) => setTimeout(resolve, 1400)); // Add a delay of 3 seconds (3000 milliseconds)
    const response = await axios.post(webhookUrl, { content: message }, { proxy: currentProxy });
    console.log(message, ": ", response.status);
    switchProxy(); // Switch to the next proxy after successfully sending the message
  } catch (error) {
    // Handle errors as before
    if (error.response && error.response.status === 429) {
      console.log('Rate limited by Discord, will retry after a delay...');
      // const retryDelay = 5000; // 5 seconds delay, you can adjust this value as needed
      // setTimeout(() => sendWebhookMessage(message), retryDelay);
    } else {
      console.error('Error sending webhook message:', error.message);
      switchProxy(); // Switch to the next proxy even if there's an error
    }
  }
}

function getCurrentTimestamp() {
  const date = new Date();
  return date.toISOString(); // Using ISO format for the timestamp
}

function storePlayerJoinTime(playerName, timestamp) {
  const data = `${playerName}/${timestamp}/Joined\n`;
  fs.appendFile('blockmania_logs.txt', data, (err) => {
    if (err) throw err;
    console.log(`Recorded ${playerName}'s join time.`);
  });
}

function storePlayerLeaveTime(playerName, timestamp) {
  const data = `${playerName}/${timestamp}/Left\n`;
  fs.appendFile('blockmania_logs.txt', data, (err) => {
    if (err) throw err;
    console.log(`Recorded ${playerName}'s leave time.`);
  });
}

//bot.once('spawn', () => {
 // console.log('Bot spawned!');
 // bot.setControlState('forward', true);


//});

bot.once('spawn', () => {
  console.log('Bot spawned!');

  
  // Move forward for 5 seconds
  bot.setControlState('forward', true);
  setTimeout(() => {
    bot.setControlState('forward', false);
    function turnAround(bot) {
      // Calculate the new yaw (rotation around the y-axis) to face the opposite direction
      let newYaw = bot.entity.yaw + 180;
    
      // Ensure the yaw value stays within the valid range of -180 to 180 degrees
      if (newYaw > 180) {
        newYaw -= 360;
      } else if (newYaw < -180) {
        newYaw += 360;
      }
    
      // Set the new yaw and reset the pitch to look straight ahead
      bot.look(newYaw, 0);
    }
    

    turnAround(bot);
    
  
  }, 1500); // 5000 milliseconds = 5 seconds

  setInterval(() => {
  const playerCount = getPlayerCount(bot);
  savePlayerCount(playerCount);
}, 60000);
  
});


bot.on('message', (message) => {
  const messageString = message.toString();
  const joinregex = /(\w+)\s+joined the game/;
  const leaveregex = /(\w+)\s+left the game/;
  if(messageString.includes('<') && messageString.includes('>')){
    const playerNameRegex = /<([^>]+)>/;
    const match = messageString.match(playerNameRegex);
      playerName = match[1];
  }
  if (messageString.includes('joined the game')) {
    const match = messageString.match(joinregex);
    if (match && match[1]) {
      const playerName = match[1];
      const timestamp = getCurrentTimestamp();
      storePlayerJoinTime(playerName, timestamp);
      
    }
  }
  else if (messageString.includes('left the game'))  {
    const match = messageString.match(leaveregex);
    if (match && match[1]) {
      const playerName = match[1];
      const timestamp = getCurrentTimestamp();
      storePlayerLeaveTime(playerName, timestamp);
    }
  }
  else if(messageString == '>quote') {
    const quote = getRandomQuote(playerName);
    bot.chat(quote)
  }
  else if (messageString.includes('whispers: say ')) {
    const regex = /say\s+(.+)/;
    const match = messageString.match(regex);

if (match && match[1]) {
  const textAfterSay = match[1];
  console.log('Text after "say":', textAfterSay);
  bot.chat(textAfterSay)
} else {
  console.log('No match found.');

}
  }
  else if(messageString.includes('>quote')) {
    const playerNameRegex = />quote\s+(\w+)/;
    const match = messageString.match(playerNameRegex);

    if (match && match[1]) {
      playerName = match[1];
    }
    quote = getRandomQuote(playerName);
    bot.chat(quote)
  }
  else if (messageString.includes('wants to teleport to you.')) {
    const match = messageString.match(/(\w+) wants to teleport to you/);
    if (match && match[1]) {
      const playerName = match[1];
      // Check if the player's UUID is in the list
      const playerUUID = bot.players[playerName] ? bot.players[playerName].uuid : null;
      if (playerUUID && tpuuids.includes(playerUUID)) {
        // Execute the teleport command if the UUID is in the list
        bot.chat(`/tpy ${playerName}`);
        sendWebhookMessage(`TP Accepted ${playerName}`)
  }
      else {
        bot.chat(`/msg ${playerName} You are not whitelisted! ${playerUUID} contact @fiav for a whitelist!`)
        sendWebhookMessage(`TP Denied ${playerName}`)
      }
}}
  const delay = 1000; // Adjust the delay time (in milliseconds) as needed

  if (!messageString.includes('@everyone') && messageString.includes('>') && !messageString.includes('<moooomoooo>')) {
    setTimeout(() => {
      sendWebhookMessage(messageString);
      storePlayerMessage(playerName, messageString);
    }, delay);
  }
});
function getRandomQuote(playerName) {
  const messages = fs.readFileSync('player_messages.txt', 'utf8').split('\n');
  const playerQuotes = messages.filter((msg) => (msg.includes(`<${playerName}>`) && !msg.includes('<moooomoooo>') && !msg.includes('<STEPBROLOUIS>') && !msg.includes('>quote') && !msg.includes('!quote')));

  if (playerQuotes.length === 0) {
    return `No quotes found for player ${playerName}.`;
  }

  const randomIndex = Math.floor(Math.random() * playerQuotes.length);
  return playerQuotes[randomIndex];
}



function storePlayerMessage(playerName, message) {
  const currentTime = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const data = `> ${currentTime}: ${message}\n`;

  fs.appendFile('player_messages.txt', data, (err) => {
    if (err) throw err;
    console.log(`Message from ${playerName} saved at ${currentTime}`);
  });
}



let isReconnecting = false; // Flag to prevent concurrent reconnections

function reconnectBot() {
  if (isReconnecting) return; // Prevent multiple simultaneous reconnections
  isReconnecting = true;

  console.log('Reconnecting...');
  bot.quit(); // Properly quit the existing bot

  setTimeout(() => {
    bot = mineflayer.createBot({
      host: '0b0t.org',
      port: 25565,
      version: '1.14.2',
      username: username,
      password: password,
      auth: 'microsoft'
    });

    // Reattach event listeners here (similar to what you did initially)

    isReconnecting = false;
  }, 5000); // Reconnect after 5 seconds
}

bot.on('kicked', (reason) => {
  console.log(`Kicked from the server: ${reason}`);
  reconnectBot();
});

bot.on('error', (err) => {
  console.log('Bot encountered an error:', err);
  reconnectBot();
});


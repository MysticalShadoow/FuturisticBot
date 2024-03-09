const mineflayer = require("mineflayer");
const config = require("./config.json");

let spawned = false;

const actionList = {
  attack: "attack",
  move: {
    forward: "forward",
    back: "back",
    left: "left",
    right: "right",
    jump: "jump"
  }
};

const bot = mineflayer.createBot({
  username: config.mineflayer.username,
  port: config.mineflayer.port,
  host: config.mineflayer.host,
  version: config.mineflayer.version
});

const qTable = {};
const learningRate = 0.1;
const discountFactor = 0.9;
const explorationRate = 0.1;
const botReach = 3;

bot.on("spawn", () => {
  console.log("Bot spawned in");
  spawned = true;
});

bot.on("error", (err) => {
  console.error("Bot error:", err);
});

bot.on("end", (reason) => {
  console.log("Bot disconnected\n", reason);
});

bot.on("message", (msg) => {
  console.log(msg.toAnsi());
  msg = msg.toString();

  if (msg.includes("register")) {
    console.log("Registered");
    bot.chat("/register EDPN5000");
  } else if (msg.includes("login")) {
    console.log("Logged in");
    bot.chat("/login EDPN5000");
  }
});

bot.on("physicTick", () => {
  if (!spawned) return;
  const target = bot.nearestEntity(entity => entity.type.toLowerCase() === "player");

  if (target) {
    const currentState = getState(bot, target);
    const action = chooseAction(currentState);
    const reward = performAction(bot, action, target);
    const nextState = getState(bot, target);

    updateQValues(currentState, action, reward, nextState);
  }
});


let cachedState = null;

function getState(bot, opponent) {
  // Check if the state needs to be updated
  if (cachedState && !stateNeedsUpdate(bot, opponent)) {
    return cachedState;
  }

  if (!opponent.entity) return;
  const { health: targHealth = 0, entity: { position } } = opponent;
  const { position: botPosition, health: botHealth, heldItem: { name: weapon } = {} } = bot.entity;
  const targDist = botPosition.distanceTo(position);
  const direction = botPosition.directionTo(position);

  // Update the cached state
  cachedState = {
    targHealth,
    targDist,
    botPos: botPosition,
    botHealth,
    weapon,
    direction
  };

  return cachedState;
}

function stateNeedsUpdate(bot, opponent) {
  // Check if the opponent's position has changed
  if (!cachedState || bot.entity.position.distanceTo(opponent.entity.position) > 1) {
    return true;
  }

  // Check if the bot's position has changed
  if (bot.entity.position.distanceTo(cachedState.botPos) > 1) {
    return true;
  }

  // Check if the bot's health has changed
  if (bot.entity.health !== cachedState.botHealth) {
    return true;
  }

  // Check if the opponent's health has changed
  if (opponent.health !== cachedState.targHealth) {
    return true;
  }

  // Check if the bot's weapon has changed
  if (bot.entity.heldItem && bot.entity.heldItem.name !== cachedState.weapon) {
    return true;
  }

  // If none of the above conditions are met, the state does not need to be updated
  return false;
}

function updateQValues(state, action, reward, nextState) {
  if (!qTable[state]) qTable[state] = null;
  if (!qTable[nextState]) qTable[nextState] = null;

  const currentQValue = qTable[state] && qTable[state][action] ? qTable[state][action] : 0;

  let maxNextQValue = 0;
  if (qTable[nextState]) {
    for (let [nextAction, nextQValue] of Object.entries(qTable[nextState])) {
      if (nextQValue > maxNextQValue) {
        maxNextQValue = nextQValue;
      }
    }
  }

  const newQValue = currentQValue + learningRate * (reward + discountFactor * maxNextQValue - currentQValue);

  if (!qTable[state]) qTable[state] = {};
  qTable[state][action] = newQValue;
}

function chooseAction(state) {
  if (Math.random() < explorationRate || !qTable[state]) {
    const actions = Object.values(actionList);
    return actions[Math.floor(Math.random() * actions.length)];
  } else {
    const actions = Object.entries(qTable[state]);
    actions.sort((a, b) => b[1] - a[1]);
    return actions[0][0];
  }
}

function performAction(bot, action, target) {
  const currentWeapon = bot.heldItem?.name;

  switch (action) {
    case actionList.attack:
      bot.lookAt(target.position.offset(0, 0.5, 0));
      if (bot.entity.position.distanceTo(target.position) <= botReach) {
        setTimeout(() => {
          bot.attack(target);
        }, config.combat.cooldowns[currentWeapon] * 1000);
      } else {
        bot.setControlState("forward", true);
      }
      break;
    case actionList.move.forward:
      bot.setControlState("forward", true);
      break;
    case actionList.move.back:
      bot.setControlState("back", true);
      break;
    case actionList.move.left:
      bot.setControlState("left", true);
      break;
    case actionList.move.right:
      bot.setControlState("right", true);
      break;
    case actionList.move.jump:
      bot.setControlState("jump", true);
      break;
  }

  return Math.random() > 0.5 ? 1 : -1;
}

bot.on("physicTick", () => {
  if (!spawned) return;
  const target = bot.nearestEntity(entity => entity.type.toLowerCase() === "player");

  if (target) {
    const currentState = getState(bot, target);
    const action = chooseAction(currentState);
    const reward = performAction(bot, action, target);
    const nextState = getState(bot, target);

    updateQValues(currentState, action, reward, nextState);
  }
});

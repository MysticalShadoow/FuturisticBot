const mineflayer = require("mineflayer");
const config = require("./config.json");

let spawned = false;

const actionList = {
  attack: "attack",
  move: {
    forward: "forward",
    back: "back",
    left: "left",
    right: "right"
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

function getState(bot, opponent) {
  if (!opponent.entity) return;
  const { health: targHealth = 0, entity: { position } } = opponent;
  const { position: botPosition, health: botHealth } = bot.entity;
  const targDist = botPosition.distanceTo(position);

  return {
    targHealth,
    targDist,
    botPos: botPosition,
    botHealth,
  };
}

function chooseAction(state) {
  if (Math.random() < explorationRate || !qTable[state]) {
    return Math.random() < 0.5 ? actionList.attack : actionList.move.forward;
  } else {
    return qTable[state][actionList.attack] > qTable[state][actionList.move.forward] ? actionList.attack : actionList.move.forward;
  }
}

function updateQValues(state, action, reward, nextState) {
  if (!qTable[state]) qTable[state] = { attack: 0, forward: 0 };
  if (!qTable[nextState]) qTable[nextState] = { attack: 0, forward: 0 };

  const currentQValue = qTable[state][action];
  const maxNextQValue = Math.max(...Object.values(qTable[nextState]));

  const newQValue = currentQValue + learningRate * (reward + discountFactor * maxNextQValue - currentQValue);
  qTable[state][action] = newQValue;
}

function performAction(bot, action, target) {
  if (action === actionList.attack) {
    bot.lookAt(target.position);
    bot.attack(target);
  } else if (action === actionList.move.forward) {
    bot.setControlState("forward", true);
  }

  return Math.random() > 0.5 ? 1 : -1;
}

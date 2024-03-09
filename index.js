const mineflayer = require("mineflayer");
const config = require("./config.json")

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

function getState(bot, opponent) {
  // Extract relevant information
  if (!opponent.entity) return;
  const targHealth = opponent.health || 0;
  const targDist = bot.entity.position.distanceTo(opponent.entity.position);

  const botPosx = bot.entity.position.x
  const botPosy = bot.entity.position.y
  const botPosz = bot.entity.position.z
  const botHealth = bot.health

  return {
    targHealth,
    targDist,

    botPosx,
    botPosy,
    botPosz,
    botHealth,
  };
}

// Q-table for storing Q-values
const qTable = {};

// Parameters
const learningRate = 0.1;
const discountFactor = 0.9;
const explorationRate = 0.1;

// Exploration vs Exploitation
function chooseAction(state) {
  if (Math.random() < explorationRate || !qTable[state]) {
    // Explore (random action)
    return Math.random() < 0.5 ? actionList.attack : actionList.move.forward;
  } else {
    // Exploit (choose action with the highest Q-value)
    return qTable[state][actionList.attack] > qTable[state][actionList.move.forward] ? actionList.attack : actionList.move.forward;
  }
}

// Update Q-values using Q-learning
function updateQValues(state, action, reward, nextState) {
  if (!qTable[state]) qTable[state] = { attack: 0, forward: 0 };
  if (!qTable[nextState]) qTable[nextState] = { attack: 0, forward: 0 };

  const currentQValue = qTable[state][action];
  const maxNextQValue = Math.max(qTable[nextState][action], qTable[nextState][actionList.move.forward]);

  const newQValue = currentQValue + learningRate * (reward + discountFactor * maxNextQValue - currentQValue);
  qTable[state][action] = newQValue;
}

// Training loop
bot.on("physicTick", () => {
  if (!spawned) return;
  // Your PvP logic and actions here
  const target = bot.nearestEntity(entity => entity.type.toLowerCase() === "player");

  if (target) {
    // Obtain current state
    const currentState = getState(bot, target);

    // Choose action
    const action = chooseAction(currentState);

    // Perform action and obtain reward
    const reward = performAction(bot, action, target);

    // Obtain new state after the action
    const nextState = getState(bot, target);

    // Update Q-values using Q-learning
    updateQValues(currentState, action, reward, nextState);
  }
});

// Function to perform actions (attack, forward)
function performAction(bot, desiredAction, target) {
  // Implement your action logic here
  if (desiredAction == actionList.attack) {
    bot.lookAt(target.position)
    bot.attack(target)
  } else if (desiredAction == actionList.move.forward) {
    bot.setControlState("forward", true)
  }

  // Simulate PvP actions and return a reward
  return Math.random() > 0.5 ? 1 : -1;
}

// Handle bot events
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
    console.log("Registered")
    bot.chat("/register EDPN5000")
  } else if (msg.includes("login")) {
    console.log("Logged in")
    bot.chat("/login EDPN5000")
  }
});

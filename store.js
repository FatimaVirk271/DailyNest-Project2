// store.js - the "Data Persistence Layer".
// Project 2 says: master endpoints BEFORE complex databases.
// So tasks live in memory and are saved to a simple JSON file (data.json).
const fs = require('fs');
const path = require('path');

const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

// The same four starter tasks DailyNest had in Project 1
const STARTER = [
  { text: 'Drink 8 glasses of water', category: 'health', done: false },
  { text: 'Study for 1 hour', category: 'study', done: false },
  { text: 'Clean my room', category: 'home', done: false },
  { text: 'Buy vegetables and fruit', category: 'shopping', done: false },
];

let tasks = [];
let nextId = 1;

function seed() {
  const now = new Date().toISOString();
  tasks = STARTER.map((t, i) => ({ id: i + 1, ...t, createdAt: now }));
  nextId = STARTER.length + 1;
}

function save() {
     try {
       fs.writeFileSync(FILE, JSON.stringify({ tasks, nextId }, null, 2));
     } catch (err) {
       // If the disk is read-only (some hosts), keep working in memory
       console.error('Could not save data file, continuing in memory:', err.message);
     }
   }

// Load saved tasks when the server starts. No file (or a broken one) -> starter tasks.
try {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (!Array.isArray(raw.tasks)) throw new Error('data file has no tasks list');
  tasks = raw.tasks;
  nextId = raw.nextId || tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
} catch (err) {
  seed();
}

module.exports = {
  all: () => tasks,

  find: (id) => tasks.find((t) => t.id === id),

  // Newest task goes to the top, just like Project 1
  create(data) {
    const task = { id: nextId++, ...data, createdAt: new Date().toISOString() };
    tasks.unshift(task);
    save();
    return task;
  },

  update(id, data) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;
    Object.assign(task, data, { updatedAt: new Date().toISOString() });
    save();
    return task;
  },

  remove(id) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;
    tasks.splice(index, 1);
    save();
    return true;
  },

  // Remove every task for which test(task) is true. Returns how many were removed.
  removeWhere(test) {
    const before = tasks.length;
    tasks = tasks.filter((t) => !test(t));
    save();
    return before - tasks.length;
  },

  // Back to the four starter tasks
  reset() {
    seed();
    save();
    return tasks;
  },
};

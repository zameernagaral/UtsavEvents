import express from 'express';
import mongoose from 'mongoose';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import 'dotenv/config';

const app = express();

import cors from 'cors';

app.use(cors({
  origin: '*', // or your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mergedEvents')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));
import { Schema, model } from 'mongoose';

const ScoreSchema = new Schema({
  team: { type: String, required: true, trim: true },
  round: { type: Number, required: true, enum: [1, 2, 3] },
  score: { type: Number, required: true }
}, { timestamps: true });
ScoreSchema.index({ team: 1, round: 1 }, { unique: true });
const Score = model('Score', ScoreSchema);
const AdminSchema = new Schema({ username: String, password: String });
const Admin = model('Admin', AdminSchema);

const TeamSchema = new Schema({
  name: { type: String, unique: true },
  scores: {
    game1: { type: Number, default: 0 },
    game2: { type: Number, default: 0 },
    game3: { type: Number, default: 0 },
    game4: { type: Number, default: 0 },
  },
  logs: [{ game: String, breakdown: Object, points: Number, timestamp: Date }]
});
const Team = model('Team', TeamSchema);

async function seedAdmin() {
  const hash = await bcrypt.hash('duosdash2026', 10);
  const admin = await Admin.findOne({ username: 'admin' });
  
  if (!admin) {
    await Admin.create({ username: 'admin', password: hash });
    console.log('Admin created with password: duosdash2026');
  } else {
    admin.password = hash;
    await admin.save();
    console.log('Admin password forcefully reset to: duosdash2026');
  }
}
seedAdmin();
app.post('/api/clockedout/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD)
    return res.json({ success: true });
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

const clockedoutScoresRouter = express.Router();

clockedoutScoresRouter.get('/:round', async (req, res) => {
  try {
    const scores = await Score.find({ round: Number(req.params.round) }).sort({ score: -1 });
    res.json(scores);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

clockedoutScoresRouter.post('/', async (req, res) => {
  const { team, round, score } = req.body;
  try {
    const doc = await Score.findOneAndUpdate(
      { team: team.trim(), round: Number(round) },
      { score: Number(score) },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

clockedoutScoresRouter.delete('/:round/:team', async (req, res) => {
  try {
    await Score.findOneAndDelete({ team: req.params.team, round: Number(req.params.round) });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

clockedoutScoresRouter.get('/finals/top15', async (req, res) => {
  try {
    const r1 = await Score.find({ round: 1 });
    const r2 = await Score.find({ round: 2 });
    const r3 = await Score.find({ round: 3 });

    const combined = {};
    r1.forEach(x => { combined[x.team] = (combined[x.team] || 0) + x.score; });
    r2.forEach(x => { combined[x.team] = (combined[x.team] || 0) + x.score; });

    const top15 = Object.entries(combined)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([team, total]) => {
        const r3entry = r3.find(x => x.team.toLowerCase() === team.toLowerCase());
        return { team, total, r3score: r3entry ? r3entry.score : null };
      });
    res.json(top15);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.use('/api/clockedout/scores', clockedoutScoresRouter);
function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.admin = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

app.post('/api/duosdash/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin || !(await bcrypt.compare(password, admin.password)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

app.get('/api/duosdash/teams', auth, async (req, res) => {
  const teams = await Team.find();
  res.json(teams);
});

app.post('/api/duosdash/teams', auth, async (req, res) => {
  try {
    const team = await Team.create({ name: req.body.name });
    res.json(team);
  } catch (e) { res.status(400).json({ error: 'Team already exists' }); }
});

app.delete('/api/duosdash/teams/:id', auth, async (req, res) => {
  await Team.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

function calcGame1(data) { let pts = 0, breakdown = {}; if (data.defused) { breakdown.base = 150; pts += 150; const tb = Math.floor(data.timeRemaining / 10) * 10; breakdown.timeBonus = tb; pts += tb; const mb = data.modulesFirst * 15; breakdown.moduleBonus = mb; pts += mb; if (data.noStrikes) { breakdown.perfectBonus = 40; pts += 40; } } else { breakdown.base = 0; const cm = data.modulesCompleted * 20; breakdown.completedModules = cm; pts += cm; } const sp = data.strikes * 20; breakdown.strikePenalty = -sp; pts -= sp; return { pts, breakdown }; }
function calcGame2(data) { let pts = 0, breakdown = {}; if (data.guessed) { breakdown.base = 50; pts += 50; } const cw = data.correctWords * 25; breakdown.correctWords = cw; pts += cw; const tb = Math.floor(data.timeRemaining / 30) * 10; breakdown.timeBonus = tb; pts += tb; if (data.streak3) { breakdown.streakBonus = 20; pts += 20; } if (data.noSkips && data.guessed) { breakdown.perfectBonus = 40; pts += 40; } const skip = data.skips * 10; breakdown.skipPenalty = -skip; pts -= skip; const viol = data.violations * 20; breakdown.violationPenalty = -viol; pts -= viol; return { pts, breakdown }; }
function calcGame3(data) { let pts = 0, breakdown = { cards: [] }; for (const card of data.cards) { let cp = 0, cb = {}; if (card.completed) { cb.base = 10; cp += 10; cb.cardNumber = card.cardNumber; cp += card.cardNumber; if (card.withinTime) { cb.timeBonus = 5; cp += 5; } if (card.isSpecial) { cb.specialBonus = 15; cp += 15; } } breakdown.cards.push({ ...cb, total: cp }); pts += cp; } return { pts, breakdown }; }
function calcGame4(data) { let pts = 0, breakdown = { chits: [] }; for (const chit of data.chits) { let cp = 0, cb = {}; if (chit.guessed) { cb.base = 5; cp += 5; if (chit.within30) { cb.speedBonus = 5; cp += 5; } } breakdown.chits.push({ ...cb, total: cp }); pts += cp; } return { pts, breakdown }; }

app.post('/api/duosdash/score/:teamId/game/:game', auth, async (req, res) => {
  const { teamId, game } = req.params;
  const team = await Team.findById(teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  let result;
  if (game === '1') result = calcGame1(req.body);
  else if (game === '2') result = calcGame2(req.body);
  else if (game === '3') result = calcGame3(req.body);
  else if (game === '4') result = calcGame4(req.body);
  else return res.status(400).json({ error: 'Invalid game' });

  team.scores[`game${game}`] = result.pts;
  team.logs.push({ game: `Game ${game}`, breakdown: result.breakdown, points: result.pts, timestamp: new Date() });
  await team.save();
  res.json({ points: result.pts, breakdown: result.breakdown });
});
// app.use(express.static(path.join(__dirname, '../frontend/dist')));
// app.use((req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
// });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
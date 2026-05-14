import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jemiskitchenn_db_user:c4IRPGlGwMYtnzEk@cluster0.cfg3rti.mongodb.net/?appName=Cluster0';

let isDbConnected = false;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // Timeout early to avoid hanging
    });
    isDbConnected = true;
    console.log('Connected to MongoDB successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Please whitelist the IP address 0.0.0.0/0 in your MongoDB Atlas cluster.');
  }
}

connectDB();

// Schemas
const NoticeSchema = new mongoose.Schema({
  title: String,
  content: String,
  date: String,
  attachmentUrl: String,
  attachmentName: String,
  createdAt: { type: Date, default: Date.now }
});

const GallerySchema = new mongoose.Schema({
  url: String,
  title: String,
  category: String,
  createdAt: { type: Date, default: Date.now }
});

const CommitteeSchema = new mongoose.Schema({
  name: String,
  title: String,
  order: Number,
  createdAt: { type: Date, default: Date.now }
});

const DownloadSchema = new mongoose.Schema({
  name: String,
  url: String,
  size: String,
  category: String,
  createdAt: { type: Date, default: Date.now }
});

const LinkSchema = new mongoose.Schema({
  name: String,
  url: String,
  order: Number,
  createdAt: { type: Date, default: Date.now }
});

const StaffSchema = new mongoose.Schema({
  name: String,
  role: String,
  imageUrl: String,
  category: String,
  order: Number,
  createdAt: { type: Date, default: Date.now }
});

const ConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'system' },
  schoolName: String,
  phone: String,
  email: String,
  address: String,
  principalName: String,
  principalMessage: String,
  principalImageUrl: String,
  mission: String,
  vision: String,
  history: String,
  schoolLogoUrl: String
});

const Notice = mongoose.model('Notice', NoticeSchema);
const GalleryItem = mongoose.model('GalleryItem', GallerySchema);
const CommitteeMember = mongoose.model('CommitteeMember', CommitteeSchema);
const DownloadItem = mongoose.model('DownloadItem', DownloadSchema);
const ImportantLink = mongoose.model('ImportantLink', LinkSchema);
const PublicStaff = mongoose.model('PublicStaff', StaffSchema);
const SystemConfig = mongoose.model('SystemConfig', ConfigSchema);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
const models: { [key: string]: mongoose.Model<any> } = {
  notices: Notice,
  gallery: GalleryItem,
  committee: CommitteeMember,
  downloads: DownloadItem,
  important_links: ImportantLink,
  public_staff: PublicStaff
};

// Generic GET all
app.get('/api/website/:collection', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ error: 'Database not connected' });
  try {
    const model = models[req.params.collection];
    if (!model) return res.status(404).json({ error: 'Collection not found' });
    
    let sort: any = { createdAt: -1 };
    if (req.params.collection === 'committee' || req.params.collection === 'important_links' || req.params.collection === 'public_staff') {
      sort = { order: 1 };
    }
    
    const data = await model.find().sort(sort);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Generic POST
app.post('/api/website/:collection', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ error: 'Database not connected' });
  try {
    const model = models[req.params.collection];
    if (!model) return res.status(404).json({ error: 'Collection not found' });
    
    const item = new model(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Generic DELETE
app.delete('/api/website/:collection/:id', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ error: 'Database not connected' });
  try {
    const model = models[req.params.collection];
    if (!model) return res.status(404).json({ error: 'Collection not found' });
    
    await model.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// System Config Routes
app.get('/api/config/system', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ error: 'Database not connected' });
  try {
    let config = await SystemConfig.findOne({ key: 'system' });
    if (!config) {
      config = new SystemConfig({ key: 'system' });
      await config.save();
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

app.post('/api/config/system', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ error: 'Database not connected' });
  try {
    const config = await SystemConfig.findOneAndUpdate(
      { key: 'system' },
      req.body,
      { upsert: true, new: true }
    );
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Server setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

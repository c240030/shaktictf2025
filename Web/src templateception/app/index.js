require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const doT = require('dot');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none';");
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const TEMPLATES_DIR = path.join(__dirname, 'templates');
fs.ensureDirSync(TEMPLATES_DIR);

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/upload', async (req, res) => {
  try {
    const { filename, template, config } = req.body;

    if (!filename || !template || !config) {
      return res.status(400).render('upload', { error: 'Missing fields', link: null });
    }

    // Vulnerable merge
    const polluted = _.merge({}, config);

    const filePath = path.join(TEMPLATES_DIR, filename);
    await fs.writeFile(filePath, template);
    res.render('upload', { error: null, link: `/render/${filename}` });
  } catch (err) {
    res.status(500).render('upload', { error: err.message, link: null });
  }
});

app.get('/render/:file', async (req, res) => {
  const file = req.params.file;
  const filePath = path.join(TEMPLATES_DIR, file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).render('rendered', { output: 'Template not found', flag: '' });
  }

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const compiled = doT.template(raw);

    // Build context
    const flag = process.env.FLAG || 'flag{missing}';
    const context = { name: 'CTF Player' };

    const output = compiled(context);
    res.render('rendered', { output, flag });
  } catch (err) {
    res.status(500).render('rendered', { output: 'Render error: ' + err.message, flag: '' });
  }
});

app.listen(1337, () => console.log('challenge running on http://localhost:1337'));

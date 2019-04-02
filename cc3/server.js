const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const morgan = require("morgan");
const path = require("path");
const admin = require("firebase-admin");

const config = require("./env");
const router = require("./routes");

const app = express();

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "logs/access.log"),
  { flags: "a" }
);

var serviceAccount = require(path.join(__dirname, "config.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cloud-33c5e.firebaseio.com"
});

const firestore = admin.firestore();
const storage = admin.storage();

app.use(morgan("tiny", { stream: accessLogStream }));
app.use(cors());
app.use(bodyParser.json());

app.use(router);

app.listen(config.port, () =>
  console.log(`Server started at http://127.0.0.1:${config.port}`)
);

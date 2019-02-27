const http = require("http");
const dotenv = require("dotenv");
const unsplash = require("unsplash-api");
const faker = require("faker");
const download = require("./modules").download;
const imgur = require("imgur");
const fs = require("fs");
const path = require("path");
const morgan = require("morgan");
const RandomOrg = require("random-org");

// CONFIG
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  {
    flags: "a"
  }
);

const logger = morgan("short", {
  stream: accessLogStream
});

const CONFIG = dotenv.config().parsed;

unsplash.init(CONFIG.UNSPLASH_ACCESS_KEY);

imgur.setClientId(CONFIG.IMGUR_CLIENT_ID);
imgur.setAPIUrl(CONFIG.IMGUR_API_URL);

const random = new RandomOrg({
  apiKey: CONFIG.RANDOM_API_KEY
});

// REQUEST HANDLER
const requestHandler = (req, res) => {
  logger(req, res, error => {
    if (error) {
      console.log(error);

      res.end(
        JSON.stringify({
          status: 500,
          success: false,
          mesagge: error
        })
      );
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "GET" && req.url === "/api/t1") {
      const word = faker.random.word();

      // #2 API UNSPLASH
      unsplash.searchPhotos(word, [], 1, 1, async (error, photos, link) => {
        if (error) {
          console.log(error);

          res.end(
            JSON.stringify({
              status: 500,
              success: false,
              mesagge: error
            })
          );
        }

        const photo = photos[0];

        // #3 API RANDOM ORG
        const uuid = await random.generateUUIDs({
          n: 1
        });

        const id = uuid.random.data[0];

        const filename = `${__dirname}/images/${id}.png`;
        const url = photo.urls.small;

        download(url, filename, () => {
          // #3 API IMGUR
          imgur
            .uploadFile(filename)
            .then(json => {
              fs.unlinkSync(filename);

              accessLogStream.write(
                JSON.stringify({
                  status: 200,
                  success: true,
                  mesagge: json.data.link
                })
              );

              res.end(
                JSON.stringify({
                  status: 200,
                  success: true,
                  mesagge: json.data.link
                })
              );
            })
            .catch(error => {
              console.log(error);

              res.end(
                JSON.stringify({
                  status: 500,
                  success: false,
                  mesagge: error.mesagge
                })
              );
            });
        });
      });
    } else if (req.url === "/api/t1/metrics" && req.method === "GET") {
      fs.readFile(`${__dirname}/metrix.log`, "utf8", function(err, contents) {
        res.end(contents);
      });
    } else if (req.url === "/api/t1/logs" && req.method === "GET") {
      fs.readFile(`${__dirname}/access.log`, "utf8", function(err, contents) {
        res.end(contents);
      });
    } else {
      res.end("you are lost ma boi.");
    }
  });
};

http.createServer(requestHandler).listen(CONFIG.PORT);
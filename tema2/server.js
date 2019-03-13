const http = require('http');
const { port, firebaseConfig, bucket, storageBucket } = require('./config');
const admin = require('firebase-admin');
const uuid = require('uuid/v4');
const fs = require("fs");

const { download } = require('./modules');

admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    databaseURL: "https://cloud-33c5e.firebaseio.com"
});

const firestore = admin.firestore();
const storage = admin.storage();
const catsRefs = firestore.collection('cats');

const requestHandler = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === 'GET' && req.url === '/cats') {
        await catsRefs.get().then(snapshot => {
            const cats = [];

            snapshot.forEach(doc => {
                let cat = doc.data();
                cat.id = doc.id;

                cats.push(cat);
            });

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(cats));
        }).catch(err => {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ err }));
        });
    } else if (req.method === 'GET' && req.url.match(/\/cats\/[a-zA-Z0-9]+/)) {
        const id = req.url.split('/').pop();

        await catsRefs.doc(id).get().then(doc => {
            if (!doc.exists) {
                res.statusCode = 404;
                res.end('Not Found!');
            }

            let cat = doc.data();
            cat.id = doc.id;

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(cat));
        }).catch(err => {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ err }));
        });
    } else if (req.method === 'DELETE' && req.url.match(/\/cats\/[a-zA-Z0-9]+/)) {
        const id = req.url.split('/').pop();

        await catsRefs.doc(id).get().then(async doc => {
            if (!doc.exists) {
                res.statusCode = 404;
                res.end('Not Found!');
            }

            let cat = doc.data();

            const imgName = cat.image.split('/').pop().split('?')[ 0 ];

            await storage.bucket(storageBucket).file(imgName).delete();
            await catsRefs.doc(id).delete();

            res.statusCode = 204;
            res.end();
        }).catch(err => {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ err }));
        });
    } else if (req.method === 'POST' && req.url === '/cats') {
        req.on('data', async  data => {
            const details = JSON.parse(data);

            const cat = {};

            details.name ? cat.name = details.name : null;
            details.description ? cat.description = details.description : null;
            details.color ? cat.color = details.color : null;
            details.origin ? cat.origin = details.origin : null;

            if (details.image) {
                const name = uuid();
                const filename = `${__dirname}/${name}.png`;

                await download(details.image, filename);
                await storage.bucket(storageBucket).upload(filename);

                cat.image = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${name}.png?alt=media&token=''`;

                fs.unlinkSync(filename);
            }

            catsRefs.add(cat).then(ref => {
                cat.id = ref.id;

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 201;
                res.end(JSON.stringify(cat));
            }).catch(error => {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 500;
                res.end(JSON.stringify({ error }));
            });
        });
    } else if (req.method === 'PUT' && req.url.match(/\/cats\/[a-zA-Z0-9]+/)) {
        req.on('data', async  data => {
            const id = req.url.split('/').pop();
            const details = JSON.parse(data);

            const cat = {};

            await catsRefs.doc(id).get().then(async doc => {
                if (!doc.exists) {
                    res.statusCode = 404;
                    res.end('Not Found!');
                }

                let catDetails = doc.data();

                details.name ? cat.name = details.name : null;
                details.description ? cat.description = details.description : null;
                details.color ? cat.color = details.color : null;
                details.origin ? cat.origin = details.origin : null;

                if (details.image) {
                    const imgName = catDetails.image.split('/').pop().split('?')[ 0 ];
                    await storage.bucket(storageBucket).file(imgName).delete();

                    const name = uuid();
                    const filename = `${__dirname}/${name}.png`;

                    await download(details.image, filename);
                    await storage.bucket(storageBucket).upload(filename);

                    cat.image = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${name}.png?alt=media&token=''`;

                    fs.unlinkSync(filename);
                }

                catsRefs.doc(id).update(cat).then(ref => {
                    cat.id = id;

                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 200;
                    res.end(JSON.stringify(cat));
                }, { merge: true }).catch(error => {
                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error }));
                });
            }).catch(err => {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 500;
                res.end(JSON.stringify({ err }));
            });
        });
    } else {
        res.statusCode = 404;
        res.end('NOT FOUND!');
    }
}

const server = http.createServer(requestHandler);

server.listen(process.env.PORT || port, () => {
    console.log(`server started at http://127.0.0.1:${process.env.PORT || port}`);
});
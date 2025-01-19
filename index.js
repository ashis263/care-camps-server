require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send("server running");
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fhbw5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const userCollection = client.db('care-camps').collection('users');
        const campCollection = client.db('care-camps').collection('camps');
        const registeredCampCollection = client.db('care-camps').collection('registeredCamps');
        const reviewCollection = client.db('care-camps').collection('reviews');

        //auth middlewares
        const tokenVerifier = (req, res, next) => {
            const token = req.headers.token;
            if (!token) {
                return res.status(401).send({ message: "unauthorized" });
            };
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
                if (error) {
                    return res.status(401).send({ message: 'unauthorized' });
                };
                if (req.query.email !== decoded.email) {
                    return res.status(403).send({ message: 'forbidden' });
                };
                next();
            })
        };

        const adminVerifier = async (req, res, next) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden' });
            };
            next();
        }

        //auth/jwt related api
        app.post('/auth', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        //checking if admin
        app.get('/admin', tokenVerifier, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        })

        //user related api
        app.put('/users', async (req, res) => {
            const query = { email: req.body.email };
            const updatedDoc = {
                $set: req.body
            };
            const option = { upsert: true };
            const result = await userCollection.updateOne(query, updatedDoc, option);
            res.send(result);
        });

        app.patch('/users', tokenVerifier, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const updatedDoc = {
                $set: req.body
            };
            const result = await userCollection.updateOne(query, updatedDoc);
            res.send(result);
        })

        //camp related apis
        app.post('/camps', tokenVerifier, adminVerifier, async (req, res) => {
            const { fees, participantCount, dateTime, ...others } = req.body;
            const modified = {
                ...others,
                fees: parseFloat(fees),
                participantCount: parseInt(participantCount),
                dateTime: moment(dateTime).format('ddd MMM DD YYYY,  h:mm:ss A')
            }
            const result = await campCollection.insertOne(modified);
            res.send(result);
        });

        app.get('/camps/count', async (req, res) => {
            const searchKey = req.query.searchKey
            const query = {
                $or: [
                    { name: { $regex: searchKey, $options: 'i' } },
                    { location: { $regex: searchKey, $options: 'i' } },
                    { professionalName: { $regex: searchKey, $options: 'i' } },
                    { dateTime: { $regex: searchKey, $options: 'i' } }
                ]
            }
            const result = await campCollection.countDocuments(query);
            res.send({ count: result });
        });

        app.get('/adminCamps/count', tokenVerifier, adminVerifier, async (req, res) => {
            const email = req.query.email;
            const searchKey = req.query.searchKey;
            const query = {
                $and: [
                    { addedBy: email },
                    {
                        $or: [
                            { name: { $regex: searchKey, $options: 'i' } },
                            { location: { $regex: searchKey, $options: 'i' } },
                            { professionalName: { $regex: searchKey, $options: 'i' } },
                            { dateTime: { $regex: searchKey, $options: 'i' } }
                        ]
                    }
                ]
            }
            const result = await campCollection.countDocuments(query);
            res.send({ count: result });
        });
        
        app.get('/registeredCamps/count', tokenVerifier, async (req, res) => {
            const email = req.query.email;
            const searchKey = req.query.searchKey;
            const query = {
                $and: [
                    { participantEmail: email },
                    {
                        $or: [
                            { name: { $regex: searchKey, $options: 'i' } },
                            { location: { $regex: searchKey, $options: 'i' } },
                            { professionalName: { $regex: searchKey, $options: 'i' } },
                            { dateTime: { $regex: searchKey, $options: 'i' } }
                        ]
                    }
                ]
            }
            const result = await registeredCampCollection.countDocuments(query);
            res.send({ count: result });
        });

        app.get('/camps/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await campCollection.findOne(query);
            res.send(result);
        })

        app.get('/camps', async (req, res) => {
            const page = parseInt(req.query.page);
            const sortBy = req.query.sortBy;
            let sorter;
            if(sortBy === 'participantCount'){
                sorter = { [sortBy]: -1 };
            }else{
                sorter = { [sortBy]: 1 };
            }
            const searchKey = req.query.searchKey;
            const query = {
                $or: [
                    { name: { $regex: searchKey, $options: 'i' } },
                    { location: { $regex: searchKey, $options: 'i' } },
                    { professionalName: { $regex: searchKey, $options: 'i' } },
                    { dateTime: { $regex: searchKey, $options: 'i' } }
                ]
            }
            const result = await campCollection.find(query).skip((page - 1) * 6).limit(6).sort(sorter).collation({ locale: 'en', strength: 2 }).toArray();
            res.send(result);
        });

        app.get('/adminCamps', tokenVerifier, adminVerifier, async (req, res) => {
            const email = req.query.email;
            const searchKey = req.query.searchKey;
            const page = parseInt(req.query.page);
            const query = {
                $and: [
                    { addedBy: email },
                    {
                        $or: [
                            { name: { $regex: searchKey, $options: 'i' } },
                            { location: { $regex: searchKey, $options: 'i' } },
                            { professionalName: { $regex: searchKey, $options: 'i' } },
                            { dateTime: { $regex: searchKey, $options: 'i' } }
                        ]
                    }
                ]
            }
            const result = await campCollection.find(query).skip((page - 1) * 10).limit(10).toArray();
            res.send(result);
        });

        app.delete('/delete-camp/:campId', tokenVerifier, adminVerifier, async (req, res) => {
            const id = req.params.campId;
            const query = { _id: new ObjectId(id) };
            const result = await campCollection.deleteOne(query);
            res.send(result);
        });

        app.patch('/update-camp/:campId', tokenVerifier, adminVerifier, async (req, res) => {
            const id = req.params.campId;
            const query = { _id: new ObjectId(id) };
            const { fees, participantCount, ...others } = req.body;
            const updatedDoc = {
                $set: {
                    ...others,
                    fees: parseFloat(fees),
                    participantCount: parseInt(participantCount)
                }
            }
            const result = await campCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        //registered camp related api

        app.put('/registeredCamps', tokenVerifier, async (req, res) => {
            const query = { findingKey: req.query.email + req.query.campId };
            const updatedDoc = {
                $set: req.body

            };
            const option = { upsert: true }
            const campQuery = { _id: new ObjectId(req.query.campId) };
            const inc = await campCollection.updateOne(campQuery, { $inc: { participantCount: 1 } });
            const result = await registeredCampCollection.updateOne(query, updatedDoc, option);
            res.send(result);
        });

        app.get('/registeredCamps', tokenVerifier, async (req, res) => {
            const email = req.query.email;
            const searchKey = req.query.searchKey;
            const page = parseInt(req.query.page);
            const query = {
                $and: [
                    { participantEmail: email },
                    {
                        $or: [
                            { name: { $regex: searchKey, $options: 'i' } },
                            { location: { $regex: searchKey, $options: 'i' } },
                            { professionalName: { $regex: searchKey, $options: 'i' } },
                            { dateTime: { $regex: searchKey, $options: 'i' } }
                        ]
                    }
                ]
            }
            const result = await registeredCampCollection.find(query).skip((page - 1) * 10).limit(10).toArray();
            res.send(result);
        });

        app.delete('/cancel-registration/:id', tokenVerifier, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await registeredCampCollection.deleteOne(query);
            res.send(result);
        });

        //review related api
        app.put('/reviews', tokenVerifier, async(req, res) => {
            const findingKey = req.query.email + req.query.campId;
            const query = { findingKey }
            const updatedDoc = {
                $set: {
                    ...req.body,
                    findingKey
                }
            };
            const option = { upsert: true };
            const result = await reviewCollection.updateOne(query, updatedDoc, option);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log('port: ', port);
})
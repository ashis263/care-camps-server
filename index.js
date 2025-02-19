require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const stripe = require('stripe')(process.env.PAYMENT_SK)
const nodemailer = require("nodemailer");

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
        const paymentCollection = client.db('care-camps').collection('payments');
        const subscriberCollection = client.db('care-camps').collection('subscribers');

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

        app.get('/camps/popular', async (req, res) => {
            const result = await campCollection.find().sort({ participantCount: -1 }).limit(6).toArray();
            res.send(result);
        })

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
            const searchKey = req.query?.searchKey;
            const page = parseInt(req.query.page);
            const query = {
                $and: [
                    { participantEmail: email },
                    {
                        $or: [
                            { campName: { $regex: searchKey, $options: 'i' } },
                            { participantEmail: { $regex: searchKey, $options: 'i' } },
                            { participantName: { $regex: searchKey, $options: 'i' } },
                            { fees: { $regex: searchKey, $options: 'i' } },
                            { paymentStatus: { $regex: searchKey, $options: 'i' } },
                            { confirmationStatus: { $regex: searchKey, $options: 'i' } }
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
            if (sortBy === 'participantCount') {
                sorter = { [sortBy]: -1 };
            } else {
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

        app.get('/professionals', async (req, res) => {
            const result = await campCollection.find({}, { projection: { "professionalName": 1, _id: 1, location: 1, photoURL: 1, name: 1 } }).toArray();
            result.map(res => {
                const {_id, ...other} = res;
                const id = new ObjectId(_id);
                const time = id.getTimestamp();
                res.time = time;
            })
            res.send(result);
        })

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
            const searchKey = req.query?.searchKey;
            const page = parseInt(req.query.page);
            const query = {
                $and: [
                    { participantEmail: email },
                    {
                        $or: [
                            { campName: { $regex: searchKey, $options: 'i' } },
                            { participantEmail: { $regex: searchKey, $options: 'i' } },
                            { participantName: { $regex: searchKey, $options: 'i' } },
                            { fees: { $regex: searchKey, $options: 'i' } },
                            { paymentStatus: { $regex: searchKey, $options: 'i' } },
                            { confirmationStatus: { $regex: searchKey, $options: 'i' } }
                        ]
                    }
                ]
            }
            result = await registeredCampCollection.find(query).skip((page - 1) * 10).limit(10).toArray();
            res.send(result);
        });

        app.delete('/cancel-registration/:id', tokenVerifier, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await registeredCampCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/registeredCamps/all', tokenVerifier, async (req, res) => {
            const query = { participantEmail: req.query.email };
            const result = await registeredCampCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/registeredCamps/admin', tokenVerifier, adminVerifier, async (req, res) => {
            const searchKey = req.query.searchKey;
            const query = {
                $or: [
                    { campName: { $regex: searchKey, $options: 'i' } },
                    { participantEmail: { $regex: searchKey, $options: 'i' } },
                    { participantName: { $regex: searchKey, $options: 'i' } },
                    { fees: { $regex: searchKey, $options: 'i' } },
                    { paymentStatus: { $regex: searchKey, $options: 'i' } },
                    { confirmationStatus: { $regex: searchKey, $options: 'i' } },
                ]
            }
            const result = await registeredCampCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/registeredCamps/admin/count', tokenVerifier, adminVerifier, async (req, res) => {
            const searchKey = req.query.searchKey;
            const query = {
                $or: [
                    { campName: { $regex: searchKey, $options: 'i' } },
                    { participantEmail: { $regex: searchKey, $options: 'i' } },
                    { participantName: { $regex: searchKey, $options: 'i' } },
                    { fees: { $regex: searchKey, $options: 'i' } },
                    { paymentStatus: { $regex: searchKey, $options: 'i' } },
                    { confirmationStatus: { $regex: searchKey, $options: 'i' } },
                ]
            }
            const result = await registeredCampCollection.countDocuments(query);
            res.send({ count: result });
        });

        app.delete('/admin/cancel-registration/:id', tokenVerifier, adminVerifier, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await registeredCampCollection.deleteOne(query);
            res.send(result);
        });

        app.patch('/registeredCamps/admin/status', tokenVerifier, adminVerifier, async (req, res) => {
            const query = {
                $and: [
                    { findingKey: req.query.participantEmail + req.query.campId },
                    {
                        confirmationStatus: {
                            $exists: false
                        }
                    }
                ]
            };
            const updatedDoc = {
                $set: { confirmationStatus: 'Confirmed' }
            };
            const result = await registeredCampCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        //review related api
        app.put('/reviews', tokenVerifier, async (req, res) => {
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
        });

        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        //payment intent creation api
        app.post('/createPaymentIntent', tokenVerifier, async (req, res) => {
            const { fees } = req.body;
            const feesInCents = parseInt(fees * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: feesInCents,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        //payment related
        app.post('/payments', tokenVerifier, async (req, res) => {
            const doc = {
                ...req.body,
                findingKey: req.query.email + req.query.campId
            };
            const result = await paymentCollection.insertOne(doc);
            res.send(result);
        });

        app.get('/payments', tokenVerifier, async (req, res) => {
            const searchKey = req.query.searchKey;
            const query = {
                $and: [
                    { paidBy: req.query.email },
                    {
                        $or: [
                            { campName: { $regex: searchKey, $options: 'i' } },
                            { fees: { $regex: searchKey, $options: 'i' } },
                            { paymentStatus: { $regex: searchKey, $options: 'i' } },
                            { transactionId: { $regex: searchKey, $options: 'i' } },
                            { confirmationStatus: { $regex: searchKey, $options: 'i' } }
                        ]
                    }
                ]
            };
            const result = await paymentCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/payments/count', tokenVerifier, async (req, res) => {
            const email = req.query.email;
            const searchKey = req.query.searchKey;
            const query = {
                $and: [
                    { paidBy: email },
                    {
                        $or: [
                            { campName: { $regex: searchKey, $options: 'i' } },
                            { fees: { $regex: searchKey, $options: 'i' } },
                            { paymentStatus: { $regex: searchKey, $options: 'i' } },
                            { transactionId: { $regex: searchKey, $options: 'i' } },
                            { confirmationStatus: { $regex: searchKey, $options: 'i' } }
                        ]
                    }
                ]
            }
            const result = await paymentCollection.countDocuments(query);
            res.send({ count: result });
        });

        app.patch('/registeredCamps/payment', tokenVerifier, async (req, res) => {
            const query = {
                $and: [
                    { findingKey: req.query.email + req.query.campId },
                    {
                        paymentStatus: {
                            $exists: false
                        }
                    }
                ]
            };
            const updatedDoc = {
                $set: { paymentStatus: 'Paid' }
            };
            const result = await registeredCampCollection.updateOne(query, updatedDoc);
            res.send(result);
        });

        //stat
        app.get('/stat', async (req, res) => {
            const campsWithParticipantCount = await campCollection.find({ participantCount: { $gt: 0 } }).toArray();
            const totalCamps = await campCollection.estimatedDocumentCount();
            const result = await campCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalParticipants: { $sum: "$participantCount" }
                    }
                }
            ]).toArray();
            res.send({ camps: campsWithParticipantCount, totalCamps, totalParticipants: result[0].totalParticipants });
        });

        //user stat
        app.get('/userStat', async(req, res) => {
            const email = req.query.email;
            const camps = await registeredCampCollection.find({participantEmail: email}).toArray();
            const paymentQuery = {
                $and : [
                    {paidBy: email},
                    {confirmationStatus: true}
                ]
            }
            const payments = await paymentCollection.find(paymentQuery).toArray();
            res.send({camps: camps, payments: payments});
        })

        //contact
        app.post('/contact', async (req, res) => {
            const data = req.body;
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "ashis263@gmail.com",
                    pass: process.env.APP_PASS,
                },
            });
            const sendMail = async (to, subject, text) => {
                try {
                    const info = await transporter.sendMail({
                        from: 'ashis263@gmail.com',
                        to,
                        subject,
                        text,
                    });
                    res.send({ Status: "Success" });
                } catch (error) {
                    res.send({ Status: "Failed" });
                }
            };
            sendMail("ashis263@gmail.com", "New message from CareCamps", `From: ${data.name}, email: ${data.email}, message: ${data.message}`);
        })

        //newsletter
        app.post('/subscriber', async (req, res) => {
            const existed = await subscriberCollection.findOne({ email: req.body.email });
            if (existed) {
                res.send({ existed: true });
            } else {
                const result = await subscriberCollection.insertOne(req.body);
                res.send(result);
            }
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log('port: ', port);
})
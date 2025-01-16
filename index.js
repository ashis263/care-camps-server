require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
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

        //auth middlewares
        const tokenVerifier = ( req, res, next ) => {
            const token = req.headers.token;
            if(!token){
                return res.status(401).send({message: "unauthorized"});
            };
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
                if(error){
                    return res.status(401).send({message: 'unauthorized'});
                };
                if(req.query.email !== decoded.email){
                    return res.status(403).send({ message: 'forbidden'});
                };
                next();
            })
        };
        
        const adminVerifier = async(req, res, next) =>{
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if(!isAdmin){
                return res.status(403).send({ message: 'forbidden'});
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
        app.get('/admin', tokenVerifier, async(req, res) => {
            const email = req.query.email;
            const query = { email: email};
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

        app.patch('/users', tokenVerifier, async(req, res) => {
            const email = req.query.email;
            const query = { email: email};
            const updatedDoc = {
                $set: req.body
            };
            const result = await userCollection.updateOne(query, updatedDoc);
            res.send(result);
        })

        //camp related apis
        app.post('/camps', tokenVerifier, adminVerifier, async(req, res) => {
            const result = await campCollection.insertOne(req.body);
            res.send(result);
        });

        app.get('/camps', async(req, res) => {
            const result = await campCollection.find().toArray();
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
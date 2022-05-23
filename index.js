const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000

const app = express()

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dtvvv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    console.log("AUTH", authHeader)
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    // console.log("Token holo", token)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })

        }
        req.decoded = decoded
        next();
    });

}



async function run() {
    try {
        await client.connect();

        //ALL COLLECTION
        //1 ) uer collection
        const usersCollection = client.db("cycle_gear").collection('users');

        //middletare
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterUser = await usersCollection.findOne({ email: requester })
            if (requesterUser.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' })
            }
        }


        //find all users 
        //http://localhost:5000/user
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray()
            res.send(users)
        })


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);

            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.send({ result, token })

        })

        //make an user admin and check admin

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;

            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' }
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)

        })

        //find all admin

        //http://localhost:5000/admin
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin'
            res.send({ admin: isAdmin })

        })




    } finally {

    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello From The Cycle Gear')
})

app.listen(port, () => {
    console.log(`The Cycle Gear app listening on port ${port}`)
})
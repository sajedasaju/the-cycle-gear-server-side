const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        console.log(req.decoded)
        next();
    });

}



async function run() {
    try {
        await client.connect();

        //ALL COLLECTION
        //1 ) uer collection
        const usersCollection = client.db("cycle_gear").collection('users');
        //2 ) tools collection
        const toolsCollection = client.db("cycle_gear").collection('tools');
        //3 ) orders collection
        const ordersCollection = client.db("cycle_gear").collection('orders');



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
        app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {
            const users = await usersCollection.find().toArray()
            res.send(users)
        })

        //PUT USER
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

        //Post all added tools
        //http://localhost:5000/tool
        app.post('/tool', verifyJWT, verifyAdmin, async (req, res) => {
            const tool = req.body;
            const result = await toolsCollection.insertOne(tool);
            res.send(result);
        })
        //get all added tools
        //http://localhost:5000/tool
        app.get('/tool', async (req, res) => {
            const tools = await toolsCollection.find().toArray()
            res.send(tools)
        })

        //get single tool 
        //http://localhost:5000/tool
        app.get('/tool/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const tool = await toolsCollection.findOne(query);

            res.send(tool)
        })


        //Post or add order to order collection
        app.post('/order', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        })



        //get  orders by email
        app.get('/order', verifyJWT, async (req, res) => {
            const reqEmail = req.query.email
            const decodedEmail = req.decoded.email
            if (reqEmail == decodedEmail) {
                // console.log(patient)
                const query = { email: reqEmail }
                const orders = await ordersCollection.find(query).toArray();
                res.send(orders)
            }
            else {
                return res.status(403).send({ message: "Forbidden access" })
            }

        })

        //particular id wise orders for payment
        app.get('/order/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const order = await ordersCollection.findOne(query);

            res.send(order)

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
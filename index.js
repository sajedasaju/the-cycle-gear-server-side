const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000

const app = express()

//middleware
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('Hello From The Cycle Gear')
})

app.listen(port, () => {
    console.log(`The Cycle Gear app listening on port ${port}`)
})
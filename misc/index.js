const express = require('express')
const app = express()
const port = 3000

app.use('/', express.static(__dirname + '/demo'));
app.use('/dist', express.static(__dirname + '/dist'));
app.use('/node_modules', express.static(__dirname + '/node_modules'));

app.listen(port, () => {
    console.log(`listening at http://localhost:${port}`)
})
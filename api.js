const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');
const nodeAddress = uuid().split('-').join('');
const bitcoin  = new Blockchain;

//  parsing the post request 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// creating endpoints 
app.get('/blockchain' , (req , res) => {
  res.send(bitcoin)
});

app.post('/transaction' , (req , res) => {
  const blockIndex = bitcoin.createNewTransaction(req.body.amount , req.body.sender , req.body.recipient );

  res.json({ note: `Transaction will be added in block ${blockIndex}`})
});

app.get('/mine' , (req , res) => {
  const lastBlock = bitcoin.getLastBlock();
  const previousBlock = lastBlock['hash'];
  const currentBlockData = {
    transactions : bitcoin.pendingTransactions,
    index: lastBlock['index'] + 1
  }

  const nonce = bitcoin.proofOfWork( previousBlock , currentBlockData );
  const blockHash = bitcoin.hashBlock(previousBlock , currentBlockData , nonce);

  bitcoin.createNewTransaction(12.5 , "00" , nodeAddress )

  const newBlock = bitcoin.createNewBlock(nonce , previousBlock ,blockHash );
  res.json({
    note: "New Block Mined successfully",
    block: newBlock
  })
});
// l
app.listen(3000 , function() {
  console.log('listening on port 3000')
})
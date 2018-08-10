const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');
const nodeAddress = uuid().split('-').join('');
const bitcoin  = new Blockchain;
const port = process.argv[2];
const rp = require('request-promise');
//  parsing the post request 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// creating endpoints 
app.get('/blockchain' , (req , res) => {
  res.send(bitcoin)
});

app.post('/transaction' , (req , res) => {
  const newTransaction = req.body;
  const  blockIndex =  bitcoin.addTransactionToPendingTransactions(newTransaction);
  res.json({ note : `transacation will be added in block  ${blockIndex}` })
});

app.post('/transaction/broadcast' , (req , res) => {
  const newTransaction = bitcoin.createNewTransaction(req.body.amount , req.body.sender , req.body.recipient);

  bitcoin.addTransactionToPendingTransactions(newTransaction);

  const requestPromises = [];
  bitcoin.networkNodes.forEach(networkNodeUrl =>{
    const requestOptions = {
      url : networkNodeUrl + '/transaction',
      method: 'POST',
      body : newTransaction,
      json: true
    }; 
    
    requestPromises.push(rp(requestOptions)) ;
  });
  Promise.all(requestPromises)
  .then(data => {
    res.json({  note : 'transaction created and broadcasted succesfully' });
    });
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

// register a node and broadcast it to the network
app.post('/register-and-broadcast-node' , function(req , res){
  const newNodeUrl = req.body.newNodeUrl;
  if(bitcoin.networkNodes.indexOf(newNodeUrl) == -1 ) bitcoin.networkNodes.push(newNodeUrl); 

  const regNodesPromises = [];
  bitcoin.networkNodes.forEach( networkNodeUrl => {
    // registering nodes
    const requestOptions = {
        url : networkNodeUrl + '/register-node',
        method: 'POST',
        body:{ newNodeUrl : newNodeUrl },
        json: true
    };
      regNodesPromises.push(rp(requestOptions));
  } );
  Promise.all(regNodesPromises)
  .then(data => {
    const bulkRegisterOptions = {
      url: newNodeUrl + '/register-nodes-bulk',
      method: 'POST',
      body: { allNetworkNodes : [ ...bitcoin.networkNodes , bitcoin.currentNodeUrl] },
      json: true
    };

    return rp(bulkRegisterOptions);
  })
  .then(data => {
      res.json({ note: 'New Node Registered' })
  })
})

app.post('/register-node' , function(req , res){
  const newNodeUrl = req.body.newNodeUrl;
  const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
  const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl ;
  if( nodeNotAlreadyPresent && notCurrentNode)  bitcoin.networkNodes.push(newNodeUrl);
  res.json({ note: 'New Node Registered succesfully.' })
});

app.post('/register-nodes-bulk' , function(req , res){
  const allNetworkNodes = req.body.allNetworkNodes;

  allNetworkNodes.forEach( networkNodeUrl => {
    const  nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;
    if( nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(networkNodeUrl);
  } );
  res.json({ note: 'Bulk Registeration succesfully.' })
});


app.listen(port , function() {
  console.log(`listening on port ${port}`)
});
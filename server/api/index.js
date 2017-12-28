import express from 'express';
import ccxt from 'ccxt';
import schedule from 'node-schedule';
import mysql from 'mysql';
import config from '../config';
let connection = mysql.createConnection(config.sqlConfig);

connection.connect(function(err) {
    if(err){
        console.log('sql connection error');
    } else {
        console.log('connected to db');
    }
});

let router = express.Router();

router.get('/exchange-info',function (req,res){
    var query = 'SELECT * from info WHERE exChange="'+ req.query.name + '"';
    connection.query(query,function(err,result,fields) {
        if(err){
            res.status(1002).send({
                status: 'NOTOK',
                errorcode:1002,
                errormessage : 'Invalid exchange not found',
                messagedetail: 'Provide more info if needed'
            });
            return console.log(err);
        }
        if(!result) {
            res.status(1001).send({
                "status": "NOTOK",
                "errorcode":1001,
                "errormessage" : "Coin pair not found",
                "messagedetail": "Provide more info if needed"
            })
            return;
        }
        let dataToSend = result.map(function(data) {
            return {
                coin : data.CoinPair,
                value: data.Price
            }
        });
        res.send(dataToSend);
    })
});
router.get('/coin-price',async function(req,res) {
    var query = 'SELECT * from info WHERE CoinPair="'+ req.query.pair+ '"';
    console.log(query);
    connection.query(query,function(err,result,fields) {
        if(err){
            res.status(500).send();
            return console.log(err);
        }
        console.log(result);
        console.log(fields);
        res.send(result);
    })
});
var j = schedule.scheduleJob(config.cronJob, async function(){
    console.log('cronJob started');
    try{
        let bittrex = new ccxt.bittrex();
        let data = await bittrex.fetch('https://bittrex.com/api/v2.0/pub/Markets/GetMarketSummaries');
        if(data.success === false ){
            throw new Error("api calling error")
        }
        data = data.result;
        connection.query('truncate info',function(err,dataresult) {
            data.forEach(function (value) {
                let dataToSave ={
                    CoinPair : value.Market.MarketCurrency+ "/" + value.Market.BaseCurrency ,
                    exChange : 'bittrex',
                    Price : value.Summary.Last,
                    timeStampUpdated : new Date().toISOString()
                };
                let query = connection.query('INSERT INTO info SET ?', dataToSave, function (error, results, fields) {
                    if (error) throw error;
                    // Neat!
                });
            })
        });
    }
    catch(err) {
        console.log(err);
    }
});

module.exports = router;

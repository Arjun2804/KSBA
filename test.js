var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
var app = express();
var session = require('express-session')
var nodemailer = require('nodemailer');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/"
app.set('view engine', 'pug');
app.set('views', './views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({ secret: 'Ksba' }))

app.all('/', function (req, res) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var i = 0;
        var k = 0;
        var dbo = db.db("KSBA");
        var ob1 = { _id: 60000005};
        var newvalues, newvalues1;
        dbo.collection("customers").find(ob1).toArray(function (err, result) {
            for (i = 0; i < result[0].accounts.creditCard.length; i++) {
                if (result[0].accounts.creditCard[i].cardNo == 5331360100542103) {
                    newvalues = { $push: { "blockedAccounts": result[0].accounts.creditCard[i] } };
                    newvalues1 = { $pull: { "accounts.creditCard": { "cardNo": result[0].accounts.creditCard[i].cardNo } } };
                    dbo.collection("customers").update(ob1, newvalues, function (err, result) {
                        if (err) console.log(err)
                        dbo.collection("customers").update(ob1, newvalues1, function (err, resut) {
                            if (err) console.log(err)
                            console.log(resut)
                            res.redirect('/login_otp_correct')
                            k = 1;
                        })
                    })
                }

            }

        })
    })

}).listen(8080);
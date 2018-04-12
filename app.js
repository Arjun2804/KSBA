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
    res.render('homePage.pug');
});
app.all('/login', function (req, res) {
    res.render('login.pug', { msg: "" });
})
app.all('/login_submit1', function (req, res) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("KSBA");
        req.session.cid = parseFloat(req.body.username);
        var ob1 = { _id: req.session.cid };
        dbo.collection("customers").find(ob1).toArray(function (err, result) {
            if (err) throw err;
            var a = parseFloat("+91" + req.body.mno);
            var b = parseFloat(result[0].regMob);
            if ((result.length > 0) && (result[0].password.cur == req.body.psw) && (b == a)) {
                req.session.email = result[0].mail;
                req.session.name = result[0].name;
                res.render('login_otp.pug',{Mobile:req.body.mno})
               // res.render('Accounts.pug', { name: req.session.name });
            }
            else {
                req.session.destroy(function (err) {
                    if (err) { res.negotiate(err); }
                    res.render('login.pug', { msg: "Wrong Creditials Entered!" })
                })
            }
            db.close();

        });
    });
})
app.all('/login_otp_wrong', function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            res.negotiate(err);
        }
        res.render('login.pug', { msg: "OTP Incorrect!" });
    })
})
app.all('/login_frgtusr', function (req, res) {
    res.render('forgot _userid.pug');
})
app.all('/login_frgtpass', function (req, res) {
    res.render('forgot_psw_verify.pug');
})
app.all('/forgot_userid_otp', function (req, res) {

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("KSBA");
        dbo.collection("customers").find({ $and: [{ regMob: "+91" + req.body.mno }, { 'pan.number': req.body.pan }, { 'dob.date': req.body.dob }] }).toArray(function (err, result) {
            if (err) throw err;
            if (result.length > 0) {
                req.session.mno = "+91" + req.body.mno;
                req.session.pan = req.body.pan;
                req.session.uid = result[0]._id
                req.session.email = result[0].mail
                res.render('forgot_userid_otp.pug', { Mobile: req.body.mno });
            }
            else {
                res.render('login.pug', { msg: "User Doesn't Exist!" });
            }
            db.close();
        });
    });
})
app.all('/forgot_userid_otp_correct', function (req, res) {
    if (req.session.uid) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'arjun1997.130@gmail.com',
                pass: 'Birthdaycoming@0211'
            }
        });

        var mailOptions = {
            from: 'arjun1997.130@gmail.com',
            to: req.session.email,
            subject: 'KSBA Bank',
            text: 'Your Customer ID:' + req.session.uid
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        res.render('forgot_userid_success.pug');

    }
    else {

        res.render("/login", { msg: "" });
    }
    req.session.destroy(function (err) {
        if (err) {
            res.negotiate(err);
        }
    })
})
app.all('/forgot_psw_cardform', function (req, res) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("KSBA");
        req.session.pid = parseFloat(req.body.cid);
        var exp = req.body.year + "-" + req.body.month;
        var ob1 = { _id: parseFloat(req.body.cid) };
        var flag = 1;
        dbo.collection("customers").find(ob1).toArray(function (err, result) {
            if (err) throw err;
            if (result.length > 0) {
                for (var i = 0; i < result[0].accounts.creditCard.length; i++) {
                    if ((result[0].accounts.creditCard[i].cardNo == req.body.card) && (result[0].accounts.creditCard[i].cvv == req.body.cvv) && (result[0].accounts.creditCard[i].expiryDate == exp)) {
                        flag = 0;
                        res.render('forgot_passwd_otp.pug', { Mobile: parseFloat(result[0].regMob) })
                    }
                }
            }
            if (flag == 1) {
                res.render('login.pug', { msg: "Credentials Incorrect!" })
            }
            db.close();
        });
    })
})
app.all('/forgot_passwd_otp_correct', function (req, res) {
    res.render('forgot_pass_reset.pug');
})
app.all('/forgot_passwd_success', function (req, response) {
    if (req.session.pid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var myquery = { _id: req.session.pid };
            dbo.collection("customers").find(myquery).toArray(function (err, result) {
                if (err) throw err;
                var ol1 = result[0].password.old1;
                var ol2 = result[0].password.old2;
                var cu = result[0].password.cur;
                if (req.body.psw == cu || req.body.psw == ol1 || req.body.psw == ol2) {
                    response.render('forgot_pass_reset.pug')
                }
                else {
                    var newvalues = { $set: { password: { old1: ol2, old2: cu, cur: req.body.psw } } };
                    dbo.collection("customers").updateOne(myquery, newvalues, function (err, res) {
                        response.render('login.pug', { msg: "" });
                    });
                }
                db.close();

            });

        });
    }
    else {
        response.render('login.pug', { msg: "" });
    }

})
app.all('/login_otp_correct', function (req, res) {
    if (req.session.cid) {
        res.render('Accounts.pug', { name: req.session.name });
    }
    else {
        req.session.destroy(function (err) {
            if (err) { res.negotiate(err); }
            res.render('login.pug', { msg: "" });
        })
    }

})
app.all('/view_profile', function (req, res) {
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob1 = { _id: req.session.cid };
            dbo.collection("customers").find(ob1).toArray(function (err, result) {
                var det = {
                    cust: result[0]._id,
                    name: result[0].name,
                    regmob: result[0].regMob,
                    dob: result[0].dob.date,
                    pan: result[0].pan.number,
                    adhaar: result[0].adharNo,
                    street: result[0].address.street,
                    city: result[0].address.city,
                    state: result[0].address.state,
                    country: result[0].address.country,
                    pin: result[0].address.pinCode,
                    email1: result[0].mail
                }
                res.render('view_Profile.pug', det);
                db.close();
            });
        });
    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }
})
app.all('/view_profile_pass', function (req, res) {
    if (req.session.cid) {
        res.render('change_password.pug', { name: req.session.name })
    }
    else {
        res.render('login.pug');
    }
})
app.all('/view_profile_changepass_submit', function (req, res) {
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob1 = { _id: req.session.cid };
            var myquery = { _id: req.session.cid };
            dbo.collection("customers").find(ob1).toArray(function (err, result) {
                if (err) throw err;
                if (req.body.psw == result[0].password.cur) {
                    var ol1 = result[0].password.old1;
                    var ol2 = result[0].password.old2;
                    var cu = result[0].password.cur;
                    if ((req.body.psw1 == ol1) || (req.body.psw1 == ol2) || (req.body.psw1 == cu)) {
                        res.render('change_password.pug', { name: req.session.name })
                    }
                    else {
                        var newvalues = { $set: { 'password.old1': ol2, 'password.old2': cu, 'password.cur': req.body.psw1 } };
                        dbo.collection("customers").updateOne(myquery, newvalues, function (err, resul) {
                            res.redirect("/view_profile");
                        });
                    }
                }
                else {
                    res.render('change_password.pug', { name: req.session.name })
                }
                db.close();

            });
        });
    }
    else {
        res.render('login.pug');
    }
})
app.all('/view_profile_addr', function (req, res) {
    if (req.session.cid) {
        res.render('Change_Address.pug', { name: req.session.name });
    }
    else {
        res.render('login.pug')
    }
})
app.all('/view_profile_addr_submit', function (req, res) {
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob1 = { _id: req.session.cid };
            var myquery = { _id: req.session.cid };
            dbo.collection("customers").find(ob1).toArray(function (err, result) {
                if (err) throw err;
                if (req.body.psw == result[0].password.cur) {
                    var street = req.body.add2;
                    var city = req.body.city;
                    var state = req.body.state;
                    var pincode = req.body.zip;
                    var kyc = req.body.pic;
                    var newvalues = { $set: { 'address.street': street, 'address.city': city, 'address.state': state, 'address.pinCode': pincode, 'address.kyc.file': kyc, 'address.kyc.status': "pending" } };
                    dbo.collection("customers").updateOne(myquery, newvalues, function (err, resut) {
                        res.redirect("/view_profile");
                    });
                }
                else {
                    res.render('Change_Address.pug', { name: req.session.name })
                }
                db.close();

            });
        });
    }
    else {
        res.render('login.pug');
    }

})
app.all('/view_profile_pan', function (req, res) {
    if (req.session.cid) {
        res.render('Update_PAN.pug', { name: req.session.name });

    }
    else {
        res.render('login.pug')
    }
})
app.all('/view_profile_pan_submit', function (req, res) {
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob1 = { _id: req.session.cid };
            dbo.collection("customers").find(ob1).toArray(function (err, result) {
                if (err) throw err;
                if ((req.body.psw == result[0].password.cur) && (req.body.cpan == result[0].pan.number)) {
                    var pan = req.body.npan;
                    var kyc = req.body.pic;
                    var newvalues = { $set: { 'pan.number': pan, 'pan.kyc.file': kyc, 'pan.kyc.status': "pending" } };
                    dbo.collection("customers").updateOne(ob1, newvalues, function (err, resut) {
                        res.redirect("/view_profile");
                    });
                }
                else {
                    res.render('Update_PAN.pug', { name: req.session.name })
                }
                db.close();

            });
        });
    }
    else {
        res.render('login.pug');
    }
})
app.all('/view_profile_mail', function (req, res) {
    if (req.session.cid) {
        res.render('Update_Mail_and_Mobile.pug', { name: req.session.name, cid: req.session.cid, email: req.session.email });

    }
    else {
        res.render('login.pug')
    }
})
app.all('/view_profile_mail_submit', function (req, res) {
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob1 = { _id: req.session.cid };
            dbo.collection("customers").find(ob1).toArray(function (err, result) {
                if (err) throw err;
                var p = "+91" + req.body.mno;
                if ((req.body.psw == result[0].password.cur) && (p == result[0].regMob)) {
                    var mailid = req.body.mailid1;
                    var mno = req.body.mno1;
                    var newvalues = { $set: { 'mail': mailid, 'regMob': p } };
                    dbo.collection("customers").updateOne(ob1, newvalues, function (err, resut) {
                        res.redirect("/view_profile");
                    });
                }
                else {
                    res.redirect('/view_profile_mail')
                }
                db.close();

            });
        });
    }
    else {
        res.render('login.pug');
    }
})
app.all('/alerts', function (req, res) {
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob1 = { _id: req.session.cid };
            dbo.collection("customers").find(ob1).toArray(function (err, result) {
                alerts = result[0].alerts
                alerts.name = req.session.name;
                res.render('Alerts.pug', alerts);
                db.close();
            });
        });
    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }
})
app.all('/msg*', function (req, res) {
    if (req.session.cid) {
        var a = req.params[0]
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob2 = { _id: req.session.cid, "alerts.id": parseFloat(a) };
            var k = 0;
            var ob1 = { _id: req.session.cid };
            dbo.collection("customers").find(ob2).toArray(function (err, result) {
                if (err) throw err;
                var newvalues = { $set: { "alerts.$.read": true } };
                dbo.collection("customers").update(ob2, newvalues, function (err, resut) {
                    dbo.collection("customers").find(ob1).toArray(function (err, result) {
                        if (err) throw err;
                        for (var i = 0; i < result[0].alerts.length; i++) {
                            if (result[0].alerts[i].id == a) {
                                alerts = result[0].alerts[i];
                                res.render('view_Message.pug', alerts)
                                k = 0;
                            }
                        }
                    });
                })
            })
        })
    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }
})
app.all('/alerts_unread', function (req, res) {
    theTypeIs = Object.keys(req.body)[0];
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob2 = { _id: req.session.cid, "alerts.id": parseFloat(theTypeIs) };
            var k = 0;
            dbo.collection("customers").find(ob2).toArray(function (err, result) {
                if (err) throw err;
                var newvalues = { $set: { "alerts.$.read": false } };
                dbo.collection("customers").update(ob2, newvalues, function (err, resut) {
                    res.redirect('/alerts')
                });
            })
        })
    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }

})
app.all('/alerts_delete', function (req, res) {
    theTypeIs = Object.keys(req.body)[0];
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob2 = { _id: req.session.cid };
            var k = 0;
            dbo.collection("customers").find(ob2).toArray(function (err, result) {
                if (err) throw err;
                var newvalues = { $pull: { "alerts": { "id": parseFloat(theTypeIs) } } };
                dbo.collection("customers").update(ob2, newvalues, function (err, resut) {
                    res.redirect('/alerts')
                });
            })
        })
    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }

})
app.all('/alerts_compose', function (req, res) {
    if (req.session.cid) {
        res.render('Compose.pug', { name: req.session.name })
    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }

})
app.all('/alerts_compose_send', function (req, res) {
    if (req.session.cid) {
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'arjun1997.130@gmail.com',
                pass: 'Birthdaycoming@0211'
            }
        });
        var mailOptions = {
            from: 'arjun1997.130@gmail.com',
            to: 'arjun1997.130@gmail.com',
            subject: 'KSBA Bank',
            text: req.body.msg
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        res.redirect('/alerts');
    }
    else {
        res.render("/login", { msg: "" });

        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
        })
    }
})
app.all('/card_block', function (req, res) {
    if (req.session.cid) {
        res.render('Block.pug', { name: req.session.name })
    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }

})
app.all('/card_unblock', function (req, res) {
    if (req.session.cid) {
        res.render('Unblock.pug', { name: req.session.name })

    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }

})
app.all('/savings', function (req, res) {
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob1 = { _id: req.session.cid };
            dbo.collection("customers").find(ob1).toArray(function (err, result) {
                results = result[0].accounts.savings
                results['name'] = req.session.name;
                res.render('Savings.pug', results)
                db.close();
            });
        });
    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }
})
app.all('/loan', function (req, res) {
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob1 = { _id: req.session.cid };
            dbo.collection("customers").find(ob1).toArray(function (err, result) {
                results = result[0].accounts.homeLoan
                results['name'] = req.session.name;
                res.render('HomeLoan.pug', results)
                db.close();
            });
        });


    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }
})
app.all('/card', function (req, res) {
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob1 = { _id: req.session.cid };
            dbo.collection("customers").find(ob1).toArray(function (err, result) {
                results = result[0].accounts.creditCard
                results['name'] = req.session.name;
                res.render('CreditCard.pug', results)
                db.close();
            });
        });


    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }
})
app.all('/block_card_data', function (req, res) {
    if (req.session.cid) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var i = 0;
            var k = 0;
            var dbo = db.db("KSBA");
            var ob1 = { _id: req.session.cid };
            var newvalues, newvalues1;
            dbo.collection("customers").find(ob1).toArray(function (err, result) {
                for (i = 0; i < result[0].accounts.creditCard.length; i++) {
                    if (result[0].accounts.creditCard[i].cardNo == req.body.card) {
                        newvalues = { $push: { "blockedAccounts": result[0].accounts.creditCard[i] } };
                        newvalues1 = { $pull: { "accounts.creditCard": { "cardNo": result[0].accounts.creditCard[i].cardNo } } };
                        dbo.collection("customers").update(ob1, newvalues, function (err, result) {
                            if (err) console.log(err)
                            dbo.collection("customers").update(ob1, newvalues1, function (err, resut) {
                                if (err) console.log(err)
                                res.redirect('/savings')
                                k = 1;
                            })
                        })
                    }

                }

            })
        })
    }

    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }
})
app.all('/transaction*', function (req, res) {
    if (req.session.cid) {
        var a = req.params[0]
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db("KSBA");
            var ob1 = { _id: req.session.cid };
            var k = 1
            dbo.collection("customers").find(ob1).toArray(function (err, result) {
                for (i = 0; i < result[0].accounts.savings.length; i++) {
                    if (result[0].accounts.savings[i].accountNo == a) {
                        results = result[0].accounts.savings[i]
                        results['sa'] = result[0].accounts.savings[i].accountNo
                        results['cb'] = result[0].accounts.savings[i].balance
                        results['name'] = req.session.name
                        res.render("transactionHistory.pug", results);
                        k = 0;
                    }
                }
                if (k == 1) {
                    res.render('Accounts.pug', { name: req.session.name });
                }
                db.close();
            });
        });
    }
    else {
        req.session.destroy(function (err) {
            if (err) {
                res.negotiate(err);
            }
            res.render('login.pug')
        })
    }
})
app.all('/logout', function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            res.negotiate(err);
        }
    })
    res.render('homePage.pug');
})
app.listen(1337);

require('dotenv').config({ path: "../.env" });
const mongoose = require('mongoose');
const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Stock = require('../data_models/stock_data')
const User = require('../data_models/user');
const salt = bcrypt.genSaltSync(10);
const secret = process.env.SECRET;
app.use(cors({
    credentials:true,
    origin:process.env.CORS_ORIGIN,
    preflightContinue: true,
}));
app.use(express.json());
app.use(cookieParser());

mongoose.set('strictQuery',false);
mongoose.connect(
    process.env.MONGODB_CREDENTIALS,
    (err) => {
     if(err) console.log(err) ;
    }
  );

app.get('/top_10_stocks',(req,res)=>{
    const date = new Date();
    date.setDate(date.getDate()-1);

    Stock.find({ date: { $lt: date.toLocaleString() } })
                        .sort({close : -1})
                        .limit(10)
                        .select('-_id code name open low high close date')
                        .exec((err, results) => {
                            if (err) {
                                res.status(500).json("Unable to fetch! Error!");
                                console.error(err);
                            } else {
                                res.status(200).json(results);
                            }
                        });
}) ;


app.get('/stock/:name',(req,res)=>{
    const date = new Date();
    date.setDate(date.getDate()-1);
    const {name} = req.params;
    
    Stock.find({ name: { $eq: name.substring(1) } })
                        .select('-_id code name open low high close date')
                        .sort({date:-1})
                        .limit(1)
                        .exec((err, results) => {
                            if (err) {
                                res.status(500).json("Unable to fetch! Error!");
                                console.error(err);
                            } else {
                                res.status(200).json(results);
                            }
                        });
}) ;



app.get('/stock_history/:name',(req,res)=>{
    const date = new Date();
    date.setDate(date.getDate()-1);
    const {name} = req.params;

    Stock.find({ name: { $eq: name.substring(1) } })
                        .select('-_id code name open low high close date')
                        .sort({date:-1})
                        .exec((err, results) => {
                            if (err) {
                                res.status(500).json("Unable to fetch! Error!");
                                console.error(err);
                            } else {
                                res.status(200).json(results);
                            }
                        });
}) ;


app.post('/register',async (req,res)=>{
    const {username, password} = req.body;
    
    try{
        const userDoc =  await User.create({username,
             password:bcrypt.hashSync(password,salt),
             favourite: [],
        });
        jwt.sign({username,id:userDoc.id},secret,{},(err,token)=>{
            if(err) throw err;
            res.cookie('token',token,{ sameSite: 'none', secure: false, httpOnly: true}).json({ 
                userDoc,
                logged_in:true,
            },);
        });
        
    } catch(e){
        res.status(400).json(e);
    }
    
});

app.post('/login',async (req,res)=>{
    const {username,password} = req.body;
    const userDoc = await User.findOne({username});
    const passok = bcrypt.compareSync(password,userDoc.password);
    if(passok){
        jwt.sign({username,id:userDoc.id},secret,{},(err,token)=>{
            if(err) throw err;
            res.cookie('token',token,{ sameSite: 'none', secure: false, httpOnly: true}).json({ 
                id:userDoc._id,
                username,
                logged_in:true,
            },);
        });
    }
    else{
        res.status(400).json('wrong credentials');
    }
});

app.get('/favourites:username',async(req,res)=>{
    const {token} = req.cookies;
    const {username} = req.params;
    
    if(token){
        jwt.verify(token, secret,{},(err, info)=>{
            if(err) {
                res.status(400).json("cannot verify!");
                throw err;
            }
            else{
                const favourites = User.find({ username: { $eq: username.substring(1) } })
                .select('-_id favourite')
                .exec((err, results) => {
                    if (err) {
                        res.status(500).json("Unable to fetch! Error!");
                        console.error(err);
                    } else {
                        res.status(200).json(results);
                    }
                });
            }
        });
    }
});


app.post('/add_favourites:username',async(req,res)=>{
    const {token} = req.cookies;
    const {username} = req.params;
    const {favourites} = req.body;
    
    if(token){
        jwt.verify(token, secret,{},async (err, info)=>{
            if(err) {
                res.status(400).json("cannot verify!");
                throw err;
            }
            else{
                const doc = await User.find({ username: { $eq: username.substring(1) } })
                .select('-_id favourite');

                doc[0].favourite.map((name)=>{
                    if(!favourites.includes(name)) favourites.push(name);
                });

                User.updateOne({username: username.substring(1)},
                {$set : {favourite : favourites}},
                (err,result)=>{
                    if(err) res.status(500);
                    else res.status(200).json("favourites updated");
                });
            }
        });
    }
});


app.delete('/delete_favourite',async (req,res)=>{
    const username = req.query.username;
    const stock_name = req.query.stock;
    const {token} = req.cookies;

    if(token){
        const doc = await User.find({username: {$eq : username}})
                .select('-_id favourite');
        const index = doc[0].favourite.indexOf(stock_name);
        if (index > -1) { 
            doc[0].favourite.splice(index, 1); 
        }
        User.updateOne({username: username},
                {$set : {favourite : doc[0].favourite}},
                (err,result)=>{
                    if(err) res.status(500);
                    else res.status(200).json("favourites updated");
                });
    }
})



app.listen(process.env.PORT);
console.log(`listening on port ${process.env.PORT}`);
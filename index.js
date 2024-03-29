require('dotenv').config({ path: "./.env" });
const mongoose = require('mongoose');
const fs = require('fs');
const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cache = require('memory-cache');
const { spawn } = require('child_process');
const cookieParser = require('cookie-parser');
const Stock = require('./data_models/stock_data')
const User = require('./data_models/user');
const salt = bcrypt.genSaltSync(10);
const secret = process.env.SECRET;
const indexPage = process.cwd()+"/index.html";
const registeredUserPage = process.cwd()+"/forRegisteredUser.html";
const loggedUserPage = process.cwd()+"/forLoggedUser.html";
var index;
var registered;
var logged;


try {
    index = fs.readFileSync(indexPage, 'utf8');
    registered = fs.readFileSync(registeredUserPage, 'utf8');
    logged = fs.readFileSync(loggedUserPage, 'utf8');

} catch (err) {
    console.error('Error reading the file:', err);
}





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


app.get('/all_stocks',(req,res)=>{
    const data = cache.get('all_stocks');
    if(data){
        res.status(200).json(data);
    }
    else{
        Stock.distinct('name',(err,names)=>{
            if(err) res.status(500).json("unable to fetch! try later.");
            else res.status(200).json(names);
        });
    }
});




app.get('/top_10_stocks',(req,res)=>{
    const date = new Date();
    const data = cache.get('top_stocks');
    date.setDate(date.getDate()-1);

    if(data){
        res.status(200).json(data);
    }
    else{
        Stock.find({ date: { $lt: date.toLocaleString() } })
                        .sort({close : -1})
                        .limit(10)
                        .select('-_id code name open low high close date')
                        .exec((err, results) => {
                            if (err) {
                                res.status(500).json("Unable to fetch! Error!");
                                console.error(err);
                            } else {
                                cache.put('top_stocks',results,5*60*1000);
                                res.status(200).json(results);
                            }
                        });
    }
    
}) ;


app.get('/stock',(req,res)=>{
    const date = new Date();
    date.setDate(date.getDate()-1);
    const name = decodeURIComponent(req.query.name);
    const data = cache.get(name);

    if(data){
        res.status(200).json(data);
    }
    else{
        Stock.find({ name: { $eq: name } })
                        .select('-_id code name open low high close date')
                        .sort({date:-1})
                        .limit(1)
                        .exec((err, results) => {
                            if (err) {
                                res.status(500).json("Unable to fetch! Error!");
                                console.error(err);
                            } else {
                                cache.put(name,results,5*60*1000);
                                res.status(200).json(results);
                            }
                        });
    }
}) ;



app.get('/stock_history',(req,res)=>{
    const date = new Date();
    date.setDate(date.getDate()-1);
    const name = decodeURIComponent(req.query.name);
    const data = cache.get(`history:${name}`);
    
    if(data){
        res.status(200).json(data);
    }

    else{
        Stock.find({ name: { $eq: name } })
                        .select('-_id name open low high close date')
                        .sort({date:-1})
                        .exec((err, results) => {
                            if (err) {
                                res.status(500).json("Unable to fetch! Error!");
                                console.error(err);
                            } else {
                                cache.put(`history:${name}`,results,5*60*1000);
                                res.status(200).json(results);
                            }
                        });
    }
    
}) ;


app.post('/register',async (req,res)=>{
    const {username, password} = req.body;
    if(!username || !password) res.status(400).json("username and password cannot be empty!");
    else{
        try{
            const userDoc =  await User.create({username,
                 password:bcrypt.hashSync(password,salt),
                 favourite: [],
                 token: "token",
            });
            jwt.sign({username,id:userDoc.id},secret,{},async (err,token)=>{
                if(err) throw err;
                await User.updateOne({username:{$eq: username}},{token: token});
                res.cookie('token',token,{ sameSite: 'none', secure: true, httpOnly: true}).json({ 
                    logged_in:true,
                },);
            });
            
        } catch(e){
            res.status(400).json(e);
        }
    }
});

app.post('/login',async (req,res)=>{
    const {username,password} = req.body;
    if(!username || !password) res.status(400).json("username and password cannot be empty!");
    else{
        const userDoc = await User.findOne({username});
        const passok = bcrypt.compareSync(password,userDoc.password);
        if(passok){ 
            const userDoc = await User.findOne({username:{$eq: username}});
            const token = userDoc.token;
            res.cookie('token',token,{ sameSite: 'none', secure: true, httpOnly: true}).json({ 
                id:userDoc._id,
                username,
                logged_in:true,
            },);
        }
        else{
            res.status(400).json('wrong credentials');
        }
    }
});

app.get('/favourites',async(req,res)=>{
    const {token} = req.cookies;
    const username = decodeURIComponent(req.query.username);
    
    if(token){
        jwt.verify(token, secret,{},(err, info)=>{
            if(err) {
                res.status(400).json("cannot verify!");
                throw err;
            }
            else{
                const favourites = User.find({ username: { $eq: username } })
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


app.post('/add_favourites',async(req,res)=>{
    const {token} = req.cookies;
    const username = decodeURIComponent(req.query.username);
    const {favourites} = req.body;
    
    if(!username) res.status(400).json("please give a username!");
    else if(favourites.length===1 && favourites[0]==='') res.status(400).json("please enter a stock name!");
    else{
        var invalid;
        const existing_stocks = await Stock.find({name: {$in: favourites}});
        const stock_names = existing_stocks.map(stock => stock.name);

        await favourites.forEach(name => {
            if(!stock_names.includes(name)){
                invalid = name;
            }
        });
        
        if(invalid) res.status(400).json(`failed to add! ${invalid} is not a stock`);
        else if(token){
            jwt.verify(token, secret,{},async (err, info)=>{
                if(err) {
                    res.status(400).json("cannot verify!");
                    throw err;
                }
                else{
                    const doc = await User.find({ username: { $eq: username } })
                    .select('-_id favourite');

                    doc[0].favourite.map((name)=>{
                        if(!favourites.includes(name)) favourites.push(name);
                    });

                    User.updateOne({username: username},
                    {$set : {favourite : favourites}},
                    (err,result)=>{
                        if(err) res.status(500);
                        else res.status(200).json("favourites updated");
                    });
                }
            });
        }
    }
});


app.delete('/delete_favourite',async (req,res)=>{
    const username = decodeURIComponent(req.query.username);
    const stock_name = decodeURIComponent(req.query.stock);
    const {token} = req.cookies;
   
    if(token && username && stock_name){
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
    else res.status(400).json("invalid request! please enter correct information.");
})

app.get('/',async (req,res)=>{
    const {token} = req.cookies;
    
    if(token){
    const userDoc = await User.findOne({token: {$eq: token}});
    const username = userDoc.username;
    const regex = new RegExp('\\{' + "username" + '\\}', 'g');
    logged = logged.replace(regex,username);
        res.status(200).send(logged)
    }
    else res.status(200).send(index);
})


app.get('/login_page',(req,res)=>{
    res.status(200).send(registered);
})



// app.get('/refresh',(req,res)=>{
//     const args = ['-f'];
//     const child = spawn('node',['fetch_data.js', ...args],{cwd: `${process.cwd()}/script`});
//     child.on('error',(err)=>{
//         console.log(err);
//         res.status(500).json("refresh failed");
//     })
//     child.on('close',()=>{
//         res.status(200).json("successfully refreshed 50 days data");
//     })
// })



app.listen(process.env.PORT,()=>{
    console.log(`listening on port ${process.env.PORT}`);
});

module.exports = app;
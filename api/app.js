require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const app = express();
const cors = require('cors');


app.use(cors({
    credentials:true,
    origin:process.env.CORS_ORIGIN,
    preflightContinue: true,
}));
app.use(express.json());
app.use(cookieParser());
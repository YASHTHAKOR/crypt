import express from 'express';
const app = express();
import index from './api/index';


app.use('/',index);
app.listen(8080);
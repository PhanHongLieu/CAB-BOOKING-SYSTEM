const express = require('express');

const mongoose = require('mongoose');

const cors = require('cors');

const helmet = require('helmet');

require('dotenv').config();



const logger = require('../../shared/logger');

const { errorHandler } = require('./middleware/errorHandler');

const { metricsMiddleware, register } = require('../../shared/metrics');

const { tracingMiddleware } = require('../../shared/tracing');

const { getEventBus } = require('../../shared/eventBus');

const { BOOKING_EVENTS } = require('../../shared/events');

const driverRoutes = require('./routes/driver.routes');

const eventHandlers = require('./events/eventHandlers');



const app = express();

const PORT = process.env.PORT || 3003;
let serverInstance = null;



/* ===== SECURITY ===== */

app.use(helmet());

app.use(cors({

 origin:process.env.FRONTEND_URL || '*',

 credentials:true

}));



/* ===== OBSERVABILITY ===== */

app.use(tracingMiddleware);

app.use(metricsMiddleware);



/* ===== BODY PARSER ===== */

app.use(express.json());

app.use(express.urlencoded({extended:true}));



/* ===== HEALTH ===== */

app.get('/health',(req,res)=>{

 res.json({

 status:"ok",

 service:"driver-service",

 time:new Date()

 });

});



/* ===== PROMETHEUS ===== */

app.get('/metrics',async(req,res)=>{

 res.set(

 'Content-Type',

 register.contentType

 );

 res.end(

 await register.metrics()

 );

});



/* ===== ROUTES ===== */

app.use('/api/drivers',driverRoutes);



/* ===== ERROR ===== */

app.use(errorHandler);



/* ===== EVENT BUS ===== */

async function initializeEventBus(){

 if(process.env.EVENT_BUS_ENABLED==="false"){
  logger.info("EventBus disabled (EVENT_BUS_ENABLED=false)");
  return;
 }

 try{

 const eventBus=getEventBus();

 await eventBus.connect();


 await eventBus.subscribe(

 'driver-service-booking-queue',

 [

 BOOKING_EVENTS.BOOKING_CREATED

 ],

 eventHandlers.handleBookingCreated

 );


 logger.info(

 "EventBus connected"

 );

 }catch(error){

 logger.warn(
  `EventBus unavailable, continuing without messaging: ${error.message}`
 );

 }

}



/* ===== MONGODB ===== */

mongoose.connect(

 process.env.MONGODB_URI ||

 'mongodb://localhost:27017/driver_db'

)

.then(async()=>{

 logger.info(

 "MongoDB Connected"

 );


 await initializeEventBus();


 serverInstance = app.listen(PORT,()=>{

 logger.info(

 `Driver Service running ${PORT}`

 );

 });

 serverInstance.on('error',(error)=>{
  if(error.code==='EADDRINUSE'){
   logger.warn(`Port ${PORT} is already in use. Driver service may already be running.`);
   process.exit(0);
  }

  logger.error("Server start error", error);
  process.exit(1);
 });


})

.catch(error=>{

 logger.error(

 "MongoDB Error",

 error

 );

 process.exit(1);

});



/* ===== SHUTDOWN ===== */

process.on('SIGTERM',async()=>{

 logger.info("Shutdown driver-service");


 try{

 if(serverInstance){
 await new Promise((resolve)=>{
  serverInstance.close(()=>resolve());
 });
 }

 }catch(e){}


 try{

 const eventBus=getEventBus();

 await eventBus.close();

 }catch(e){}


 try{

 await mongoose.connection.close();

 }catch(e){}


 process.exit(0);

});



module.exports=app;

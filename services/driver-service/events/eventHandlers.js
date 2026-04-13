const Driver = require('../models/Driver.model');

const logger = require('../../../shared/logger');

const { recordEventConsumed } = require('../../../shared/metrics');

const { getEventBus } = require('../../../shared/eventBus');

const { recordEventPublished } = require('../../../shared/metrics');



exports.handleBookingCreated = async (event)=>{

 try{

 const {eventType,data}=event;

 recordEventConsumed(eventType,'driver-service');


 if(!data.pickupLocation){

 logger.error("pickupLocation missing");

 return;

 }


 const lat=data.pickupLocation.coordinates.lat;

 const lng=data.pickupLocation.coordinates.lng;



 const drivers=await Driver.find({

 status:"online",

 isAvailable:true,

 location:{

 $near:{

 $geometry:{

 type:"Point",

 coordinates:[lng,lat]

 },

 $maxDistance:5000

 }

 }

 })
 .limit(20);



 if(drivers.length===0){

 logger.info("No nearby drivers");

 return;

 }


 const eventBus=getEventBus();



 await eventBus.publish("driver.nearby.found",{

 bookingId:data.bookingId,

 drivers:drivers.map(d=>({

 driverId:d._id.toString(),

 userId:d.userId?.toString ? d.userId.toString() : d.userId,

 vehicle:d.vehicle,

 location:d.location,

 rating:d.rating

 }))

 });



 recordEventPublished(

 "driver.nearby.found",

 "driver-service"

 );



 logger.info(

 `Found ${drivers.length} drivers for booking ${data.bookingId}`

 );


 }catch(error){

 logger.error(

 "Error booking.created event",

 error

 );


 throw error;

 }

};

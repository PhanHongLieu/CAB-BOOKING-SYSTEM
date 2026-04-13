const Driver = require('../models/Driver.model');
const HttpClient = require('../../../shared/httpClient');
const { NotFoundError, ValidationError } = require('../../../shared/errors');
const logger = require('../../../shared/logger');
const { getEventBus } = require('../../../shared/eventBus');
const { DRIVER_EVENTS } = require('../../../shared/events');
const { recordEventPublished } = require('../../../shared/metrics');

const authClient = new HttpClient(process.env.AUTH_SERVICE_URL || 'http://localhost:3001');
const locationClient = new HttpClient(process.env.LOCATION_SERVICE_URL || 'http://localhost:3006');


/* ================= REGISTER DRIVER ================= */

exports.registerDriver = async (req, res, next) => {

  try {

    const userId = req.user.userId;
    const { licenseNumber, vehicle, documents } = req.body;

    const existingDriver = await Driver.findOne({ userId });

    if (existingDriver) {
      throw new ValidationError('Driver profile already exists');
    }

    const driver = await Driver.create({

      userId,
      licenseNumber,
      vehicle,

      status: "offline",

      isAvailable:false,

      location:{
        type:"Point",
        coordinates:[0,0]
      },

      kyc:{
        status:"pending",
        documents:documents || {}
      }

    });

    logger.info(`Driver registered ${driver._id}`);

    res.status(201).json({
      success:true,
      data:driver
    });

  } catch(error){

    next(error);

  }

};



/* ================= GET PROFILE ================= */

exports.getDriverProfile = async (req,res,next)=>{

 try{

  const userId=req.user.userId;

  const driver=await Driver.findOne({userId});

  if(!driver){
    throw new NotFoundError('Driver profile');
  }

  res.json({
    success:true,
    data:driver
  });

 }catch(error){
  next(error);
 }

};



/* ================= UPDATE ONLINE OFFLINE ================= */

exports.updateDriverStatus=async(req,res,next)=>{

 try{

  const userId=req.user.userId;

  const { status, isOnline, isAvailable } = req.body;

  const driver=await Driver.findOne({userId});

  if(!driver){
    throw new NotFoundError('Driver profile');
  }

  if(status===undefined && isOnline===undefined && isAvailable===undefined){
    throw new ValidationError("Provide at least one field: status, isOnline, isAvailable");
  }

  const allowedStatuses = ['offline','online','busy'];
  let nextStatus = driver.status;
  let nextIsAvailable = driver.isAvailable;

  if(status!==undefined){
    const normalizedStatus = String(status).toLowerCase().trim();
    if(!allowedStatuses.includes(normalizedStatus)){
      throw new ValidationError("Invalid status. Allowed: offline, online, busy");
    }
    nextStatus = normalizedStatus;
  }

  if(isOnline!==undefined){
    if(typeof isOnline !== 'boolean'){
      throw new ValidationError("isOnline must be boolean");
    }
    if(isOnline===false){
      nextStatus='offline';
    } else if(status===undefined){
      nextStatus='online';
    }
  }

  if(isAvailable!==undefined){
    if(typeof isAvailable !== 'boolean'){
      throw new ValidationError("isAvailable must be boolean");
    }
    nextIsAvailable=isAvailable;
  }

  if(nextStatus==='offline' || nextStatus==='busy'){
    nextIsAvailable=false;
  }

  driver.status=nextStatus;
  driver.isAvailable=nextIsAvailable;

  await driver.save();


  res.json({
    success:true,
    data:{
      ...driver.toObject(),
      isOnline: driver.status !== 'offline'
    }
  });


 }catch(error){

  next(error);

 }

};



/* ================= UPDATE LOCATION ================= */

exports.updateLocation=async(req,res,next)=>{

 try{

  const userId=req.user.userId;

  const {lat,lng}=req.body;

  const driver=await Driver.findOne({userId});

  if(!driver){
    throw new NotFoundError('Driver profile');
  }


  driver.location={

    type:"Point",

    coordinates:[lng,lat],

    lastUpdated:new Date()

  };


  await driver.save();


  res.json({

    success:true,

    data:driver.location

  });


 }catch(error){

  next(error);

 }

};



/* ================= NEARBY DRIVERS ================= */

exports.getNearbyDrivers=async(req,res,next)=>{

 try{

 const {lat,lng,radius=5}=req.query;


 const drivers=await Driver.find({

  status:"online",

  isAvailable:true,

  location:{

    $near:{

      $geometry:{

        type:"Point",

        coordinates:[parseFloat(lng),parseFloat(lat)]

      },

      $maxDistance:radius*1000

    }

  }

 })
 .limit(20);



 res.json({

  success:true,

  data:drivers

 });


 }catch(error){

  next(error);

 }

};



/* ================= UPDATE RATING ================= */

exports.updateRating=async(req,res,next)=>{

 try{

 const {driverId}=req.params;

 const {rating}=req.body;


 const driver=await Driver.findById(driverId);

 if(!driver){

  throw new NotFoundError('Driver');

 }


 const totalRating=
 driver.rating.average*
 driver.rating.count+
 rating;


 driver.rating.count+=1;

 driver.rating.average=
 totalRating/
 driver.rating.count;


 await driver.save();


 res.json({

  success:true,

  data:driver.rating

 });


 }catch(error){

 next(error);

 }

};



/* ================= KYC VERIFY ================= */

exports.verifyKYC=async(req,res,next)=>{

 try{

 const {driverId}=req.params;

 const status = req.body.status || req.body.kycStatus;


 const driver=await Driver.findById(driverId);


 if(!driver){

 throw new NotFoundError('Driver');

 }

 if(!status){
  throw new ValidationError("KYC status is required");
 }

 const normalizedStatus = String(status).toLowerCase().trim();
 const allowedKycStatus = ['pending','approved','rejected'];
 if(!allowedKycStatus.includes(normalizedStatus)){
  throw new ValidationError("Invalid KYC status. Allowed: pending, approved, rejected");
 }

 driver.kyc.status=normalizedStatus;


 if(normalizedStatus==="approved"){

 driver.kyc.verifiedAt=new Date();

 }else{

 driver.kyc.verifiedAt=undefined;

 }


 await driver.save();


 res.json({

 success:true,

 data:{
  ...driver.kyc.toObject(),
  kycStatus: driver.kyc.status
 }

 });


 }catch(error){

 next(error);

 }

};


const AccessModel = require("../models/AccessModel");

// using this middleware in create item
const rateLimiting = async (req, res, next) => {
  const sessionId = req.session.id;
  console.log(sessionId);
  if (!sessionId) {
    return res.send({
        status: 400,
        message: "Invalid session, please login again"
    })
  }

  // Case 1 - user making request for first time
  const sessionTimeDb = await AccessModel.findOne({sessionId : sessionId})
  // will give the time for last request made by user
  // two possibilities, if time does not exist then first request is being made, first todo is being created, else will get time
  if (!sessionTimeDb) {
    // create the accessmodal - hence it will not be present at time of first request from user
    const accessTime = new AccessModel({
        sessionId: sessionId,
        time: Date.now() // current time
    })
    await accessTime.save();
    // so the first time current time will be stored, next time difference between last time and current time will be stored
    next();
    return;
  }

  const previousAccessTime = sessionTimeDb.time;
  const currentAccessTime = Date.now();

  // limit request making
  // Case 2 - if person is making request within 1 sec
  if (currentAccessTime - previousAccessTime < 1000) {
    return res.send({
        status: 400,
        message: "Two many requests. Please try again after some time"
    })
  }

  // Case 3 - user making request after 2 sec
  // if user made a request and it was fine, then update the time
  await AccessModel.findOneAndUpdate(
    {sessionId: sessionId},
    {time: Date.now()}
  )

  next();
  return;
};

module.exports = rateLimiting;

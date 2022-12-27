// rate limiting - a hacker can generate traffic and send requests to make thousands of todos per second which can crash our db hence rate limiting where for eg a user can make only 1 request every second
// store here session id and time 
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const accessSchema = new Schema ({
    sessionId: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("access", accessSchema);
const mongoose = require("mongoose");

// just write schema instead of mongoose.schema everywhere
const Schema = mongoose.Schema;

// defining the structure of schema
const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: Number,
  },
});

// give collection name as plural - users as multiple users can be there
module.exports = mongoose.model("users", UserSchema);

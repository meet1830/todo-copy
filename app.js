// importing express
const express = require("express");
const validator = require("validator");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const UserSchema = require("./UserSchema");
const session = require("express-session");
const mongoDBSession = require("connect-mongodb-session")(session);

// models
const TodoModel = require("./models/TodoModel");

// middlewares
const { cleanUpAndValidate } = require("./Utils/AuthUtils");
const isAuth = require("./middlewares/isAuth");
const rateLimiting = require("./middlewares/rateLimiting")

// creating a server
const app = express();

// set render method to ejs
// for rendering ejs we need view engine
// for it to work the folder name should be views and should contain the files to be rendered
// ejs is run by view engine like chrome is run by v8 engine
app.set("view engine", "ejs");

// remove warning in console
// uptil mongoose 7 this prop was false by default, but after that manually have to set it true or false
mongoose.set("strictQuery", false);
const mongoURI = `mongodb+srv://meet:meet123@cluster0.eym9t1e.mongodb.net/cluster0`;
mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((res) => {
    console.log("DB connected");
  })
  .catch((err) => {
    console.log("Failed to connect to DB", err);
  });

// these lines help take out the body if sending some data
// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// create a middle ware for public folder to be accessible from both client and server side
app.use(express.static("public"));

// both packages installed for session based authentication
// session will be created in backend and will be sent to frontend and will be stored there in the form of a cookie
// express session does this
// connect mongodb session helps store that session in database

// adding session
// create a store first
// this will store the session inside db
const store = new mongoDBSession({
  uri: mongoURI,
  collection: "sessions",
  // by which name we want to see this collection in the db
});

// use middlewares
// secret key matches the password or the information and creates a long string
app.use(
  session({
    secret: "this is my secret code",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

// home route
app.get("/", (req, res) => {
  res.send("Welcome to my app");
});

// login page
app.get("/login", (req, res) => {
  // return res.send("Login page");
  // instead of just sending a string, we want to render the template for login from ejs file
  return res.render("login");
});

app.post("/login", async (req, res) => {
  // login id since we can receive email or username
  // sending both the things to body
  const { loginId, password } = req.body;

  if (
    typeof loginId !== "string" ||
    typeof password !== "string" ||
    !loginId ||
    !password
  ) {
    return res.send({
      status: 400,
      message: "Invalid data",
    });
  }

  // find and findOne
  // find returns all the matching keys and returns an array of objects
  // findOne returns single object or null if not able to find
  let userDB;
  try {
    if (validator.isEmail(loginId)) {
      // key will be email but value will be login id that is to be found out
      // make app.post login above async to get rid of await error
      userDB = await UserSchema.findOne({ email: loginId });
    } else {
      // else make search with username
      userDB = await UserSchema.findOne({ username: loginId });
    }
    console.log(userDB);

    // if no userdb hence user needs to register first
    if (!userDB) {
      return res.send({
        status: 400,
        message: "User not found, please register first",
        error: err,
      });
    }

    // comparing password
    const isMatch = await bcrypt.compare(password, userDB.password);
    if (!isMatch) {
      return res.send({
        status: 400,
        message: "Invalid password",
        data: req.body,
        // can send the data to front end so that user can see the password entered
      });
    }

    // final return
    // marking that the authentication is successfull and hence session can be created
    // now everytime while browsing the website just check isauth to be true for that session and restricted pages can be shown to user
    req.session.isAuth = true;
    // store user details in the session
    // if user logs in using different device or browser then db should know that the user has two logins hence send user details, generate different sessions
    // hence to keep track of the multiple sessions in db, which sessions belongs to which user, hence send user details
    req.session.user = {
      username: userDB.username,
      email: userDB.email,
      userId: userDB._id,
    };
    // return res.send({
    //   status: 200,
    //   message: "Logged in successfully",
    // });
    res.redirect("/dashboard");
  } catch (err) {
    return res.send({
      status: 400,
      message: "Internal server error, please login again",
      error: err,
    });
  }
});

// create a route for /home
// check for authentication - isauth is a middle ware the logic inside parenthesis is next, middleware went and see in its code if authenticated then execute next function, called authenticated middleware, or authenticated route
// home just for demonstration purpose redirect to dashboard
/*
app.get("/home", isAuth, (req, res) => {
  // first check if user is authenticated
  if (req.session.isAuth) {
    return res.send({
      message: "This is your homepage",
    });
  } else {
    return res.send({
      message: "Please login again",
    });
  }
});
*/

// creating logout and logoutfromalldevices routes
app.post("/logout", isAuth, (req, res) => {
  // using destroy method to clear out cookies and sessions in db, also catching any error in the process. if successfull redirect to login page
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/login");
  });
});

app.post("/logout_from_all_devices", isAuth, async (req, res) => {
  // have to get the user details to delete all the sessions, in logout had to delete only the current session, but here since have to delete all the sessions in the db need user details
  // we will get that from cookies
  console.log(req.session.user.username);
  // data stored in db in the above format, just console.log(req.session) to view whole obj
  // we have not created a schema for sessions till now
  // first schema is created, then its model is created and then through that model findone func can run
  // module.exports = mongoose.model("users", UserSchema);
  // hence create sessionschema first

  // this line is required to create any schema
  const Schema = mongoose.Schema;
  const sessionSchema = new Schema({ _id: String }, { strict: false });
  // strict: is the id or whatever info compulsory everytime, here no hence marked as false

  // convert the schema into a model
  const sessionModel = mongoose.model("sessions", sessionSchema);

  const username = req.session.user.username;
  // can perform ops on this model
  try {
    const sessionDB = await sessionModel.deleteMany({
      "session.user.username": username,
    });
    console.log(sessionDB);
    return res.send({
      status: 200,
      message: "Logged out from all devices",
    });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Log out from all devices failed",
      error: err,
    });
  }
});

// dashboard means redirect to todo app
app.get("/dashboard", isAuth, async (req, res) => {
  return res.render("dashboard");
  // // if send information in the form of second argument here then will be accessible to the dashboard.ejs

  // let todos = [];

  // try {
  //   // below line will access all the todos of a user using username
  //   todos = await TodoModel.find({ username: req.session.user.username });
  //   // if it was in react then do not have to send html from frontend to backend it has its own frontend part in that case this is how to send data
  //   // return res.send({
  //   //     status: 200,
  //   //     message: "Read successful",
  //   //     data: todos
  //   // })
  //   console.log(todos);
  // } catch (err) {
  //   return res.send({
  //     status: 400,
  //     message: "Database Error. Please try again",
  //   });
  // }
  // // sending todos information
  // res.render("dashboard", { todos: todos });
});

// optimizing apis - sending only relevent information through them, pagination(route pagination in backend, not page pagination for frontend)
// skip and limit - pagination means not showing all the data at once instead when user clicks on show more then load some more data
// skip is initially 0 and limit amount of data is shown to user. once clicked show more, then skip increases by limit amount and hence the initial data is not shown - data from new value of skip, upto the count of limit is shown
// skip = 0, limit = 20, data shown 0-20
// skip = 20, limit = 20, data 21-40
// skip = 40, limit = 20, data 41-60
// skip will be provided by frontend, limit will be provided by backend
app.post("/pagination_dashboard", isAuth, async (req, res) => {
  // query is that which comes after & in url and req.body is params
  // skip exists then take that value else take 0
  const skip = req.query.skip || 0;
  const LIMIT = 5;
  const username = req.session.user.username;

  // we are not reading everything from mongodb, can read upto a certain range, mongodb aggregation
  // performing multiple queries in sql we use aggregate functions
  try {
    let todos = await TodoModel.aggregate([
      {
        // here use the match aggregate function to read todos belonging to a user
        $match: {username: username}
        // first username: first one coming from database, second one coming from frontend
      },
      {
        // select data
        // first limit coming from frontend side other we have defined
        // skip can be string
        $facet: {
          data: [{$skip: parseInt(skip)}, {$limit: LIMIT}]
        }
      }
    ]);

    return res.send({
      status: 200,
      message: "Read successfully",
      data: todos
    })
  } catch(err) {
    return res.send({
      status: 400,
      message: "Database error. Please try again",
      error: err
    })
  }
})


app.get("/register", (req, res) => {
  // return res.send("Register page");
  return res.render("register");
});

app.post("/register", async (req, res) => {
  console.log(req.body);
  // destructuring the info that we are getting in terminal which is filled in the form, after that form is submitted and post request is made and we get the information
  const { name, email, username, password } = req.body;

  // since below func is async hence need to await for it so that it can validate before moving forward, hence have to mention async in parent function
  try {
    await cleanUpAndValidate({ name, email, username, password });
  } catch (err) {
    return res.send({
      status: 400,
      message: err,
    });
  }
  // since retuning a promise we also need to catch it. since .then and .catch will become very messy hence after this all code has to be written in .then block, we use try catch block

  // sending a password here to the backend without encrypting, security issue
  // hence encrypting the password
  // bcrypt internally uses md5 algo
  const hashedPassword = await bcrypt.hash(password, 7);
  //   console.log(hashedPassword);

  // insert into db
  let user = new UserSchema({
    name: name,
    username: username,
    password: hashedPassword,
    email: email,
  });

  // check if user present in the db
  let userExists;
  try {
    userExists = await UserSchema.findOne({ email });
  } catch (err) {
    return res.send({
      status: 400,
      // message user already exists, but many other problems can occur like internet down when checking, user goes away, etc
      message: "Internal server error, Please try again",
      error: err,
    });
  }

  // in findone function mongodb returns the whole matching object to it, or else returns nothing hence undefined
  if (userExists) {
    return res.send({
      status: 400,
      message: "User already exists",
    });
  }

  // save to db
  try {
    const userDB = await user.save();
    console.log(userDB);
    // once user registers should redirect to login page instead of sending message
    res.redirect("/login")
    // return res.send({
    //   status: 201,
    //   // 201 - code for new user created
    //   message: "Registered successfully",
    //   // showing the data that is being stored in db
    //   data: {
    //     // _id will be generated by mongoose for every user
    //     _id: userDB._id,
    //     username: userDB.username,
    //     email: userDB.email,
    //   },
    // });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Internal server error, please try again",
      error: err,
    });
  }
});

// CUD operations(not read) are always to be authenticated first (isAuth)
app.post("/create-item", isAuth, rateLimiting, async (req, res) => {
  console.log(req.body);
  // from frontend in dashboard where request is made to backend(here)
  const todoText = req.body.todo;

  if (!todoText) {
    return res.send({
      status: 400,
      message: "Missing Parameters",
    });
  }

  if (todoText.length > 100) {
    return res.send({
      status: 400,
      message: "Todo text is very long. Max 100 characters allowd.",
    });
  }

  // create new schema to insert in db
  let todo = new TodoModel({
    todo: todoText,
    username: req.session.user.username,
  });

  try {
    // saving to db
    const todoDb = await todo.save();
    return res.send({
      status: 200,
      message: "Todo created successfully",
      data: todoDb,
    });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Database error, Please Try again.",
    });
  }
});

app.post("/edit-item", async (req, res) => {
  const id = req.body.id;
  const newData = req.body.newData;
  console.log(req.body);
  if (!id || !newData) {
    return res.send({
      status: 404,
      message: "Missing Paramters.",
      error: "Missing todo data",
    });
  }

  try {
    const todoDb = await TodoModel.findOneAndUpdate(
      { _id: id },
      { todo: newData }
    );
    return res.send({
      status: 200,
      message: "Updated todo succesfully",
      data: todoDb,
    });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Database error, Please Try again.",
      error: err,
    });
  }
});

app.post("/delete-item", async (req, res) => {
  const id = req.body.id;
  console.log(req.body);
  if (!id) {
    return res.send({
      status: 404,
      message: "Missing parameters",
      error: "Missing id of todo to delete",
    });
  }

  try {
    const todoDb = await TodoModel.findOneAndDelete({ _id: id });

    return res.send({
      status: 200,
      message: "Todo Deleted Succesfully",
      data: todoDb,
    });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Database error. Please try again.",
      error: err,
    });
  }
});

// listening to server
// assign variable port
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Listening to port ${PORT}`);
});

// this will check each page to be rendered if the user is authenticated or not and then only show the page so that dont have to use isauth everytime
const isAuth = (req, res, next) => {
  // next = since isauth is a middleware it will call the controller for the next set of executions
  if (req.session.isAuth) {
    // if true then only go to next function
    next();
  } else {
    res.send({
      status: 401,
      message: "Invalid session, please login again",
    });
  }
};

module.exports = isAuth;
